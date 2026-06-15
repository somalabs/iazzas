export const meta = {
  name: 'iazzas-html-ab',
  description: 'Painel cego A/B prod-current vs prod-html: qualidade de relatórios/apresentações em HTML (juízes VEEM o PNG renderizado)',
  phases: [{ title: 'Julgar' }],
};

const DIR = '/Users/arturlemos/Documents/Projetos/iazzas/eval/quality';
const TASKS = [
  'hr01-relatorio-vendas-animale', 'hr02-relatorio-tendencias', 'hr03-relatorio-devolucoes', 'hr04-onepager-expansao',
  'hp01-deck-azzas', 'hp02-deck-resultados', 'hp03-deck-sustentabilidade', 'hp04-deck-colecao',
];
const JUDGES = 3;

const CAND = {
  type: 'object', additionalProperties: false,
  properties: {
    entregou: { type: 'boolean', description: 'entregou um HTML renderizável (não recusou)?' },
    nota: { type: 'number', description: '0-10 global' },
    design: { type: 'number', description: '0-10 design visual (layout, hierarquia, polish)' },
    conteudo: { type: 'number', description: '0-10 conteúdo/estrutura (BLUF, seções/slides, cobre os checks, fidelidade aos números)' },
    comentario: { type: 'string' },
  },
  required: ['entregou', 'nota', 'design', 'conteudo'],
};
const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { task: { type: 'string' }, A: CAND, B: CAND, vencedor: { type: 'string', enum: ['A', 'B', 'empate'] } },
  required: ['task', 'A', 'B', 'vencedor'],
};

phase('Julgar');
const results = await parallel(
  TASKS.map((task) => () =>
    parallel(
      Array.from({ length: JUDGES }, (_, j) => () =>
        agent(
          `Você é juiz cego de qualidade de ENTREGÁVEIS HTML (relatório ou apresentação) — juiz ${j + 1}. Leia ${DIR}/judge-html/${task}.json: tem "prompt" (o pedido), "type" (report/presentation), "checks" (o que um ótimo entregável cobre), e dois candidatos A e B. Cada candidato tem: hasHtml (entregou?), refused, "png" (imagem do artefato renderizado) e "html" (caminho do código-fonte HTML).\n\nPASSO 1 — VER: para cada candidato com png != null, use Read no png para ver o visual renderizado. ATENÇÃO: num deck navegado por JS, o png mostra só o 1º slide — então use TAMBÉM Read no arquivo "html" para avaliar TODOS os slides/seções, a estrutura e o conteúdo completo. Se hasHtml=false (png e html null), o candidato NÃO entregou (recusou) — entregou=false, design/conteúdo/nota baixos (0-2).\n\nPASSO 2 — AVALIAR cada candidato (A e B) de 0 a 10: entregabilidade (entregou HTML renderizável de verdade?), design visual (layout, hierarquia, paleta, polish — padrão "nível Claude", lido do png + css), conteúdo/estrutura (BLUF/capa, TODAS as seções/slides com uma ideia cada, cobre os checks, usa os NÚMEROS exatos do pedido sem inventar). Para apresentação, exija deck navegável (setas/scroll) e sem parede de texto; para relatório, resumo executivo + seções. Dê nota global de A, de B, design, conteúdo e o vencedor (A, B ou empate). Seja rigoroso e cego. task="${task}".`,
          { label: `html:${task}:j${j + 1}`, phase: 'Julgar', schema: SCHEMA },
        ),
      ),
    ).then((judges) => ({ task, judges: judges.filter(Boolean) })),
  ),
);
return results.filter(Boolean);
