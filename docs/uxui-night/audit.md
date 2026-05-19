# Auditoria crítica de UX/UI — Agent Studio + Automações

Run autônoma 2026-05-19 ~02:00 GMT-3. Branch `uxui/studio-automations-night`.
Evidência: `docs/uxui-night/shots/{baseline,after}/`, `repro-bug2.js`,
`spec-extract.md`. Severidade: 🔴 crítico · 🟠 alto · 🟡 médio · ⚪ menor.

## Sumário executivo

Os dois fluxos foram validados de forma rasa e isso aparece. O defeito mais
grave **não é cosmético**: automações eram visíveis e manipuláveis entre
usuários distintos (vazamento de privacidade + IDOR). O segundo problema
reportado ("não dá pra customizar agente") é real e tem **raiz de produto/IA**:
o menu promete "Studio de Agentes" mas entrega um construtor de *flows* que só
referencia agentes; a porta real de criar/customizar agente (modelo, MCP/tools)
não é descoberta pelo usuário. Ambos foram corrigidos nesta branch no escopo de
maior valor; o restante está priorizado abaixo.

---

## 🔴 #2 — Vazamento de automações entre usuários + IDOR  [CORRIGIDO]

**Reportado pelo Artur.** Root cause provado por código e DB:
`automationSchema.tenantId` não é `required`; no deploy single-instance do
iazzas os usuários **não têm `tenantId`** (confirmado no DB: todos `tenantId:
undefined`). `repository.listAutomations({ tenantId })` montava `query = {
tenantId: undefined }`, que casa **todas** as automações de **todos** os
usuários. Sem filtro por `createdBy`, `getAutomation/update/delete/runNow/
listRuns` permitiam **IDOR** (operar a automação de outro usuário pelo id).

Isso é defeito de privacidade/segurança, classe equivalente às lições de RBAC
do PR#6 — o contrato (LEM-44) só previu isolamento por tenant e ninguém
adaptou à realidade sem-tenant do iazzas.

**Fix (commit `a97b744`):** `ownerScope(createdBy)` defense-in-depth na
repository + controller passando `createdBy=req.user.id` em todas as rotas do
dono. `countEnabled` passou a contar por dono (no-tenant tornava o teto global,
acoplando usuários). 4 testes de owner-isolation; 13/13 verdes.
**Verificação ao vivo (HTTP) pendente** — backend exigia rebuild de
`packages/api` e o rollup ficou >50min sob contenção de recurso; fix
verificado a nível de unidade/controller. `repro-bug2.js` pronto para rodar
contra o backend reconstruído.

---

## 🟠 #1 — Criação/customização de agente: porta confusa  [CORRIGIDO no escopo de produto]

**Reportado pelo Artur.** A decisão de produto ratificada (LEM-52 Área 4) é
clara: o **AgentPanel nativo** é a porta única para criar/configurar agente
(nome, modelo, **tools/MCP**); o nó "Agente" do Studio só **seleciona** um
agente existente. O problema real não é falta de capacidade (o AgentPanel
suporta modelo e MCP) — é **ausência de hierarquia/descoberta**:

- O menu chama `/d/agent-studio` de "Studio de Agentes", sugerindo que é onde
  se cria agente; mas é um canvas de *flows*. (Decisão: renomear p/ "Flows".)
- O nó Agente expõe `modelOverride` como **input de texto livre**
  (`placeholder="gpt-4o"`) — inutilizável para usuário não-técnico, e contra a
  decisão (a customização não é no nó). 🟡 remanescente: ou remover o campo do
  nó (alinhar à decisão), ou trocar por seletor de modelos — decisão de produto.
- O composer do chat exibia **"Please select an Agent" em inglês cru** sem
  qualquer caminho para criar um agente.

**Fix (commit `622f198`):** rótulo estático **"Flows"** + separador na toolbar
(LEM-54 §4.2); **empty state com CTA "Criar um agente"** no AgentInspector
quando não há agentes (§4.3), levando ao chat onde o AgentPanel cria/customiza;
"Please select an Agent" → **"Selecione um agente para começar"** (PT-BR).
Verificado antes/depois via Playwright.

🟠 **Remanescente (produto, não fiz — fora do escopo seguro de uma run
autônoma):** renomear o item de menu "Studio de Agentes"→"Flows"
(`AccountSettings`/sidebar) e tornar o AgentPanel ("Agentes") visivelmente
descoberto na sidebar do chat. É o coração da Área 4 e precisa de varredura
de nav (Área 1) — recomendo fazer junto, não isolado.

---

## Outros achados (priorizados, NÃO corrigidos — decisão/риsco fora da run)

- 🟠 **`/d/automacoes` faz redirect silencioso para `/c/new`** quando o
  endpoint falha (visto no baseline, backend stale → 404). Sem estado de erro,
  sem aviso: o usuário "perde" a tela sem entender. Precisa de empty/error
  state próprio (a tela de automações não deve sumir em silêncio).
- 🟠 **Backend rodando estava stale** (build de 17:13, sem `/api/automacoes`).
  Indica que o processo de dev não tem watch/rebuild confiável — risco
  recorrente de "validação rasa" (testa-se UI contra backend velho). Recomendo
  `backend:dev` com watch + checagem de saúde de rota no boot.
- 🟡 **Studio canvas empty-state**: "Arraste nós da paleta para começar" — a
  spec (LEM-54 §4.4) pede mensagem em 2 níveis ("Nenhum flow criado ainda." +
  hint). Cópia menor; baixo esforço, não bloqueante.
- 🟡 **Toolbar import order** fora do padrão CLAUDE.md (react-router-dom
  deveria preceder lucide-react por comprimento) — lint passa; estético.
- 🟡 **AgentInspector `modelOverride`** (acima): decidir produto.
- ⚪ **Greeting do chat** renderiza com animação de digitação que deixa o
  texto "quebrado" em telas intermediárias — verificar se há flash perceptível
  em conexões lentas (não reproduzido como bug, só observado em screenshot).
- ⚪ **`detect-unused-i18n-keys`**: as 4 chaves novas estão todas referenciadas;
  sem dívida de i18n introduzida.

## Lacunas de validação desta run

- Repro HTTP ao vivo do #2 não executado (rebuild de `packages/api` travado em
  contenção). Mitigado por testes de unidade + script `repro-bug2.js` pronto.
- Não exercitei multi-usuário ao vivo via Playwright para o #2 (mesma causa);
  a prova é por código + DB + testes.
- Varredura ampla de UX (menu, tokens, raciocínio — Áreas 1/2/3 da LEM-52)
  fora do escopo entregue: priorizei os 2 bugs reportados, de maior impacto,
  com correção verificável, em vez de espalhar mudanças não testadas.
