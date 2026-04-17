# IAzzas — Documentação de Arquitetura e Implementações

Visão equilibrada do que foi construído no fork LibreChat para entregar o IAzzas. Cobre a organização em containers, o stack de busca na web, o fluxo do Code Interpreter para Flash/Pro e a solução atual de geração de imagens.

---

## 1. Visão geral

O IAzzas é um fork customizado da LibreChat, com integrações próprias e modelos Gemini configurados via `librechat.yaml`. Hoje há duas experiências disponíveis para o usuário final:

- **IAzzas (Flash)** — Gemini 2.5 Flash, respostas rápidas. Pesquisa web e geração de imagem ativas via tools.
- **IAzzas (Pro)** — Gemini 2.5 Pro, respostas mais profundas. Mesmas capacidades do Flash, com raciocínio maior.

Ambos são expostos como **agentes efêmeros** (`endpoint: "agents"` + `agent_id: "ephemeral"`), com as tools `web_search` (Serper/Firecrawl/Jina) e `gemini_image_gen` (Nano Banana) anexadas. O modelo decide via function-calling quando chamar cada uma — geração de imagem e pesquisa ficam transparentes para o usuário.

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

## 5. Flash e Pro como agentes efêmeros (migração de 2026-04-16)

### Contexto da mudança

Inicialmente existiam três specs: `iazzas-flash`, `iazzas-pro` (ambos em `endpoint: "google"` com grounding nativo) e `iazzas-imagens` (em `endpoint: "agents"` com a tool `gemini_image_gen`). O problema: geração de imagem só estava disponível num spec separado. O usuário precisava **trocar explicitamente** de modelo para gerar imagem — experiência ruim.

Requisito novo: **Flash e Pro precisam gerar imagens nativamente, sem toggle manual**, mantendo a experiência atual para todo o resto (pesquisa, análise, etc.).

### Restrição fundamental (API Gemini)

A API do Gemini **não permite coexistir `googleSearch` (grounding nativo) com tools customizadas na mesma chamada** — é um ou outro. Isso significa:

- Com grounding nativo ativo (`endpoint: "google"` + `web_search: true`), não dá para anexar `gemini_image_gen`.
- Com `gemini_image_gen` ativo, tem que desligar o grounding.

Essa restrição fechou o caminho óbvio de "só adicionar a tool nos specs atuais".

### Alternativas avaliadas

**Alternativa A — Tag-based server-side (rejeitada)**
Manter `endpoint: "google"` com grounding, e instruir via promptPrefix que o modelo emita uma tag `<image_request>...</image_request>` quando o usuário pedir imagem. Um middleware no backend interceptaria o stream, extrairia o prompt, chamaria o modelo de imagem separadamente e injetaria o resultado.

- Ganhos: preserva grounding do Google (sem custo extra de infra de busca).
- Custos: código custom vive em `api/app/clients/GoogleClient.js` (área altamente volátil no upstream → conflitos de merge em quase todo sync). Implementação frágil (parsing de tag mid-stream, falha de chamada de imagem, edge cases de cancelamento). ~150-250 linhas em arquivo upstream-instável.

**Alternativa B — Migrar Flash/Pro para agentes efêmeros (escolhida)**
Converter os dois specs para `endpoint: "agents"` + `agent_id: "ephemeral"` com as tools `web_search` e `gemini_image_gen`. O próprio Gemini decide via function-calling quando chamar cada tool.

- Ganhos: zero código custom de orquestração. Function-calling natural resolve o "quando gerar imagem". Usa primitives nativas do LibreChat, sync-friendly (patches já existentes em `loadEphemeralAgent` são pontuais).
- Custos: perde grounding nativo. Pesquisa passa a usar stack Serper + Firecrawl + Jina. Isso custa dinheiro por chamada (ver análise abaixo).

**Alternativa C — Toggle manual de imagem no chat (rejeitada)**
Botão explícito no input ("gerar imagem") que flipa a conversa para agente efêmero só quando o usuário clica. Flash/Pro mantêm grounding nativo por padrão.

- Ganhos: preserva grounding quando não é imagem.
- Rejeitada porque **o usuário explicitou que quer geração automática, sem ativação manual**.

### Análise de custo da Alternativa B

Como Flash/Pro passam a poder chamar `web_search`, toda query pesquisada paga infra externa:

| Componente | Custo típico |
|---|---|
| Serper (busca) | ~US$ 0,001 |
| Firecrawl (5 páginas scrape) | ~US$ 0,005–0,025 |
| Jina (rerank) | ~US$ 0,0001 |
| **Infra por busca** | **~US$ 0,01–0,03** |

**Cenário limite** (1000 usuários × US$ 1/dia em créditos × 100% das queries pesquisam × 30 dias):

- ~100 queries/usuário/dia (mix Flash/Pro)
- Infra: ~US$ 1,50/usuário/dia
- **Teto mensal: ~US$ 45.000**

**Cenário realista** (40% das queries pesquisam, 50% de usuários ativos):

- **~US$ 9.000/mês**

⚠️ **Importante**: o sistema de créditos (`tokenCredits`) só conta tokens do modelo, **não conta infra de busca**. O limite de US$ 1/dia não cobre `web_search`. Pra produção, é necessário adicionar rate-limit explícito por usuário no `web_search` e instruir o modelo via prompt a pesquisar só quando necessário.

### Decisão e fundamentação

Seguimos com a **Alternativa B** por três razões:

1. **Sync-friendly**: patches ficam em arquivos relativamente estáveis (`packages/api/src/agents/load.ts`, yaml, frontend icons). A Alternativa A tocaria `GoogleClient.js`, um dos arquivos mais ativos do upstream.
2. **Teste empírico**: uma query de comparação direta mostrou a stack Serper/Firecrawl/Jina produzindo resposta mais profunda que o grounding nativo em consulta de pesquisa. N=1 não é estatística, mas alinha com a intuição: Firecrawl traz página inteira, Jina rerankeia, vs grounding que expõe só top-3 snippets curtos.
3. **Custo controlável**: com prompt bem calibrado ("use `web_search` só quando necessário") e rate-limit futuro, o gasto projetado é aceitável para a fase atual.

### Fluxo atual

```
Usuário seleciona "IAzzas (Flash)" ou "IAzzas (Pro)"
        │
        ▼
┌──────────────────────────┐
│ modelSpec no yaml:       │
│  endpoint: "agents"      │
│  agent_id: "ephemeral"   │
│  model: gemini-2.5-      │
│    flash | pro           │
│  tools:                  │
│    - web_search          │
│    - gemini_image_gen    │
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
│ Gemini decide via        │
│ function-calling:        │
│  - pedido de imagem      │
│    → gemini_image_gen    │
│  - pergunta atual/       │
│    externa → web_search  │
│  - caso comum → sem tool │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Resposta (texto + imagem │
│ inline se aplicável)     │
└──────────────────────────┘
```

### Mudanças entregues

**Em `librechat.yaml`:**

- Specs `iazzas-flash` e `iazzas-pro` migrados para `endpoint: "agents"` + `agent_id: "ephemeral"` com `tools: [web_search, gemini_image_gen]`.
- `promptPrefix` estendido com duas diretivas:
  - "Use `web_search` apenas quando a resposta depender de informação atual, externa ou o usuário solicitar explicitamente."
  - "Quando gerar imagens com `gemini_image_gen`, faça-o diretamente sem anunciar — apenas entregue o resultado."
- `iazzas-imagens` removido (redundante).
- **Specs antigos com `endpoint: "google"` ficam comentados no mesmo yaml** — rollback é descomentar o bloco e remover as versões ativas acima. O texto do promptPrefix original está preservado no bloco comentado para facilitar.

**Patches de UX (necessários para experiência parecer nativa):**

1. `client/src/components/Chat/Menus/Endpoints/components/SpecIcon.tsx` — se o spec é ephemeral agent com model `gemini-*`, usa o ícone do Google (Gemini G) em vez da folha padrão do endpoint agents. Afeta dropdown de seleção e ícone do header.
2. `client/src/components/Endpoints/MessageEndpointIcon.tsx` — mesma regra para o avatar ao lado de cada mensagem no chat.
3. `client/src/hooks/Messages/useMessageActions.tsx` — prioriza `conversation.modelLabel` ("IAzzas") antes de cair para `agent.name` (que vinha "Gemini" para agentes efêmeros Gemini). Afeta o nome do remetente mostrado no chat.

**Patches anteriores ainda em uso** (já commitados em `a1d7f6fd7`, continuam válidos):

- `packages/data-provider/src/models.ts` — `tools?: string[]` em `TModelSpec`.
- `packages/api/src/agents/load.ts (loadEphemeralAgent)` — leitura de `modelSpec.tools`, fallback de model/promptPrefix, inferência de provider pelo prefixo do model.
- `client/src/components/Chat/Menus/Endpoints/ModelSelectorContext.tsx` — filtro de specs permite ephemeral agents.

### Pontos abertos para próxima sessão

- **Rate-limit de `web_search`**: não existe ainda. Produção precisa de um limite por usuário (ex: N buscas/dia) para capear custo de infra.
- **Validação em múltiplos cenários**: teste de qualidade Flash-agent vs Flash-nativo foi feito com poucas queries. Antes de deploy amplo, rodar um set variado (pesquisa profunda, análise, conversa casual, geração de imagem) comparando as duas versões.
- **Refill diário de créditos**: combinado de implementar, ainda pendente. A mensagem de "créditos esgotados" já promete renovação à meia-noite (commit `782b4a464`), mas o mecanismo de refill não foi ligado.

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

- **Sync com upstream LibreChat**: patches em `packages/api` e `packages/data-provider` podem conflitar em merges. Revisar `loadEphemeralAgent`, `TModelSpec`, `SpecIcon.tsx`, `MessageEndpointIcon.tsx` e `useMessageActions.tsx` após cada sync.
- **Rollback Flash/Pro para google endpoint**: o `librechat.yaml` preserva os specs antigos comentados ao final do bloco `modelSpecs.list`. Para reverter, remover os specs ativos e descomentar o bloco — grounding nativo volta, mas geração de imagem é perdida.
- **Docker Compose**: primeira execução pós-clean baixa ~700 MB de imagens (mongo, meilisearch, pgvector, rag_api, librechat-dev). Cacheia nas rodadas seguintes.
- **Nodemon zumbi na 3080 (Windows)**: após restart de backend em dev, se der `EADDRINUSE`, matar PID com `taskkill //F //PID <pid>`.
- **Build do frontend com OOM**: `npm run frontend` (production build) estoura heap em máquinas com pouca RAM. Para dev local usamos `npm run frontend:dev` (Vite HMR em :3090, proxy para backend em :3080).
- **Rebuild manual pós-patch**: alterações em `packages/api` exigem `npm run build --workspace=@librechat/api`. Em `packages/data-provider`, `npm run build:data-provider`. Só então o backend (`npm run backend`) pega o código novo.
