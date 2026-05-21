# Agentes Fase 3 — Aba "🛠 Construir" (agente que cria agentes)

Data: 2026-05-19
Branch: nova branch a partir de `agentes/LEM-52`

## Objetivo

Habilitar a aba "🛠 Construir" no `TestPanel`, conectando-a a um agente salvo
(`CONSTRUTOR_AGENT_ID`) que edita os campos do rascunho ao vivo via tool call
`atualizar_rascunho`. O usuário descreve o que quer e o form é atualizado
automaticamente sem nenhum DB write extra.

## Decisões fechadas

- **Agente Construir**: agente salvo no banco com ID fixo `CONSTRUTOR_AGENT_ID`
  (`'construtor-agente-iazzas'`). Configurado manualmente no painel admin com
  o tool `atualizar_rascunho` habilitado e um system prompt de instruções.
- **Mecanismo de aplicação**: SSE interception no frontend. Quando o SSE emite
  `ON_RUN_STEP_COMPLETED` com `tool_name === 'atualizar_rascunho'`, o hook
  `useBuilderToolInterceptor` extrai os args e chama `setDraftParams` +
  `setValue` (react-hook-form) para atualizar o form ao vivo.
- **Escopo**: todos os campos — `name`, `instructions`, `provider`, `model`,
  `webSearch`, `fileSearch`, `executeCode`, `mcpServers`, `temperature`, `top_p`.
  Todos opcionais no schema do tool (agente atualiza só o necessário).
- **Contexto em cada mensagem**: frontend injeta o estado atual do `draftParams`
  como bloco de texto no início de cada mensagem enviada ao agente Construir:
  ```
  [Rascunho atual]: {"name":"...","instructions":"...","model":"...",...}

  <mensagem do usuário>
  ```
- **Isolamento Recoil**: `BUILDER_CHAT_INDEX = 3` (0=main, 2=preview, 3=builder).
  Não colide com o chat principal nem com o preview da Fase 2.
- **Histórico separado por aba**: `TestPanel` mantém `previewConvoId` e
  `builderConvoId` independentes. Trocar de aba preserva o histórico de ambas.
- **Badge efêmero**: mantido só na aba "Testar". Aba "Construir" não exibe badge
  (a conversa com o agente construtor é persistente e intencional).
- Conversas do Construir são salvas normalmente no histórico do usuário.

## Fora de escopo

- Versionamento de rascunhos.
- Rollback/desfazer de tool calls do agente.
- Confirmação explícita antes de aplicar (`auto-apply` direto, usuário edita depois).
- Qualquer mudança em `PreviewChatView`, `AgentesLayout`, `DragHandle`, `AgentesView`.
- Sistema de criação/configuração do `CONSTRUTOR_AGENT_ID` — presumido já existente.

## Arquitetura

### Novos artefatos

#### `packages/api/src/tools/definitions.ts` — nova entry

```ts
export const atualizarRascunhoTool = {
  name: 'atualizar_rascunho',
  description: 'Atualiza os campos do agente em construção no formulário do usuário.',
  parameters: {
    type: 'object',
    properties: {
      name:         { type: 'string' },
      instructions: { type: 'string' },
      provider:     { type: 'string' },
      model:        { type: 'string' },
      webSearch:    { type: 'boolean' },
      fileSearch:   { type: 'boolean' },
      executeCode:  { type: 'boolean' },
      mcpServers:   { type: 'array', items: { type: 'string' } },
      temperature:  { type: 'number' },
      top_p:        { type: 'number' },
    },
    required: [],
  },
};
```

Stub de execução retorna `{ aplicado: true }` sem side effects. Registrar
junto ao mecanismo existente de tool execution no backend de agentes.

#### `packages/data-provider/src/config.ts` (ou arquivo de constants)

```ts
CONSTRUTOR_AGENT_ID: 'construtor-agente-iazzas',
BUILDER_CHAT_INDEX: 3,
```

#### `client/src/components/Agentes/BuilderChatView.tsx`

Componente espelhado de `PreviewChatView` com 3 diferenças:

1. Usa `CONSTRUTOR_AGENT_ID` como `agent_id` na conversa (sem ephemeral).
2. Injeta `draftParams` serializado como prefixo de cada mensagem enviada.
3. Monta `useBuilderToolInterceptor` passando `setDraftParams` e `setValue`.

Props:
```ts
type BuilderChatViewProps = {
  conversationId: string | null;
  draftParams: AgentDraftParams;
  onConversationCreated: (id: string) => void;
};
```

#### `client/src/hooks/Agentes/useBuilderToolInterceptor.ts`

```ts
export function useBuilderToolInterceptor(
  messages: TMessage[],
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>,
  setValue: UseFormSetValue<AgentForm>,
) {
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    for (const part of last.content ?? []) {
      if (
        part.type === ContentTypes.TOOL_CALL &&
        part.tool_call?.name === 'atualizar_rascunho' &&
        part.tool_call?.output
      ) {
        const args = JSON.parse(part.tool_call.args ?? '{}');
        applyDraftUpdate(args, setDraftParams, setValue);
      }
    }
  }, [messages]);
}
```

#### `client/src/utils/applyDraftUpdate.ts`

Função pura que merge args parciais no draft atual:

```ts
export function applyDraftUpdate(
  args: Partial<AgentDraftParams>,
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>,
  setValue: UseFormSetValue<AgentForm>,
): void {
  setDraftParams((prev) => ({ ...prev, ...filterUndefined(args) }));
  // Propaga cada campo presente para o react-hook-form
  for (const [key, value] of Object.entries(filterUndefined(args))) {
    setValue(key as keyof AgentForm, value, { shouldDirty: true });
  }
}
```

### Componentes modificados

#### `client/src/Providers/AgentDraftContext.tsx`

Adicionar campos a `AgentDraftParams`:

```ts
export type AgentDraftParams = {
  name: string;         // novo
  category: string;     // novo
  provider: string;
  model: string;
  instructions: string;
  webSearch: boolean;
  fileSearch: boolean;
  executeCode: boolean;
  mcpServers: string[];
  temperature?: number; // novo
  top_p?: number;       // novo
};
```

#### `client/src/components/Agentes/TestPanel.tsx`

- Estado `activeTab: 'testar' | 'construir'` (default `'testar'`).
- Estado `builderConvoId: string | null` (independente de `previewConvoId`).
- Tab "🛠 Construir" passa a ser clicável: remove `cursor-not-allowed`,
  `opacity-50` e o badge "Fase 3".
- Renderização condicional das duas views por tab.
- Badge efêmero exibido apenas quando `activeTab === 'testar'`.

#### `client/src/components/SidePanel/Agents/AgentPanel.tsx`

O `useEffect` de sync com `AgentDraftContext` deve incluir `name` e `category`
nos campos observados via `useWatch`, para que o agente Construir tenha
acesso ao nome atual do agente em construção.

## i18n — novas chaves

```json
"com_ui_ux_construir_ativo":      "🛠 Build",
"com_ui_ux_construir_contexto":   "[Current draft]:",
"com_ui_ux_construir_placeholder": "Describe what this agent should do..."
```

## Testes

| Arquivo | Cobre |
|---|---|
| `BuilderChatView.spec.tsx` | renderiza sem conversationId; injeta draftParams na mensagem |
| `useBuilderToolInterceptor.spec.ts` | detecta `atualizar_rascunho`, ignora outras tools, não re-aplica output já processado |
| `applyDraftUpdate.spec.ts` | merge parcial correto; não sobrescreve com undefined; propaga via setValue |
| `TestPanel.spec.tsx` (extensão) | troca de aba preserva conversationId de cada view; badge só na aba Testar |

## Riscos / a validar no plano

- **`useBuilderToolInterceptor` re-trigger**: o `useEffect` dispara a cada nova mensagem;
  garantir que só processa tool calls com `output` (completados), não `args` em
  construção (parciais durante streaming).
- **`setValue` com campos desconhecidos**: se o agente enviar um campo fora do schema
  do `AgentForm`, o `setValue` deve ser no-op. Usar type guard antes de chamar.
- **Mapeamento `AgentDraftParams` ↔ `AgentForm`**: verificar que os nomes dos campos
  batem exatamente com os `name` do react-hook-form (ex: `webSearch` vs `web_search`).
- **Agente Construir não configurado**: se `CONSTRUTOR_AGENT_ID` não existir no banco,
  a chamada retornará 404. `BuilderChatView` deve tratar erro e exibir mensagem
  orientando o admin a configurar o agente.

## Critério de sucesso

- Aba "🛠 Construir" clicável e renderiza `BuilderChatView`.
- Enviar "cria um agente de suporte técnico" → agente chama `atualizar_rascunho`
  → campo Instructions atualiza ao vivo no form da esquerda.
- Trocar para "💬 Testar" e voltar: histórico da conversa Construir preservado.
- Nenhuma escrita extra no banco além da conversa em si.
- Lint limpo, suite de testes verde.
