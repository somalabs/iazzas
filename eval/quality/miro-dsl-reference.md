# Miro DSL — gramáticas reais (lidas via MCP oficial mcp.miro.com, 2026-06-14)

Fonte da verdade pro harness de Miro (fixtures, linter, prompt). Capturado de
`diagram_get_dsl(flowchart)` e `layout_get_dsl`. As tools de criação são:
`diagram_create` (node-link: flowchart, uml_class, uml_sequence, entity_relationship),
`layout_create` (itens posicionados em DSL), `connector_create` (aresta avulsa entre 2 itens).

## Flowchart DSL (diagram_create, diagram_type="flowchart")

Regras comuns a todos os diagramas:
- 1ª linha: `graphdir <TB|LR|BT|RL>` (TB=cima-baixo, LR=esq-dir, etc.).
- Uma linha por nó OU por conector. Não quebrar elemento em várias linhas.
- IDs de nó: `n1, n2, ...`. IDs de conector: `e1, e2, ...` (no exemplo aparecem com prefixo `c`).

Nó: `n<#> <label> <object> <color_index>`
- object ∈ `flowchart-data | flowchart-decision | flowchart-process | flowchart-terminator`.
- color_index aponta pra `palette`.

Conector: `c <source_node_id> <text> <target_node_id>`
- text vazio = use `-`. Em decisões, escreva o resultado (YES/NO).

Cluster (agrupar nós): `cluster c<#> "<label>" n1 n2 ... [parent=c#]` — definir no FIM do DSL.

Paleta: `palette #hex1 #hex2 #hex3`. Default `#fff6b6 #c6dcff #adf0c7`
(decisão=#c6dcff, início/fim=#adf0c7, demais=#fff6b6).

Exemplo canônico:
```
graphdir TB
palette #fff6b6 #c6dcff #adf0c7

n1 Boil water flowchart-process 0
n6 Want milk? flowchart-decision 1
n11 Enjoy tea flowchart-terminator 2

c n1 Wait n2
c n6 YES n7
c n6 NO n10

cluster c1 "Preparation Steps" n1 n2 n3
```

## Layout DSL (layout_create)

Linha por item: `id TYPE [parent=REF] key=value... "content"`
- TYPE ∈ `FRAME | STICKY | SHAPE | TEXT | CARD | DOC | TABLE`.
- `parent=` referencia um FRAME (alias local ou URL). Sem parent = board-absoluto (centro 0,0).
- Com parent: x,y são offset do CANTO SUPERIOR-ESQUERDO do frame e marcam o CENTRO do filho.
  Bounds: `0<=x<=frame_w`, `0<=y<=frame_h` — violar derruba o batch inteiro.

Tipos-chave:
- `FRAME id FRAME x y w h [fill=#hex] "title"`
- `STICKY id STICKY [parent=] x y (w|h) color=COLOR [shape=square|rectangle] "content"`
  cores: gray light_yellow yellow orange light_green green dark_green cyan light_pink pink violet red light_blue blue dark_blue black
- `SHAPE id SHAPE [parent=] x y w h type=TYPE [fill] [color] [border_*] "content"`
  types: rectangle round_rectangle circle triangle rhombus parallelogram trapezoid pentagon hexagon octagon star cross cloud can left_arrow right_arrow left_right_arrow left_brace right_brace wedge_round_rectangle_callout flow_chart_predefined_process
- `TEXT id TEXT [parent=] x y w [color] [size] [align] "content"`
- `CARD id CARD [parent=] x y w h [theme] [due] [assignee] [desc] "title"`

Conteúdo multi-parágrafo: `"<p>L1</p><p>L2</p>"`. Comentários começam com `#`.

## Decisão de tool por família de pedido
- Fluxograma de processo / decisão / arquitetura de dados / org chart → `diagram_create` (flowchart; org chart e ER também cabem em uml/er).
- Mapa mental → `diagram_create` flowchart radial (centro + ramos) ou layout.
- Journey / kanban / brainstorm / afinidade / matriz 2x2 → `layout_create` (frames + stickies/cards/shapes posicionados).
- Aresta avulsa entre dois itens já existentes → `connector_create`.
