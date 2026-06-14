export const meta = {
  name: 'iazzas-prod-ab',
  description: 'Painel cego A/B prod-current vs prod-plus em 4 dimensões (exec, geral, Miro, BI vs gabarito)',
  phases: [
    { title: 'Exec' }, { title: 'Geral' }, { title: 'Miro' }, { title: 'BI' },
  ],
};

const DIR = '/Users/arturlemos/Documents/Projetos/iazzas/eval/quality';

const DIMS = [
  { key: 'Exec', dir: 'judge-ab-exec', judges: 3, rubric: 'qualidade de ESCRITA EXECUTIVA: conclusão/decisão na 1ª linha (BLUF), respeita limite de palavras, sem clichê corporativo, próximo passo explícito, tom adequado ao público.',
    tasks: ['ex01-resumo-diretoria','ex02-bullets-board','ex03-memo-interno','ex04-kpi-narrativa','ex05-comunicado-cliente','ex06-email-decisao','ex07-onepager-estrutura','ex08-reescrever-crispar'] },
  { key: 'Geral', dir: 'judge-ab-geral', judges: 3, rubric: 'qualidade de ANÁLISE/RESPOSTA: correção, profundidade (conecta causa/efeito, quantifica), estrutura escaneável, segue exatamente o que foi pedido, rigor com números.',
    tasks: ['t01-diagnose-ticket','t02-margem-contrib','t03-kpis-tabela','t04-premissa-falha','t05-plano-30-60-90','t06-sql-sss','t07-comparar-precos','t08-resumo-restrito','t09-fermi','t10-decisao-tradeoff'] },
  { key: 'Miro', dir: 'judge-ab-miro', judges: 3, rubric: 'qualidade do DIAGRAMA/BOARD (DSL do Miro): ferramenta certa (diagram_create/layout_create, nunca texto solto), estrutura completa e bem ligada, agrupamento, rótulos de aresta em decisões, higiene de DSL (labels entre aspas, sem underscore, cor válida).',
    tasks: ['mt01-fluxo-processo','mt02-fluxo-decisao','mt03-org-chart','mt04-mapa-mental','mt05-customer-journey','mt06-brainstorm-stickies','mt07-afinidade','mt08-kanban','mt09-matriz-2x2','mt10-arquitetura-dados'] },
  { key: 'BI', dir: 'judge-ab-bi', judges: 2, rubric: 'correção de BI: os NÚMEROS do candidato batem com o gabarito (valores_corretos)? a regra de negócio foi respeitada (intervalo de datas exato, base do %, série temporal vs agregado, SSS comparable, ressalva de fase OFF)? Penalize número que não bate ou regra ignorada.',
    tasks: ['sb01-vendas-loja','sb02-markup-off','sb03-sss-farm','sb04-quebra-ver25','sb05-ticket-canal','sb06-desconto-marca'] },
];

const CAND = {
  type: 'object', additionalProperties: false,
  properties: { nota: { type: 'number', description: '0-10' }, comentario: { type: 'string' } },
  required: ['nota'],
};
const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { task: { type: 'string' }, A: CAND, B: CAND, vencedor: { type: 'string', enum: ['A', 'B', 'empate'] } },
  required: ['task', 'A', 'B', 'vencedor'],
};

const all = [];
for (const dim of DIMS) {
  phase(dim.key);
  const rows = await parallel(
    dim.tasks.map((task) => () =>
      parallel(
        Array.from({ length: dim.judges }, (_, j) => () =>
          agent(
            `Você é juiz cego de qualidade (juiz ${j + 1}). Leia ${DIR}/${dim.dir}/${task}.json: tem "prompt" (o pedido), ${dim.key === 'BI' ? '"gabarito" (valores corretos)' : '"checks" (o que um ótimo resultado cobre)'} e "candidates" (A e B). Avalie CADA candidato de 0 a 10 segundo: ${dim.rubric} Não presuma qual é "novo"/"velho". Dê a nota de A, a de B e o vencedor (A, B ou empate). task="${task}".`,
            { label: `${dim.key}:${task}:j${j + 1}`, phase: dim.key, schema: SCHEMA },
          ),
        ),
      ).then((judges) => ({ dim: dim.key, task, judges: judges.filter(Boolean) })),
    ),
  );
  all.push(...rows.filter(Boolean));
}
return all;
