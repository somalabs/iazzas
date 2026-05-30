# Spec de Copy — Voz Azzas (LEM-79)

> **Autoridade**: este documento é a fonte única de verdade para o copy de sistema da Azzas 2154.
> Criado: 2026-05-30 | Issue: LEM-79

---

## Princípios de voz

| Princípio | O que significa |
|-----------|-----------------|
| **Acolhedor** | Como um colega da Azzas, não um sistema |
| **Preciso** | Sem jargão técnico, sem siglas HTTP, sem stack traces |
| **Direto** | Frases curtas. Ação clara. Sem "Por favor" em excesso |
| **Pessoal** | 3ª pessoa para o sistema ("a Azzas"), 1ª para o usuário |
| **PT-BR** | Contrações naturais, vocabulário coloquial-profissional |

**Referência de tom**: "a Azzas te diz que deu errado" — não "houve um erro interno no servidor".

---

## Diagnóstico do estado atual

### Problemas identificados

| Categoria | Problema | Exemplo atual |
|-----------|----------|---------------|
| Erros de auth | Vocabulário técnico e formal | `"Não foi possível fazer login com as informações fornecidas. Por favor, verifique suas credenciais e tente novamente."` |
| Erros de auth | Expõe internals | `"Houve um erro interno no servidor."` |
| Erros de auth | "Por favor" repetitivo — soando como sistema | Todos os erros de auth usam essa construção |
| Erros de auth | Jargão: "token", "credenciais", "OAuth" | `"Este token de redefinição de senha não é mais válido."` |
| Input placeholder | Chave PT-BR ausente; sem placeholder visível | `com_ui_message_input` não existe em pt-BR |
| Empty state | Saudação de madrugada ausente em PT-BR | `com_ui_late_night` não existe em pt-BR |
| Cadastro | "Inscrever-se" — distante, não natural | Botão de sign-up na tela de login |
| Export | Tradução literal sem sentido | `"Exportar Modal de Conversação"` |

---

## Chaves a ATUALIZAR no PT-BR

> Arquivo: `client/src/locales/pt-BR/translation.json`

### Erros de autenticação

| Chave | Valor atual (PT-BR) | Novo valor |
|-------|---------------------|------------|
| `com_auth_error_login` | "Não foi possível fazer login com as informações fornecidas. Por favor, verifique suas credenciais e tente novamente." | **"E-mail ou senha incorretos. Confira os dados e tente de novo."** |
| `com_auth_error_login_rl` | "Muitas tentativas de login em um curto período de tempo. Por favor, tente novamente mais tarde." | **"Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."** |
| `com_auth_error_login_ban` | "Sua conta foi temporariamente banida devido a violações do nosso serviço." | **"Seu acesso está temporariamente suspenso. Fale com o suporte para resolver."** |
| `com_auth_error_login_server` | "Houve um erro interno no servidor. Por favor, aguarde alguns momentos e tente novamente." | **"Algo deu errado do nosso lado. Tente novamente em instantes."** |
| `com_auth_error_login_unverified` | "Sua conta não foi verificada. Por favor, verifique seu e-mail para um link de verificação." | **"Confirme seu e-mail antes de entrar — o link está na sua caixa de entrada."** |
| `com_auth_error_oauth_failed` | "Autenticação falhou. Por favor verifique seu método de login e tente novamente." | **"Não foi possível autenticar por esse caminho. Tente outro método de acesso."** |
| `com_auth_error_create` | "Houve um erro ao tentar registrar sua conta. Por favor, tente novamente." | **"Não conseguimos criar sua conta agora. Tente de novo."** |
| `com_auth_error_invalid_reset_token` | "Este token de redefinição de senha não é mais válido." | **"Este link de redefinição expirou. Solicite um novo."** |

### Labels e botões

| Chave | Valor atual (PT-BR) | Novo valor |
|-------|---------------------|------------|
| `com_auth_sign_up` | "Inscrever-se" | **"Criar conta"** |
| `com_ui_export_convo_modal` | "Exportar Modal de Conversação" | **"Exportar conversa"** |

---

## Chaves a CRIAR no PT-BR

> Estas chaves já existem em EN mas estão ausentes em `client/src/locales/pt-BR/translation.json`.

### Saudação de madrugada (0h–5h59)

| Chave | Valor EN (existente) | Novo valor PT-BR |
|-------|---------------------|------------------|
| `com_ui_late_night` | "Happy late night" | **"Boa madrugada"** |

### Placeholder do input de chat

| Chave | Contexto | Valor PT-BR |
|-------|----------|-------------|
| `com_ui_message_input` | aria-label acessível do textarea | **"Entrada de mensagem"** |
| `com_ui_chat_placeholder` | texto visível de placeholder *(chave nova)* | **"Pergunte algo para a Azzas..."** |

> **Nota para implementação**: `com_ui_message_input` deve continuar sendo usado como `aria-label`
> (acessibilidade). A chave nova `com_ui_chat_placeholder` deve ser adicionada como atributo
> `placeholder` no `<TextareaAutosize>` em `client/src/components/Chat/Input/ChatForm.tsx`.
> O placeholder visível é quem comunica a voz da marca — o aria-label é para screen readers.

---

## Empty state — Landing.tsx

A Landing.tsx não precisa de mudanças estruturais. O empty state já usa saudações por horário
localizadas em PT-BR. Ajustes necessários:

1. **Adicionar `com_ui_late_night`** em PT-BR (ver tabela acima) — saudação ausente.
2. **Configurar `customWelcome`** via `librechat.yaml` se o produto quiser mensagem de boas-vindas
   customizada abaixo da saudação. Sugestão de texto para o campo:
   > *"O que você quer criar hoje?"*

---

## Mapa de implementação — para o stream tech

### Prioridade 1 — Arquivo PT-BR (`client/src/locales/pt-BR/translation.json`)

Todas as alterações de copy ficam neste arquivo. Não há mudança de chave — só de valor (exceto
as chaves novas marcadas com ★).

```
ATUALIZAR:
  com_auth_error_login
  com_auth_error_login_rl
  com_auth_error_login_ban
  com_auth_error_login_server
  com_auth_error_login_unverified
  com_auth_error_oauth_failed
  com_auth_error_create
  com_auth_error_invalid_reset_token
  com_auth_sign_up
  com_ui_export_convo_modal

ADICIONAR (ausentes no PT-BR):
  com_ui_late_night
  com_ui_message_input
  ★ com_ui_chat_placeholder  (chave nova — também precisa ser adicionada ao EN e ao schema de tipos)
```

### Prioridade 2 — Componente de input (`ChatForm.tsx`)

Adicionar o atributo `placeholder` ao `<TextareaAutosize>`:

```tsx
// Linha ~319 em client/src/components/Chat/Input/ChatForm.tsx
// ADICIONAR:
placeholder={localize('com_ui_chat_placeholder')}
```

### Prioridade 3 — Schema de tipos (`packages/data-provider` ou `client/src`)

Se `TranslationKeys` for um enum/type com as chaves de tradução, adicionar:
```
com_ui_chat_placeholder
```

---

## Critérios de aceite (para QA)

- [ ] Input de chat mostra "Pergunte algo para a Azzas..." quando vazio
- [ ] Saudação de madrugada exibe "Boa madrugada" entre 0h e 5h59
- [ ] Login com credenciais erradas mostra mensagem sem "credenciais" ou "Por favor"
- [ ] Muitas tentativas de login mostram mensagem sem tempo técnico ("curto período de tempo")
- [ ] Erro de servidor não menciona "erro interno" nem "servidor"
- [ ] Botão de cadastro lê "Criar conta" (não "Inscrever-se")
- [ ] Nenhuma mensagem de erro exibe código HTTP (401, 422, 500)
- [ ] Export de conversa lê "Exportar conversa" (não "Exportar Modal de Conversação")
