// Fake Miro MCP tool surface + canned executor for the diagram/board lever lab.
// Mirrors the real mcp.miro.com creation tools (diagram_get_dsl, layout_get_dsl,
// diagram_create, layout_create, connector_create) so we can measure whether the
// harness (model + prompt) builds a REAL diagram vs dumps loose text — without a
// live board. get_dsl returns the real grammars (captured 2026-06-14) so the model
// behaves as in production; create tools return plausible success and the runner
// captures the emitted DSL for the structural linter.

const FLOWCHART_SPEC = `Flowchart DSL:
- 1st line: graphdir <TB|LR|BT|RL>. 2nd: palette #hex1 #hex2 #hex3 (default #fff6b6 #c6dcff #adf0c7).
- Node: n<#> <label> <object> <color_index>  | object ∈ flowchart-data | flowchart-decision | flowchart-process | flowchart-terminator
- Connector: c <source_id> <text> <target_id>  (empty text = "-"; for decisions write YES/NO)
- Cluster (group nodes): cluster c<#> "<label>" n1 n2 ...  (at end of DSL)
One element per line. Node ids n1,n2,...`;

const LAYOUT_SPEC = `Layout DSL: one item per line "id TYPE [parent=REF] key=value... \\"content\\"".
- TYPE ∈ FRAME | STICKY | SHAPE | TEXT | CARD. parent= references a FRAME alias; without parent = board-absolute (center 0,0).
- FRAME id FRAME x y w h [fill] "title"
- STICKY id STICKY [parent=] x y (w|h) color=COLOR "content"  colors: gray light_yellow yellow orange light_green green dark_green cyan light_pink pink violet red light_blue blue dark_blue black
- SHAPE id SHAPE [parent=] x y w h type=TYPE [fill] "content"  types incl: rectangle round_rectangle circle rhombus (decision) parallelogram
- TEXT id TEXT [parent=] x y w "content"   CARD id CARD [parent=] x y w h "title"
With parent: x,y = offset from frame top-left, mark child CENTER, must satisfy 0<=x<=frame_w, 0<=y<=frame_h.`;

export const declarations = [
  {
    name: 'diagram_get_dsl',
    description:
      'Retorna a especificação do DSL para um tipo de diagrama (flowchart, uml_class, uml_sequence, entity_relationship). OBRIGATÓRIO chamar antes de diagram_create para conhecer o formato.',
    parameters: {
      type: 'OBJECT',
      properties: {
        diagram_type: { type: 'STRING', description: 'flowchart | uml_class | uml_sequence | entity_relationship' },
      },
      required: ['diagram_type'],
    },
  },
  {
    name: 'diagram_create',
    description:
      'Cria um diagrama (fluxograma, org chart, ER, sequência) no board do Miro a partir de DSL. Pré-requisito: diagram_get_dsl. Use para qualquer pedido de fluxograma/diagrama de nós ligados.',
    parameters: {
      type: 'OBJECT',
      properties: {
        diagram_type: { type: 'STRING', description: 'flowchart | uml_class | uml_sequence | entity_relationship' },
        title: { type: 'STRING', description: 'Título do diagrama' },
        diagram_dsl: { type: 'STRING', description: 'O texto DSL seguindo a especificação de diagram_get_dsl' },
      },
      required: ['diagram_type', 'title', 'diagram_dsl'],
    },
  },
  {
    name: 'layout_get_dsl',
    description:
      'Retorna a especificação do DSL de layout (FRAME/STICKY/SHAPE/TEXT/CARD posicionados). OBRIGATÓRIO chamar antes de layout_create.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'layout_create',
    description:
      'Cria múltiplos itens posicionados no board (frames, sticky notes, shapes, texto, cards) a partir de DSL. Pré-requisito: layout_get_dsl. Use para boards de sticky notes, kanban, journey, matriz, afinidade.',
    parameters: {
      type: 'OBJECT',
      properties: {
        dsl: { type: 'STRING', description: 'O texto DSL de layout seguindo layout_get_dsl' },
      },
      required: ['dsl'],
    },
  },
  {
    name: 'connector_create',
    description:
      'Cria um conector (linha/seta) entre dois itens já existentes no board. Use só para ligar itens criados via layout_create.',
    parameters: {
      type: 'OBJECT',
      properties: {
        start_item: { type: 'STRING', description: 'id do item de origem' },
        end_item: { type: 'STRING', description: 'id do item de destino' },
        caption: { type: 'STRING', description: 'rótulo opcional da relação' },
      },
      required: ['start_item', 'end_item'],
    },
  },
];

const BOARD_URL = 'https://miro.com/app/board/uXjEVALSANDBOX=/';
let counter = 0;
const fakeIds = (n) => Array.from({ length: n }, () => `${3458764500000000000 + ++counter}`);

export function execute(name, args) {
  switch (name) {
    case 'diagram_get_dsl':
      return { diagram_type: args?.diagram_type || 'flowchart', spec: FLOWCHART_SPEC };
    case 'layout_get_dsl':
      return { spec: LAYOUT_SPEC };
    case 'diagram_create':
      return { ok: true, board_url: BOARD_URL, title: args?.title, created_items: fakeIds(8) };
    case 'layout_create':
      return { ok: true, board_url: BOARD_URL, created_items: fakeIds(10), failed: [] };
    case 'connector_create':
      return { ok: true, connector_id: fakeIds(1)[0] };
    default:
      return { error: `tool desconhecida: ${name}` };
  }
}
