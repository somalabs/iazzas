# Spec extract — Agent Studio + Automações (Linear, projeto iazzas)

Fonte: Linear GraphQL, projeto `iazzas` (f7732bdd-c2fc-4b09-ad3a-71d8b81c68d6).
Issues-chave: LEM-33/35/36/37 (Studio de Agentes), LEM-34/44/45/46/48 (Automações),
LEM-52/53/54/55 (revisão UX/UI — 5 áreas). Decisões marcadas FINAIS no Linear.

## Agent Studio — `/d/agent-studio` (LEM-35, contrato autoritativo)

Aba full-page, canvas React Flow encadeando agentes existentes; executa manual;
histórico de runs. **6 tipos de nó v1**:

- **Trigger**: 1 campo `input` (string). Entrada única.
- **Agente**: referencia `agentId` (não duplica). Campos: **`instructionsOverride?`,
  `modelOverride?`**. Handoffs/edges próprios do agente são suprimidos no flow.
- **Condição**: determinística — `equals|contains|regex|jsonpath-exists` → `true`/`false`.
- **HTTP**: método/URL/headers/body interpolável; allowlist host via env obrigatória.
- **Aprovação humana**: pausa o run (`paused`), cria inbox, retomável.
- **Saída**: consolida resultado.

Interpolação `{{trigger.input}}` / `{{nodeId.output}}`; lookup só no RunContext.
RBAC: CRUD `requireJwtAuth`+`checkBan`; `runFlow`/`resumeFlow` atrás de
`generateCheckAccess`. **Multi-tenant: todo recurso tem `tenantId`, cross-tenant → 404.**
Estados run: `running|paused|success|failed|skipped`. Snapshot do flow no disparo.
i18n PT-BR padrão (`com_studio_flow_*`).

> **Bug conhecido #1 (Artur):** "criação de agentes não permite customizar nada
> (modelo mais leve, plugar MCP)". O contrato JÁ prevê `modelOverride` no nó Agente.
> Hipótese: campo existe no contrato mas não está exposto/wired no Inspector da UI;
> MCP não está no v1 do nó de flow (mas o builder nativo do LibreChat suporta tools/MCP
> — ver LEM-52 área 4: unificar criação de agentes, porta canônica única).

## Automações — `/d/automacoes` (LEM-44/46 contrato)

Agenda flows do Studio headless. Gatilhos v1: cron + manual. TZ default
`America/Sao_Paulo`. Falha → `failed`, para, notifica, **continua agendada**.
Concorrência: **skip atômico** se run ativo. Destinos: Histórico (sempre) + conversa
nova (dona=`createdBy`) + notificação in-app. Proibido salvar se flow tem nó
Aprovação humana (422).

Recurso `automation`: **`tenantId, flowId, cron, timezone, enabled, triggerInput?,
outputTargets[], createdBy, lastRunAt?, lastStatus?, nextRunAt`**.
RBAC: `PermissionType` `AUTOMATIONS` (CREATE/USE), padrão `AGENTS`. Índices
`{tenantId,enabled}`, `{tenantId,flowId}`. **Multi-tenant em TODO acesso; cross-tenant
→ 404.** LEM-48: `AUTOMATIONS` declarado no `rolePermissionsSchema` (role.ts).

> **Bug conhecido #2 (Artur):** "automação criada por um usuário aparece para todos
> os outros usuários nos seus logins". Improper sharing. Contrato exige escopo
> `tenantId` + `createdBy` em todo acesso. Hipótese: query de listagem não filtra por
> usuário/owner (ou só por tenant, e dev users compartilham tenant/sem tenant) →
> vazamento de privacidade. Defeito de segurança — prioridade máxima.

## Revisão UX/UI — LEM-52 (5 áreas, ordem = prioridade Artur)

1. **Menu/nav** — `client/src/components/UnifiedSidebar/*`, `Nav/AccountSettings.tsx`,
   `routes/Dashboard.tsx`. Hierarquia; LibreChat default vs. o que faz sentido.
2. **Tokens/uso+virada** — `Nav/BalanceWidget.tsx`, `Nav/SettingsTabs/Balance/*`,
   `utils/credits.ts`. Uso e quando reseta sempre acessível (benchmark Claude).
3. **Chat/raciocínio** — `Chat/Messages/Content/Parts/{Thinking,Reasoning}.tsx`,
   `store/showThinking.ts`. Streaming, expandir/colapsar, microcópia.
4. **Unificação criação de agentes** — `SidePanel/Agents/AgentPanel.tsx` (nativo)
   vs `components/AgentStudio/*` `/d/agent-studio`. Porta canônica única, sem duas
   portas confusas. **(Cobre o bug #1.)**
5. **Limpeza fluxos secundários** — ocultar fluxos herdados do LibreChat sem sentido
   pro iazzas, sem deixar ponta solta.

Benchmark: claude.ai / Claude Code. PT-BR padrão, `useLocalize()`, só chaves EN novas
em `client/src/locales/en/translation.json`. Acessibilidade semântica. Mobile+desktop.
Decisão de produto em `config/ux-revisao/DECISAO.md`; design em `config/ux-revisao/DESIGN.md`
(verificar se existem na branch).
