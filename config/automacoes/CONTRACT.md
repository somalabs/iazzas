# Automações — Contrato de Produto v1

> Versão: 1.0.0
> Última atualização: 2026-05-18
> Escopo: `/d/automacoes` no fork iazzas do LibreChat
> Épico: LEM-34
> Status: **RATIFICADO** — não reabrir decisões aqui documentadas sem nova issue.

---

## 1. O que é Automações

Aba full-page acessível via `/d/automacoes` onde o usuário agenda flows do
**Agent Studio** (Épico 1) para rodar headless em horários definidos.

Uma **automação** é a combinação de:
- um flow (do Agent Studio) a ser executado,
- um gatilho (expressão cron) que define quando executar,
- um input pré-configurado para o nó Trigger do flow,
- destinos onde o resultado de cada run é publicado.

A aba **não cria nem edita flows** — ela os agenda. O Agent Studio é o
ambiente de autoria; Automações é o ambiente de operação.

---

## 2. O Recurso `Automation`

Campos canônicos do documento `Automation` (MongoDB):

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `tenantId` | ObjectId | ✅ | Tenant scope — todo query filtra por este campo |
| `flowId` | ObjectId | ✅ | Referência ao Flow do Agent Studio |
| `name` | string | ✅ | Nome legível da automação (max 200 chars) |
| `cron` | string | ✅ | Expressão cron válida (IANA-compatible, 5 campos) |
| `timezone` | string | ✅ | IANA timezone. Default: `"America/Sao_Paulo"` |
| `enabled` | boolean | ✅ | `true` = agendada ativa. Default: `true` |
| `triggerInput` | string? | — | Input pré-configurado para o nó Trigger do flow |
| `outputTargets` | string[] | ✅ | Em v1: sempre `["conversation", "notification"]` |
| `createdBy` | ObjectId | ✅ | userId que criou a automação |
| `lastRunAt` | Date? | — | Data/hora UTC do último run iniciado |
| `lastStatus` | string? | — | Status do último run: `"running"` \| `"success"` \| `"failed"` \| `"skipped"` |
| `nextRunAt` | Date? | — | Próximo disparo agendado (calculado do cron + timezone) |
| `createdAt` | Date | ✅ | Gerado pelo MongoDB |
| `updatedAt` | Date | ✅ | Atualizado em cada mutação |

### 2.1 `outputTargets` em v1

O campo `outputTargets` existe para acomodar v2 (e-mail, webhook). Em v1,
o array é sempre `["conversation", "notification"]` e é gerado automaticamente
pelo backend — o usuário não configura.

### 2.2 `FlowRun` — extensão para suportar Automações

O modelo `FlowRun` existente (Épico 1) recebe um campo opcional:

| Campo novo | Tipo | Descrição |
|-----------|------|-----------|
| `automationId` | ObjectId? | Quando presente, indica que o run foi disparado por uma automação |

Um run com `automationId != null` é um **AutomationRun**. Toda a lógica de
execução (estados, snapshot, interpolação) é reutilizada do Agent Studio sem
modificação.

---

## 3. Gatilhos v1

### 3.1 Tipos de gatilho

| Tipo | Descrição | Endpoint |
|------|-----------|----------|
| **Cron** | Disparo agendado por expressão cron | Scheduler interno |
| **Manual** | "Rodar agora" — disparo imediato pelo usuário | `POST /api/automacoes/:id/run` |

Ambos os tipos estão disponíveis para toda automação. O gatilho cron é
**obrigatório** na criação; "Rodar agora" é uma capacidade adicional sempre
disponível para automações habilitadas.

### 3.2 Expressão Cron

- Formato: **5 campos** (`minuto hora dia-mês mês dia-semana`).
- Exemplos válidos: `"0 9 * * 1"` (toda segunda às 09h), `"30 18 * * 1-5"` (dias úteis às 18h30).
- Intervalo mínimo entre disparos consecutivos: ≥ `AUTOMATION_MIN_INTERVAL_MIN` minutos (default: **5 min**).
- Expressão inválida ou que produza intervalo menor que o mínimo → **400** na criação/edição.

### 3.3 Validação de cron no save

Ao salvar (POST/PUT), o backend:
1. Parseia a expressão cron — erro de parse → 400, `"error": "cronInvalid"`.
2. Calcula os dois próximos disparos e verifica `Δt ≥ AUTOMATION_MIN_INTERVAL_MIN` — intervalo abaixo do mínimo → 400, `"error": "cronIntervalTooShort"`.
3. Calcula e persiste `nextRunAt` (UTC).

### 3.4 Webhook (v2 — fora de escopo)

Disparar automação via webhook externo é v2. Registrado como follow-up para
a issue sucessora deste épico.

---

## 4. Timezone

- Valor: string IANA (ex: `"America/Sao_Paulo"`, `"America/New_York"`).
- Default por automação: `"America/Sao_Paulo"`.
- O scheduler resolve o cron no timezone da automação — `nextRunAt` é
  armazenado e comparado em UTC.
- O título da conversa gerada no resultado usa o timezone da automação para
  formatar o timestamp legível (formato: `DD/MM/YYYY HH:mm`).
- Timezone inválido (não reconhecido pela lib de cron do backend) → 400.

---

## 5. Semântica de Falha

Run agendado que falha (estado `failed`):

1. `FlowRun.status` = `"failed"` (terminal — conforme estados do Épico 1).
2. `Automation.lastRunAt` e `Automation.lastStatus` = `"failed"` atualizados.
3. Notificação in-app enviada ao `createdBy` (best-effort — ver seção 6).
4. `Automation.enabled` **permanece `true`** — a automação continua agendada.
   Não há auto-desabilitação por falha em v1.
5. **Sem retry**: nenhuma tentativa de re-execução. O próximo run ocorre na
   próxima janela de cron.

> **Rationale**: auto-desabilitar por falha seria comportamento surpreendente —
> o usuário descobriria que uma automação "sumiu" sem aviso claro. Preferimos
> notificar e manter ativa; o usuário decide se desabilita manualmente.

---

## 6. Controle de Concorrência

### 6.1 Regra de skip

Antes de criar um novo `FlowRun` (seja por scheduler ou por "rodar agora"),
o backend verifica **atomicamente** se existe `FlowRun` com:
- `flowId` = `automation.flowId`
- `status` ∈ `{ "running", "paused" }`

Se sim: **skip** — o run não é criado. O scheduler registra um log de nível
`warn` com `{ automationId, flowId, reason: "concurrentRunActive" }`.

### 6.2 Atomicidade

A verificação usa `findOne` + `insertOne` dentro de uma **transação MongoDB**
(ou `findOneAndUpdate` com `upsert` condicionado) para garantir que dois
schedulers paralelos não criem runs simultâneos do mesmo flow.

### 6.3 Feedback para "rodar agora"

Quando o usuário clica "Rodar agora" e o skip ocorre, a API retorna:
- **409 Conflict**
- Body: `{ "error": "concurrentRunActive", "message": "Já existe uma execução ativa deste flow. Aguarde a conclusão antes de rodar novamente." }`

---

## 7. Destinos do Resultado

Todo run de automação publica seu resultado em três destinos:

| # | Destino | Sempre? | Configurável? |
|---|---------|---------|---------------|
| 1 | **Histórico de Runs** | ✅ Sempre | Não |
| 2 | **Nova conversa** | ✅ Sempre (v1) | v2 |
| 3 | **Notificação in-app** | ✅ Sempre (v1) | v2 |

### 7.1 Histórico de Runs

O `FlowRun` criado com `automationId` é automaticamente o registro histórico.
Acessível via `GET /api/automacoes/:id/runs` (ver seção 10).

### 7.2 Nova Conversa

Ao fim de cada run (estado `success`, `failed` ou `skipped`), o backend cria
uma `Conversation`:

| Campo | Valor |
|-------|-------|
| `userId` | `automation.createdBy` |
| `tenantId` | `automation.tenantId` |
| `title` | `"<flowName> — <DD/MM/YYYY HH:mm>"` (timezone da automação) |
| Mensagem inicial | Output do nó Saída do flow run (ou mensagem de erro se `failed`) |

- Se o run falhou antes de atingir o nó Saída, a mensagem inicial é:
  `"Execução falhou: <razão scrubbed>"`.
- Falha ao criar a conversa (ex: DB temporariamente indisponível) → **não
  derruba o run**; loga `warn` com `{ automationId, runId, target: "conversation" }`.

### 7.3 Notificação In-App

Notificação enviada ao `createdBy` ao fim de cada run:

| Campo | Valor |
|-------|-------|
| Tipo | `"automation_run"` |
| Título | `"<flowName>: execução concluída"` ou `"<flowName>: execução falhou"` |
| Body | Resumo do output (max 200 chars) ou motivo da falha (scrubbed) |
| Link | Deep-link para `GET /d/automacoes/<automationId>/runs/<runId>` |

- Falha ao enviar a notificação → **não derruba o run**; loga `warn`.

### 7.4 Best-Effort e Scrubbing

- Falha em qualquer destino (2 ou 3) é tratada como best-effort.
- O conteúdo de erros enviado a destinos (notificação, mensagem de conversa)
  deve passar pelo mesmo scrubbing de secrets aplicado ao `FlowRun.nodeError`
  (conforme restrições inegociáveis do Épico 1).

---

## 8. Bloqueio: Flows com Aprovação Humana

Salvar uma automação que referencia um flow contendo **qualquer nó de
Aprovação Humana** (`type === "human_approval"`) é proibido.

### 8.1 Quando verificar

Na criação (`POST /api/automacoes`) **e** na edição (`PUT /api/automacoes/:id`).
A verificação ocorre no backend, após autenticação e autorização.

### 8.2 Resposta de erro

- **Status HTTP**: `422 Unprocessable Entity`
- **Body**:
  ```json
  {
    "error": "approvalNodeIncompatible",
    "message": "Este flow contém um nó de Aprovação Humana, que é incompatível com execuções automáticas. Remova o nó de Aprovação Humana antes de criar uma automação."
  }
  ```

### 8.3 Validação no frontend

O frontend deve exibir a mensagem de erro verbatim (usando a chave i18n
`com_automacoes_error_approval_node`). A validação **não é preventiva no
frontend** — ela depende do backend para ser autoritativa.

---

## 9. Modelo de Permissão / RBAC

### 9.1 Autenticação de base

Todas as rotas de Automações exigem:
```javascript
router.use(requireJwtAuth);   // JWT + renovação OpenID + tenantContextMiddleware
router.use(checkBan);         // Verificação de ban por IP e usuário
```

### 9.2 Novo `PermissionType`: `AUTOMATIONS`

Criar `PermissionTypes.AUTOMATIONS = 'AUTOMATIONS'` em
`packages/data-provider/src/permissions.ts`.

**Bits de permissão v1**: `USE` e `CREATE`.

```typescript
export const automationPermissionsSchema = z.object({
  [Permissions.USE]: z.boolean().default(true),
  [Permissions.CREATE]: z.boolean().default(true),
});
export type TAutomationPermissions = z.infer<typeof automationPermissionsSchema>;
```

**Defaults por role** (espelhar `agentPermissionsSchema`):

| Role | USE | CREATE |
|------|-----|--------|
| ADMIN | `true` | `true` |
| USER | `true` | `true` |

### 9.3 Campo de interface e `PERMISSION_TYPE_INTERFACE_FIELDS`

Adicionar ao mapa `PERMISSION_TYPE_INTERFACE_FIELDS`:
```typescript
[PermissionTypes.AUTOMATIONS]: 'automations',
```

Adicionar ao `hasExplicitConfig` em `packages/api/src/app/permissions.ts`:
```typescript
case PermissionTypes.AUTOMATIONS:
  return interfaceConfig?.automations !== undefined;
```

### 9.4 Permissões por operação

| Operação | Permissões requeridas |
|----------|-----------------------|
| `GET /automacoes` (listar) | `AUTOMATIONS.USE` |
| `GET /automacoes/:id` (ler) | `AUTOMATIONS.USE` |
| `POST /automacoes` (criar) | `AUTOMATIONS.USE` + `AUTOMATIONS.CREATE` |
| `PUT /automacoes/:id` (editar) | `AUTOMATIONS.USE` + `AUTOMATIONS.CREATE` |
| `DELETE /automacoes/:id` | `AUTOMATIONS.USE` + `AUTOMATIONS.CREATE` |
| `PATCH /automacoes/:id/enabled` (toggle) | `AUTOMATIONS.USE` + `AUTOMATIONS.CREATE` |
| `POST /automacoes/:id/run` (rodar agora) | `AUTOMATIONS.USE` |
| `GET /automacoes/:id/runs` (histórico) | `AUTOMATIONS.USE` |

Padrão de implementação (espelhar `api/server/routes/memories.js`):
```javascript
const checkAutomationRead = generateCheckAccess({
  permissionType: PermissionTypes.AUTOMATIONS,
  permissions: [Permissions.USE],
  getRoleByName,
});
const checkAutomationWrite = generateCheckAccess({
  permissionType: PermissionTypes.AUTOMATIONS,
  permissions: [Permissions.USE, Permissions.CREATE],
  getRoleByName,
});
```

### 9.5 Teto por tenant

- Número máximo de automações com `enabled: true` por tenant: **20**
  (configurável via `AUTOMATION_MAX_ACTIVE_PER_TENANT`).
- Tentativa de habilitar (`enabled: true`) uma automação quando o teto está
  atingido → **422**:
  ```json
  {
    "error": "automationLimitReached",
    "message": "Limite de {{limit}} automações ativas atingido. Desabilite uma antes de criar ou habilitar outra."
  }
  ```
- O teto aplica-se a `enabled: true`. Automações desabilitadas não contam.

### 9.6 Multi-Tenant

- Todo documento `Automation` e todo `FlowRun` com `automationId` carrega `tenantId`.
- Todo query filtra por `tenantId: req.user.tenantId` — sem exceção.
- Acesso a recurso de outro tenant → **404** (não 403; não revelar existência).
- `tenantId` chega via `requireJwtAuth` → `tenantContextMiddleware` → `req.user.tenantId`.

---

## 10. Variáveis de Ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `AUTOMATION_MIN_INTERVAL_MIN` | `5` | Intervalo mínimo em minutos entre disparos consecutivos do mesmo cron |
| `AUTOMATION_MAX_ACTIVE_PER_TENANT` | `20` | Teto de automações com `enabled: true` por tenant |

---

## 11. Endpoints

### 11.1 Listar automações

```
GET /api/automacoes
```

Query params:
- `limit` (int, default 20, max 100)
- `before` (ObjectId, cursor para paginação)

Response `200`:
```json
{
  "automations": [ ...Automation[] ],
  "nextCursor": "<ObjectId | null>",
  "hasMore": true
}
```

### 11.2 Criar automação

```
POST /api/automacoes
```

Body (JSON):
```json
{
  "flowId": "<ObjectId>",
  "name": "string",
  "cron": "0 9 * * 1",
  "timezone": "America/Sao_Paulo",
  "triggerInput": "string (opcional)"
}
```

Response `201`: `{ "automation": Automation }`

Erros:
- `400` — cron inválido, timezone inválido, name vazio
- `400` — `"cronIntervalTooShort"` — intervalo abaixo do mínimo
- `404` — flow não encontrado no tenant
- `422` — `"approvalNodeIncompatible"` — flow contém Aprovação Humana
- `422` — `"automationLimitReached"` — teto de automações ativas atingido

### 11.3 Ler automação

```
GET /api/automacoes/:id
```

Response `200`: `{ "automation": Automation }`
Erro: `404` se não pertence ao tenant.

### 11.4 Editar automação

```
PUT /api/automacoes/:id
```

Body: mesmos campos de criação (todos opcionais; apenas campos enviados são atualizados).
Response `200`: `{ "automation": Automation }`

Erros: mesmos de criação + `404`.

### 11.5 Deletar automação

```
DELETE /api/automacoes/:id
```

Response `200`: `{ "deleted": true }`
Erro: `404` se não pertence ao tenant.

Runs históricos (`FlowRun` com `automationId`) **não são deletados** — permanecem
para auditoria.

### 11.6 Toggle enabled

```
PATCH /api/automacoes/:id/enabled
```

Body: `{ "enabled": boolean }`

- Habilitar (`true`) quando teto atingido → `422 automationLimitReached`.
- Response `200`: `{ "automation": Automation }` (com `enabled` e `nextRunAt` atualizados).

### 11.7 Rodar agora (trigger manual)

```
POST /api/automacoes/:id/run
```

Body: `{ "triggerInput": "string (opcional)" }` — se omitido, usa `automation.triggerInput`.

Comportamento:
- Aplica a mesma lógica de skip de concorrência (seção 6).
- Cria `FlowRun` com `automationId` e dispara execução.
- Response `202 Accepted`: `{ "runId": "<ObjectId>" }`.

Erros:
- `404` — automação não pertence ao tenant.
- `409` — `"concurrentRunActive"` — já existe run ativo para o flow.
- `422` — automação `enabled: false` → `{ "error": "automationDisabled", "message": "Habilite a automação antes de rodar." }`.

### 11.8 Listar runs de uma automação

```
GET /api/automacoes/:id/runs
```

Query params:
- `limit` (int, default 20, max 100)
- `before` (ObjectId, cursor — mesmo padrão do Agent Studio)

Response `200`:
```json
{
  "runs": [ ...FlowRun[] ],
  "nextCursor": "<ObjectId | null>",
  "hasMore": true
}
```

Filtra `FlowRun` por `automationId` + `tenantId`. Ordena por `createdAt` desc.

---

## 12. Paginação Cursor (ObjectId)

Reutiliza o padrão do Agent Studio (Épico 1):

- **Cursor = ObjectId do último item retornado** (`_id`).
- Query: `{ automationId, tenantId, _id: { $lt: before } }` ordenado por `_id desc`.
- `nextCursor` = `_id` do último item da página, ou `null` se não houver mais.
- `hasMore` = `true` se houver mais itens além da página atual.

---

## 13. Inventário de Chaves i18n PT-BR

Prefixo canônico: **`com_automacoes_`**

### 13.1 Navegação e título

```
com_automacoes_nav_label            "Automações"
com_automacoes_page_title           "Automações"
com_automacoes_page_subtitle        "Agende flows do Studio de Agentes para rodar automaticamente"
com_automacoes_empty_state          "Nenhuma automação ainda. Crie uma para começar."
com_automacoes_create_btn           "Nova automação"
```

### 13.2 Formulário de criação/edição

```
com_automacoes_form_name_label       "Nome"
com_automacoes_form_name_placeholder "Ex: Relatório semanal de coleção"
com_automacoes_form_flow_label       "Flow"
com_automacoes_form_flow_placeholder "Selecione um flow..."
com_automacoes_form_cron_label       "Agendamento (cron)"
com_automacoes_form_cron_placeholder "0 9 * * 1"
com_automacoes_form_cron_hint        "Formato: minuto hora dia mês dia-da-semana. Ex: '0 9 * * 1' = toda segunda às 09h."
com_automacoes_form_timezone_label   "Fuso horário"
com_automacoes_form_input_label      "Input para o flow (opcional)"
com_automacoes_form_input_hint       "Texto enviado ao nó Trigger do flow em cada execução"
com_automacoes_form_enabled_label    "Ativada"
com_automacoes_form_save_btn         "Salvar automação"
com_automacoes_form_cancel_btn       "Cancelar"
```

### 13.3 Lista de automações

```
com_automacoes_list_col_name        "Nome"
com_automacoes_list_col_flow        "Flow"
com_automacoes_list_col_schedule    "Agendamento"
com_automacoes_list_col_last_run    "Último run"
com_automacoes_list_col_status      "Status"
com_automacoes_list_col_next_run    "Próximo run"
com_automacoes_list_col_actions     "Ações"
com_automacoes_run_now_btn          "Rodar agora"
com_automacoes_edit_btn             "Editar"
com_automacoes_delete_btn           "Excluir"
com_automacoes_delete_confirm       "Excluir esta automação? Runs anteriores são preservados."
com_automacoes_toggle_enable        "Ativar"
com_automacoes_toggle_disable       "Desativar"
```

### 13.4 Status de runs

```
com_automacoes_run_status_running   "Em execução"
com_automacoes_run_status_success   "Concluído"
com_automacoes_run_status_failed    "Falhou"
com_automacoes_run_status_skipped   "Sem resultado"
com_automacoes_run_never            "Nunca executado"
com_automacoes_run_next_at          "Próximo: {{datetime}}"
com_automacoes_run_last_at          "Último: {{datetime}}"
```

### 13.5 Histórico de runs (drawer/página)

```
com_automacoes_runs_title           "Histórico de execuções"
com_automacoes_runs_empty           "Nenhuma execução ainda"
com_automacoes_run_started_at       "Iniciado em"
com_automacoes_run_duration         "Duração"
com_automacoes_run_input_label      "Input"
com_automacoes_run_output_label     "Output"
com_automacoes_run_view_convo       "Ver conversa gerada"
```

### 13.6 Erros e validações

```
com_automacoes_error_name_required       "Nome é obrigatório"
com_automacoes_error_flow_required       "Selecione um flow"
com_automacoes_error_cron_invalid        "Expressão cron inválida"
com_automacoes_error_cron_too_short      "O agendamento gera disparos com menos de {{min}} minutos de intervalo"
com_automacoes_error_timezone_invalid    "Fuso horário inválido"
com_automacoes_error_approval_node       "Este flow contém um nó de Aprovação Humana, que é incompatível com execuções automáticas. Remova o nó de Aprovação Humana antes de criar uma automação."
com_automacoes_error_limit_reached       "Limite de {{limit}} automações ativas atingido. Desabilite uma antes de criar ou habilitar outra."
com_automacoes_error_concurrent_run      "Já existe uma execução ativa deste flow. Aguarde a conclusão antes de rodar novamente."
com_automacoes_error_disabled_run        "Habilite a automação antes de rodar."
com_automacoes_save_success              "Automação salva"
com_automacoes_save_error                "Erro ao salvar automação"
com_automacoes_delete_success            "Automação excluída"
com_automacoes_run_triggered             "Execução iniciada"
com_automacoes_run_trigger_error         "Erro ao iniciar execução"
```

### 13.7 Notificação in-app

```
com_automacoes_notif_success_title  "{{flowName}}: execução concluída"
com_automacoes_notif_failed_title   "{{flowName}}: execução falhou"
com_automacoes_notif_view_run       "Ver execução"
```

---

## 14. Critérios de Aceite por Feature

### 14.1 Lista de automações (`/d/automacoes`)

- [ ] Página exibe lista de automações do tenant com: nome, flow, cron (legível), último run, status, próximo run.
- [ ] Toggle enable/disable funciona inline com feedback visual imediato.
- [ ] Botão "Rodar agora" inicia execução e exibe toast de confirmação.
- [ ] Botão "Rodar agora" exibe erro 409 se já houver run ativo.
- [ ] Botão "Excluir" abre confirmação antes de deletar.
- [ ] Estado vazio exibe mensagem e botão "Nova automação".
- [ ] Paginação cursor funciona (scroll infinito ou botão "Carregar mais").

### 14.2 Formulário de criação/edição

- [ ] Campo "Flow" lista apenas flows do tenant sem nó de Aprovação Humana (frontend pode filtrar visualmente, mas o bloqueio real é no backend).
- [ ] Campo "Agendamento" valida formato cron com feedback de erro.
- [ ] Campo "Fuso horário" exibe timezone atual e permite alterar.
- [ ] Ao salvar com flow incompatível (Aprovação Humana), exibe mensagem de erro da chave `com_automacoes_error_approval_node`.
- [ ] Ao salvar quando teto atingido, exibe mensagem `com_automacoes_error_limit_reached`.
- [ ] Salvar com sucesso redireciona para a lista e exibe toast de confirmação.

### 14.3 Histórico de runs

- [ ] Acessível via botão de detalhe em cada automação da lista.
- [ ] Lista runs com status, data de início, duração, link para conversa gerada.
- [ ] Run com status `failed` exibe motivo (scrubbed).
- [ ] Paginação cursor funciona.

### 14.4 Scheduler

- [ ] Runs são disparados no horário definido pelo cron (tolerância: ≤ 60s).
- [ ] Skip ocorre corretamente quando run anterior ainda está `running` ou `paused`.
- [ ] Falha num run não desabilita a automação — próximo run ocorre normalmente.
- [ ] Conversa é criada com título e output corretos após cada run.
- [ ] Notificação in-app é enviada ao `createdBy` após cada run.

### 14.5 RBAC e Multi-Tenant

- [ ] Usuário sem `AUTOMATIONS.USE` não vê o menu "Automações" na navegação.
- [ ] Usuário sem `AUTOMATIONS.CREATE` não consegue criar ou editar automações.
- [ ] Acesso a automação de outro tenant via URL direta retorna 404.
- [ ] Dropdown de flows no formulário lista apenas flows do próprio tenant.
- [ ] Runs históricos são filtrados por `tenantId` e `automationId`.

### 14.6 Segurança

- [ ] Erros de execução expostos em notificações e conversas passam por scrubbing.
- [ ] `triggerInput` armazenado não é logado em plaintext.
- [ ] Teto de automações ativas por tenant é verificado antes de habilitar ou criar com `enabled: true`.

---

## 15. Restrições Inegociáveis (checklist para design e tech)

Estas restrições devem ser verificadas em code review e QA:

- [ ] **Bloqueio de Aprovação Humana no backend**: toda criação e edição de automação verifica se o flow referenciado contém nó `human_approval`. Frontend UI é apenas sinalização — a autoridade é o backend.
- [ ] **Skip atômico**: a verificação de run concorrente usa transação ou operação atômica MongoDB — sem window de race condition entre dois schedulers simultâneos.
- [ ] **Sem retry automático**: nenhum mecanismo de retry após falha. O próximo run ocorre apenas na próxima janela de cron.
- [ ] **Automation.enabled não muda em falha**: o campo `enabled` só muda via ação explícita do usuário (toggle ou delete). Falha de run nunca seta `enabled: false`.
- [ ] **Best-effort em destinos**: falha ao criar conversa ou notificação não propaga erro para o run nem para o agendador.
- [ ] **Scrubbing em destinos**: output de run enviado para conversa e notificação deve passar pelo mesmo scrubbing do Épico 1.
- [ ] **Multi-tenant em todo query**: todo `find`/`findOne`/`updateOne` dos modelos `Automation` e `FlowRun` (quando filtrado por `automationId`) deve incluir `tenantId`.
- [ ] **Cron validation antes de persistir**: expressão inválida ou abaixo do intervalo mínimo → rejeitar com 400 antes de qualquer write.
- [ ] **Teto verificado antes de write**: checar `AUTOMATION_MAX_ACTIVE_PER_TENANT` antes de criar com `enabled: true` ou de habilitar — não após.
- [ ] **`nextRunAt` sempre UTC**: armazenar e comparar em UTC; converter para timezone da automação apenas na exibição.

---

## 16. Fora de Escopo (v1)

Registrado para evitar scope creep:

- Webhook como gatilho → v2
- E-mail como destino de resultado → v2
- Webhook como destino de resultado → v2
- Retry automático em caso de falha → v2
- Auto-desabilitação por N falhas consecutivas → v2
- Agendamento por evento (ex: "quando flow X concluir") → v2
- Versionamento de automações (histórico de edições) → v2
- Compartilhamento de automações entre tenants → v2
- Execução paralela de múltiplas instâncias da mesma automação → explicitamente proibido (skip)
- Notificação para outros usuários além do `createdBy` → v2
- Dashboard de métricas de automações (taxa de sucesso, latência) → v2
- Filtros de flows incompatíveis no seletor do frontend (é UX convenience, não bloqueio) → v2

---

## 17. Dependências e Interfaces

| Recurso | Onde vive | Nota |
|---------|-----------|------|
| `FlowRun` | `packages/data-schemas` (Épico 1) | Adicionar campo `automationId?: ObjectId` |
| `Flow` | `packages/data-schemas` (Épico 1) | Leitura para validar presença de `human_approval` |
| `PermissionTypes.AUTOMATIONS` | `packages/data-provider/src/permissions.ts` | Criar (novo enum value) |
| `automationPermissionsSchema` | `packages/data-provider/src/permissions.ts` | Criar (USE + CREATE) |
| `PERMISSION_TYPE_INTERFACE_FIELDS` | `packages/data-provider/src/permissions.ts` | Adicionar `AUTOMATIONS: 'automations'` |
| `hasExplicitConfig` | `packages/api/src/app/permissions.ts` | Adicionar case `AUTOMATIONS` |
| `roleDefaults` | `packages/data-provider/src/roles.ts` | Adicionar `AUTOMATIONS` aos defaults de ADMIN e USER |
| `permissionsSchema` | `packages/data-provider/src/permissions.ts` | Adicionar `AUTOMATIONS` ao schema raiz |
| `generateCheckAccess` | `packages/api/src/middleware/access.ts` | Reutilizar |
| `requireJwtAuth` | `api/server/middleware/requireJwtAuth.js` | Reutilizar |
| `checkBan` | `api/server/middleware/checkBan.js` | Reutilizar |
| `tenantContextMiddleware` | via `requireJwtAuth` | Automático |
| `AUTOMATION_MIN_INTERVAL_MIN` | env var (novo) | Default 5; validado no save do cron |
| `AUTOMATION_MAX_ACTIVE_PER_TENANT` | env var (novo) | Default 20; verificado antes de create/enable |
| Scheduler de cron | `packages/api` (novo) | Biblioteca recomendada: `node-cron` ou `cron` (confirmar com tech) |
| Sistema de notificação in-app | `packages/api` ou `api` (existente ou novo) | Confirmar com tech se existe mecanismo; se não, tech define |
| `Conversation` model | `packages/data-schemas` (existente) | Criar nova conversa por run |
