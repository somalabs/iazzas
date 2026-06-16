"""Waldemiro — engine determinístico de moodboard de produtos no Miro.

Roda no code interpreter do IAzzas (code-gateway). O modelo cura a lista de
produtos (via MCPs de dados ou planilha do usuário) e chama `montar_moodboard`;
este módulo é dono da matemática de layout (grade categoria x coleção, fotos,
legendas, indicadores, post-its) e da resolução da URL de foto por marca,
devolvendo as operações prontas que o modelo executa com o MCP do Miro
(`layout_create` para os rótulos/textos + um `image_create` por foto).

Port fiel de `eval/quality/waldemiro/gen.mjs` — coordenadas validadas 1:1 contra
a engine JS (mesma grade, mesmos offsets, mesmo arredondamento estilo JS).

Uso no code interpreter:

    import json, waldemiro
    produtos = [{"prod": "52.10.5554", "cor": "07508", "texto": "Bata Renda Babados",
                 "linha": "Vestidos", "coluna": "Verao 26", "indicadores": "32 un - R$ 22 mil"}]
    ops = waldemiro.montar_moodboard(produtos, titulo="Top Animale FDS",
                                     legenda="un - receita", marca="Animale")
    print(json.dumps(ops))

Depois: layout_create(dsl=ops["layout_create_dsl"]) e um image_create por item de
ops["image_create_calls"] (image_url, x, y, width).

Foto avulsa de um produto:

    print(waldemiro.foto_produto(marca="Animale", produto="52.10.5554", cor="07508"))
"""

from __future__ import annotations

import json
import math
import sys
import unicodedata
from typing import Any

# marca -> brand_id da API de fotos images.somalabs.com.br (fonte: dono do produto).
# Brand errado NAO da 404: devolve uma imagem de fallback generica. Por isso a
# resolucao e sempre por marca (nunca o modelo escolhe o id na mao).
BRAND_IDS: dict[str, int] = {
    "animale": 1,
    "farm": 2,
    "fabula": 5,
    "off": 6,
    "foxton": 7,
    "cris barros": 9,
    "maria filo": 15,
    "nv": 16,
    "hering": 32,
}
BRAND_NAMES: dict[int, str] = {
    1: "Animale", 2: "Farm", 5: "Fabula", 6: "Off", 7: "Foxton",
    9: "Cris Barros", 15: "Maria Filo", 16: "NV", 32: "Hering",
}
# Fallback quando nem marca nem brand sao informados (NAO entra na resolucao
# por marca — senao mascararia a marca pedida com FARM).
DEFAULT_BRAND = 2

DEFAULTS: dict[str, Any] = {
    "alturaImg": 400,
    "distHoriz": 350,
    "distVert": 550,
    "quebraLinha": 220,
    "quebraColuna": 320,
    "distFotoSubtitulo": 60,
    "maxProdutosPorLinha": 10,
    "imgWidth": 280,
    "labelColors": [
        "light_green", "cyan", "light_pink", "pink", "violet",
        "green", "red", "light_blue", "dark_blue", "orange",
    ],
}


def _jround(x: float) -> int:
    """Arredonda como o Math.round do JS (meio sempre pra +infinito)."""
    return math.floor(x + 0.5)


def _norm(s: str) -> str:
    """Normaliza nome de marca: minusculo, sem acento, espacos colapsados."""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return " ".join(s.lower().split())


def resolve_brand(marca: str | None = None, brand: int | None = None) -> int | None:
    """Resolve o brand_id a partir da marca (preferido) ou de um id explicito."""
    if brand is not None:
        return int(brand)
    if marca:
        return BRAND_IDS.get(_norm(marca))
    return None


def photo_url(produto: str, cor: str | None, brand: int) -> str:
    """Monta a URL da API de fotos. Referencia = PRODUTO verbatim (mantem pontos)."""
    ref = f"{produto}_{cor}" if cor else f"{produto}"
    return f"https://images.somalabs.com.br/brands/{brand}/products/reference_id/{ref}/image"


def foto_produto(
    produto: str,
    cor: str | None = None,
    marca: str | None = None,
    brand: int | None = None,
) -> dict[str, Any]:
    """Resolve a foto de um produto. Retorna url + markdown pronto pra exibir no chat.

    Passe a marca (ex.: "Animale") — o brand_id e resolvido pelo mapa. `brand`
    explicito tem prioridade. Se a marca nao for reconhecida, `ok` vem False.
    """
    bid = resolve_brand(marca, brand)
    if bid is None:
        marcas = ", ".join(sorted(BRAND_NAMES.values()))
        return {
            "ok": False,
            "erro": f"marca '{marca}' nao reconhecida. Marcas validas: {marcas}",
            "url": None,
        }
    url = photo_url(produto, cor, bid)
    ref = f"{produto}_{cor}" if cor else produto
    return {
        "ok": True,
        "marca": BRAND_NAMES.get(bid, str(bid)),
        "brand": bid,
        "produto": produto,
        "cor": cor,
        "url": url,
        "markdown": f"![{ref}]({url})",
    }


def _pick_color(colors: list[str], seed: int) -> str:
    return colors[seed % len(colors)]


def build_layout(products: list[dict[str, Any]], opts: dict[str, Any] | None = None) -> dict[str, Any]:
    """Calcula a grade (categoria x colecao) e a posicao de cada produto.

    products: lista de dicts com prod (obrigatorio), cor, texto, linha, coluna,
    postit, indicadores e, opcionalmente, marca/brand por produto.
    """
    o = opts or {}
    c = {**DEFAULTS, **o}
    board_brand = resolve_brand(o.get("marca"), o.get("brand"))
    board_marca_dada = bool(o.get("marca")) or o.get("brand") is not None
    # So cai no FARM default quando NENHUMA marca/brand foi dada. Marca dada-porem-
    # desconhecida deixa board_brand=None (URL visivelmente quebrada, nunca FARM silencioso).
    if board_brand is None and not board_marca_dada:
        board_brand = DEFAULT_BRAND

    ordem_linhas: list[str] = []
    ordem_colunas: list[str] = []
    cells: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for p in products:
        linha = str(p.get("linha", "") or "").strip()
        coluna = str(p.get("coluna", "") or "").strip()
        if linha not in ordem_linhas:
            ordem_linhas.append(linha)
        if coluna not in ordem_colunas:
            ordem_colunas.append(coluna)
        cells.setdefault((linha, coluna), []).append({**p, "linha": linha, "coluna": coluna})

    max_prods = max((len(v) for v in cells.values()), default=0)
    largura = min(max(math.ceil(math.sqrt(max_prods)), 2), c["maxProdutosPorLinha"])

    alt_linhas: dict[str, int] = {}
    for linha in ordem_linhas:
        max_in_linha = 0
        for coluna in ordem_colunas:
            cell = cells.get((linha, coluna))
            if cell and len(cell) > max_in_linha:
                max_in_linha = len(cell)
        alt_linhas[linha] = math.ceil((max_in_linha or 1) / largura)

    linhas_dict: dict[str, dict[str, Any]] = {}
    linhas_acumuladas = 0
    for n, linha in enumerate(ordem_linhas):
        inicio = linhas_acumuladas * c["distVert"] + n * c["quebraLinha"]
        linhas_dict[linha] = {
            "sticker": linha,
            "inicio": inicio,
            "vertSticker": inicio + _jround((1 + alt_linhas[linha]) * c["distVert"] / 2),
            "horizSticker": -250,
        }
        linhas_acumuladas += alt_linhas[linha]

    colunas_dict: dict[str, dict[str, Any]] = {}
    for n, coluna in enumerate(ordem_colunas):
        inicio = n * (largura * c["distHoriz"] + c["quebraColuna"])
        colunas_dict[coluna] = {
            "sticker": coluna,
            "inicio": inicio,
            "vertSticker": -100,
            "horizSticker": inicio + _jround(largura * c["distHoriz"] / 2) + 200,
        }

    placed: list[dict[str, Any]] = []
    for (lin, col), cell in cells.items():
        linha_atual = 1
        coluna_atual = 0
        for entry in cell:
            if coluna_atual == largura:
                coluna_atual = 1
                linha_atual += 1
            else:
                coluna_atual += 1
            horiz = coluna_atual * c["distHoriz"] + colunas_dict[col]["inicio"]
            vert_img = linha_atual * c["distVert"] + linhas_dict[lin]["inicio"]
            cor = entry.get("cor") or ""
            ref_cor = f"{entry['prod']}_{cor}" if cor else str(entry["prod"])
            base = linha_atual * c["distVert"] + c["alturaImg"] / 2 + linhas_dict[lin]["inicio"]
            ebrand = resolve_brand(entry.get("marca"), entry.get("brand"))
            item_marca_dada = bool(entry.get("marca")) or entry.get("brand") is not None
            if ebrand is None and not item_marca_dada:
                ebrand = board_brand
            placed.append({
                "prod": entry["prod"],
                "cor": cor,
                "refCor": ref_cor,
                "sub": str(entry.get("texto", "") or "").strip(),
                "indicadores": str(entry.get("indicadores", "") or "").strip(),
                "postit": str(entry.get("postit", "") or "").strip(),
                "imgUrl": photo_url(entry["prod"], cor or None, ebrand),
                "brand": ebrand,
                "x": horiz,
                "yImg": vert_img,
                "imgWidth": c["imgWidth"],
                "yLeg": base + 7,
                "ySub": base + c["distFotoSubtitulo"],
                "yInd": base + c["distFotoSubtitulo"] + 42,
                "postX": horiz + (c["alturaImg"] * 0.6) / 2,
                "postY": vert_img - c["alturaImg"] / 2,
            })

    return {
        "largura": largura,
        "ordemLinhas": ordem_linhas,
        "ordemColunas": ordem_colunas,
        "altLinhas": alt_linhas,
        "linhasDict": linhas_dict,
        "colunasDict": colunas_dict,
        "products": placed,
        "config": c,
    }


def _esc(s: Any) -> str:
    # Colapsa quebras de linha/tabs (a DSL e por-linha: um \n injetaria itens) e
    # troca aspas duplas por simples (a aspas dupla fecharia o content da DSL).
    return " ".join(str(s).replace('"', "'").split())


def to_miro_ops(layout: dict[str, Any]) -> dict[str, Any]:
    """Converte o layout em ops do Miro: uma DSL de layout_create + lista de imagens."""
    linhas_dict = layout["linhasDict"]
    colunas_dict = layout["colunasDict"]
    products = layout["products"]
    c = layout["config"]
    lines: list[str] = []
    if not products:
        return {"layoutDsl": "", "images": []}

    box = {"minX": math.inf, "minY": math.inf, "maxX": -math.inf, "maxY": -math.inf}

    def grow(x: float, y: float, w: float, h: float) -> None:
        box["minX"] = min(box["minX"], x - w / 2)
        box["maxX"] = max(box["maxX"], x + w / 2)
        box["minY"] = min(box["minY"], y - h / 2)
        box["maxY"] = max(box["maxY"], y + h / 2)

    for p in products:
        grow(p["x"], p["yImg"], c["imgWidth"], c["alturaImg"])
        grow(p["x"], p["yInd"], 280, 60)
    for r in linhas_dict.values():
        grow(r["horizSticker"], r["vertSticker"], 400, 400)
    for col in colunas_dict.values():
        grow(col["horizSticker"], col["vertSticker"], 400, 400)
    center_x = _jround((box["minX"] + box["maxX"]) / 2)
    header_y = _jround(box["minY"]) - 240

    if c.get("frame"):
        pad = 160
        fx = _jround((box["minX"] + box["maxX"]) / 2)
        fy = _jround((header_y - 80 + box["maxY"]) / 2)
        fw = _jround(box["maxX"] - box["minX"] + pad * 2)
        fh = _jround(box["maxY"] - (header_y - 80) + pad)
        lines.append(f'bf FRAME x={fx} y={fy} w={fw} h={fh} fill=#fbfbfa "{_esc(c.get("titulo") or "Moodboard")}"')
        if c.get("legenda"):
            lines.append(f'leg TEXT x={center_x} y={header_y} w=1400 size=22 align=center "{_esc(c["legenda"])}"')
    else:
        if c.get("titulo"):
            lines.append(f'ttl TEXT x={center_x} y={header_y - 130} w=1200 size=44 align=center "{_esc(c["titulo"])}"')
        if c.get("legenda"):
            lines.append(f'leg TEXT x={center_x} y={header_y} w=1200 size=20 align=center "{_esc(c["legenda"])}"')

    for k, r in enumerate(linhas_dict.values()):
        lines.append(
            f'rl{k} STICKY x={_jround(r["horizSticker"])} y={_jround(r["vertSticker"])} '
            f'w=400 color={_pick_color(c["labelColors"], k)} "{_esc(r["sticker"])}"'
        )
    for k, col in enumerate(colunas_dict.values()):
        lines.append(
            f'cl{k} STICKY x={_jround(col["horizSticker"])} y={_jround(col["vertSticker"])} '
            f'w=400 color={_pick_color(c["labelColors"], k + 5)} "{_esc(col["sticker"])}"'
        )

    images: list[dict[str, Any]] = []
    show_ref = bool(c.get("mostrarRef"))
    for i, p in enumerate(products):
        images.append({"ref": p["refCor"], "url": p["imgUrl"], "x": _jround(p["x"]), "y": _jround(p["yImg"]), "width": p["imgWidth"]})
        if p["sub"]:
            lines.append(f'sb{i} TEXT x={_jround(p["x"])} y={_jround(p["ySub"])} w=280 size=18 align=center "{_esc(p["sub"])}"')
        if p["indicadores"]:
            lines.append(f'in{i} TEXT x={_jround(p["x"])} y={_jround(p["yInd"])} w=280 size=14 color=#6b7280 align=center "{_esc(p["indicadores"])}"')
        if show_ref:
            lines.append(f'lg{i} TEXT x={_jround(p["x"])} y={_jround(p["yInd"]) + 32} w=280 size=11 color=#9ca3af align=center "{_esc(p["refCor"])}"')
        if p["postit"]:
            lines.append(f'pi{i} STICKY x={_jround(p["postX"])} y={_jround(p["postY"])} w=120 color=light_yellow "{_esc(p["postit"])}"')

    return {"layoutDsl": "\n".join(lines), "images": images}


def validate(layout: dict[str, Any]) -> dict[str, Any]:
    """Checagem offline: contagens + nenhuma foto sobreposta."""
    issues: list[str] = []
    products = layout["products"]
    c = layout["config"]
    if not products:
        issues.append("sem produtos")
    for a in range(len(products)):
        for b in range(a + 1, len(products)):
            dx = abs(products[a]["x"] - products[b]["x"])
            dy = abs(products[a]["yImg"] - products[b]["yImg"])
            if dx < c["imgWidth"] and dy < c["alturaImg"]:
                issues.append(
                    f'fotos sobrepostas: {products[a]["refCor"]} x {products[b]["refCor"]} (dx={dx}, dy={dy})'
                )
    return {"ok": len(issues) == 0, "issues": issues, "nProdutos": len(products), "largura": layout["largura"]}


def _marcas_desconhecidas(produtos: list[dict[str, Any]], marca: str | None, brand: int | None) -> set[str]:
    """Marcas informadas (board ou por produto) que NAO resolvem para um brand_id."""
    desconhecidas: set[str] = set()
    if (marca or brand is not None) and resolve_brand(marca, brand) is None:
        desconhecidas.add(str(marca))
    for p in produtos:
        im, ib = p.get("marca"), p.get("brand")
        if (im or ib is not None) and resolve_brand(im, ib) is None:
            desconhecidas.add(str(im))
    return desconhecidas


def _erro_moodboard(erro: str, n: int, marca: str | None, issues: list[str]) -> dict[str, Any]:
    return {
        "erro": erro,
        "summary": {"produtos": n, "marca": marca, "marca_desconhecida": "nao reconhecida" in erro},
        "validacao": {"ok": False, "issues": [erro] + issues, "nProdutos": n, "largura": 0},
        "layout_create_dsl": "",
        "image_create_calls": [],
        "instrucoes": "NAO monte o board: explique o problema acima ao usuario em linguagem clara.",
    }


def montar_moodboard(
    produtos: list[dict[str, Any]],
    titulo: str | None = None,
    legenda: str | None = None,
    marca: str | None = None,
    brand: int | None = None,
    frame: bool = False,
) -> dict[str, Any]:
    """Calcula o moodboard e devolve as operacoes prontas do Miro.

    Depois de chamar, CHEQUE validacao.ok e o campo 'erro': se nao estiver ok ou
    houver erro, NAO monte — explique ao usuario. Caso ok: execute no board
    (1) layout_create com layout_create_dsl; (2) um image_create por item de
    image_create_calls (image_url, x, y, width).

    `marca` (ex.: "Animale") resolve o brand_id das fotos pelo mapa; produtos
    podem trazer 'marca'/'brand' proprios para boards multimarca. Marca informada
    mas fora do mapa retorna erro (nunca cai no FARM silenciosamente).
    """
    produtos = produtos or []
    validos = [p for p in produtos if str(p.get("prod") or "").strip()]
    issues: list[str] = []
    dropados = len(produtos) - len(validos)
    if dropados:
        issues.append(f"{dropados} produto(s) ignorado(s) por falta de 'prod'")

    desconhecidas = _marcas_desconhecidas(validos, marca, brand)
    if desconhecidas:
        validas = ", ".join(sorted(BRAND_NAMES.values()))
        nomes = ", ".join(sorted(m for m in desconhecidas if m and m != "None"))
        return _erro_moodboard(
            f"marca(s) nao reconhecida(s): {nomes or '(vazia)'}. Marcas com catalogo de fotos: {validas}.",
            len(validos), marca, issues,
        )

    if not validos:
        return _erro_moodboard("sem produtos validos para montar o moodboard", 0, marca, issues)

    opts: dict[str, Any] = {}
    if titulo is not None:
        opts["titulo"] = titulo
    if legenda is not None:
        opts["legenda"] = legenda
    if marca is not None:
        opts["marca"] = marca
    if brand is not None:
        opts["brand"] = brand
    if frame:
        opts["frame"] = True

    layout = build_layout(validos, opts)
    v = validate(layout)
    v["issues"] = issues + v["issues"]
    ops = to_miro_ops(layout)

    return {
        "summary": {
            "produtos": len(validos),
            "grade_colunas": layout["largura"],
            "linhas": layout["ordemLinhas"],
            "colunas": layout["ordemColunas"],
            "marca": marca,
            "marca_desconhecida": False,
        },
        "validacao": v,
        "layout_create_dsl": ops["layoutDsl"],
        "image_create_calls": [
            {"title": im["ref"], "image_url": im["url"], "x": im["x"], "y": im["y"], "width": im["width"]}
            for im in ops["images"]
        ],
        "instrucoes": (
            "Execute no board do Miro: (1) layout_create(dsl=layout_create_dsl); "
            "(2) image_create para cada item de image_create_calls (image_url, x, y, width)."
        ),
    }


def _main() -> None:
    """CLI: le JSON do stdin {produtos, titulo?, legenda?, marca?, brand?} e imprime as ops."""
    raw = sys.stdin.read()
    req = json.loads(raw) if raw.strip() else {}
    produtos = req.get("produtos", [])
    out = montar_moodboard(
        produtos,
        titulo=req.get("titulo"),
        legenda=req.get("legenda"),
        marca=req.get("marca"),
        brand=req.get("brand"),
        frame=bool(req.get("frame", False)),
    )
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    _main()
