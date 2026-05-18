# Agent Studio — Contrato de Produto v1

> Versão: 1.0.0
> Última atualização: 2026-05-18
> Escopo: `/d/agent-studio` no fork iazzas do LibreChat
> Status: **RATIFICADO** — não reabrir decisões aqui documentadas sem nova issue.

---

## 1. O que é o Agent Studio

Aba full-page acessível via `/d/agent-studio` onde o usuário desenha visualmente
(React Flow) um flow encadeando agentes existentes. O flow pode ser executado
manualmente e o histórico de runs fica disponível em um drawer lateral.

O Studio **não cria nem edita agentes** — ele os orquestra. Cada nó de Agente é
uma referência a um agente já existente na plataforma.

---

## 2. Os 6 Tipos de Nó v1

Contratos detalhados em `config/agent-studio/nodes/`. Resumo:

| # | Tipo | ID interno | Finalidade |
|---|------|------------|------------|
| 1 | Trigger | `trigger` | Ponto de entrada único; recebe o input do usuário |
| 2 | Agente | `agent` | Executa um agente existente por referência |
| 3 | Condição | `condition` | Roteamento determinístico; sem LLM |
| 4 | HTTP | `http` | Chamada HTTP externa com allowlist obrigatória |
| 5 | Aprovação Humana | `human_approval` | Pausa o run; aguarda decisão humana |
| 6 | Saída | `output` | Terminal do flow; consolida resultado |

### 2.1 Regras Comuns a Todos os Nós

- Todo nó tem `id` (UUID gerado no frontend), `type` (um dos 6 acima) e `position` (x/y no canvas).
- Edges conectam nós: um `source` para um ou mais `targets`, com `handle` identificando
  a porta de saída (`default`, `true`, `false`).
- O modelo de edge reutiliza/estende o `GraphEdge` existente na codebase — tech não cria novo modelo.
- Campos de texto suportam interpolação `{{nodeId.output}}` — ver seção 3.

---

## 3. Semântica de Interpolação

### 3.1 Sintaxe

```
{{trigger.input}}        → valor do input fornecido pelo usuário no disparo
{{nodeId.output}}        → output do nó com o ID especificado
```

O `nodeId` deve ser o `id` do nó conforme definido no flow (UUID). A palavra `trigger`
é reservada e aponta sempre para o nó Trigger do flow corrente.

### 3.2 Escopo

- Lookup **somente no `RunContext`** (estado acumulado da execução em andamento).
- **Nunca acessa** `process.env`, variáveis globais, ou contexto de outra run.
- Interpolação é aplicada no momento de execução do nó, não no momento de salvar o flow.

### 3.3 Comportamento em Caso de Placeholder Ausente

- Placeholder que não existe no RunContext → substituído por **string vazia `""`**.
- Um aviso (`logger.warn`) é emitido com o nodeId e o nome do placeholder.
- A execução **continua** (não é erro fatal), exceto se o campo for obrigatório e
  o valor resultante vazio for inválido (e.g., URL do HTTP vazia → erro não-retryável).

### 3.4 Campos que Suportam Interpolação

| Nó | Campos interpoláveis |
|----|----------------------|
| Agente | `instructionsOverride` |
| Condição | `value` (lado direito do operador) |
| HTTP | `url`, `headers[*]`, `body` |
| Aprovação Humana | `prompt` |
| Saída | `template` |

Interpolação **não é aplicada** em campos estruturais (`agentId`, `operator`, `method`).

### 3.5 Profundidade

Interpolação é rasa (1 nível). `{{{{nested}}}}` não é avaliado recursivamente.

---

## 4. Modelo de Permissão / RBAC

### 4.1 Autenticação de Base

Todas as rotas do Agent Studio exigem:
```javascript
router.use(requireJwtAuth);        // JWT + renovação OpenID + tenantContextMiddleware
router.use(checkBan);              // Verificação de ban por IP e usuário
```

### 4.2 Permissão de Domínio

**Reutilizar `PermissionTypes.AGENTS`** — flows de agentes são extensão do domínio
de agentes existente. Não criar novo `PermissionType`.

| Operação | Permissões requeridas |
|----------|-----------------------|
| `GET /flows` (listar) | `AGENTS.USE` + `AGENTS.READ` |
| `GET /flows/:id` (ler) | `AGENTS.USE` + `AGENTS.READ` |
| `POST /flows` (criar) | `AGENTS.USE` + `AGENTS.CREATE` |
| `PUT /flows/:id` (editar) | `AGENTS.USE` + `AGENTS.UPDATE` |
| `DELETE /flows/:id` | `AGENTS.USE` + `AGENTS.UPDATE` |
| `POST /flows/:id/run` | `AGENTS.USE` |
| `POST /runs/:runId/resume` | `AGENTS.USE` |

Padrão de implementação (espelhar `api/server/routes/memories.js`):
```javascript
const checkFlowRead = generateCheckAccess({
  permissionType: PermissionTypes.AGENTS,
  permissions: [Permissions.USE, Permissions.READ],
  getRoleByName,
});
const checkFlowRun = generateCheckAccess({
  permissionType: PermissionTypes.AGENTS,
  permissions: [Permissions.USE],
  getRoleByName,
});
```

### 4.3 Multi-Tenant

- Todo documento no banco (`Flow`, `FlowRun`) carrega campo `tenantId`.
- Todo query filtra por `tenantId: req.user.tenantId` — sem exceção.
- Tentativa de acesso a recurso de outro tenant → **404** (não 403; não revelar existência).
- `tenantId` chega via `requireJwtAuth` → `tenantContextMiddleware` → `req.user.tenantId`.

---

## 5. Estados de Run

Um `FlowRun` tem exatamente um destes estados em qualquer momento:

| Estado | Significado para o usuário | Transições válidas |
|--------|---------------------------|--------------------|
| `running` | Execução em andamento | → `paused`, `success`, `failed`, `skipped` |
| `paused` | Aguardando aprovação humana | → `running` (após approve/reject), `failed` (após timeout, se configurado) |
| `success` | Flow concluído com êxito; nó de Saída atingido | terminal |
| `failed` | Erro irrecuperável (HTTP allowlist, agente falhou, timeout) | terminal |
| `skipped` | Todos os caminhos ativos terminaram em dead-end (Condição sem edge de saída conectada) sem atingir nó de Saída | terminal |

**Regra de snapshot**: no momento do disparo (`POST /flows/:id/run`), o estado
atual do flow é copiado para `FlowRun.flowSnapshot`. Edições posteriores ao flow
não afetam runs em andamento nem o histórico.

**Execução de nós individuais** (estado interno, visível no histórico):

| Estado do nó | Significado |
|-------------|-------------|
| `pending` | Ainda não iniciado |
| `running` | Em execução agora |
| `completed` | Concluído com sucesso |
| `skipped` | Bypassed por edge de Condição |
| `failed` | Erro neste nó |
| `waiting` | Aguardando aprovação humana (nó Human Approval) |

---

## 6. Inventário de Chaves i18n PT-BR

Prefixo canônico: **`com_studio_flow_`**

### 6.1 Paleta (sidebar/toolbox do canvas)

```
com_studio_flow_palette_title           "Nós disponíveis"
com_studio_flow_node_trigger            "Trigger"
com_studio_flow_node_agent              "Agente"
com_studio_flow_node_condition          "Condição"
com_studio_flow_node_http               "HTTP"
com_studio_flow_node_human_approval     "Aprovação Humana"
com_studio_flow_node_output             "Saída"
com_studio_flow_node_trigger_desc       "Ponto de entrada do flow"
com_studio_flow_node_agent_desc         "Executa um agente existente"
com_studio_flow_node_condition_desc     "Roteamento determinístico por condição"
com_studio_flow_node_http_desc          "Chamada HTTP externa"
com_studio_flow_node_human_approval_desc "Pausa para aprovação humana"
com_studio_flow_node_output_desc        "Consolida o resultado do flow"
```

### 6.2 Inspetor — Trigger

```
com_studio_flow_trigger_input_label     "Input"
com_studio_flow_trigger_input_hint      "Texto recebido ao disparar o flow"
```

### 6.3 Inspetor — Agente

```
com_studio_flow_agent_id_label          "Agente"
com_studio_flow_agent_id_placeholder    "Selecione um agente..."
com_studio_flow_agent_instructions_label "Instrução adicional (opcional)"
com_studio_flow_agent_instructions_hint  "Sobrescreve instruções do agente para esta execução. Suporta {{nodeId.output}}."
com_studio_flow_agent_model_label       "Modelo (opcional)"
com_studio_flow_agent_model_hint        "Deixe em branco para usar o modelo padrão do agente"
```

### 6.4 Inspetor — Condição

```
com_studio_flow_condition_operator_label "Operador"
com_studio_flow_condition_op_equals      "igual a"
com_studio_flow_condition_op_contains    "contém"
com_studio_flow_condition_op_regex       "regex"
com_studio_flow_condition_op_jsonpath    "jsonpath existe"
com_studio_flow_condition_value_label    "Valor"
com_studio_flow_condition_value_hint     "Suporta {{nodeId.output}}"
com_studio_flow_condition_edge_true      "Verdadeiro"
com_studio_flow_condition_edge_false     "Falso"
```

### 6.5 Inspetor — HTTP

```
com_studio_flow_http_method_label       "Método"
com_studio_flow_http_url_label          "URL"
com_studio_flow_http_url_hint           "Suporta {{nodeId.output}}. Host deve estar na allowlist."
com_studio_flow_http_headers_label      "Headers"
com_studio_flow_http_headers_add        "Adicionar header"
com_studio_flow_http_body_label         "Body"
com_studio_flow_http_body_hint          "Suporta {{nodeId.output}}"
com_studio_flow_http_timeout_label      "Timeout (ms)"
```

### 6.6 Inspetor — Aprovação Humana

```
com_studio_flow_approval_prompt_label   "Mensagem para o aprovador"
com_studio_flow_approval_prompt_hint    "Suporta {{nodeId.output}}"
com_studio_flow_approval_role_label     "Papel que pode aprovar (opcional)"
com_studio_flow_approval_role_hint      "Deixe vazio para qualquer usuário autenticado"
com_studio_flow_approval_timeout_label  "Timeout (horas, opcional)"
```

### 6.7 Inspetor — Saída

```
com_studio_flow_output_template_label   "Template de resultado (opcional)"
com_studio_flow_output_template_hint    "Suporta {{nodeId.output}}. Vazio = output do nó anterior."
com_studio_flow_output_label_label      "Rótulo"
com_studio_flow_output_label_hint       "Nome exibido no histórico de runs"
```

### 6.8 Runs Drawer

```
com_studio_flow_runs_title              "Histórico de execuções"
com_studio_flow_runs_empty              "Nenhuma execução ainda"
com_studio_flow_run_status_running      "Em execução"
com_studio_flow_run_status_paused       "Aguardando aprovação"
com_studio_flow_run_status_success      "Concluído"
com_studio_flow_run_status_failed       "Falhou"
com_studio_flow_run_status_skipped      "Sem resultado"
com_studio_flow_run_trigger_input_label "Input"
com_studio_flow_run_started_at          "Iniciado em"
com_studio_flow_run_duration            "Duração"
com_studio_flow_run_approve_btn         "Aprovar"
com_studio_flow_run_reject_btn          "Rejeitar"
com_studio_flow_run_approve_confirm     "Confirmar aprovação?"
com_studio_flow_run_reject_confirm      "Confirmar rejeição?"
```

### 6.9 Validação e Erros

```
com_studio_flow_error_no_trigger        "O flow precisa de um nó Trigger"
com_studio_flow_error_no_output         "O flow precisa de ao menos um nó Saída"
com_studio_flow_error_disconnected_node "Nó '{{label}}' não está conectado ao flow"
com_studio_flow_error_agent_required    "Selecione um agente"
com_studio_flow_error_url_required      "URL é obrigatória"
com_studio_flow_error_url_invalid       "URL inválida"
com_studio_flow_error_host_blocked      "Host não permitido pela política de segurança"
com_studio_flow_error_condition_value   "Informe o valor da condição"
com_studio_flow_error_approval_prompt   "Informe a mensagem para o aprovador"
com_studio_flow_error_interpolation     "Placeholder '{{placeholder}}' não encontrado — será tratado como vazio"
com_studio_flow_error_run_failed        "Execução falhou: {{reason}}"
com_studio_flow_save_success            "Flow salvo"
com_studio_flow_save_error              "Erro ao salvar flow"
com_studio_flow_run_started             "Execução iniciada"
com_studio_flow_run_error               "Erro ao iniciar execução"
```

---

## 7. Critérios de Aceite por Feature

### 7.1 Canvas (editor visual)

- [ ] Usuário consegue arrastar nós da paleta para o canvas.
- [ ] Usuário consegue conectar nós com edges (drag da porta de saída para porta de entrada).
- [ ] Cada tipo de nó renderiza ícone e label distintos.
- [ ] Clicar em um nó abre o inspetor lateral correto para aquele tipo.
- [ ] Usuário consegue deletar nós e edges individualmente.
- [ ] Canvas exibe mensagem de validação se flow não tiver Trigger ou não tiver Saída.
- [ ] Flow com nó desconectado exibe aviso visual no nó (não bloqueia salvar, bloqueia executar).
- [ ] Botão "Salvar" persiste o flow via `PUT /flows/:id`; feedback de sucesso/erro visível.
- [ ] Botão "Executar" abre modal de input (campo de texto) e dispara `POST /flows/:id/run`.

### 7.2 Inspetor de Nó — Trigger

- [ ] Campo `input` exibe o valor fornecido no disparo (read-only no inspetor, editável no modal de run).

### 7.3 Inspetor de Nó — Agente

- [ ] Dropdown de seleção de agente lista apenas agentes do tenant corrente.
- [ ] Campos `instructionsOverride` e `modelOverride` são opcionais e exibem hint de interpolação.
- [ ] Ao selecionar agente, exibe nome e avatar do agente selecionado.

### 7.4 Inspetor de Nó — Condição

- [ ] Select de operador exibe as 4 opções: equals, contains, regex, jsonpath-exists.
- [ ] Campo `value` aceita interpolação; hint exibido.
- [ ] Nó exibe duas portas de saída claramente rotuladas "Verdadeiro" e "Falso".

### 7.5 Inspetor de Nó — HTTP

- [ ] Select de método exibe: GET, POST, PUT, PATCH, DELETE.
- [ ] Campo URL valida formato e exibe erro se vazio ao salvar.
- [ ] Headers: lista de pares chave/valor com botão "Adicionar header".
- [ ] Campo Body visível apenas para métodos POST/PUT/PATCH.
- [ ] Timeout tem default 10000ms e aceita apenas inteiros positivos.

### 7.6 Inspetor de Nó — Aprovação Humana

- [ ] Campo `prompt` obrigatório; erro de validação se vazio.
- [ ] Campo `assignee_role` opcional; dropdown com roles disponíveis no tenant.
- [ ] Campo `timeout_hours` opcional; aceita apenas inteiros positivos.

### 7.7 Inspetor de Nó — Saída

- [ ] Campo `template` opcional; hint de interpolação exibido.
- [ ] Campo `label` opcional; padrão "Saída" se vazio.

### 7.8 Runs Drawer

- [ ] Botão "Histórico" no header abre drawer lateral com lista de runs.
- [ ] Cada run exibe: status (com cor semântica), input, data de início, duração.
- [ ] Run em status `paused` exibe botões "Aprovar" e "Rejeitar" com modal de confirmação.
- [ ] Clicar em um run expande o detalhamento passo a passo dos nós executados.
- [ ] Status de cada nó no detalhamento exibe ícone + label (pending/running/completed/skipped/failed/waiting).

### 7.9 RBAC e Multi-Tenant

- [ ] Usuário sem permissão `AGENTS.USE` não vê o menu "Agent Studio" na navegação.
- [ ] Usuário sem `AGENTS.CREATE` não consegue criar flows (botão desabilitado + 403 na API).
- [ ] Tentativa de acessar flow de outro tenant via URL direta retorna 404.
- [ ] Dropdown de agentes no nó Agente lista apenas agentes do próprio tenant.

### 7.10 Segurança — HTTP Node

- [ ] Nó HTTP com host fora da `FLOW_HTTP_ALLOWED_HOSTS` retorna erro não-retryável imediato.
- [ ] Erro de HTTP node **não expõe** URL completa, headers, body ou secrets no output do run.
- [ ] Allowlist vazia (`FLOW_HTTP_ALLOWED_HOSTS` não configurada) bloqueia **todas** as requests HTTP.

---

## 8. Restrições Inegociáveis (checklist para design e tech)

Estas restrições devem ser verificadas explicitamente em code review e QA:

- [ ] **Edge existente**: nó de Condição usa/estende `GraphEdge` existente. Não criar modelo paralelo.
- [ ] **Condição zero-LLM**: operador `condition` é sempre determinístico. Qualquer referência a LLM ou scoring → bloquear.
- [ ] **HTTP allowlist antes da request**: a verificação de host ocorre **antes** de qualquer I/O de rede. Erros de allowlist são `failed` (não retryável).
- [ ] **Scrubbing de erros**: logs e output de run nunca incluem valores de headers de autenticação, query params com tokens, ou body com secrets. Implementar scrubbing antes de persistir `nodeError`.
- [ ] **Multi-tenant em todo query**: sem exceção; revisão de PR deve checar todos os `findOne`/`find`/`updateOne` dos modelos `Flow` e `FlowRun`.
- [ ] **Snapshot no disparo**: `FlowRun` armazena cópia do flow. Consulta de run usa `flowSnapshot`, nunca o flow atual.
- [ ] **Interpolação sem `process.env`**: grep por `process.env` dentro de qualquer helper de interpolação → bloquear.

---

## 9. Fora de Escopo (v1)

Registrado para evitar scope creep:

- Condição com LLM-classifier → v2
- Agendamento automático de flows (cron) → v2
- Versionamento de flows (histórico de edições) → v2
- Nós custom / extensibilidade via plugin → v2
- Compartilhamento de flows entre tenants → v2
- Execução em paralelo de múltiplos branches → v2 (v1: execução linear)
- Loops / recursão entre nós → explicitamente proibido em v1 (validação no save)

---

## 10. Dependências e Interfaces

| Recurso | Onde vive | Nota |
|---------|-----------|------|
| `GraphEdge` | `packages/data-provider` (existente) | Estender, não duplicar |
| `PermissionTypes.AGENTS` | `packages/data-provider/src/permissions.ts` | Reutilizar |
| `generateCheckAccess` | `packages/api/src/middleware/access.ts` | Reutilizar |
| `requireJwtAuth` | `api/server/middleware/requireJwtAuth.js` | Reutilizar |
| `checkBan` | `api/server/middleware/checkBan.js` | Reutilizar |
| `tenantContextMiddleware` | via `requireJwtAuth` | Automático |
| `FLOW_HTTP_ALLOWED_HOSTS` | env var (novo) | Semântica: hostnames separados por vírgula; ancorados (sem wildcards em v1) |
| Agentes existentes | `packages/api` + `packages/data-schemas` | Flows referenciam por `agentId` |
| React Flow | `client` (biblioteca a confirmar com tech) | Canvas visual |
