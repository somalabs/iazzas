# Agente de Produto — Memória de Longo Prazo

> Atualizado em: 2026-05-30
> Escopo: fork LibreChat para Azzas 2154 (varejo de moda, multimarca: Farm, Animale, Cris Barros, etc.)
> Produto central desta fase: **Studio** (imagens de moda) + **Flows/Studio de Agentes** (orquestração visual) + **Automações** (agendamento) + **Revisão UX/UI** (LEM-52) + **Copy com voz Azzas** (LEM-79)

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

## Domínio: Studio de Agentes / Flows

### O que é o Agent Studio / Flows

Aba full-page `/d/agent-studio` onde o usuário desenha visualmente (React Flow) um flow
encadeando agentes existentes. O flow é executado manualmente; histórico de runs fica em
drawer lateral. O Studio **não cria nem edita agentes** — apenas os orquestra.

**Renomeação LEM-52**: na UI, "Studio de Agentes" passa a se chamar **"Flows"**. A rota
`/d/agent-studio` permanece inalterada. "Agentes" na sidebar = AgentPanel (criação individual).

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

## Domínio: UX/UI — Revisão LEM-52

### Decisões ratificadas (2026-05-18)

Documento autoritativo: `config/ux-revisao/DECISAO.md`

| Área | Decisão-chave |
|------|---------------|
| 1 — Menu/Nav | Studios saem do dropdown de conta → ícones primários na sidebar |
| 2 — Tokens | Modelo = ciclo mensal; widget mostra barra de progresso + "Vira DD/MM" |
| 3 — Raciocínio | Reasoning.tsx canônico; expand durante streaming, collapse ao finalizar; labels PT-BR |
| 4 — Agentes | AgentPanel = "Agentes" (individual); AgentStudio = "Flows" (pipeline) |
| 5 — Fluxos | 6 features ocultadas/removidas: bookmarks, multiConvo, temporaryChat, peoplePicker, marketplace, remoteAgents |

### Nomenclatura canônica (LEM-52)

- **Agente** = assistente individual configurado (modelo, instrução, tools) — gerenciado pelo AgentPanel
- **Flow** = pipeline visual que encadeia agentes — gerenciado pelo AgentStudio (renomeado "Flows")
- **Automação** = flow agendado (cron) — gerenciado pelo Automações
- Nunca intercambiar "Agente" e "Flow" em UI ou docs.

---

## Domínio: Copy e Voz da Marca — LEM-79

### Princípios de voz Azzas (ratificados)

| Princípio | Descrição |
|-----------|-----------|
| **Acolhedor** | Como um colega da Azzas, não um sistema impessoal |
| **Preciso** | Sem jargão técnico, sem siglas HTTP, sem stack traces para o usuário |
| **Direto** | Frases curtas. Ação clara. Evitar "Por favor" em excesso |
| **Pessoal** | 3ª pessoa para o sistema ("a Azzas"), 1ª para o usuário |
| **PT-BR** | Contrações naturais, vocabulário coloquial-profissional |

### Estado da localização (auditoria LEM-79, 2026-05-30)

**Arquitetura**: LibreChat usa `useLocalize()` para 100% do texto visível ao usuário. Não há
strings hardcoded no UI — tudo passa por `client/src/locales/pt-BR/translation.json`.

**Componentes-chave**:
- `client/src/components/Chat/Landing.tsx` — empty state; usa saudações por horário
- `client/src/components/Chat/Input/ChatForm.tsx:319` — textarea com aria-label mas sem placeholder visível
- `client/src/utils/getLoginError.ts` — mapeia status HTTP → chave i18n (nunca expõe número HTTP diretamente)

**Lacunas identificadas**:
- `com_ui_late_night` ausente em PT-BR (saudação 0h–5h59)
- `com_ui_message_input` ausente em PT-BR (aria-label do textarea)
- Chave nova necessária: `com_ui_chat_placeholder` (placeholder visível — "Pergunte algo para a Azzas...")
- `ChatForm.tsx` usa apenas `aria-label`, sem atributo `placeholder` visível no textarea

### Decisões ratificadas — Copy (LEM-79, 2026-05-30)

**Erros de auth**: reescritos para voz Azzas. Regra: nenhum erro expõe código HTTP, "servidor",
"credenciais" ou "token" como jargão. Cada erro dá uma ação clara.

| Chave | Novo valor PT-BR |
|-------|-----------------|
| `com_auth_error_login` | "E-mail ou senha incorretos. Confira os dados e tente de novo." |
| `com_auth_error_login_rl` | "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." |
| `com_auth_error_login_ban` | "Seu acesso está temporariamente suspenso. Fale com o suporte para resolver." |
| `com_auth_error_login_server` | "Algo deu errado do nosso lado. Tente novamente em instantes." |
| `com_auth_error_login_unverified` | "Confirme seu e-mail antes de entrar — o link está na sua caixa de entrada." |
| `com_auth_error_oauth_failed` | "Não foi possível autenticar por esse caminho. Tente outro método de acesso." |
| `com_auth_error_create` | "Não conseguimos criar sua conta agora. Tente de novo." |
| `com_auth_error_invalid_reset_token` | "Este link de redefinição expirou. Solicite um novo." |

**Labels corrigidas**:
- `com_auth_sign_up`: "Inscrever-se" → "Criar conta"
- `com_ui_export_convo_modal`: "Exportar Modal de Conversação" → "Exportar conversa"

**Placeholder do input**: chave nova `com_ui_chat_placeholder` = "Pergunte algo para a Azzas..."
Requer: (1) adicionar chave ao JSON PT-BR e EN, (2) adicionar `placeholder={localize(...)}` no textarea de `ChatForm.tsx`.

**Documento autoritativo**: `config/copy/SPEC.md`

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
- **Nomeação resolve hierarquia sem reescrever código**: quando dois componentes parecem fazer a mesma coisa, a primeira correção é renomear/reframar para comunicar a distinção. (LEM-52: AgentPanel="Agentes", AgentStudio="Flows" — zero mudança estrutural.)
- **Destinos de trabalho nunca ficam no menu de conta**: Studios, Flows, Automações pertencem à sidebar primária. Menu de conta (avatar dropdown) = exclusivo para operações sobre perfil. (LEM-52 Área 1.)
- **"Virada" = auto-refill mensal reframado**: no modelo corporativo iazzas, auto-refill monthly IS a virada de ciclo. Não há novo sistema — apenas reframing de UX e exposição do `refillAmount` no widget. (LEM-52 Área 2.)
- **Toggle global vs comportamento contextual**: raciocínio/thinking expandido é estado transitório (feedback durante streaming), não preferência permanente. Comportamento correto: expand-durante-streaming, collapse-quando-pronto. Toggle de Settings é anti-padrão. (LEM-52 Área 3.)
- **Ocultar antes de remover**: features desnecessárias são primeiro desabilitadas via config, código preservado. Remoção de código vem após confirmar zero uso. Reduz risco, facilita reversão. (LEM-52 Área 5.)
- **Copy é a voz do produto, não decoração**: mensagens de erro sem voz de marca criam distância entre usuário e produto. "Erro interno no servidor" vs "Algo deu errado do nosso lado" — a diferença é quem assume a responsabilidade. (LEM-79.)
- **aria-label ≠ placeholder visível**: em formulários React, `aria-label` é para screen readers; o `placeholder` HTML é o texto visível quando o campo está vazio. Não confundir — o copy de marca precisa do atributo `placeholder`, não só do `aria-label`. (LEM-79.)

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
├── config/ux-revisao/               # Revisão UX/UI — decisão de produto (LEM-52)
│   └── DECISAO.md                   # Documento autoritativo das 5 áreas (RATIFICADO)
├── config/agent-studio/             # Agent Studio/Flows — spec e contrato de produto (LEM-33)
│   ├── CONTRACT.md                  # Contrato autoritativo (RATIFICADO)
│   └── nodes/
│       ├── 01-trigger.yaml ... 06-output.yaml
├── config/automacoes/               # Automações — spec e contrato de produto (LEM-34)
│   └── CONTRACT.md                  # Contrato autoritativo (RATIFICADO)
├── config/copy/                     # Copy e voz da marca — spec de produto (LEM-79)
│   └── SPEC.md                      # Documento autoritativo de copy (RATIFICADO)
├── packages/data-provider/src/permissions.ts  # PermissionTypes e Permissions (RBAC)
├── packages/data-provider/src/roles.ts        # roleDefaults por SystemRole (ADMIN/USER)
├── packages/api/src/app/permissions.ts        # hasExplicitConfig + updateInterfacePermissions
├── packages/api/src/middleware/access.ts      # generateCheckAccess (RBAC)
├── api/server/routes/memories.js             # Padrão de rota com RBAC (referência)
└── client/src/components/Studio/             # UI do Studio de Imagens (em desenvolvimento)
```
