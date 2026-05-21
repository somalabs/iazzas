# Decisão de Produto — Revisão UX/UI iazzas

**Épico:** LEM-52 | **Versão:** 1.0 | **Data:** 2026-05-18
**Produto:** iazzas — fork LibreChat para Azzas 2154 (varejo de moda, PT-BR, multi-tenant)
**Autor:** agente produto | **Status:** RATIFICADO — design e tech podem implementar

---

## Contexto e Princípios Transversais

O iazzas partiu do LibreChat genérico e acumulou features de produto (Studio de Imagens,
Studio de Agentes, Automações) sem revisitar a UX base. O resultado é um produto que **ainda
parece uma ferramenta genérica de chat IA** quando deveria parecer uma plataforma de trabalho
especializada para profissionais de moda da Azzas 2154.

As 5 áreas abaixo são tratadas na **ordem de prioridade de impacto** definida pelo Artur.
Cada decisão usa o Claude (claude.ai / Claude Code) como referência de benchmark e adapta
para a realidade multi-tenant, varejo de moda, PT-BR do iazzas.

### Princípios inegociáveis (herdados por design e tech)

1. **PT-BR obrigatório:** toda string user-facing via `useLocalize()`, chaves novas apenas em
   `client/src/locales/en/translation.json` (PT-BR é automatizado externamente). Padrão de
   prefixo para chaves novas neste épico: `com_ui_ux_*`.
2. **Sem regressão:** fluxos mantidos funcionam igual ou melhor; fluxos descontinuados não
   deixam pontas soltas (rotas 404, imports quebrados, toggles sem efeito).
3. **Melhoria mensurável:** cada área tem critérios de aceite quantificáveis abaixo.
4. **Não inventar fora do escopo:** se algo não está listado em "o que muda", não muda.

---

## Área 1 — Menu, Navegação e Hierarquia (Prioridade 1)

### Estado atual no iazzas

A sidebar tem dois componentes:
- **ExpandedPanel** (`UnifiedSidebar/ExpandedPanel.tsx`): coluna fixa de ícones com itens de
  painel (conversas, arquivos, etc.) + **BalanceWidget** + **AccountSettings** no rodapé.
- **AccountSettings** (`Nav/AccountSettings.tsx`): dropdown do avatar com:
  `My Files | Help/FAQ | Settings | Studio de Agentes | Studio de Imagens | Admin | Logout`

**Problema central:** as funcionalidades mais importantes do produto — Studio de Imagens,
Studio de Agentes e Automações — estão **enterradas no dropdown de conta**, ao lado de
"Logout". São tratadas como configurações de usuário, não como destinos principais de trabalho.
Rotas existentes no `Dashboard.tsx`: `/d/studio`, `/d/agent-studio`, `/d/automacoes`,
`/d/prompts`, `/d/admin`.

### Como o Claude resolve

O claude.ai separa claramente:
- **Navegação primária:** destinos de trabalho (novo chat, histórico, projetos) — sidebar principal.
- **Conta:** configurações de perfil, limites, billing — dropdown do avatar, sem cruzamento com
  destinos de trabalho.
- Claude Code faz o mesmo: o menu de ferramentas/features fica em nível de primeiro acesso;
  configurações de conta ficam separadas.

**Regra extraída:** destinos de trabalho nunca ficam no menu de conta; menu de conta é
exclusivo para operações sobre o perfil do usuário.

### Decisão adaptada ao iazzas

**Hierarquia nova:**

| Nível | Item | Onde fica | Visível para |
|-------|------|-----------|--------------|
| Primário | Studio de Imagens | Ícone sidebar (ExpandedPanel) | Todos |
| Primário | Studio de Agentes (Flows) | Ícone sidebar (ExpandedPanel) | Todos |
| Primário | Automações | Ícone sidebar (ExpandedPanel) | Todos |
| Primário | Chat (conversas) | Ícone sidebar — posição default | Todos |
| Secundário | Prompts | Ícone sidebar | Todos |
| Secundário | Admin | Ícone sidebar | Admins apenas |
| Conta | Meus Arquivos | Dropdown avatar | Todos |
| Conta | Ajuda / FAQ | Dropdown avatar | Todos |
| Conta | Configurações | Dropdown avatar | Todos |
| Conta | Logout | Dropdown avatar | Todos |

**Ordem dos ícones na sidebar (top → bottom):**
1. Novo Chat (botão ação, já existente)
2. Studio de Imagens (`/d/studio`)
3. Studio de Agentes (`/d/agent-studio`)
4. Automações (`/d/automacoes`)
5. *(separador visual)*
6. Conversas (histórico — painel dinâmico)
7. Prompts (`/d/prompts`)
8. Arquivos (painel dinâmico — My Files)
9. *(separador visual)*
10. Admin (`/d/admin`) — visível apenas se `isAdmin`

**Rodapé da sidebar (sem mudança estrutural):** BalanceWidget + AccountSettings (avatar).

**Dropdown de conta (simplificado):**
- Email do usuário (desabilitado, identificação)
- Saldo (se `balance.enabled`)
- *(separador)*
- Configurações
- Ajuda / FAQ
- *(separador)*
- Logout

`Studio de Agentes` e `Studio de Imagens` **saem** do dropdown de conta completamente.

### Escopo exato

**O que muda:**
- `ExpandedPanel.tsx`: adicionar 3 `NavIconButton` para Studio de Imagens, Studio de Agentes,
  Automações; reorganizar ordem dos itens; adicionar separadores visuais.
- `AccountSettings.tsx`: remover entradas "Agent Studio" e "Image Studio" do dropdown;
  simplificar para: email (disabled) → saldo (condicional) → separador → Settings → Ajuda →
  separador → Logout.
- Ícones: escolher ícones semânticos (sugestão: `ImageIcon` para Studio de Imagens, `GitFork`
  para Studio de Agentes, `CalendarClock` para Automações).
- Chaves i18n: `com_ui_ux_nav_studio_imagens`, `com_ui_ux_nav_studio_agentes`,
  `com_ui_ux_nav_automacoes`.

**O que NÃO muda:**
- Rotas (`Dashboard.tsx`) — os caminhos `/d/*` não mudam.
- Lógica de permissão de acesso às páginas (gates de PermissionTypes existentes).
- Componentes das páginas em si (Studio, AgentStudio, Automações).
- Comportamento de collapse/expand da sidebar.
- BalanceWidget — permanece no rodapé.

### Critérios de aceite

- [ ] Clicar em qualquer ícone dos Studios na sidebar navega para a rota correta.
- [ ] Dropdown de conta não contém mais links para Studios.
- [ ] Admin icon aparece apenas para usuários com `isAdmin = true`.
- [ ] Automações (`/d/automacoes`) acessível via ícone sidebar.
- [ ] Todos os labels dos ícones via `useLocalize()` com chaves `com_ui_ux_*`.
- [ ] Regressão zero: itens restantes do dropdown de conta (Configurações, Ajuda, Logout)
  continuam funcionando.
- [ ] Em mobile/sidebar colapsada: tooltips nos ícones mostram label correto.

---

## Área 2 — Tokens: Uso e Disponibilidade até a Virada (Prioridade 2)

### Estado atual no iazzas

**BalanceWidget** (`Nav/BalanceWidget.tsx`):
- Modo colapsado: ícone de moeda + tooltip `"Balance: {valor}"`, fica vermelho se < 1 crédito.
- Modo expandido: ícone + valor formatado + label "balance".
- Retorna `null` se `balance.enabled = false`.

**Settings > Balance** (`SettingsTabs/Balance/Balance.tsx`):
- Exibe saldo + conversão USD.
- Se `autoRefillEnabled`: mostra last refill, refill amount, interval, next refill (calculado).
- `credits.ts`: 1 display credit = 10.000 tokens raw; 1.000.000 tokens raw = $1 USD.

**Problema:** o widget mostra apenas um número. O usuário não sabe:
- Quanto usou neste ciclo.
- Quando o ciclo reseta.
- Se está em ritmo de esgotar antes da virada.

A `Balance.tsx` em Settings tem "next refill" mas não comunica isso como "virada" — e fica
enterrado em Settings, inacessível no fluxo de trabalho diário.

### Definição de produto: modelo de créditos do iazzas

O modelo atual de dados suporta **auto-refill periódico** (refill automático a cada N dias/
meses). No contexto corporativo do iazzas (Azzas 2154, usuários de time), este auto-refill
mensal É a "virada de ciclo" — a data em que o saldo retorna ao teto alocado.

**Decisão explícita de produto:** o iazzas usa **ciclo mensal fixo** como modelo de créditos.
"Virada" = próximo auto-refill mensal. Tech deve configurar o sistema para que cada workspace
tenha `refillIntervalUnit: 'month'` com `refillIntervalValue: 1` como padrão, com
`refillAmount` = teto do plano do workspace (configurado pelo admin).

**O usuário precisa ver:**
1. Saldo atual em display credits (não tokens raw).
2. Teto do ciclo (= `refillAmount`).
3. % consumido = `(teto - saldo) / teto`.
4. Data da próxima virada (= next refill, já calculada em `AutoRefillSettings`).
5. Indicador visual de risco: verde / amarelo / vermelho.

### Como o Claude resolve

O Claude.ai comunica limites de uso com:
- Uma barra de progresso indicando uso em relação ao limite.
- Linguagem simples: "X mensagens restantes até [data]" ou "Seu plano reseta em [data]".
- Cores semânticas: neutro (normal), âmbar (>70%), vermelho (>90%).
- Acesso rápido via ícone sempre visível na interface, não enterrado em settings.

Adaptação necessária: o iazzas usa créditos (não mensagens), então a lógica é a mesma mas a
unidade muda.

### Decisão adaptada ao iazzas

**Componente BalanceWidget revisado — dois estados:**

**Sidebar colapsada (ícone):**
- Ícone de moeda + mini progress ring (indicador de % consumido).
- Tooltip ao hover: `"847 créditos • Vira em 14 dias"`.
- Cor do ícone: cinza (< 70% consumido), âmbar (70–90%), vermelho (> 90%).

**Sidebar expandida (pill):**
```
[ícone]  847 / 1.000 créditos
         ████████░░  85%  •  Vira 01/06
```
- Barra de progresso horizontal (fill color acompanha o estado: verde/âmbar/vermelho).
- "Vira DD/MM" — data curta da próxima virada.
- Click no pill → abre Settings na tab Balance (comportamento já existente ou similar).

**Settings > Balance (reformulado):**
- Titulo da seção: "Ciclo atual" (não "Balance").
- Card de destaque: saldo atual / teto, barra de progresso, data da virada.
- Histórico dos últimos 3 ciclos: "Março 2026 — usou 923 / 1.000 créditos".
- Remover terminologia "auto-refill" da UI — exibir como "virada mensal" para o usuário.
  (A config técnica permanece como auto-refill internamente.)

### Escopo exato

**O que muda:**
- `BalanceWidget.tsx`: adicionar estado expandido com barra de progresso + "Vira DD/MM";
  lógica de cor baseada em % (não em `< 1 credit` absoluto); mini progress ring no modo
  colapsado.
- `Balance.tsx` (Settings): reformular como "Ciclo atual" com card destacado; renomear labels
  de "auto-refill" para "virada" na UI.
- `AutoRefillSettings.tsx`: renomear labels: "Próxima virada" (era "Next Refill"),
  "Créditos do ciclo" (era "Refill Amount").
- Novas chaves i18n: `com_ui_ux_balance_cycle`, `com_ui_ux_balance_vira_em`,
  `com_ui_ux_balance_creditos_ciclo`, etc.

**O que NÃO muda:**
- Model de dados (`tokenCredits`, `autoRefillEnabled`, `nextRefill`) — sem mudança de schema.
- Lógica de cálculo em `credits.ts` (toDisplayCredits, toRawCredits, formatDisplayCredits).
- `startupConfig.balance.enabled` como gate de visibilidade.
- Backend de créditos.

**Novo dado necessário (tech resolver):** o widget precisa do `refillAmount` (teto do ciclo)
para calcular %. Verificar se `useGetUserBalance` já retorna esse campo; se não, adicionar ao
endpoint de balance. Sem esse dado, barra de progresso não é implementável.

### Critérios de aceite

- [ ] BalanceWidget expandido mostra: saldo atual / teto + barra de progresso + "Vira DD/MM".
- [ ] Cor da barra: verde se < 70% consumido, âmbar se 70–90%, vermelho se > 90%.
- [ ] Tooltip no modo colapsado mostra saldo + data de virada.
- [ ] Settings > Balance redenomina "auto-refill" para "virada mensal" na UI.
- [ ] Click no widget navega para Settings > Balance tab.
- [ ] Se `balance.enabled = false`, widget não renderiza (comportamento mantido).
- [ ] Nenhum token raw exposto diretamente ao usuário (sempre display credits).

---

## Área 3 — Interface de Chat e Fluxo de Raciocínio (Prioridade 3)

### Estado atual no iazzas

**Dois sistemas coexistentes:**

| Sistema | Arquivo | Trigger | Status |
|---------|---------|---------|--------|
| Legacy | `Thinking.tsx` (338 linhas) | Delimitador `:::thinking:::` | Legado |
| Moderno | `Reasoning.tsx` (136 linhas) | `ContentTypes.THINK`, tags `<think>` | Canônico |

Ambos renderizam um bloco expansível com: lightbulb icon, label "Thoughts", conteúdo cinza,
botão de copy. Ambos controlados por `showThinkingAtom` (Jotai + localStorage, default `false`).

**Toggle:** Settings > Chat > "Show thinking" — liga/desliga se blocos começam expandidos.

**Problemas:**
1. Dois sistemas paralelos criam inconsistência visual e overhead de manutenção.
2. Default `false` (colapsado) é correto para resposta final, mas durante **streaming** o
   usuário fica sem feedback — a tela parece travar enquanto o modelo "pensa".
3. Label "Thoughts" em inglês — não segue PT-BR.
4. Toggle de Settings é uma solução de preferência permanente para o que deveria ser
   comportamento contextual (colapsado quando pronto, expandido durante processo).
5. `FloatingThinkingBar` no hover pode atrapalhar leitura em mobile.

### Como o Claude resolve

O claude.ai com Extended Thinking:
- Durante o processamento: exibe "Analisando..." com ícone animado (spinner/pulse), conteúdo
  parcialmente expandido para dar feedback de progresso.
- Quando completo: colapsa automaticamente, exibe "Ver raciocínio" como link/toggle discreto.
- O texto colapsado dá dica do volume: "Ver raciocínio (3 passos)" ou similar.
- Click expande com animação suave.
- Não há toggle global em settings — o comportamento é sempre contextual.
- Diferenciação visual clara: fundo levemente diferente, borda sutil, fonte menor.

**Princípio extraído:** raciocínio expandido = estado transitório (feedback durante processo),
não estado permanente. O toggle global em settings é um anti-padrão.

### Decisão adaptada ao iazzas

**Sistema canônico:** `Reasoning.tsx` é o único sistema a evoluir. `Thinking.tsx` permanece
apenas para renderizar mensagens já salvas no banco que usam `:::thinking:::` — não recebe
novas features, não é o default para novos modelos/endpoints.

**Comportamento novo:**

| Estado | Comportamento |
|--------|---------------|
| Streaming (modelo pensando) | Bloco expandido, label "Analisando...", shimmer/pulse animation |
| Streaming (resposta sendo escrita) | Bloco colapsado automaticamente, label "Ver raciocínio" |
| Resposta finalizada | Bloco colapsado, label "Ver raciocínio" com count de caracteres discreto |
| Usuário clicou "Ver raciocínio" | Bloco expandido, label muda para "Ocultar raciocínio" |

**Microcópia PT-BR (chaves i18n):**
- `com_ui_ux_reasoning_analisando` → "Analisando..."
- `com_ui_ux_reasoning_ver` → "Ver raciocínio"
- `com_ui_ux_reasoning_ocultar` → "Ocultar raciocínio"

**Remoção do toggle global:**
- `ShowThinking.tsx` (Settings > Chat) é removido.
- `showThinkingAtom` deixa de ser persistido em localStorage — vira estado local transitório
  por mensagem (cada mensagem tem seu próprio estado expand/collapse).

**Estilo visual (uniformizar entre Thinking.tsx e Reasoning.tsx):**
- Background: `bg-surface-secondary` (consistente com o design system existente).
- Borda esquerda: `border-l-2 border-border-medium`.
- Ícone: `BrainCircuit` (Lucide) — substitui o lightbulb atual; mais semântico para raciocínio.
- Animação durante streaming: pulse no ícone (CSS `animate-pulse`).

### Escopo exato

**O que muda:**
- `Reasoning.tsx`: implementar comportamento contextual de expand/collapse baseado em
  `isSubmitting` + `isLatestMessage`; trocar label para PT-BR via `useLocalize()`; trocar
  ícone para `BrainCircuit`; estado expand/collapse local por instância (não global).
- `showThinking.ts`: remover persistência localStorage; manter atom apenas como estado local
  transitório, ou remover completamente se Reasoning.tsx gerenciar seu próprio estado.
- `ShowThinking.tsx` (Settings): remover o toggle da aba Chat settings.
- `Thinking.tsx` (legado): manter para backward compatibility; NÃO alterar comportamento;
  NÃO adicionar features.

**O que NÃO muda:**
- `ContentTypes.THINK` e a lógica de parsing das tags `<think>`.
- Botão de copy (mantido em ambos os sistemas).
- `useExpandCollapse` hook (animação de altura).
- Backend — nenhuma mudança no servidor.

### Critérios de aceite

- [ ] Durante streaming com thinking ativo: bloco exibe "Analisando..." + ícone animado.
- [ ] Ao completar streaming: bloco colapsa automaticamente para "Ver raciocínio".
- [ ] Click em "Ver raciocínio" expande; label muda para "Ocultar raciocínio".
- [ ] Toggle "Show thinking" não existe mais em Settings > Chat.
- [ ] `Thinking.tsx` (legado) continua renderizando mensagens antigas sem alteração visual.
- [ ] Todos os labels em PT-BR via `useLocalize()`.
- [ ] Nenhuma regressão: modelos que não geram thinking não renderizam o bloco.

---

## Área 4 — Unificação da Criação de Agentes (Prioridade 4)

### Estado atual no iazzas

**Duas portas existentes:**

| Componente | Localização | O que faz |
|------------|-------------|-----------|
| `AgentPanel.tsx` | Sidebar lateral do chat | Criar/editar um agente (form: nome, modelo, tools, instruções) |
| `AgentStudioView` | `/d/agent-studio` (full page) | Montar um flow visual orquestrando múltiplos agentes |

**O problema não é duplicação — é ausência de hierarquia clara.** São features distintas:
- AgentPanel → trabalha no nível do **agente individual** (a entidade que tem instrução, modelo, tools).
- AgentStudio → trabalha no nível do **flow** (pipeline que encadeia agentes via canvas visual).

Mas para o usuário sem contexto técnico, ver "Studio de Agentes" no menu e "Agentes" na
sidebar do chat parece que são dois jeitos de fazer a mesma coisa. O resultado: confusão sobre
onde criar um agente, e qual é a "porta certa" para o trabalho que quer fazer.

### Como o Claude resolve

O Claude separa claramente:
- **Criar/configurar um assistente:** feito no painel de configuração de "Projects" ou
  "Custom Instructions" — edita um assistente individual.
- **Orquestrar múltiplos modelos/ferramentas:** feito na interface de "Tools" e "Projects"
  de nível de workspace — é um contexto diferente, com UI diferente.
- A diferença é comunicada pela **nomenclatura** e pelo **ponto de entrada**: não há ambiguidade
  porque os nomes descrevem o que é cada coisa.

**Princípio extraído:** nomeação resolvendo hierarquia > reestruturação técnica. Não é
preciso remover nem unificar os componentes — basta deixar clara a **distinção conceitual**
na UI.

### Decisão adaptada ao iazzas

**Modelo conceitual a comunicar:**

```
Agente = um assistente configurado (tem nome, persona, modelo, ferramentas)
Flow   = um pipeline que encadeia agentes (tem nós, condições, triggers)
```

Automação = um flow agendado (já ratificado em LEM-34)

**Renomeações e reframings:**

| Elemento atual | Decisão | Novo label |
|----------------|---------|------------|
| "Studio de Agentes" (menu) | Renomear | **"Flows"** |
| Rota `/d/agent-studio` | Manter rota | Label = "Flows" |
| AgentPanel (sidebar chat) | Manter, clarificar label | **"Agentes"** |
| Ícone sidebar (área 1) | Ícone de flows | `GitFork` ou `Workflow` |

**Comportamento da sidebar do chat (AgentPanel):**
- Label do ícone na sidebar: "Agentes" (não "Agent Studio").
- Ao abrir: exibe lista de agentes disponíveis + botão "Novo Agente".
- Criação/edição de agente acontece dentro deste painel — sem navegação para `/d/agent-studio`.
- AgentPanel não menciona "flows", não tem link para `/d/agent-studio`.

**Comportamento de `/d/agent-studio` (AgentStudio):**
- Título da página: "Flows" (não "Studio de Agentes").
- Subtítulo/tooltip: "Crie pipelines conectando múltiplos agentes".
- Quando o usuário arrasta um nó "Agente" no canvas e configura, ele **seleciona um agente
  existente** da lista — não cria um agente novo. Se não houver agente criado, exibir CTA
  "Crie um agente primeiro" com link para abrir AgentPanel no chat.
- Sem duplicação de criação de agentes: AgentPanel é a única porta para criar/editar agentes.

**Guideline de UX (para design):**
- Em todas as telas, "Agente" = assistente individual. "Flow" = pipeline. Nunca intercambiar.
- Tooltips e empty states devem reforçar a distinção.

### Escopo exato

**O que muda:**
- Label do menu nav: "Studio de Agentes" → "Flows" (chave: `com_ui_ux_nav_flows`).
- Título/heading da página `AgentStudioView.tsx`: "Flows" (chave: `com_ui_ux_flows_titulo`).
- Label do ícone sidebar para AgentPanel: "Agentes" (chave: `com_ui_ux_nav_agentes`).
- Nó "Agente" no canvas do AgentStudio: ao configurar, mostrar seletor de agentes existentes
  (não form de criação). Se lista vazia: exibir mensagem guia.
- AccountSettings.tsx: entrada renomeada de "Studio de Agentes" → removed (fluxo do Área 1).

**O que NÃO muda:**
- Rota `/d/agent-studio` — URL permanece (deep links não quebram).
- Estrutura interna do `AgentPanel.tsx` (react-hook-form, mutations, etc.).
- Estrutura do canvas ReactFlow no AgentStudio.
- Nenhuma mudança de permissões (ambos usam `PermissionTypes.AGENTS`).

### Critérios de aceite

- [ ] Menu de navegação exibe "Flows" (não "Studio de Agentes").
- [ ] AgentStudio page title/heading exibe "Flows".
- [ ] Painel sidebar do chat exibe "Agentes" como label.
- [ ] Nó Agente no canvas de Flows usa seletor de agentes existentes.
- [ ] Empty state do nó Agente com flow vazio exibe CTA de criação.
- [ ] Nenhuma tela usa "Studio de Agentes" como string visível ao usuário.
- [ ] Todos os labels via `useLocalize()`.

---

## Área 5 — Limpeza de Fluxos Secundários (Prioridade 5)

### Estado atual no iazzas

O LibreChat herda 14 permission types mapeados em `PERMISSION_TYPE_INTERFACE_FIELDS`
(`packages/data-provider/src/permissions.ts`). Cada um controla visibilidade de uma feature.
O `loadDefaultInterface` (`packages/data-schemas/src/app/interface.ts`) define o que aparece
via config do `librechat.yaml`.

### Auditoria completa

| Feature | Interface Field | Decisão | Justificativa | Risco se removido |
|---------|----------------|---------|---------------|-------------------|
| Agents | `agents` | **MANTER** | Core do produto — AgentPanel + AgentStudio dependem deste gate | Alto |
| Prompts | `prompts` | **MANTER** | Biblioteca de prompts usada como part do Studio de Imagens e workflows | Médio |
| Memories | `memories` | **MANTER** | Feature de memória de agentes — relevante para contexto persistente de moda | Médio |
| Web Search | `webSearch` | **MANTER** | Habilitado via MCP no stack do iazzas (LEM-12); profissionais de moda usam para pesquisa de tendência | Médio |
| Run Code | `runCode` | **MANTER** | Code interpreter presente na arquitetura (docs/iazzas-arquitetura.md) | Médio |
| File Search | `fileSearch` | **MANTER** | Busca em arquivos de referência (lookbooks, briefs) — fluxo real de moda | Médio |
| File Citations | `fileCitations` | **MANTER** | Complemento de fileSearch; sem risco de remoção mas vinculado | Baixo |
| MCP Servers | `mcpServers` | **MANTER** | Infra central do iazzas (proxy JWT, LEM-12); não tocado pela UX | Alto |
| Bookmarks | `bookmarks` | **OCULTAR** | Sem evidência de uso ativo no iazzas; overhead de UI sem ROI comprovado | Baixo (reversível) |
| Multi-Convo | `multiConvo` | **OCULTAR** | Multi-janela de conversa paralela aumenta carga cognitiva; sem caso de uso moda identificado | Baixo (reversível) |
| Temporary Chat | `temporaryChat` | **OCULTAR** | Chat sem histórico — faz sentido em contexto consumer, não corporativo com auditoria | Baixo (reversível) |
| People Picker | `peoplePicker` | **OCULTAR** | Seleção de usuário por mensagem — complexidade sem ROI no fluxo atual; reavaliado quando houver colaboração real-time | Baixo (reversível) |
| Marketplace | `marketplace` | **REMOVER** | Já desabilitado por padrão; marketplace de plugins externos é anti-padrão no modelo fechado iazzas/Azzas | Desprezível |
| Remote Agents | `remoteAgents` | **REMOVER** | Já desabilitado por padrão; fora de escopo v1 de acordo com LEM-33 | Desprezível |

**Componente Plugins Store** (`client/src/components/Plugins/Store/`):
- **REMOVER** da navegação e exports públicos.
- Justificativa: marketplace de plugins terceiros é incompatível com o modelo controlado do
  iazzas (multi-tenant corporativo, compliance de moda, MCP como padrão de integração).
- Risco: baixo — marketplace está desabilitado por padrão (USE: false na permissão).

### Semântica de "ocultar" vs "remover"

- **OCULTAR:** feature desativada por padrão no `librechat.yaml` do iazzas; código permanece
  no repo para facilitar reversão se houver demanda futura. Implementado via `defaultInterface`
  config (toggle false). Não requer mudança de código — apenas config.
- **REMOVER:** feature não aparece em nenhuma UI, link ou import público. Pode ser feito
  gradualmente: primeiro ocultar, depois em sprint subsequente deletar código se confirmado
  sem uso após 60 dias.

**Estratégia de implementação (tech):**
1. Fase 1 (este épico): todas as "OCULTAR" e "REMOVER" implementadas como `defaultInterface`
   false no `librechat.yaml` — mudança de config, sem tocar código.
2. Fase 2 (sprint +1, fora deste épico): remoção de código dos items "REMOVER" se confirmado
   zero uso.

### Escopo exato

**O que muda:**
- `librechat.yaml` (config de produção): settar como `false` nos campos:
  `bookmarks`, `multiConvo`, `temporaryChat`, `peoplePicker`, `marketplace`, `remoteAgents`.
- Verificar se há hardcoded references às features "ocultar/remover" em componentes que
  precisam de guarda condicional adicional (ex: menu items que não checam a permission).

**O que NÃO muda:**
- Código dos componentes (preservado para reversão fácil).
- Código do backend.
- Features "MANTER" — sem alteração.

### Critérios de aceite

- [ ] `bookmarks`, `multiConvo`, `temporaryChat`, `peoplePicker` não aparecem na UI em
  nenhuma tela (desabilitados via config).
- [ ] `marketplace` e `remoteAgents` não aparecem na UI (já eram false; confirmado na config).
- [ ] Plugin Store não aparece em nenhum menu ou ícone de navegação.
- [ ] Features "MANTER" continuam funcionando normalmente.
- [ ] Nenhuma rota 404 para features desabilitadas (redirects corretos se necessário).
- [ ] Nenhum import quebrado em componentes que referenciavam as features removidas.

---

## Sumário de Impacto Esperado

| Área | Problema resolvido | Métrica de sucesso |
|------|-------------------|-------------------|
| 1 — Menu/Nav | Studios enterrados em dropdown de conta | Tempo para acessar Studio de Imagens ≤ 1 click (era: 2 clicks em dropdown) |
| 2 — Tokens | Usuário não sabe quando créditos acabam | Widget exibe % consumido + data de virada sem navegar para Settings |
| 3 — Raciocínio | Tela "trava" durante thinking; labels em EN | Feedback visual durante streaming; zero labels EN em fluxo de raciocínio |
| 4 — Agentes | "Studio de Agentes" vs "Agentes" ambíguos | Zero reports de confusão entre "criar agente" e "criar flow" |
| 5 — Fluxos | 6 features desnecessárias poluem a interface | Interface com 6 menos items visuais; zero feature removal breaking existing workflows |

---

## Dependências entre Streams

```
Produto (este doc) → Design → Tech → QA
```

- **Design** recebe: este documento como fonte única de verdade de comportamento.
- **Tech** recebe: output de Design (mockups/specs visuais) + este documento para lógica.
- **QA** usa: critérios de aceite de cada área como checklist de validação.

Para a Área 2 (tokens), tech deve verificar antes de iniciar se `useGetUserBalance` retorna
`refillAmount`. Se não retornar, adicionar ao endpoint é pré-requisito para a barra de
progresso. Tech resolve e registra a decisão.

Para a Área 5 (fluxos secundários), a Fase 1 (config) é independente das outras áreas e pode
ser implementada imediatamente como quick win.
