# Skills System — Design

**Data**: 2026-05-21
**Status**: Aprovado pra implementação
**Inspiração**: [Claude Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) / [agentskills.io](https://agentskills.io)

## Contexto e objetivo

Implementar no iazzas um sistema de **Skills** análogo ao do Claude: pacotes de instruções + recursos auxiliares + scripts executáveis, instaláveis e compartilháveis entre usuários, que o modelo descobre e ativa automaticamente baseado no contexto da conversa.

A propriedade que motiva o sistema é a **progressive disclosure** — o modelo recebe apenas metadados (name + description) de todas as skills disponíveis no system prompt e decide carregar o corpo completo só quando relevante. Isso permite ter centenas de skills sem custo de contexto proibitivo.

### Escopo da v1

- Skills funcionam em **Agents E chat normal** (mesma pipeline de injeção em ambos os caminhos)
- Skills podem ter **scripts executáveis** (paridade total com o padrão Claude)
- Marketplace **híbrido**: privado por tenant + opt-in pra marketplace global iazzas (com moderação)
- Auto-suggest **híbrido**: embeddings + sinais explícitos (favoritas, recência, keyword match)
- Formato **compatível com Claude** (import/export de zip seguindo padrão agentskills.io)

### Fora do MVP

Skills com dependências entre si; versionamento branching; rating/reviews na marketplace; skill compositions/workflows; A/B testing de descriptions; tradução automática.

---

## 1. Data Model

### 1.1 Collection `Skill` (`packages/data-schemas/src/schema/skill.ts`)

```ts
{
  _id, tenantId,                    // multi-tenant scoping
  name: string,                     // 1-64 chars, lowercase-hyphens
  description: string,              // 1-1024 chars (gatilho de auto-suggest)
  body: string,                     // markdown do SKILL.md (sem frontmatter)
  frontmatter: Mixed,               // YAML parseado (allowed-tools, compatibility, ...)
  version: string,                  // semver, auto-bump no edit
  versionHistory: [{ version, body, frontmatter, createdAt, files }],

  files: [{ path, storageKey, size, mimeType }],   // scripts/*, references/*, assets/*
  embedding: number[],              // 1536 dim (recalculado on description change)
  embeddingModel: string,           // versionado p/ migrações

  author: ObjectId,
  visibility: 'private' | 'tenant' | 'public',
  publishedAt?: Date,

  keywords: string[],               // extraído do frontmatter + boost no auto-suggest
  category?: string,

  stats: { installs, activations, lastUsedAt }
}
```

### 1.2 Collection `SkillInstall`

```ts
{ userId, tenantId, skillId, versionPinned?, installedAt, enabled, isFavorite }
```

Separação `Skill` × `SkillInstall`:
- Marketplace lista skills disponíveis; auto-suggest opera só sobre as instaladas
- Permite revogar acesso sem deletar skill
- Suporta favoritos e disable por user

### 1.3 Object Storage (MinIO/S3 já presente no iazzas)

- Path: `skills/{tenantId}/{skillId}/{version}/{path}`
- `body` fica em Mongo (precisa pra injection rápido)
- Arquivos auxiliares (`scripts/`, `references/`, `assets/`) só no storage, carregados sob demanda

### 1.4 Conversation schema — extensão

```ts
// packages/data-schemas/src/schema/convo.ts
activeSkills: [{ skillId, activatedAt, ttl, turnsRemaining }]
```

Sticky activation: skill ativada permanece carregada por N turns (default 3). Decremento por user message; quando chega a 0, sai do contexto.

### 1.5 Audit logs

- `SkillSuggestionLog`: `{ turn, suggestedSkills, activatedSkills }` — alimenta evolução do ranking
- `SkillExecutionLog`: `{ userId, skillId, version, scriptPath, exitCode, durationMs, filesGenerated }`
- `SkillAuditLog`: transições de visibility e ações administrativas

### 1.6 ACL

Reusa `PermissionService.grantPermission()` com `resourceType=SKILL`. Roles VIEWER (install/use), EDITOR (edit), OWNER (delete/publish).

---

## 2. Auto-suggest pipeline

Novo módulo `packages/api/src/skills/` (TypeScript).

### 2.1 `SkillResolver.resolve()`

```
user envia mensagem
  ↓
SkillResolver.resolve({ userId, tenantId, conversationId, messageText })
  ├─ 1. fetch SkillInstall onde userId=X, enabled=true   → pool (~10-50)
  ├─ 2. inclui skills com sticky activation (activeSkills)
  ├─ 3. embed(messageText) via provider configurado      → vetor 1536
  ├─ 4. cosine(vetor, skill.embedding) para cada skill
  ├─ 5. boost: +recência (últimas N msgs) +favoritas +keyword match
  ├─ 6. top-K (default K=8, configurável por tenant)
  └─ 7. retorna [{ skill, score, reason }]
```

### 2.2 Fallback para mensagens curtas/ambíguas

Se top-K abaixo do threshold de similaridade (e.g., < 0.3), injeta as **favoritas do user** (limite 5).

### 2.3 Custo e cache

- Embedding mensagem: ~$0.00002 + ~30ms (text-embedding-3-small)
- Ranking in-memory: ~10ms
- Redis cache de skill embeddings (`{tenantId}:skill:{id}:emb`), invalidado on description change
- Provider configurável (`SKILL_EMBEDDING_PROVIDER=openai|azure|local`)

### 2.4 Telemetria

`SkillSuggestionLog` grava sugestões vs ativações. Dashboard mede Recall@K real → alimenta evolução do ranking pra abordagem híbrida com sinais explícitos (favoritas/recência/keywords) — já no MVP.

---

## 3. Injection pipeline

### 3.1 Agents — extensão de `buildAgentInstructions`

`packages/api/src/agents/context.ts:99` ganha quarta camada:

```ts
buildAgentInstructions({
  sharedRunContext,
  baseInstructions: agent.instructions,
  mcpInstructions,
  skillsContext: await buildSkillsContext({ userId, conversationId, messageText }),
})
```

`buildSkillsContext()` retorna:

```
=== AVAILABLE SKILLS ===
You have access to the following skills. Use `load_skill` when relevant.
- pdf-extractor: Extract structured data from PDFs...
- finance-report: Generate quarterly financial reports...
(8 skills total)

=== ACTIVE SKILLS ===
[full body of currently active skills]
```

### 3.2 Chat normal — novo seam em `BaseClient`

Hoje `api/app/clients/BaseClient.js:buildMessages()` monta system prompt só do preset. Adicionar wrapper chamando função TS de `packages/api/src/skills`:

```js
const { injectSkillsIntoSystemPrompt } = require('@librechat/api/skills');

async buildMessages(...) {
  let systemPrompt = this.options.systemPrompt || '';
  systemPrompt = await injectSkillsIntoSystemPrompt({
    basePrompt: systemPrompt,
    userId: this.user,
    tenantId: this.tenantId,
    conversationId: this.conversationId,
    messageText: lastUserMessage,
  });
  // ...
}
```

Mesma função usada nos dois caminhos (DRY).

### 3.3 Tool `load_skill` — ativação pelo modelo

```ts
load_skill({ name: "pdf-extractor" })
  → fetch body do Mongo
  → adiciona ao activeSkills da Conversation com ttl=3
  → retorna body como tool result
  → libera allowed-tools declaradas no toolRegistry
```

Implementada em `ToolService.js`, sempre disponível quando user tem skills instaladas.

### 3.4 Budget de tokens

| Camada | Cap default | Comportamento ao estourar |
|---|---|---|
| L1 descriptions | ~1.2k tokens (8 × ~150) | top-K reduzido |
| L2 active bodies | ~9k tokens (3 × ~3k) | LRU descarrega skill mais antiga, avisa modelo |

Hard limits configuráveis por tenant.

---

## 4. Script execution

### 4.1 Fluxo

Reusa code interpreter local do iazzas (sem Piston, sandbox próprio).

```
modelo chama run_skill_script({ skillName, scriptPath, args })
  ↓
SkillScriptRunner:
  ├─ valida: skill em activeSkills? script no manifest?
  ├─ baixa scripts/* do object storage pra workspace temp
  ├─ resolve deps via frontmatter.compatibility (venv cached por skillId@version)
  ├─ executa via code interpreter local
  ├─ captura stdout/stderr + arquivos em /workspace/output/
  └─ retorna { stdout, stderr, exitCode, generatedFiles }
```

### 4.2 Resolução de dependências

Frontmatter declara:
```yaml
compatibility: python>=3.10, requires: python-pptx==0.6.21, openpyxl
```

Runner cria venv isolada por `skillId@version`, cacheada em volume persistente. Invalidada quando version muda.

### 4.3 Filesystem layout no container

```
/workspace/
├── input/      # uploads do user
├── skill/      # arquivos da skill (read-only)
└── output/     # arquivos gerados → anexados à resposta
```

### 4.4 Tools nativas que toda skill ganha

- `read_input_file(path)`
- `write_output_file(path, content)`
- `read_skill_resource(path)`

Evita boilerplate.

### 4.5 Segurança

| Camada | Comportamento |
|---|---|
| Sandbox | Mesmo isolamento do code interpreter atual; sem network por default |
| Network policy | Frontmatter declara `network: required\|none`; só liberado com aprovação admin do tenant |
| Allow-list pacotes | venv builder valida `requirements` contra denylist do tenant |
| Quotas | Timeout (default 5min), max memória, max disk |
| Auditoria | `SkillExecutionLog` por execução |
| Curadoria pública | Skills `visibility=public` passam por review manual |

### 4.6 Import de skills externas (formato Claude)

Upload de zip → validador parseia SKILL.md → UI mostra scripts/deps detectados pra aprovação → instala como `private` por padrão. Scripts já sandboxed desde o início.

---

## 5. Marketplace, publishing e UI

### 5.1 Backend routes (`api/server/routes/skills.js` → wrapper de `packages/api/src/skills`)

```
GET    /api/skills/marketplace            # browse
GET    /api/skills/installed
GET    /api/skills/:id
POST   /api/skills
PATCH  /api/skills/:id                    # auto-bump version
DELETE /api/skills/:id                    # soft delete
POST   /api/skills/:id/install
POST   /api/skills/:id/uninstall
PATCH  /api/skills/:id/favorite
POST   /api/skills/:id/publish            # tenant → public
GET    /api/skills/:id/scripts/:path
POST   /api/skills/import                 # upload zip
GET    /api/skills/:id/export             # download zip
```

### 5.2 Publishing flow

```
draft (privada) → tenant (visível pro tenant) → pending_review → public
```

Cada transição em `SkillAuditLog`. Reversível: despublicar mantém versão instalada nos users existentes.

### 5.3 Versionamento

- PATCH gera nova version (semver auto-bump: patch=body, minor=metadata, major=allowed-tools/scripts incompatíveis)
- `SkillInstall.versionPinned?` (default null = latest)
- Notificação no UI quando update disponível
- `versionHistory` permite rollback

### 5.4 Frontend (PT-BR via `useLocalize()`)

| Surface | Path | Status |
|---|---|---|
| Marketplace de Skills | `client/src/components/Skills/Marketplace.tsx` | novo |
| Skill Builder | `client/src/components/Skills/SkillBuilder.tsx` | novo |
| Indicador na conversa | `client/src/components/Chat/ChatView.tsx` | modifica |
| Tab Skills no Agent | `client/src/components/AgentStudio/AgentDetailContent.tsx` | modifica |
| Settings policy | `client/src/components/Settings/` | nova seção |

### 5.5 i18n keys (prefixo `com_skills_`)

`com_skills_marketplace_title`, `com_skills_install`, `com_skills_uninstall`, `com_skills_publish_tenant`, `com_skills_publish_public`, `com_skills_favorite`, `com_skills_builder_*`, `com_skills_active_indicator`, `com_skills_panel_pool`, `com_skills_panel_active`, `com_skills_import_zip`, `com_skills_export_zip`, `com_skills_version_update_available`.

---

## 6. Rollout, testes e riscos

### 6.1 Faseamento (~4-5 semanas)

| Fase | Duração | Entrega |
|---|---|---|
| F1 Foundation | ~1 sem | Schemas, CRUD routes, object storage, embedding pipeline |
| F2 Injection (agents) | ~1 sem | SkillResolver, buildSkillsContext, tool `load_skill`, sticky activation |
| F3 Injection (chat) | ~3 dias | `injectSkillsIntoSystemPrompt` em BaseClient |
| F4 Scripts | ~1 sem | SkillScriptRunner, sandbox/policies, audit log |
| F5 UI | ~1 sem | Marketplace, Builder, indicador, tab, settings |
| F6 Polish + público | ~3 dias | Import/export zip, publish flow, moderação, telemetria |

Feature flag `SKILLS_ENABLED` por tenant pra dogfooding gradual.

### 6.2 Estratégia de testes

Filosofia do projeto: real logic > mocks, `mongodb-memory-server`.

- **Unit/integration (Jest)**: SkillResolver, buildSkillsContext, schemas, pre-save hooks; Mongo real em memória + MinIO local
- **E2E (Playwright)**: `e2e/specs/skills.spec.ts` e `skills-marketplace.spec.ts`, reusando `storageState.json`
- **Script execution**: skill-fixture real (Python gerando PDF) rodando no code interpreter de dev
- **Auto-suggest quality**: dataset seed de ~50 pares `{ msg, skill esperada }`; mede Recall@K e MRR; threshold mínimo Recall@8 ≥ 0.85
- **CI vermelho**: skills tests devem ser **green isoladamente**; não bloquear merge por testes não relacionados (per memory `ci-chronically-red`)

### 6.3 Riscos e mitigações

| Risco | Sev | Mitigação |
|---|---|---|
| Script malicioso na marketplace global | Alta | Curadoria manual antes de `public`; sandbox sem network por default; denylist; audit log |
| Auto-suggest sugere skill errada | Média | Sticky activation curta; user desativa com 1 clique; telemetria → evolução do ranking; fallback favoritas |
| Custo de embeddings explode | Baixa | Embed só da última msg; cache; provider local opcional |
| Token budget estourado | Média | LRU em activeSkills; hard cap; warning ao modelo no descarte |
| Skill com description ruim nunca aparece | Média | Hint no Builder; analytics de skills órfãs |
| Conflito de nomes no marketplace global | Baixa | Namespace `{author}/{name}` no público; name único só dentro do tenant |
| Update quebra users com pin | Baixa | `versionPinned` opcional; semver auto-bump sinaliza |
| Embedding model deprecation | Baixa | Campo `embeddingModel` permite reprocessamento; fallback keyword match |
| Skill exfiltra auth via script | Alta | Sandbox sem acesso a auth; tools nativas operam fora do sandbox; scripts veem só `input/` e `skill/` |
| CI vermelho mascarando regressão | Média | Skills PRs com testes próprios green; baseline merged é referência |

### 6.4 Métricas de sucesso

- **Adoção**: % de tenants com ≥1 skill instalada após 30 dias
- **Engajamento**: skills ativadas por conversa (média)
- **Qualidade auto-suggest**: % sugeridas não-desativadas pelo user
- **Custo**: tokens médios no system prompt (alvo: <2k P95)
- **Latência**: overhead SkillResolver (alvo: <100ms P95)
- **Saúde marketplace**: skills publicadas, instalações por skill, time-to-review

### 6.5 Decisões explícitas pra v1 (YAGNI)

Fora do escopo: dependências entre skills; branching de versão; rating/reviews; network access via UI dedicado; skill compositions/workflows; A/B de descriptions; tradução automática PT/EN. Tudo retomável pós-MVP sem refator do schema.

---

## Arquivos-chave a tocar

**Novo (backend)**:
- `packages/data-schemas/src/schema/skill.ts`
- `packages/data-schemas/src/schema/skillInstall.ts`
- `packages/data-schemas/src/schema/skillLogs.ts`
- `packages/api/src/skills/{resolver,context,inject,runner,storage,embeddings,publish}.ts`
- `api/server/routes/skills.js`
- `api/server/services/Skills/` (wrappers JS finos)

**Modifica (backend)**:
- `packages/api/src/agents/context.ts` — adicionar `skillsContext` em `buildAgentInstructions`
- `packages/api/src/agents/initialize.ts` — chamar SkillResolver
- `packages/data-schemas/src/schema/convo.ts` — campo `activeSkills`
- `api/app/clients/BaseClient.js` — chamar `injectSkillsIntoSystemPrompt`
- `api/server/services/ToolService.js` — registrar `load_skill` e `run_skill_script`

**Novo (frontend)**:
- `client/src/components/Skills/Marketplace.tsx`
- `client/src/components/Skills/SkillBuilder.tsx`
- `client/src/components/Skills/ActiveSkillsDrawer.tsx`
- `client/src/data-provider/Skills/queries.ts`

**Modifica (frontend)**:
- `client/src/components/Chat/ChatView.tsx` — pill indicador
- `client/src/components/AgentStudio/AgentDetailContent.tsx` — tab Skills
- `client/src/components/Settings/` — nova seção
- `client/src/locales/en/translation.json` — keys `com_skills_*`

**Compartilhado**:
- `packages/data-provider/src/api-endpoints.ts` — endpoints `/api/skills/*`
- `packages/data-provider/src/data-service.ts` — funções de fetch
- `packages/data-provider/src/types/skills.ts` — types compartilhados
- `packages/data-provider/src/keys.ts` — QueryKeys/MutationKeys

---

## Referências

- [Claude Agent Skills (platform)](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic engineering blog: Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [agentskills.io — open standard](https://agentskills.io)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
