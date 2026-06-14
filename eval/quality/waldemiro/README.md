# Waldemiro — moodboard de produtos no Miro

Port do `waldeMiro 4_7 2.py` (planilha de produtos → moodboard no Miro) como engine
JS determinístico + servidor MCP para o IAzzas montar moodboards a partir de dados
dos MCPs de BI **ou** de uma planilha que o usuário sobe.

## Peças

| Arquivo | Papel |
|---|---|
| `gen.mjs` | Engine de layout (grade categoria×coleção, foto + legenda + indicadores + post-it). `buildLayout` / `toMiroOps` / `validate`. |
| `sheet.mjs` | Import de planilha (`.xlsx/.xls/.csv`) no formato-padrão + geração da planilha-padrão. |
| `build.mjs` | CLI determinístico: `--in produtos.json|planilha.xlsx` → ops do Miro validadas. |
| `mcp-server.mjs` | Servidor MCP (tools `montar_moodboard`, `gerar_planilha_modelo`). |
| `preview*.mjs` | Render local (SVG→PNG) pra validar o layout sem board ao vivo. |
| `modelo-waldemiro.csv` | Planilha-padrão pro usuário preencher. |

## O fluxo (hybrid)

1. O modelo **cura a lista de produtos** — consultando os MCPs de dados (vendas/etc.)
   ou lendo a planilha-padrão que o usuário subiu.
2. Chama **`montar_moodboard(produtos, titulo?, legenda?, brand?)`** — a tool calcula o
   layout determinístico (coordenadas nunca são "chutadas" pelo LLM) e resolve as URLs
   de foto (`images.somalabs.com.br/brands/{brand}/products/reference_id/{prod}_{cor}/image`
   → CDN VTEX).
3. A tool devolve `layout_create_dsl` + `image_create_calls`. O modelo executa no board
   com o **MCP do Miro que já tem**: `layout_create(dsl)` e um `image_create` por foto.

Formato da planilha-padrão: `PRODUTO, COR, TEXTO, LINHA, COLUNA, POST_IT, INDICADORES`
(`PRODUTO` obrigatório; `LINHA`/`COLUNA` agrupam a grade; aliases tolerantes a acento/caixa).

## Rodar / testar local

```bash
cd eval/quality/waldemiro
npm install            # @modelcontextprotocol/sdk, xlsx, zod
npm test               # valida o servidor MCP (client↔server in-memory)
npm run template       # gera modelo-waldemiro.xlsx
node build.mjs --in farm-products.json --out ops.json   # json → ops
node build.mjs --in modelo-waldemiro.xlsx --out ops.json # planilha → ops
```

## Deploy no IAzzas (fiação no produto)

1. Empacotar esta pasta no deploy (ex.: `/opt/waldemiro-mcp`) com `npm install --omit=dev`.
2. Registrar o MCP em `librechat.yaml` (mesmo padrão do bloco stdio `azzas`):

   ```yaml
   mcpServers:
     waldemiro:
       type: stdio
       command: node
       args:
         - /opt/waldemiro-mcp/mcp-server.mjs
       timeout: 60000
       startup: false
       title: "Waldemiro — Moodboard de Produtos"
       description: |
         Monta moodboards de produtos no Miro a partir de dados de BI ou de uma
         planilha. Calcula o layout (grade categoria×coleção, fotos, indicadores)
         e entrega as operações prontas pro Miro.
   ```

3. Garantir que o MCP do Miro esteja conectado (o modelo executa as ops lá).

A tool é auto-documentada (a descrição diz ao modelo: chame `montar_moodboard`,
depois execute `layout_create` + `image_create`), então não exige mudança no system
prompt. Opcional: uma nota no `promptPrefix` reforçando o fluxo para moodboards.
