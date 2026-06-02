# Redesign da UI do fluxo de agentes (LEM-88)

**Data:** 2026-06-01
**Branch:** `agentes/LEM-88`
**Status:** aprovado para planejamento

## Objetivo

Revisar e ajustar a UI de todas as telas do fluxo de agentes, na identidade Azzas 2154, e introduzir duas capacidades: visibilidade pública (marketplace) controlada pelo usuário e identidade visual do agente (imagem **ou** ícone). Tudo numa única entrega na branch `agentes/LEM-88`.

## Identidade visual (Azzas 2154)

Tokens em `client/src/style.css`:

- `--azzas-navy #274566` — **única** cor de fill de botão no produto (`--action`)
- `--azzas-steel #3D5A73`, `--azzas-blue-soft #A1C6ED`, `--azzas-blue-light #C5D9ED`
- Superfícies: `--azzas-surface-warm #E8E8E4`, `--azzas-surface-cream #F9F6EA`
- Tintas: `--azzas-ink #000`, `--azzas-ink-soft #595959`, `--azzas-ink-faint #999`

**Regra:** navy é o único fill de botão; paleta contida. Estados (ativo/precisa-auth/erro) usam navy + neutros; evitar verde/âmbar como fill. Toda string de UI via `useLocalize()`, chaves novas só em `en/translation.json` + alinhar `pt-BR/translation.json` (PT-BR sempre presente — sem chave crua).

## Escopo (6 itens)

### 1. Tela de criação de agentes — `AgentConfig.tsx`

Layout aprovado: **bloco de identidade à esquerda** (avatar 72px clicável + "Trocar") e, à direita, **Nome** seguido do **toggle de visibilidade**. Restante do formulário (Instructions, Category, Capacidades, Advanced) mantém ordem atual abaixo.

- Reintroduzir o avatar no topo do form (hoje `AgentConfig` começa direto no campo Nome; `AgentAvatar.tsx` existe mas está órfão).
- Inserir o toggle "Visível no marketplace" logo abaixo do Nome (ver item 5).
- Polir espaçamentos/tipografia na identidade Azzas; labels `text-sm font-medium`.

### 2. Modais de MCP — `MCPToolSelectDialog.tsx` e `MCPConfigDialog.tsx`

**Seletor (`MCPToolSelectDialog`):**
- Trocar o diálogo `max-w-7xl` / `minHeight 610px` fixo por largura proporcional ao conteúdo.
- Busca full-width discreta (remover a lupa gigante centralizada e o input de 64ch centralizado).
- Cards de servidor com estado inline: *Adicionar* (navy) / *Configurar →* (precisa auth) / *✓ Adicionado* / pill *Ativo*. Estados em navy/neutros.

**Auth/config (`MCPConfigDialog`):**
- Cabeçalho com identidade do servidor (ícone + status), campos de credencial claros com dica.
- OAuth separado por divisor "ou".
- Rodapé fixo com *Cancelar* / *Salvar e conectar* (fill navy).

Comportamento e fluxo de dados (initialize, save auth, OAuth, custom user vars) permanecem; mudança é apenas de apresentação/estrutura visual.

### 3. Marketplace — `Marketplace.tsx`, `AgentCard.tsx`, `CategoryTabs.tsx`, `SearchBar.tsx`

- Cards na identidade Azzas: avatar (imagem ou ícone), nome em navy, descrição, autor e selo "Público".
- Busca discreta e chips de categoria em navy (ativo) / warm (inativo).
- **Listar apenas agentes públicos**: o backend (`api/server/controllers/agents/v1.js`) já marca `isPublic: true` nos agentes com permissão pública (`findPubliclyAccessibleResources`). O marketplace passa a filtrar/exibir apenas `isPublic` (excluir os apenas-acessíveis-ao-próprio-usuário da visão de marketplace). Sem trabalho de schema/backend novo.

### 4. Bug do input no builder por IA — `client/src/components/Chat/Input/ChatForm.tsx:184-191`

`methods.register('text', { onChange: useCallback(... setValue('text', ...), [methods]) })` faz update redundante e a dependência `[methods]` instável interfere no `reset()` pós-envio (BuilderChatView usa esse ChatForm).

**Fix:** remover o `onChange` custom e deixar o react-hook-form gerenciar o valor; se precisar de side-effect, usar o `watch`/`useEffect` já existente (linhas ~193-201). Validar que o textarea limpa após enviar no builder e no chat normal.

### 5. Visibilidade pública controlada pelo usuário

Toggle "Visível no marketplace" na tela de criação, mapeado para a permissão **`SHARE_PUBLIC`** existente (reuso da infra `GenericGrantAccessDialog`/`PublicSharingToggle` por baixo — gravar/ler a ACL pública do agente).

- Ligar = conceder VIEW público ao recurso (agente aparece no marketplace automaticamente, conforme item 3).
- Desligar = revogar a ACL pública.
- Sem campo novo no schema; sem migração. Respeitar permissão `Permissions.SHARE_PUBLIC` do usuário (se não tiver, toggle desabilitado/oculto).
- Para agente novo (sem `_id` ainda), aplicar a visibilidade na primeira gravação.

### 6. Identidade visual: imagem **ou** ícone — `AgentAvatar.tsx` / `Images.tsx`

Abas **Imagem / Ícone** no seletor do avatar:

- **Imagem:** reusar upload atual (`useUploadAgentAvatarMutation`, validação de tamanho via `fileConfig.avatarSizeLimit`).
- **Ícone:** grade de emoji + cor de fundo da paleta Azzas. Prévia ao vivo.

**Armazenamento (sem migração):** `avatar` é `Schema.Types.Mixed`. Modelar ícone como:

```ts
avatar?: {
  filepath?: string;   // imagem enviada
  source: string;      // 's3' | 'local' | 'icon'
  icon?: string;       // emoji/nome do ícone quando source === 'icon'
  iconColor?: string;  // cor de fundo (token Azzas) quando source === 'icon'
};
```

- Render do avatar (em `Images.tsx`, marketplace cards, chips) passa a tratar `source === 'icon'`: desenhar emoji sobre `iconColor` em vez de `<img>`.
- Upload de imagem com `source: 'icon'` deve pular o processamento de arquivo no controller (`api/server/controllers/agents/v1.js`), gravando só os campos do ícone.
- Tipos: estender a definição `avatar` em `packages/data-schemas/src/types/agent.ts` e o `AgentAvatar` em `librechat-data-provider` (e o form `avatar_*` em `client/src/common/agents-types.ts`).

## Fora de escopo

- Mudanças no fluxo de permissões além de expor `SHARE_PUBLIC` via toggle.
- Migração de avatares existentes.
- Redesign do chat/mensagens (já tratado em trabalho anterior).

## Critérios de sucesso

- As 4 telas (criação, modais MCP, marketplace, builder IA) refletem a identidade Azzas, sem cores fora da paleta e sem chave i18n crua em PT-BR.
- Toggle de visibilidade liga/desliga a presença no marketplace ponta a ponta.
- Avatar aceita imagem **ou** ícone+cor; render correto em form, marketplace e chips.
- Input do builder limpa após enviar; sem regressão no chat normal.
- Sem `any`, sem warnings de TS/ESLint nos arquivos tocados.
