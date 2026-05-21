# Agentes Fase 2 — Split + "💬 Testar"

Data: 2026-05-19
Branch: nova branch a partir de `main` (ou continuação de `agentes/LEM-52`)

## Objetivo

Adicionar o painel "💬 Testar" à tela `/d/agentes`, com layout split resizável no
desktop e toggle segmentado no mobile. O usuário conversa com o agente em rascunho
sem nenhum DB write — e só cria o agente ao clicar **Publicar**.

## Decisões fechadas

- **Layout desktop**: split resizável (divisor arrastável). Largura inicial 40% form /
  60% chat. Sem biblioteca externa — implementar com CSS flex + drag handle nativo.
- **Mobile**: toggle segmentado `[⚙ Configurar | 💬 Conversar]` no topo da tela.
  Estado do formulário preservado ao alternar abas.
- **Testar = efêmero puro**: zero DB write. O painel de chat envia a requisição com
  `agent_id: Constants.EPHEMERAL_AGENT_ID`, `promptPrefix: instructions`,
  `ephemeralAgent: { web_search, file_search, execute_code, mcp }`, e os parâmetros
  de modelo/endpoint da conversa. Nenhum agente é criado ou modificado no banco.
- **Publicar**: botão verde "✦ Publicar" (no lugar de "Criar") na footer do form.
  Chama a mesma mutation de criação já existente. Aparece só para agentes novos
  (sem `agent_id`). Agentes já publicados mantêm o botão "Salvar" normal.
- **Tab "🛠 Construir"**: visível mas desabilitada com badge "Fase 3". Reserva espaço
  visual para a fase seguinte sem código de implementação.
- Conversas de teste são salvas normalmente no histórico do usuário (é comportamento
  padrão do chat); o que NÃO é salvo é a configuração do agente.

## Fora de escopo

- Versionamento de rascunhos.
- Indicador de "mudanças não publicadas" em agentes existentes (isso seria Fase 2b se
  a equipe quiser).
- Qualquer mudança no canvas `/d/flows`.
- Resize com biblioteca (react-resizable-panels etc.) — implementar com CSS puro
  primeiro; se houver problema de UX abrir task separada.

## Arquitetura

### Componentes novos

#### `client/src/components/Agentes/AgentesLayout.tsx`
Novo wrapper que contém o split. Responsabilidades:
- Gerencia estado do divisor (`splitPos: number`, default `40`).
- No desktop (≥768px): dois painéis com `flex`, divisor arrastável no meio.
- No mobile (<768px): renderiza o toggle segmentado + mostra um dos dois painéis
  conforme `activeTab: 'config' | 'chat'`.
- Exporta `AgentesLayout` como default.

#### `client/src/components/Agentes/DragHandle.tsx`
Divisor arrastável. Gerencia o `mousedown`/`mousemove`/`mouseup` e dispara
`onResize(newPos: number)`. Renderiza a barra vertical com grip visual.

#### `client/src/components/Agentes/TestPanel.tsx`
Painel direito "💬 Testar". Responsabilidades:
- Lê `AgentDraftContext` para obter os valores atuais do form.
- Gerencia `conversationId` local (`useRef<string | null>`): `null` = nova conversa.
- Renderiza `<PreviewChatView conversationId={...} draftParams={...} />`.
- Tab bar: "💬 Testar" (ativa) e "🛠 Construir" (desabilitada, badge "Fase 3").
- Badge amarelo no chat "Rascunho efêmero — não salvo".

#### `client/src/components/Agentes/PreviewChatView.tsx`
Versão do `ChatView` adaptada para o painel de preview. Diferenças do `ChatView`:
- Aceita `conversationId` como prop (não usa `useParams()`).
- Aceita `draftParams: AgentDraftParams` para injetar na requisição.
- Quando `conversationId` é `null`, passa `Constants.NEW_CONVO` para os hooks.
- Expõe callback `onConversationCreated(id: string)` para `TestPanel` armazenar o
  `conversationId` gerado após a 1ª mensagem (via `useRef`) e reutilizá-lo nas
  mensagens seguintes em vez de criar uma nova conversa a cada envio.

#### `client/src/Providers/AgentDraftContext.tsx`
Contexto leve que `AgentPanel` preenche e `TestPanel` consome.

```ts
export type AgentDraftParams = {
  provider: string;     // EModelEndpoint ou custom endpoint value
  model: string;
  instructions: string;
  webSearch: boolean;
  fileSearch: boolean;
  executeCode: boolean;
  mcpServers: string[]; // nomes dos MCP servers selecionados no form
};

type AgentDraftContextValue = {
  draftParams: AgentDraftParams;
  setDraftParams: (params: AgentDraftParams) => void;
};
```

`AgentPanel` adiciona um `useEffect` que observa os campos relevantes via
`useWatch` e chama `setDraftParams` com debounce (300ms).

### Componentes modificados

#### `client/src/components/Agentes/AgentesView.tsx`
Substituir o `div` centrado por `<AgentesLayout>`. Passa `<AgentPanelSwitch>` como
filho esquerdo e `<TestPanel>` como filho direito. Envolve tudo em
`<AgentDraftProvider>`.

#### `client/src/components/SidePanel/Agents/AgentPanel.tsx`
Adicionar `useEffect` para alimentar `AgentDraftContext`:
```ts
const { setDraftParams } = useAgentDraftContext();
const [provider, model, instructions, tools] = useWatch({
  control,
  name: ['provider', 'model', 'instructions', 'tools'],
});
useEffect(() => {
  // debounce 300ms
  setDraftParams(buildDraftParams({ provider, model, instructions, tools, mcpServersMap }));
}, [provider, model, instructions, tools]);
```

#### `client/src/components/SidePanel/Agents/AgentFooter.tsx`
Renomear "Criar" → "✦ Publicar" quando `!agent_id` (somente novos agentes).
Remover qualquer botão "Testar" da footer — no desktop o painel direito já está
visível; no mobile o usuário troca via toggle. A footer contém apenas: botões de
admin/delete/share (existentes) + "✦ Publicar" ou "Salvar".

### Requisição de chat efêmera

`TestPanel` / `PreviewChatView` constroem a requisição assim:

```ts
const conversation: Partial<TConversation> = {
  endpoint: draftParams.provider,
  model: draftParams.model,
  agent_id: Constants.EPHEMERAL_AGENT_ID,
  promptPrefix: draftParams.instructions,
};

const ephemeralAgent: TEphemeralAgent = {
  web_search: draftParams.webSearch,
  file_search: draftParams.fileSearch,
  execute_code: draftParams.executeCode,
  mcp: draftParams.mcpServers,
};
```

Esses valores são passados via o mecanismo de submissão existente (`useChatHelpers` /
`useSubmitMessage`). A conversa resultante fica no histórico normal do usuário.

### Divisor resizável (implementação CSS)

```tsx
// AgentesLayout.tsx (simplificado)
const [leftPct, setLeftPct] = useState(40);

function onDrag(e: MouseEvent) {
  const pct = (e.clientX / window.innerWidth) * 100;
  setLeftPct(Math.min(Math.max(pct, 25), 70)); // clamp 25%–70%
}

<div style={{ display: 'flex', height: '100%' }}>
  <div style={{ width: `${leftPct}%`, overflow: 'hidden auto' }}>
    {left}
  </div>
  <DragHandle onDrag={onDrag} />
  <div style={{ flex: 1, overflow: 'hidden' }}>
    {right}
  </div>
</div>
```

## i18n — novas chaves

```json
"com_ui_ux_testar_rascunho":       "💬 Testar",
"com_ui_ux_construir_agente":      "🛠 Construir",
"com_ui_ux_fase3_badge":           "Fase 3",
"com_ui_ux_rascunho_efemero":      "Rascunho efêmero — não salvo",
"com_ui_ux_publicar_agente":       "Publicar",
"com_ui_ux_configurar_tab":        "Configurar",
"com_ui_ux_conversar_tab":         "Conversar"
```

## Riscos / a validar

- **`PreviewChatView` com prop vs. `useParams`**: o hook `useGetMessagesByConvoId`
  aceita string vazia sem erro? Validar com `Constants.NEW_CONVO` como fallback.
- **`useChatHelpers` fora de `ChatRoute`**: precisa de `ChatContext.Provider` e
  `ChatFormProvider` — `PreviewChatView` deve montar esses providers internamente.
- **Drag handle em touch**: implementação inicial só cobre mouse. Touch (mobile) não
  é necessário porque mobile usa o toggle segmentado.
- **`buildDraftParams`**: derivar `mcpServers` de `tools` (lista heterogênea de IDs).
  Usar o mesmo padrão de `useVisibleTools` em `AgentConfig.tsx` — filtra pelo
  `mcpServersMap` para extrair apenas os nomes dos servidores MCP selecionados.

## Critério de sucesso

- `/d/agentes` mostra split resizável no desktop (>768px).
- Usuário arrasta o divisor e os painéis redimensionam.
- Clicar em "💬 Testar" na footer e enviar uma mensagem: conversa usa o agente
  efêmero com as instructions e model do form, sem criar nenhum agente no banco.
- Botão "✦ Publicar" visível apenas para novos agentes; agentes existentes continuam
  com "Salvar".
- Mobile: toggle [⚙ Configurar | 💬 Conversar] funciona, formulário preservado ao
  alternar abas.
- Lint limpo; `client/vite.config.ts` fora de qualquer commit.
