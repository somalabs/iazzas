# IAzzas — Documentação de Arquitetura e Implementações

Visão equilibrada do que foi construído no fork LibreChat para entregar o IAzzas. Cobre a organização em containers, o stack de busca na web, o fluxo do Code Interpreter para Flash/Pro e a solução atual de geração de imagens.

---

## 1. Visão geral

O IAzzas é um fork customizado da LibreChat, com integrações próprias e modelos Gemini configurados via `librechat.yaml`. Hoje há três experiências disponíveis para o usuário final:

- **IAzzas (Flash)** — Gemini 2.5 Flash, respostas rápidas.
- **IAzzas (Pro)** — Gemini 2.5 Pro, respostas mais profundas.
- **IAzzas (Imagens)** — Gemini 2.5 Flash Image (Nano Banana), geração de imagens em conversa.

Backend em Node/Express (legado JS) delegando para pacotes TypeScript (`packages/api`, `packages/data-schemas`, `packages/data-provider`). Frontend em React/TypeScript. Dependência chave: `@librechat/agents` (fornece a camada de function-calling dos agentes).

---

## 2. Organização em containers

```
┌──────────────────────────────────────────────────────────────┐
│                     Docker (local/prod)                       │
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │   mongodb    │   │ meilisearch  │   │   vectordb   │      │
│  │  (persist.)  │   │ (full-text)  │   │ (pgvector)   │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
│         ▲                  ▲                  ▲               │
│         │                  │                  │               │
│  ┌──────┴──────────────────┴──────────────────┴────────┐    │
│  │            LibreChat API (api container)             │    │
│  │                Node/Express, port 3080               │    │
│  └───────────────────────┬──────────────────────────────┘    │
│                          │                                    │
│  ┌───────────────────────┴────────────┐   ┌──────────────┐   │
│  │  rag_api (embeddings + retrieval)  │   │  pgvector    │   │
│  └────────────────────────────────────┘   └──────────────┘   │
└──────────────────────────────────────────────────────────────┘
           │
           ├── Code Interpreter Gateway (host, port 8080)
           │   ├── Python venv + /opt/user-deps
           │   └── Pandas, openpyxl, scipy, matplotlib, scikit-learn,
           │       pdfplumber, xlsx, papaparse (imagem completa)
           │
           └── Serviços externos
               ├── Google Gemini API (modelo)
               ├── Serper (busca)
               ├── Firecrawl (scraping)
               └── Jina (reranking)
```

**`docker-compose.override.yml` (local dev)** — expõe portas do MongoDB (27017), Meilisearch (7700) e Postgres (5432) ao host. Em produção isso não é necessário.

**Code Interpreter Gateway** roda fora do compose: serviço Node na porta 8080 com Python embutido para execução de código pesado (análise de planilhas, geração de gráficos).

---

## 3. Busca na web: Serper + Firecrawl + Jina

Fluxo disparado quando o modelo (ou uma tool) precisa de informação da web:

```
  Query
    │
    ▼
┌──────────┐   retorna 10-20 URLs + snippets
│  Serper  │──────────────────────────────────┐
└──────────┘                                  │
                                              ▼
                                      ┌──────────────┐
                                      │  Firecrawl   │  scraping dos URLs,
                                      │              │  conteúdo limpo em markdown
                                      └──────┬───────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │     Jina     │  rerank semântico:
                                      │              │  ordena chunks pela
                                      └──────┬───────┘  relevância à pergunta
                                             │
                                             ▼
                                     Contexto para o modelo
```

**Serper** — API que encapsula a Google Search. Retorna resultados estruturados (URL, título, snippet).

**Firecrawl** — serviço de scraping. Renderiza páginas (inclusive com JS) e devolve o conteúdo principal em Markdown limpo, sem lixo de navegação.

**Jina** — reranker semântico. Recebe a query e chunks de texto, reordena por relevância real. Faz a diferença quando Firecrawl devolve páginas longas e só parte é útil.

Configurado no `librechat.yaml` em `webSearch:`. Cada serviço usa variável de ambiente própria (`SERPER_API_KEY`, `FIRECRAWL_API_KEY`, `JINA_API_KEY`).

---

## 4. Code Interpreter em Flash/Pro

Problema: Gemini tem grounding nativo (Google Search) que conflita com tools externas como `execute_code`. Se ambos estão ativos, o Google retorna erro `GOOGLE_TOOL_CONFLICT`.

Solução aplicada (commit `e5c770150`):

```
Usuário anexa arquivo
        │
        ▼
┌──────────────────────────┐
│ Frontend detecta MIME    │
│ (xlsx, csv, docx, pptx,  │
│  parquet, zip, odf …)    │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Auto-ativa toggle        │
│ `execute_code`           │
│ (silencioso para o user) │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Conversa vira agente     │
│ efêmero (endpoint agents)│
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Backend encoder:         │
│ strip de MIMEs CI-only   │
│ (evita mandar pro Gemini │
│  como inline_data)       │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ `initialize.ts`:         │
│ se googleSearch +        │
│ execute_code, dropa      │
│ googleSearch. Análise    │
│ vence grounding aqui.    │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ CI Gateway (porta 8080)  │
│ executa Python/Node com  │
│ venv pré-buildado.       │
└──────────────────────────┘
```

**Detalhes técnicos chave:**

- `packages/data-provider/src/file-config.ts` — lista `codeInterpreterOnlyMimeTypes` + helper.
- `client/useFileHandling` e `useDragHelpers` — disparam o auto-toggle no upload (menu e drag-drop).
- `packages/api/files/encode/document.ts` — strip de MIMEs do encoder Google.
- `packages/api/agents/initialize.ts` — resolução do conflito tools × grounding.
- `code-interpreter-gateway/` — Dockerfile com venv Python + /opt/user-deps. Inclui pandas, openpyxl, scipy, matplotlib, scikit-learn, pdfplumber, xlsx e papaparse; `mem_limit 2g` no compose override.

Resultado: o usuário anexa uma planilha, o IAzzas entende e executa código sobre ela, sem o usuário saber que trocou de modo. Grounding Google Search continua ativo em conversas normais (sem anexos CI).

---

## 5. IAzzas (Imagens) — geração de imagens em conversa

Necessidade: permitir geração de imagem usando o modelo Nano Banana (`gemini-2.5-flash-image-preview`), que retorna `inline_data` com bytes PNG, não texto.

### Caminho escolhido: modelSpec nova + agente efêmero com tool

Em vez de patches no provider Google para lidar com `responseModalities` e `inline_data` (frágil e sujeito a conflitos no sync upstream), aproveitamos que o fork já tinha a tool `gemini_image_gen` em `packages/api/src/tools/toolkits/gemini.ts`. Ela emite a imagem como `attachment` via o pipeline existente de tool streaming.

### Fluxo

```
Usuário seleciona "IAzzas (Imagens)"
        │
        ▼
┌──────────────────────────┐
│ modelSpec no yaml:       │
│  endpoint: "agents"      │
│  agent_id: "ephemeral"   │
│  model: gemini-2.5-      │
│    flash-image-preview   │
│  tools: [gemini_image_   │
│    gen]                  │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ loadEphemeralAgent       │
│  monta agente em memória │
│  com tools + prompt      │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Agente chama             │
│ gemini_image_gen         │
│  (tool → API Gemini      │
│   Image com              │
│   responseModalities)    │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Tool retorna             │
│  content_and_artifact    │
│  → stream SSE            │
│  attachment event        │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Frontend renderiza       │
│ imagem inline no chat    │
└──────────────────────────┘
```

### Patches necessários no fork

1. **`packages/data-provider/src/models.ts`** — adicionar `tools?: string[]` em `TModelSpec` e no schema Zod.
2. **`packages/api/src/agents/load.ts` (`loadEphemeralAgent`)** — quatro ajustes:
   - Ler `modelSpec.tools` e anexar ao array de tools do agente.
   - Fallback para `modelSpec.preset.model` quando body não tem model (schema agents strippa model por design).
   - Fallback para `modelSpec.preset.promptPrefix` quando body não tem (mesmo motivo).
   - Resolver `provider` a partir do prefixo do model (`gemini-*` → `"google"`) em vez de usar `endpoint: "agents"` cru (que a validação rejeita).
3. **`client/src/components/Chat/Menus/Endpoints/ModelSelectorContext.tsx`** — permitir modelSpec com `agent_id === "ephemeral"` passar pelo filtro que checa se o agent existe no banco.
4. **`librechat.yaml`** — novo modelSpec `iazzas-imagens` usando `endpoint: "agents"`, `agent_id: "ephemeral"`, `tools: [gemini_image_gen]` + o prompt institucional do IAzzas.

### Por que não migramos Flash/Pro junto?

Fazer Flash/Pro subir para `endpoint: "agents"` também funcionaria, mas **perde o grounding nativo do Google Search** (vira tool `web_search` via Serper). Mantivemos Flash/Pro em `endpoint: "google"` direto por enquanto, com a tool de imagem disponível apenas no spec dedicado "IAzzas (Imagens)".

Caminho futuro avaliado: adicionar um toggle no chat (como o do Code Interpreter) que flipa a conversa para agente efêmero com `gemini_image_gen` quando o usuário quer imagem, sem trocar de modelSpec.

---

## 6. Feedback de usuário

Commit `f760d279d` introduziu estrutura completa de captura de feedback/limitações:

- Tag `<cannot_answer category="CATEGORIA">` emitida pelo modelo quando não consegue atender.
- Parser (`api/server/utils/cannotAnswerParser.js`) extrai a tag do output.
- Model + schema + methods em `packages/data-schemas/src/{schema,model,methods}/feedback.ts`.
- Rotas em `api/server/routes/feedbacks.js`.
- UI Admin em `client/src/components/Admin/feedbacks/`.
- Data-provider (`packages/data-provider/src/feedbacks.ts`) + queries React.

Categorias cobertas: dados internos, tempo real, análise de arquivo, info pessoal, integração externa, fora de escopo, limitação técnica, outros.

---

## 7. Stack resumido

| Camada | Tecnologia |
|---|---|
| Modelos | Google Gemini 2.5 Flash, Pro, Flash Image Preview |
| Orquestração agentes | `@librechat/agents` (LangChain by baixo) |
| Backend | Node 20 / Express (JS legado) + packages TypeScript |
| Frontend | React 18 + Vite + TypeScript |
| Auth | OpenID (Microsoft) + email |
| DB principal | MongoDB 8.0 |
| Full-text search | Meilisearch 1.35 |
| RAG | pgvector + rag_api |
| Web search | Serper + Firecrawl + Jina |
| Code Interpreter | Gateway Node + Python venv (host) |
| Tracking cost | Balance config + daily refill (yaml) |

---

## 8. Pontos de atenção para manutenção

- **Sync com upstream LibreChat**: patches em `packages/api` e `packages/data-provider` podem conflitar em merges. Revisar `loadEphemeralAgent` e `TModelSpec` após cada sync.
- **Docker Compose**: primeira execução pós-clean baixa ~700 MB de imagens (mongo, meilisearch, pgvector, rag_api, librechat-dev). Cacheia nas rodadas seguintes.
- **Nodemon zumbi na 3080 (Windows)**: após restart de backend em dev, se der `EADDRINUSE`, matar PID com `taskkill //F //PID <pid>`.
- **Build do frontend com OOM**: `npm run frontend` (production build) estoura heap em máquinas com pouca RAM. Para dev local usamos `npm run frontend:dev` (Vite HMR em :3090, proxy para backend em :3080).
- **Rebuild manual pós-patch**: alterações em `packages/api` exigem `npm run build --workspace=@librechat/api`. Em `packages/data-provider`, `npm run build:data-provider`. Só então o backend (`npm run backend`) pega o código novo.
