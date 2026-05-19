# Redesenho da criação de agentes

Data: 2026-05-19
Branch: `agentes/LEM-52`

## Problema

A tela de criação de agentes hoje é um formulário longo e técnico (Provider,
temperature/top_p, Recursion Limit, Agent Handoffs/edges, Agent Chain, Agent ID
read-only no meio do form). Está embutida "de forma abrupta" como coluna de 360px
dentro do `AgentStudioView` (`/d/agent-studio`, rotulado "Flows"), competindo por
espaço com o canvas. Não há nenhuma forma de testar o agente recém-criado dentro
da tela — o usuário precisa salvar e caçar um botão "Selecionar". O elo
agente↔flow já existe (nó `agent` no canvas lista agentes criados) mas é invisível.

## Objetivo

Transformar a criação de agentes numa experiência guiada e em linguagem simples,
em tela própria, onde o usuário (a) cria mexendo no mínimo, (b) testa o agente na
mesma tela, e (c) pode criar conversando com uma IA que monta o agente pra ele.

## Decisões (fechadas no brainstorm)

- Tela própria: nova rota **`/d/agentes`**, item "Agentes" no menu. Separada do
  canvas de flow.
- **`/d/agent-studio` → `/d/flows`**: renomear rota, href do menu, refs e label.
  O builder de agente sai de dentro do `AgentStudioView`.
- Desktop: **split** — Builder (form) à esquerda, painel à direita com toggle
  `[ 🛠 Construir | 💬 Testar ]`. Mobile: uma coluna, toggle segmentado
  `[ Configurar | Conversar ]`, estado preservado entre abas.
- Form: **progressive disclosure**. Primeira dobra só essencial (Nome+avatar,
  "O que esse agente faz?" = Instructions com placeholder que ensina, Categoria,
  toggles de capacidade em linguagem simples). Tudo técnico vai pra
  `▸ Ajustes avançados` colapsado, com modelo/params com default pré-selecionado.
- **🛠 Construir** = agente dedicado que edita o rascunho via tool call
  (`atualizar_rascunho`); **auto-apply** (campos mudam ao vivo, usuário edita
  depois); escopo **essencial + avançado** (pode mexer em modelo, params,
  ferramentas/ações, MCP). Único source of truth = o rascunho do form.
- **💬 Testar** = conversa com o agente rascunho de verdade (caminho de agente
  efêmero/draft executável).
- Agente salvo → CTA "Usar em um Flow →" leva pra `/d/flows`.

## Fora de escopo (YAGNI)

- Não reescrever o canvas de flow nem o motor de execução.
- No inspector do flow, único ajuste: "Model Override" texto-livre → dropdown
  (alinha com "tirar jargão"; entra na fase do flow, não na Fase 1).
- Sem versionamento novo. i18n só chave EN (padrão do fork; valor PT-BR).

## Arquitetura por fases

Entrega incremental, cada fase mergeável e commitada sozinha.

### Fase 1 — Tela própria + rename + form enxuto (ESTA FASE)

Escopo:

1. **Rename `/d/agent-studio` → `/d/flows`**
   - `client/src/routes/Dashboard.tsx`: `path: 'agent-studio'` → `path: 'flows'`.
   - `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`: `href: '/d/agent-studio'`
     → `href: '/d/flows'`.
   - Qualquer outra ref hardcoded ao path (toolbar/header do studio, redirects).
   - Label "Flows" (`com_ui_ux_nav_flows`) mantida.
2. **Extrair o builder de agente do `AgentStudioView`**
   - Remover a coluna de 360px (`AgentPanelSwitch`) de
     `client/src/components/AgentStudio/layouts/AgentStudioView.tsx`. `/d/flows`
     fica só com o canvas.
   - Nova rota `/d/agentes` renderizando o builder em tela cheia própria.
   - Novo item de menu "Agentes" em `useUnifiedSidebarLinks` (ícone próprio,
     antes de "Flows").
3. **Form enxuto (progressive disclosure)**
   - Reorganizar `AgentConfig`/`AgentPanel` para primeira dobra = essencial:
     Nome+avatar, "O que esse agente faz?" (relabel de Instructions + placeholder
     instrutivo), Categoria, bloco "O que ele pode fazer" (toggles em linguagem
     simples mapeando capacidades existentes: web search, code, file context/
     search unificados como "consultar arquivos", MCP/ações como "ferramentas
     externas").
   - Tudo técnico (Provider/Model + params, Recursion Limit, Handoffs, Chain,
     contato de suporte, Agent ID read-only) dentro de `▸ Ajustes avançados`
     colapsado por padrão.
   - Garantir um **modelo/provider default pré-selecionado** para um agente
     válido ser criável sem abrir "Avançado".
   - Sem mudança de payload/mutation: mesmos campos do
     `composeAgentUpdatePayload`, só reorganização de UI e cópia.

Não-objetivos da Fase 1: split, "Testar", "Construir com IA" (Fases 2 e 3).

### Fase 2 — Split + aba "💬 Testar"

Layout split (desktop) / toggle (mobile). Painel direito "Testar" conversa com o
agente rascunho. Risco técnico central: tornar o rascunho executável antes do
save formal (agente efêmero/draft auto-salvo). A validar no plano da Fase 2.

### Fase 3 — Aba "🛠 Construir" (agente que cria agentes)

Agente dedicado com ferramenta `atualizar_rascunho`; front aplica tool calls no
estado do rascunho (auto-apply, visível e editável). Escopo essencial+avançado.

## Riscos / a validar no plano de implementação

- Fase 1: refs ocultas ao path `/d/agent-studio` (backend, redirects, deep links).
  Estado de rota default `/d/*` (hoje redireciona pra `/d/studio`).
- Fase 1: o builder atual depende de contexto/providers do `AgentStudioView`?
  Confirmar que `AgentPanelSwitch` roda standalone numa rota nova.
- Fase 2: caminho de agente efêmero/draft executável no chat (`endpoint: agents`
  sem agente salvo).
- Fase 3: como um agente chama de volta no estado do form (tool call →
  react-hook-form), validação de config inválida vinda da IA.

## Critério de sucesso (Fase 1)

- `/d/flows` mostra só o canvas; `/d/agent-studio` não existe mais (sem rota
  morta / link quebrado no menu).
- `/d/agentes` cria um agente válido mexendo só em Nome + "O que faz" (+ talvez
  1 toggle), sem abrir "Avançado".
- Nenhum campo/recurso de criação perdido — só reorganizado/recolhido.
- Lint limpo; `client/vite.config.ts` fora de qualquer commit.
