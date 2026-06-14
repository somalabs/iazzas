"""BI sandbox eval: real SQL execution against a seeded DuckDB (BigQuery-like),
so consultar_bq results are CONSISTENT with the model's SQL (kills the canned-fixture
artifact). Runs the shipped config (Gemini 3.1 Pro + v6 prompt) through a real
function-calling loop. Writes results-bisandbox/run.json + gabarito with exact numbers.

Run: uv run --with duckdb python bi_sandbox.py
"""
import json, os, re, sys, urllib.request, random, datetime, pathlib
import duckdb

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
KEY = next(l for l in (ROOT / ".env").read_text().splitlines() if l.startswith("GOOGLE_KEY=")).split("=", 1)[1].strip()
TODAY = "2026-06-14"
MODEL = "gemini-3.1-pro-preview"
GAB_ONLY = len(sys.argv) > 1 and sys.argv[1] == "gabarito"
PROMPTNAME = "iazzas-v6" if GAB_ONLY else (sys.argv[1] if len(sys.argv) > 1 else "iazzas-v6")
OUTNAME = sys.argv[2] if len(sys.argv) > 2 else "results-bisandbox"
CONFIG = "g31pro-" + PROMPTNAME.replace("iazzas-", "")
SYS = "" if GAB_ONLY else (HERE / "prompts" / f"{PROMPTNAME}.txt").read_text().strip() + f"\n\nData e hora atuais: {TODAY} 10:00 (America/Sao_Paulo)."

# ---------------- seed a BigQuery-like table ----------------
con = duckdb.connect(":memory:")
con.execute("""CREATE TABLE silver_linx_vendas(
  data_venda DATE, marca VARCHAR, loja_id VARCHAR, loja_nome VARCHAR, colecao VARCHAR,
  fase VARCHAR, canal VARCHAR, produto_id VARCHAR,
  venda_liquida DOUBLE, venda_bruta DOUBLE, cmv DOUBLE,
  qtd_pecas BIGINT, qtd_atendimentos BIGINT, quebra_valor DOUBLE)""")

rnd = random.Random(42)
MARCAS = ["Animale", "Farm", "Arezzo", "Schutz"]
LOJAS = {m: [(f"{m[:2].upper()}{i:02d}", f"{m} Loja {i}") for i in range(1, 9)] for m in MARCAS}
CANAIS = ["Físico", "Online", "Omni"]
PRODUTOS = [f"P-{1000+i}" for i in range(40)]
OFF_SHARE = {"Animale": 0.34, "Farm": 0.07, "Arezzo": 0.05, "Schutz": 0.12}

def colecao_for(d):
    return ("VER" if d.month in (9,10,11,12,1,2) else "INV") + str(d.year % 100)

rows = []
d0 = datetime.date(2024, 1, 1)
for mi in range(30):  # 30 meses: jan/2024 .. jun/2026
    y = 2024 + (mi // 12); mo = (mi % 12) + 1
    base = datetime.date(y, mo, 15)
    for marca in MARCAS:
        # loja nova só aparece a partir de 2026 (para testar comparable do SSS)
        lojas = LOJAS[marca][:7] if base < datetime.date(2026,1,1) else LOJAS[marca]
        for (lid, lname) in lojas:
            for canal in CANAIS:
                fase = "OFF" if rnd.random() < OFF_SHARE[marca] else ("SALE" if rnd.random() < 0.2 else "ON")
                atend = rnd.randint(80, 400)
                pecas = int(atend * rnd.uniform(1.3, 2.4))
                preco = rnd.uniform(180, 520) * (0.6 if fase == "OFF" else (0.85 if fase == "SALE" else 1.0))
                bruta = round(preco * pecas, 2)
                desc = bruta * (0.30 if fase == "OFF" else (0.12 if fase == "SALE" else 0.04))
                liquida = round(bruta - desc, 2)
                # OFF: custo já amortizado -> cmv baixo -> markup inflado
                cmv = round(bruta / (3.4 if fase == "OFF" else rnd.uniform(2.2, 2.6)), 2)
                quebra = round(rnd.uniform(0, 6000) * (3 if rnd.random() < 0.05 else 1), 2)
                rows.append((base.isoformat(), marca, lid, lname, colecao_for(base), fase, canal,
                             rnd.choice(PRODUTOS), liquida, bruta, cmv, pecas, atend, quebra))
con.executemany("INSERT INTO silver_linx_vendas VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
print(f"seeded {len(rows)} rows")

# ---------------- BigQuery -> DuckDB SQL shims ----------------
def shim(sql):
    s = sql
    s = s.replace("`", '"')
    s = re.sub(r"CURRENT_DATE\(\)", f"DATE '{TODAY}'", s, flags=re.I)
    s = re.sub(r"\bCURRENT_DATE\b(?!\s*\()", f"DATE '{TODAY}'", s, flags=re.I)
    s = re.sub(r"DATE_SUB\(\s*(.+?)\s*,\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)", r"(\1 - INTERVAL \2 \3)", s, flags=re.I)
    s = re.sub(r"DATE_ADD\(\s*(.+?)\s*,\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)", r"(\1 + INTERVAL \2 \3)", s, flags=re.I)
    s = re.sub(r"SAFE_DIVIDE\(\s*(.+?)\s*,\s*(.+?)\s*\)", r"(\1 / NULLIF(\2,0))", s, flags=re.I)
    s = re.sub(r"FORMAT_DATE\(\s*'([^']+)'\s*,\s*(.+?)\s*\)", r"strftime(\2, '\1')", s, flags=re.I)
    return s

def _safe(v):
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    try:
        import decimal
        if isinstance(v, decimal.Decimal):
            return float(v)
    except Exception:
        pass
    return v

def run_sql(sql):
    try:
        cur = con.execute(shim(sql))
        cols = [c[0] for c in cur.description]
        data = cur.fetchall()[:200]
        return {"rows": [{c: _safe(val) for c, val in zip(cols, r)} for r in data], "row_count": len(data)}
    except Exception as e:
        return {"error": f"SQL error: {str(e)[:300]}"}

CONTEXT = ("Agente Vendas (Linx). Tabela: silver_linx_vendas (1 linha por item-loja-mês). "
           "KPIs: venda_liquida, venda_bruta, cmv, markup, ticket_medio, pa, quebra. "
           "Dims: marca, loja_id/loja_nome, colecao, fase (ON/SALE/OFF), canal, produto_id, data_venda. "
           "Chame get_business_rules e describe_table antes de consultar.")
RULES = ("Definições canônicas: venda_liquida = venda_bruta - descontos/devoluções (use p/ receita). "
         "markup = venda_bruta / cmv. margem_bruta = (venda_liquida - cmv)/venda_liquida. "
         "ticket_medio = venda_liquida / qtd_atendimentos. pa = qtd_pecas / qtd_atendimentos. "
         "taxa_desconto = 1 - venda_liquida/venda_bruta. "
         "RESSALVA: fase OFF tem cmv amortizado -> infla markup/margem; ao comparar marcas/períodos, "
         "isole ou alerte se houver volume relevante em OFF. SSS comparable: só lojas presentes nos DOIS períodos. "
         "Tabela particionada por data_venda (DATE).")
SCHEMA = ("silver_linx_vendas: data_venda DATE, marca STRING, loja_id STRING, loja_nome STRING, colecao STRING, "
          "fase STRING(ON|SALE|OFF), canal STRING, produto_id STRING, venda_liquida NUMERIC, venda_bruta NUMERIC, "
          "cmv NUMERIC, qtd_pecas INT64, qtd_atendimentos INT64, quebra_valor NUMERIC")

def execute_tool(name, args):
    if name == "get_context": return {"context": CONTEXT}
    if name == "get_business_rules": return {"rules": RULES}
    if name == "describe_table": return {"table": args.get("table", "silver_linx_vendas"), "schema": SCHEMA}
    if name == "consultar_bq": return run_sql(args.get("sql", ""))
    if name == "listar_analises": return {"analises": []}
    return {"error": f"unknown tool {name}"}

DECLS = [
    {"name": "get_context", "description": "Panorama do agente (tabelas/KPIs/dims). Chame primeiro.", "parameters": {"type": "OBJECT", "properties": {}}},
    {"name": "get_business_rules", "description": "Regras de negócio e definições canônicas de métricas. Chame antes de montar query de métrica.", "parameters": {"type": "OBJECT", "properties": {}}},
    {"name": "describe_table", "description": "Schema da tabela.", "parameters": {"type": "OBJECT", "properties": {"table": {"type": "STRING"}}}},
    {"name": "consultar_bq", "description": "Executa SQL (Standard SQL) e retorna linhas.", "parameters": {"type": "OBJECT", "properties": {"sql": {"type": "STRING"}}, "required": ["sql"]}},
    {"name": "listar_analises", "description": "Lista análises publicadas.", "parameters": {"type": "OBJECT", "properties": {}}},
]

def gemini(contents):
    body = {"systemInstruction": {"parts": [{"text": SYS}]}, "contents": contents,
            "tools": [{"functionDeclarations": DECLS}],
            "generationConfig": {"temperature": 1, "maxOutputTokens": 8192, "thinkingConfig": {"thinkingLevel": "high"}}}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)

def run_task(task):
    contents = [{"role": "user", "parts": [{"text": task["prompt"]}]}]
    traj = []
    for _ in range(8):
        data = gemini(contents)
        cand = data["candidates"][0]
        parts = cand.get("content", {}).get("parts", [])
        calls = [p["functionCall"] for p in parts if "functionCall" in p]
        text = "".join(p["text"] for p in parts if "text" in p)
        if not calls:
            return {"task": task["id"], "toolSeq": [t["tool"] for t in traj],
                    "sqlQueries": [t["args"].get("sql") for t in traj if t["tool"] == "consultar_bq"],
                    "finalText": text}
        contents.append(cand["content"])
        resp_parts = []
        for c in calls:
            res = execute_tool(c["name"], c.get("args", {}))
            traj.append({"tool": c["name"], "args": c.get("args", {})})
            resp_parts.append({"functionResponse": {"name": c["name"], "response": res}})
        contents.append({"role": "user", "parts": resp_parts})
    return {"task": task["id"], "toolSeq": [t["tool"] for t in traj], "sqlQueries": [], "finalText": text}

# ---------------- tasks + computed gabaritos ----------------
def q(sql): return con.execute(shim(sql)).fetchall()

TASKS = [
    {"id": "sb01-vendas-loja", "prompt": "Qual a venda líquida da Animale por loja em setembro/2025? Traga as top 5 lojas, com R$."},
    {"id": "sb02-markup-off", "prompt": "Compare o markup das marcas no último semestre. Se houver fase OFF inflando, me avise."},
    {"id": "sb03-sss-farm", "prompt": "Qual o SSS (same-store sales) comparable da Farm nos últimos 3 meses?"},
    {"id": "sb04-quebra-ver25", "prompt": "Quais os 3 produtos com maior quebra na coleção VER25? Em R$."},
    {"id": "sb05-ticket-canal", "prompt": "Qual o ticket médio da Animale por canal no último trimestre?"},
    {"id": "sb06-desconto-marca", "prompt": "Qual a taxa de desconto média por marca no último mês fechado (maio/2026)?"},
]
gab = {}
gab["sb01-vendas-loja"] = q("SELECT loja_nome, ROUND(SUM(venda_liquida),2) v FROM silver_linx_vendas WHERE marca='Animale' AND YEAR(data_venda)=2025 AND MONTH(data_venda)=9 GROUP BY 1 ORDER BY 2 DESC LIMIT 5")
gab["sb02-markup-off"] = q("SELECT marca, ROUND(SUM(venda_bruta)/SUM(cmv),2) markup, ROUND(SUM(CASE WHEN fase='OFF' THEN venda_liquida ELSE 0 END)/SUM(venda_liquida),3) pct_off FROM silver_linx_vendas WHERE data_venda >= DATE '2025-12-01' AND data_venda < DATE '2026-06-01' GROUP BY 1 ORDER BY 2 DESC")
sss3 = []
for m in (3, 4, 5):
    r = q(f"""WITH comp AS (
      SELECT loja_id FROM silver_linx_vendas WHERE marca='Farm' AND YEAR(data_venda)=2026 AND MONTH(data_venda)={m}
      INTERSECT
      SELECT loja_id FROM silver_linx_vendas WHERE marca='Farm' AND YEAR(data_venda)=2025 AND MONTH(data_venda)={m})
    SELECT {m} AS mes,
      ROUND(SUM(CASE WHEN YEAR(data_venda)=2026 THEN venda_liquida ELSE 0 END)
            / NULLIF(SUM(CASE WHEN YEAR(data_venda)=2025 THEN venda_liquida ELSE 0 END),0) - 1, 4) AS sss_pct,
      (SELECT COUNT(*) FROM comp) AS lojas_comparaveis
    FROM silver_linx_vendas
    WHERE marca='Farm' AND MONTH(data_venda)={m} AND loja_id IN (SELECT loja_id FROM comp)""")
    sss3.append(r[0])
gab["sb03-sss-farm"] = sss3
gab["sb04-quebra-ver25"] = q("SELECT produto_id, ROUND(SUM(quebra_valor),2) q FROM silver_linx_vendas WHERE colecao='VER25' GROUP BY 1 ORDER BY 2 DESC LIMIT 3")
gab["sb05-ticket-canal"] = q("SELECT canal, ROUND(SUM(venda_liquida)/SUM(qtd_atendimentos),2) ticket FROM silver_linx_vendas WHERE marca='Animale' AND data_venda>=DATE '2026-03-01' AND data_venda < DATE '2026-06-01' GROUP BY 1 ORDER BY 2 DESC")
gab["sb06-desconto-marca"] = q("SELECT marca, ROUND(1-SUM(venda_liquida)/SUM(venda_bruta),3) tx FROM silver_linx_vendas WHERE YEAR(data_venda)=2026 AND MONTH(data_venda)=5 GROUP BY 1 ORDER BY 2 DESC")

outdir = HERE / OUTNAME; outdir.mkdir(exist_ok=True)
(outdir / "gabarito.json").write_text(json.dumps({k: [list(map(lambda x: float(x) if isinstance(x,(int,float)) else x, r)) for r in v] for k, v in gab.items()}, default=str, ensure_ascii=False, indent=2))
if GAB_ONLY:
    print("gabarito recomputado (períodos fechados) ->", outdir / "gabarito.json")
    sys.exit(0)

results = []
for t in TASKS:
    r = run_task(t)
    r["config"] = CONFIG
    r["prompt"] = t["prompt"]
    results.append(r)
    print(f"{t['id']}: [{' > '.join(r['toolSeq'])}] -> {len(r['finalText'])} chars")
(outdir / "run.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
print("wrote", outdir / "run.json")
