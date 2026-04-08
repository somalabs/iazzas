# Variáveis de Ambiente — Produção

Referência das variáveis de ambiente necessárias para rodar o IAzzas em produção.

> Variáveis marcadas com `*` são obrigatórias. As demais têm defaults seguros ou são opcionais.

---

## Servidor

| Variável | Exemplo | Descrição |
|---|---|---|
| `HOST` * | `0.0.0.0` | Bind address |
| `PORT` * | `3080` | Porta do backend |
| `MONGO_URI` * | `mongodb+srv://user:pass@cluster/IAzzas` | Conexão MongoDB |
| `DOMAIN_CLIENT` * | `https://iazzas.azzas2154.com.br` | URL pública do frontend |
| `DOMAIN_SERVER` * | `https://iazzas.azzas2154.com.br` | URL pública do backend |
| `TRUST_PROXY` | `1` | Hops de proxy reverso |
| `NO_INDEX` | `true` | Bloqueia indexação por buscadores |
| `NODE_ENV` | `production` | Ativa otimizações de produção |

## Secrets

Gerar valores únicos para cada ambiente (`openssl rand -hex 32`).

| Variável | Descrição |
|---|---|
| `JWT_SECRET` * | Secret para tokens JWT |
| `JWT_REFRESH_SECRET` * | Secret para refresh tokens |
| `CREDS_KEY` * | Chave de criptografia de credenciais (hex 32 bytes) |
| `CREDS_IV` * | IV de criptografia (hex 16 bytes: `openssl rand -hex 16`) |

## Autenticação — OpenID (Microsoft Entra)

| Variável | Valor |
|---|---|
| `OPENID_CLIENT_ID` * | App registration client ID |
| `OPENID_CLIENT_SECRET` * | App registration secret |
| `OPENID_ISSUER` * | `https://login.microsoftonline.com/{tenant-id}/v2.0` |
| `OPENID_SESSION_SECRET` * | Gerar com `openssl rand -hex 32` |
| `OPENID_SCOPE` | `"openid profile email"` |
| `OPENID_CALLBACK_URL` | `/api/oauth/openid/callback` |
| `OPENID_BUTTON_LABEL` | `"Login com Microsoft"` |
| `OPENID_IMAGE_URL` | `/assets/microsoft-icon.svg` |
| `OPENID_AUTO_REDIRECT` | `false` |
| `OPENID_REUSE_TOKENS` | `true` |
| `OPENID_USE_PKCE` | `false` |

## Autenticação — Controles de acesso

| Variável | Valor | Descrição |
|---|---|---|
| `ALLOW_EMAIL_LOGIN` | `true` | Login com email/senha |
| `ALLOW_REGISTRATION` | `true` | Cadastro de novos usuários |
| `ALLOW_SOCIAL_LOGIN` | `true` | Botão de OAuth na tela de login |
| `ALLOW_SOCIAL_REGISTRATION` | `false` | Auto-registro via OAuth |
| `ALLOW_PASSWORD_RESET` | `false` | Reset de senha por email |
| `ALLOW_UNVERIFIED_EMAIL_LOGIN` | `true` | Login sem verificar email |
| `SESSION_EXPIRY` | `1000 * 60 * 15` | 15 minutos |
| `REFRESH_TOKEN_EXPIRY` | `(1000 * 60 * 60 * 24) * 7` | 7 dias |

## Provedores de AI

| Variável | Valor | Descrição |
|---|---|---|
| `OPENAI_API_KEY` | `user_provided` | Usuário fornece a própria chave |
| `ANTHROPIC_API_KEY` | `user_provided` | Usuário fornece a própria chave |
| `ASSISTANTS_API_KEY` | `user_provided` | Usuário fornece a própria chave |
| `GOOGLE_KEY` * | chave API | Gemini API (AI Studio) |
| `GEMINI_API_KEY` | chave API | Gemini para geração de imagem |

## Balance / Créditos

| Variável | Valor | Descrição |
|---|---|---|
| `CHECK_BALANCE` | `true` | Ativa sistema de créditos |
| `START_BALANCE` | `1000000` | Saldo inicial por usuário |

## UI / Branding

| Variável | Valor |
|---|---|
| `APP_TITLE` | `IAzzas` |
| `CUSTOM_FOOTER` | `"Azzas 2154 — Fashion & Lifestyle"` |
| `HELP_AND_FAQ_URL` | `https://www.azzas2154.com.br` |

## Busca (Meilisearch)

| Variável | Valor | Descrição |
|---|---|---|
| `SEARCH` | `true` | Ativa busca nas conversas |
| `MEILI_HOST` * | `http://meilisearch:7700` | URL do Meilisearch |
| `MEILI_MASTER_KEY` * | gerar único | Master key do Meilisearch |
| `MEILI_NO_ANALYTICS` | `true` | Desativa analytics do Meili |

## Web Search

| Variável | Descrição |
|---|---|
| `SERPER_API_KEY` | Chave da API Serper (search provider) |
| `JINA_API_KEY` | Chave da API Jina (reranker) |

## Code Interpreter

O code interpreter roda **localmente no cluster** via `code-gateway`, um serviço próprio que executa código direto no container (sem Piston). O serviço é incluído no `deploy-compose.yml`.

| Variável | Valor | Descrição |
|---|---|---|
| `LIBRECHAT_CODE_API_KEY` * | gerar único | API key compartilhada entre API e gateway |
| `LIBRECHAT_CODE_BASEURL` | `http://code-gateway:8080/v1` | URL interna do serviço no compose |
| `GATEWAY_API_KEY` | mesmo valor de `LIBRECHAT_CODE_API_KEY` | Configurado no serviço `code-gateway` |
| `USE_LOCAL_EXEC` | `true` | Executa código localmente (sem Piston) |
| `EXEC_TIMEOUT_MS` | `30000` | Timeout de execução (30s default) |

## Rate Limiting / Moderação

| Variável | Valor | Descrição |
|---|---|---|
| `BAN_VIOLATIONS` | `true` | Banir por violações |
| `BAN_DURATION` | `1000 * 60 * 60 * 2` | 2 horas de ban |
| `LIMIT_CONCURRENT_MESSAGES` | `true` | Limitar mensagens simultâneas |
| `CONCURRENT_MESSAGE_MAX` | `2` | Máx. mensagens simultâneas |
| `LIMIT_MESSAGE_IP` | `true` | Rate limit por IP |
| `MESSAGE_IP_MAX` | `40` | Máx. mensagens por janela |
| `MESSAGE_IP_WINDOW` | `1` | Janela em minutos |

## Shared Links

| Variável | Valor |
|---|---|
| `ALLOW_SHARED_LINKS` | `true` |
| `ALLOW_SHARED_LINKS_PUBLIC` | `false` |

---

## Não necessárias em produção

As seguintes seções do `.env` podem ser **omitidas** por estarem vazias ou não serem usadas:

- **OAuth providers**: Discord, Facebook, GitHub, Google OAuth, Apple, SAML, LDAP
- **Storage**: Firebase, S3, Azure Blob Storage
- **Email**: não é necessário enquanto `ALLOW_PASSWORD_RESET=false`
- **Imagem**: DALL-E, Stable Diffusion, Flux
- **Ferramentas**: Tavily, WolframAlpha, Zapier, OpenWeather
- **Piston**: `PISTON_URL` — não usamos Piston; o code interpreter roda local (`USE_LOCAL_EXEC=true`)
- **Debug**: `DEBUG_LOGGING`, `DEBUG_OPENAI`, `AGENT_DEBUG_LOGGING` — desligar em prod
- **Redis**: só é necessário para deploy multi-instância
- **SharePoint**: não configurado
- **Entra ID people search**: desabilitado (`USE_ENTRA_ID_FOR_PEOPLE_SEARCH=false`)
