// Fake Azzas "vendas_linx" MCP tool surface + canned executor.
// Mirrors the real agent's tools (get_context, get_business_rules, describe_table,
// consultar_bq, listar_analises) so we can measure tool-orchestration quality of the
// harness (model + prompt) without real BigQuery or SSO. Data is canned/deterministic;
// what we judge is the TRAJECTORY (did it discover context/rules/schema before querying,
// did it respect business rules, did it use returned numbers instead of inventing).

export const declarations = [
  {
    name: 'get_context',
    description: 'Retorna o panorama do agente de Vendas (Linx): tabelas disponíveis, principais KPIs e dimensões. Chame isto primeiro para saber o que existe.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'get_business_rules',
    description: 'Retorna as regras de negócio e definições canônicas de métricas (como cada KPI é calculado, ressalvas e armadilhas). Chame antes de montar queries para não errar a métrica.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'describe_table',
    description: 'Retorna o schema (colunas e tipos) de uma tabela. Use antes de escrever SQL para usar nomes de coluna corretos.',
    parameters: {
      type: 'OBJECT',
      properties: { table: { type: 'STRING', description: 'Nome da tabela, ex.: silver_linx_vendas' } },
      required: ['table'],
    },
  },
  {
    name: 'consultar_bq',
    description: 'Executa uma query Standard SQL no BigQuery e retorna linhas agregadas.',
    parameters: {
      type: 'OBJECT',
      properties: { sql: { type: 'STRING', description: 'A query Standard SQL' } },
      required: ['sql'],
    },
  },
  {
    name: 'listar_analises',
    description: 'Lista análises/dashboards já publicados.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
];

const CONTEXT = `Agente Vendas (Linx) — silver Linx do BigQuery, 9 marcas da BU Varejo.
Tabela principal: silver_linx_vendas (uma linha por item vendido, já tratada).
KPIs: venda_liquida, venda_bruta, cmv, markup, margem_bruta, taxa_desconto, ticket_medio, pa (peças por atendimento), quebra.
Dimensões: marca, loja, produto/cor/tamanho, coleção, fase (ON/SALE/OFF), canal (Físico/Online/Omni/Vitrine), data.
IMPORTANTE: antes de consultar, chame get_business_rules (definições e ressalvas) e describe_table (colunas exatas).`;

const BUSINESS_RULES = `Definições canônicas:
- venda_liquida = venda_bruta - devoluções - descontos. Use SEMPRE venda_liquida para receita.
- markup = preço_venda / custo. margem_bruta = (venda_liquida - cmv) / venda_liquida.
- ticket_medio = venda_liquida / nº atendimentos. pa = nº peças / nº atendimentos.
RESSALVAS (armadilhas):
- ⚠️ FASE OFF infla o markup/margem artificialmente (produto liquidado tem custo já amortizado). Ao comparar markup/margem entre marcas ou períodos, SEMPRE segmente ou alerte se houver volume relevante em fase OFF — senão a comparação engana.
- ⚠️ SSS (same-store sales) comparable: só inclua lojas que existiam e operaram nos DOIS períodos comparados. Loja nova ou fechada distorce o SSS.
- Datas: a tabela é particionada por data_venda (DATE). Filtre por partição.`;

const SCHEMA = `silver_linx_vendas:
- data_venda: DATE
- marca: STRING
- loja_id: STRING
- loja_nome: STRING
- colecao: STRING            (ex.: VER25, INV25)
- fase: STRING               (ON | SALE | OFF)
- canal: STRING              (Físico | Online | Omni | Vitrine)
- produto_id: STRING
- venda_liquida: NUMERIC
- venda_bruta: NUMERIC
- cmv: NUMERIC
- qtd_pecas: INT64
- qtd_atendimentos: INT64
- quebra_valor: NUMERIC`;

// Deterministic canned rows. Shape varies by query intent so the model has real
// numbers to report (and we can detect if it invents different ones).
function cannedRows(sql) {
  const s = (sql || '').toLowerCase();
  if (s.includes('markup')) {
    return {
      note: 'Resultado agregado (dado simulado).',
      rows: [
        { marca: 'Animale', markup: 2.61, pct_volume_off: 0.34 },
        { marca: 'Farm', markup: 2.48, pct_volume_off: 0.07 },
        { marca: 'Arezzo', markup: 2.39, pct_volume_off: 0.05 },
      ],
    };
  }
  if (s.includes('sss') || (s.includes('same') && s.includes('store'))) {
    return {
      note: 'SSS comparable (dado simulado).',
      rows: [
        { mes: '2026-03', sss_pct: 0.041, lojas_comparaveis: 118 },
        { mes: '2026-04', sss_pct: -0.012, lojas_comparaveis: 118 },
        { mes: '2026-05', sss_pct: 0.067, lojas_comparaveis: 118 },
      ],
    };
  }
  if (s.includes('quebra')) {
    return {
      note: 'Top quebra (dado simulado).',
      rows: [
        { produto_id: 'P-10293', quebra_valor: 84210.5 },
        { produto_id: 'P-77451', quebra_valor: 61340.0 },
        { produto_id: 'P-30188', quebra_valor: 52980.75 },
      ],
    };
  }
  // default: per-store sales
  return {
    note: 'Venda líquida por loja (dado simulado).',
    rows: [
      { loja_nome: 'Animale Iguatemi SP', venda_liquida: 412300.5 },
      { loja_nome: 'Animale JK Iguatemi', venda_liquida: 388900.0 },
      { loja_nome: 'Animale Shopping Leblon', venda_liquida: 351200.25 },
      { loja_nome: 'Animale Pátio Batel', venda_liquida: 298450.0 },
      { loja_nome: 'Animale Barra Shopping', venda_liquida: 271600.8 },
    ],
  };
}

export function execute(name, args) {
  switch (name) {
    case 'get_context':
      return { context: CONTEXT };
    case 'get_business_rules':
      return { rules: BUSINESS_RULES };
    case 'describe_table':
      return { table: args?.table || 'silver_linx_vendas', schema: SCHEMA };
    case 'consultar_bq':
      return cannedRows(args?.sql);
    case 'listar_analises':
      return { analises: [] };
    default:
      return { error: `tool desconhecida: ${name}` };
  }
}
