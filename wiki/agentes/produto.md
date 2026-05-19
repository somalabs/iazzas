# Agente de Produto — Memória de Longo Prazo

> Atualizado em: 2026-05-18
> Escopo: fork LibreChat para Azzas 2154 (varejo de moda, multimarca: Farm, Animale, Cris Barros, etc.)
> Produto central desta fase: **Studio** (imagens de moda) + **Studio de Agentes** (orquestração visual) + **Automações** (agendamento de flows)

---

## Domínio: Studio de Geração de Imagens

### O que é o Studio

Interface de geração de imagens de moda construída sobre o fork do LibreChat. Não é um UI genérico
de IA — a proposta de valor está na **camada de prompt orchestration especializada em moda**,
não nos pesos dos modelos. "A inteligência de moda vive nos templates de prompt."

Sem templates de UC bem especificados, o Studio vira "mais um gerador de imagens genérico" —
risco explícito reconhecido pelo produto (e pelo próprio PRD).

### Produto de referência

O time já usa ativamente a plataforma Freepik (AI Image Generator), com modelos Nano Banana 2
e Nano Banana Pro. Os prompts são escritos em PT-BR com referências @img1..@imgN. O Studio
é a versão **guiada** desse fluxo: estrutura o que hoje é prompt livre em UCs tipados com form
fields, e constrói o prompt automaticamente. Isso reduz curva de aprendizado e aumenta consistência.

### Casos de Uso v1 (ratificados por Artur — LEM-20/LEM-22)

Os 5 UCs canônicos da v1, armazenados como YAML em `config/studio/usecases/`:

| ID | Nome PT | Arquivo | Modelo default |
|----|---------|---------|----------------|
| `color_variants` | Variantes de cor de um produto | `01-color-variants.yaml` | `flux-kontext` |
| `pattern_application` | Aplicar estampa em produto | `02-pattern-application.yaml` | `nano-banana-2` (Pro via router) |
| `virtual_tryon` | Produto em modelo (virtual try-on) | `03-virtual-tryon.yaml` | `nano-banana-pro` |
| `multi_reference` | Criação a partir de múltiplas referências | `04-multi-reference.yaml` | `nano-banana-pro` |
| `sketch_to_render` | Sketch-to-render | `05-sketch-to-render.yaml` | `nano-banana-pro` |

**Nota crítica para código**: Os `UseCase` types hardcoded em `client/src/components/Studio/types.ts`
(linha 15: `'product' | 'editorial' | 'lookbook' | 'lifestyle' | 'flatlay' | 'advanced'`) são
placeholder de uma implementação anterior — **devem ser substituídos pelos 5 UCs v1 acima**.
O tech stream (LEM-18 ou issue subsequente) precisa refatorar os tipos e os componentes `UCSelector`
e `UCForm` para consumir os YAML canônicos.

### Estrutura dos Templates YAML

Cada UC tem:
- `use_case`: ID snake_case
- `version`: semver (começar em `1.0.0`)
- `default_model` + `fallback_model`: IDs de modelo (confirmados — ver tabela abaixo)
- `ui_defaults`: `aspect_ratio`, `image_count` (4 = exploração, 1 = refinamento), `resolution`
- `image_slots`: slots de imagem tipados que o usuário fornece (required/optional, multiple/max_count)
- `form_fields`: campos de texto/select/toggle/boolean do formulário guiado
- `prompt_template`: template Handlebars-style em inglês com `{{placeholders}}` e `{{#if}}`
- `post_processing`: `upscale_if_below: 2048`, `apply_watermark: c2pa`
- `quality_signals`: sinais de QA automatizado por UC
- `compliance.requires_human_review`: obrigatório para UC3 e UC4

### Defaults por UC

| UC | Aspect Ratio | Imagens Default | Justificativa |
|----|-------------|-----------------|---------------|
| color_variants | 4:5 | 4 | Still e-commerce; exploração |
| pattern_application | 4:5 | 4 | Still e-commerce |
| virtual_tryon | 2:3 | 4 | Portrait/modelo |
| multi_reference | 4:5 | 4 | E-commerce default; editorial pode overridar |
| sketch_to_render | 4:5 | 4 | E-commerce; designer pode preferir 2:3 |

Refinamento (1 imagem) é configurável pelo usuário — não é default da v1.
Resolução default: **2K** para todos os UCs.

### Modelos (confirmados pelo PRD — LEM-22, 2026-05-16)

| ID | Nome | Uso |
|----|------|-----|
| `flux-kontext` | Flux Kontext | UC1: edição local rápida de colorway |
| `nano-banana-2` | Google Nano Banana 2 | UC2 default: volume/batch; fallback de UC3/4/5 |
| `nano-banana-pro` | Google Nano Banana Pro | UC2 via router, UC3, UC4, UC5: alta fidelidade |

**UC2 tem roteamento dinâmico**: default `nano-banana-2`; router faz upgrade para `nano-banana-pro`
se `intensity == full OR scale == extra-large`.

**UC3 (virtual try-on) nota**: se houver serviço dedicado de try-on no stack
(IDM-VTON, OOTDiffusion), deve ser preferido sobre nano-banana-pro. Tech stream deve avaliar
durante implementação — nota registrada no YAML.

---

## Vocabulário Técnico de Moda (usado nos prompts)

Termos que aparecem nos templates e devem ser preservados em inglês:

- **Silhouette** — forma geral e volume da peça
- **Drape** — como o tecido cai e se comporta com gravidade
- **Colorway** — combinação de cores de uma peça (ex: dusty rose / cobalt blue)
- **All-over print** — estampa que cobre toda a superfície
- **Placement print** — motivo único posicionado estrategicamente
- **Panel print** — estampa limitada a painéis do molde
- **Engineered print** — estampa projetada especificamente para o molde da peça
- **Flat lay** — produto fotografado deitado
- **Ghost mannequin** — manequim invisível (edição que remove o manequim da foto)
- **Specular highlights** — reflexos especulares (brilho direcional — importante para seda/couro)
- **Boucle** — tecido com superfície texturizada e irregular
- **Ripstop** — tecido técnico com grade de reforço visível
- **C2PA** — Content Credentials (padrão de proveniência para imagens geradas por IA)

---

## Decisões de Produto Ratificadas — Studio de Imagens

### v1 (LEM-20/LEM-22 — 2026-05-16)
- **5 UCs canônicos confirmados por Artur** (LEM-20 §7.1): color_variants, pattern_application, virtual_tryon, multi_reference, sketch_to_render.
- **Localização dos templates**: `config/studio/usecases/` — YAML versionado, não hardcoded em TypeScript.
- **Idioma dos prompts**: inglês (modelos respondem melhor; vocabulário técnico de moda em inglês).
- **Post-processing obrigatório para todos os UCs**: upscale mínimo 2048px + C2PA watermark.
- **Compliance**: revisão humana obrigatória antes de uso comercial para UC3 e UC4.
- **Refinamento**: 1 imagem (non-default) — exploração padrão é 4.
- **Resolução default**: 2K para todos os UCs.

### Pendências abertas — Studio de Imagens
- **UC3 (virtual try-on)**: tech stream deve avaliar se há serviço dedicado (IDM-VTON, OOTDiffusion) antes de usar nano-banana-pro.

---

## Domínio: Studio de Agentes

### O que é o Agent Studio

Aba full-page `/d/agent-studio` onde o usuário desenha visualmente (React Flow) um flow
encadeando agentes existentes. O flow é executado manualmente; histórico de runs fica em
drawer lateral. O Studio **não cria nem edita agentes** — apenas os orquestra.

### Artefatos de Spec (LEM-33 — 2026-05-18)

Criados em `config/agent-studio/`:

| Arquivo | Conteúdo |
|---------|----------|
| `CONTRACT.md` | Contrato autoritativo completo (nós, interpolação, RBAC, estados, i18n, ACs) |
| `nodes/01-trigger.yaml` | Contrato do nó Trigger |
| `nodes/02-agent.yaml` | Contrato do nó Agente |
| `nodes/03-condition.yaml` | Contrato do nó Condição |
| `nodes/04-http.yaml` | Contrato do nó HTTP |
| `nodes/05-human-approval.yaml` | Contrato do nó Aprovação Humana |
| `nodes/06-output.yaml` | Contrato do nó Saída |

### Decisões de Produto Ratificadas — Agent Studio (LEM-33)

#### Nós v1
- **6 tipos de nó**: Trigger (1 por flow), Agente, Condição, HTTP, Aprovação Humana, Saída (≥1 por flow).
- **Nó Agente**: referencia `agentId` (não duplica); handoffs do agente são suprimidos ao rodar como nó de flow.
- **Nó Condição**: SOMENTE operadores determinísticos (`equals`, `contains`, `regex`, `jsonpath_exists`). LLM-classifier = v2.
- **Nó HTTP**: requer allowlist via `FLOW_HTTP_ALLOWED_HOSTS`; verificação ANTES da request; erro não-retryável.
- **Nó Aprovação Humana**: pausa run (`paused`), cria inbox, encerra processamento; retomável via `POST /runs/:runId/resume`.
- **Nó Saída**: terminal; run → `success` ao ser alcançado; múltiplos nós Saída válidos (branches).

#### RBAC
- **Reutilizar `PermissionTypes.AGENTS`** — não criar novo PermissionType (lição LEM-31).
- CRUD de flows: `AGENTS.USE` + `AGENTS.CREATE/UPDATE/READ`; run/resume: `AGENTS.USE`.
- Multi-tenant: todo query filtra `tenantId`; cross-tenant → 404.

#### Interpolação
- Sintaxe: `{{trigger.input}}` e `{{nodeId.output}}`.
- Escopo: somente RunContext; nunca `process.env`.
- Placeholder ausente → string vazia + `logger.warn` (não erro fatal).

#### Estados de Run
- `running`, `paused`, `success`, `failed`, `skipped` (dead-end por Condição sem edge conectada).
- Snapshot do flow no disparo: `FlowRun.flowSnapshot`.

#### Restrições inegociáveis para code review/QA
1. Edge existente (`GraphEdge`) estendido, não duplicado.
2. Condição zero-LLM.
3. HTTP allowlist antes da request.
4. Erros scrubbed (sem vazar secrets).
5. Multi-tenant em todo query.
6. Snapshot no disparo.
7. Interpolação sem `process.env`.

#### Fora de escopo v1
- Condição LLM-classifier, agendamento (cron), versionamento de flows, nós custom, compartilhamento cross-tenant, execução paralela de branches, loops/recursão.

---

## Domínio: Automações

### O que é Automações

Aba full-page `/d/automacoes` que agenda flows do Agent Studio para rodar headless em horários
definidos. Não cria nem edita flows — orquestra. Épico LEM-34.

### Artefatos de Spec (LEM-34 — 2026-05-18)

| Arquivo | Conteúdo |
|---------|----------|
| `config/automacoes/CONTRACT.md` | Contrato autoritativo completo (RATIFICADO) |

### Decisões de Produto Ratificadas — Automações (LEM-34)

#### Gatilhos v1
- **Cron** (obrigatório na criação) + **manual** ("rodar agora", sempre disponível).
- Webhook = v2.
- Intervalo mínimo entre disparos: ≥ `AUTOMATION_MIN_INTERVAL_MIN` minutos (default 5 min).
- Expressão cron inválida ou abaixo do mínimo → 400.

#### Semântica de falha
- Run `failed` → para (sem retry v1), notifica createdBy, **automação CONTINUA habilitada** (não auto-desabilita).
- Sem retry em v1. Próximo run = próxima janela de cron.

#### Concorrência
- **Skip atômico**: se já existe run `running|paused` para o mesmo flow, não cria novo run.
- "Rodar agora" com run ativo → 409 `concurrentRunActive`.

#### Destinos do resultado (v1 — todos mandatory)
- Histórico de Runs: SEMPRE (FlowRun com `automationId`).
- Nova conversa: criada com `userId = createdBy`, título `<flowName> — DD/MM/YYYY HH:mm` (timezone da automação).
- Notificação in-app: enviada ao `createdBy`.
- E-mail/webhook = v2. Falha num destino = best-effort (não derruba o run).

#### Bloqueio inegociável: Aprovação Humana
- Salvar automação com flow que contém nó `human_approval` → **422 approvalNodeIncompatible**.
- Verificação no backend (POST/PUT) — frontend pode sinalizar, mas não é a barreira.
- Mensagem PT-BR: `"Este flow contém um nó de Aprovação Humana, que é incompatível com execuções automáticas. Remova o nó de Aprovação Humana antes de criar uma automação."`

#### Permissões
- **Nova `PermissionType` `AUTOMATIONS`** com bits `USE` e `CREATE`.
- Defaults: ADMIN = (USE: true, CREATE: true); USER = (USE: true, CREATE: true) — seguindo padrão de AGENTS.
- Interface field: `automations` (adicionar a `PERMISSION_TYPE_INTERFACE_FIELDS`).
- Teto: `AUTOMATION_MAX_ACTIVE_PER_TENANT` (default 20) automações `enabled: true` por tenant.

#### Modelo de dados
- `Automation`: `tenantId, flowId, name, cron, timezone, enabled, triggerInput?, outputTargets[], createdBy, lastRunAt?, lastStatus?, nextRunAt?`
- `FlowRun` ganha campo opcional `automationId?: ObjectId` (Épico 1 estendido).
- `nextRunAt` sempre UTC; converter para timezone da automação apenas na exibição.

#### Env vars (novo)
- `AUTOMATION_MIN_INTERVAL_MIN` (default 5)
- `AUTOMATION_MAX_ACTIVE_PER_TENANT` (default 20)

#### Endpoints
```
GET    /api/automacoes                → listar (cursor paginado)
POST   /api/automacoes                → criar (checkWrite)
GET    /api/automacoes/:id            → ler (checkRead)
PUT    /api/automacoes/:id            → editar (checkWrite)
DELETE /api/automacoes/:id            → deletar (checkWrite)
PATCH  /api/automacoes/:id/enabled    → toggle (checkWrite)
POST   /api/automacoes/:id/run        → rodar agora (checkRead)
GET    /api/automacoes/:id/runs       → histórico de runs (checkRead, cursor ObjectId)
```

#### Restrições inegociáveis (para code review/QA)
1. Bloqueio human_approval verificado no backend (não só frontend).
2. Skip atômico com transação MongoDB (sem race condition).
3. Automation.enabled nunca muda por falha de run — só por ação explícita do usuário.
4. Best-effort em destinos (conversa, notificação) — falha não propaga ao run.
5. Scrubbing em tudo que vai para destinos.
6. Multi-tenant em todo query Automation e FlowRun (quando filtrado por automationId).
7. Cron validado antes de qualquer write.
8. Teto verificado antes de write (não após).
9. nextRunAt em UTC.

#### Fora de escopo v1
Webhook como gatilho, e-mail/webhook como destino, retry automático, auto-desabilitar por N falhas,
agendamento por evento, versionamento, compartilhamento cross-tenant, notificação multi-usuário.

---

## Raciocínios Recorrentes do Produto

- **Valor está no template, não no modelo**: A troca de modelo é cirúrgica (1 linha no YAML). A qualidade dos prompts e o schema do formulário é onde o produto ganha ou perde. Priorizar qualidade dos templates.
- **Não inventar compliance além do PRD**: watermark C2PA e revisão humana obrigatória já estão no PRD. Não criar restrições adicionais sem base.
- **UC como "unidade fundamental"**: cada UC mapeia a um workflow completo com form schema, routing, prompt e QA. Não misturar UCs ou criar "modo avançado" que contorna os templates.
- **O Studio é a versão guiada do Freepik**: o time já usa Freepik com @img1..N e prompts livres. O Studio estrutura isso em UCs tipados. A intuição de produto sempre parte do que o time já faz na ferramenta de referência.
- **Reutilizar permissões existentes, não inventar**: `PermissionTypes.AGENTS` cobre flows de agentes. Criar novos PermissionTypes tem custo de migração e manutenção — evitar (lição LEM-31).
- **Automação ≠ auto-gestão**: automação que falha NÃO se desabilita — surpreenderia o usuário. O produto notifica e mantém habilitada; o usuário decide o que fazer.
- **Concorrência → skip, não fila**: enfileirar runs de automação criaria backlog invisível. Skip com notificação é comportamento previsível e controlável.
- **Best-effort para destinos de resultado**: o run é a fonte de verdade. Conversa e notificação são conveniências — falha nelas não pode matar o run.

---

## Estrutura de Arquivos Relevante

```
/repos/iazzas/
├── config/studio/                   # Studio de Imagens — fonte única de verdade dos UCs
│   ├── CONTRACT.md                  # Contrato design+tech (imagens)
│   ├── router.yaml                  # Lógica do Model Router
│   └── usecases/
│       ├── 01-color-variants.yaml
│       ├── 02-pattern-application.yaml
│       ├── 03-virtual-tryon.yaml
│       ├── 04-multi-reference.yaml
│       └── 05-sketch-to-render.yaml
├── config/agent-studio/             # Agent Studio — spec e contrato de produto (LEM-33)
│   ├── CONTRACT.md                  # Contrato autoritativo (RATIFICADO)
│   └── nodes/
│       ├── 01-trigger.yaml
│       ├── 02-agent.yaml
│       ├── 03-condition.yaml
│       ├── 04-http.yaml
│       ├── 05-human-approval.yaml
│       └── 06-output.yaml
├── config/automacoes/                   # Automações — spec e contrato de produto (LEM-34)
│   └── CONTRACT.md                      # Contrato autoritativo (RATIFICADO)
├── packages/data-provider/src/permissions.ts  # PermissionTypes e Permissions (RBAC)
├── packages/data-provider/src/roles.ts        # roleDefaults por SystemRole (ADMIN/USER)
├── packages/api/src/app/permissions.ts        # hasExplicitConfig + updateInterfacePermissions
├── packages/api/src/middleware/access.ts      # generateCheckAccess (RBAC)
├── api/server/routes/memories.js             # Padrão de rota com RBAC (referência)
└── client/src/components/Studio/             # UI do Studio de Imagens (em desenvolvimento)
```
