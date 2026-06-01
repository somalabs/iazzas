# Deploy do IAzzas — Procedimento e Lições

Runbook operacional pra deployar mudanças em produção. Complementa `docs/iazzas-arquitetura.md` (arquitetura) e `docs/env-production.md` (variáveis de ambiente).

Produção: https://ai-azzas.somalabs.com.br

---

## Arquitetura do deploy

Dois containers da Azzas publicados em GHCR (privados), pull autenticado pela VM:

| Imagem | Conteúdo | Workflow CI |
|---|---|---|
| `ghcr.io/somalabs/iazzas-api:latest` | API + client (LibreChat fork) | `.github/workflows/iazzas-image.yml` |
| `ghcr.io/somalabs/iazzas-code-gateway:latest` | Code Interpreter (Express + Python sandbox) | `.github/workflows/code-gateway-image.yml` |

Os outros containers (`mongodb`, `meilisearch`, `vectordb`, `rag_api`, `client/nginx`) usam imagens públicas oficiais e são definidos em `deploy-compose.yml`.

A VM está em `iazzas` (GCP project `soma-ai-hub`, zona `us-central1-a`). Repo clonado em `/home/correa/iazzas`. **Operações são feitas como user `correa`**, não como o usuário GCP do operador (o repo pertence ao `correa`; rodar git como outro user dispara `dubious ownership`).

---

## Procedimento padrão de deploy

### Mudança de código (passa pelo CI)

1. Push em `main` (no laptop do desenvolvedor). O CI relevante dispara automaticamente conforme paths:
   - `iazzas-image.yml`: `api/**`, `client/**`, `packages/**`, `config/**`, `Dockerfile.multi`, `.github/workflows/iazzas-image.yml`
   - `code-gateway-image.yml`: `code-interpreter-gateway/**`, `.github/workflows/code-gateway-image.yml`

2. Acompanhar em `https://github.com/somalabs/iazzas/actions`. Primeiro build de uma feature pode levar 10-15 min (instala dependências pesadas: pandas, numpy, matplotlib, etc.).

3. **Se for um package novo** (primeiro build dele): habilitar **"Inherit access from source repository"** em `https://github.com/orgs/somalabs/packages/container/<package>/settings`. Sem isso, o pull na VM dá `403 Forbidden`. Adicionar também o repo `somalabs/iazzas` com role `Read` na seção "Manage access".

4. Acessar a VM (PuTTY, GCP osLogin) e virar `correa`:
   ```bash
   sudo -u correa -i
   cd ~/iazzas
   ```

5. Pull do repo + da imagem:
   ```bash
   git pull
   docker compose -f deploy-compose.yml pull <service>   # api ou code-gateway
   ```

6. Recriar o container do service:
   ```bash
   docker compose -f deploy-compose.yml up -d --no-deps --force-recreate <service>
   ```

7. Verificar:
   ```bash
   docker compose -f deploy-compose.yml ps <service>
   docker compose -f deploy-compose.yml logs --tail=30 <service>
   ```

8. Smoke test no browser (aba anônima): `https://ai-azzas.somalabs.com.br`

### Mudança apenas de `.env` (sem rebuild)

Não passa pelo CI. Direto na VM:

```bash
sudo -u correa -i
cd ~/iazzas
cp .env .env.bak-$(date +%Y%m%d-%H%M%S)
sed -i 's|^VARIAVEL=.*|VARIAVEL=novovalor|' .env
docker compose -f deploy-compose.yml up -d --no-deps --force-recreate api
```

> `docker compose restart` **não** relê o env_file. Tem que ser `up -d --force-recreate`.

---

## Lições críticas

### Auth GHCR
- **Fine-grained PAT NÃO funciona pra GHCR org packages.** Mesmo com aprovação admin, escopo `Packages: Read` correto e "Inherit access" habilitado, o pull retorna `403 Forbidden`. Sempre usar **classic PAT com escopo `read:packages` apenas**.
  - Criar em https://github.com/settings/tokens/new (URL `/tokens/new`, não `/personal-access-tokens/new`).
- Username pro `docker login`: `luizvasconcelos-sys` (ou outra machine user da org), **não** o usuário pessoal do GitHub.
- Login persiste em `~/.docker/config.json` do user `correa`. Não precisa relogar entre deploys.

### Docker Compose
- `--no-deps` é **obrigatório** ao recriar um service específico. Sem ela, o compose tenta resolver as dependências (`depends_on`) e pode tentar buildar services com `build:` local que não têm contexto disponível na VM.
- `--force-recreate` é obrigatório pra reler env_file quando o `.env` muda. Sem ela, alterações ficam ignoradas.
- O orphan container `iazzas-iazzas-code-gateway-1` aparece em todo `up` como warning. Inofensivo — cleanup com `--remove-orphans` quando tiver janela.

### Env vars críticas (LibreChat)
- `DOMAIN_SERVER` e `DOMAIN_CLIENT` precisam ser `https://ai-azzas.somalabs.com.br` (não `localhost`). Versão atual respeita literalmente — diferentemente de versões antigas que detectavam do request.
- `OPENID_CALLBACK_URL=/oauth/openid/callback` (sem `/api/`). É o que o Authentik tem registrado.
- `OPENID_REUSE_TOKENS=` (vazio). **Workaround crítico**: o Authentik não está emitindo refresh token. Se um dia o Ricardo habilitar refresh no provider, voltar pra `=true`.
- `OPENID_SCOPE="openid profile email offline_access"` (com `offline_access`).
- `ALLOW_REGISTRATION=false` (sem registro local) + `ALLOW_SOCIAL_REGISTRATION=true` (Authentik decide quem é provisionado).
- Defaults perigosos no boot: `CREDS_KEY`, `CREDS_IV`, `JWT_SECRET`, `JWT_REFRESH_SECRET` estão em valores default (logs avisam). Rotacionar em janela de manutenção.

### RAG / Embeddings (file_search)
- O `rag_api` faz embeddings via **OpenAI por padrão**, mas não há chave OpenAI de sistema (`OPENAI_API_KEY=user_provided`). Prod **exige** no `.env`: `EMBEDDINGS_PROVIDER=google_genai` + `EMBEDDINGS_MODEL=gemini-embedding-001` (reusa `GOOGLE_KEY` via ordem `RAG_GOOGLE_API_KEY` > `GOOGLE_KEY` > `GOOGLE_API_KEY`). Ver `docs/env-production.md`.
- **Sintoma se faltar:** anexar arquivo em "Knowledge" (agents) dá `Error processing file` e o arquivo não persiste — a falha de embedding aborta antes de vincular o arquivo ao agent. O container `rag_api` sobe normal; só quebra no `/embed`. Confirmar com `docker compose -f deploy-compose.yml logs rag_api`.
- A imagem `-lite` só suporta embeddings via API (sem HuggingFace local). Trocar de modelo/dimensão depois exige re-embeddar os arquivos.

### Diagnóstico de SSO
| Sintoma | Causa provável | Fix |
|---|---|---|
| `AADSTS50011 / redirect URI mismatch` | URL emitida pelo app não bate com o registrado no Authentik | Conferir `DOMAIN_SERVER` (sem `/api`) e `OPENID_CALLBACK_URL` |
| `No refresh token available` após `login success` | Scope sem `offline_access` ou IdP não emite refresh | Adicionar `offline_access`; setar `OPENID_REUSE_TOKENS=` vazio; pedir admin habilitar refresh no provider |
| `Endpoint not found` após callback | App listening em path diferente do que nginx encaminha | Conferir versão do LibreChat e `OPENID_CALLBACK_URL` |

### Diagnóstico geral
- Logs da API: `docker compose -f deploy-compose.yml logs --tail=N api` (recente: `--since=2m`).
- Status: `docker compose -f deploy-compose.yml ps`.
- Rota chega no backend? `curl -s -o /dev/null -w "HTTP %{http_code} | %{content_type} | %{size_download}\n" https://ai-azzas.somalabs.com.br/<rota>`. Se vier `text/html` com ~5198 bytes é SPA fallback (rota não encaminhada).
- Asset do build certo? Comparar SHA com o local: `curl -s https://ai-azzas.somalabs.com.br/assets/<arquivo> | sha256sum`.

### Rollback de emergência

Se o deploy quebrar tudo:
```bash
sed -i 's|^    image: ghcr.io/somalabs/iazzas-api:latest|    image: registry.librechat.ai/danny-avila/librechat-dev:latest|' /home/correa/iazzas/deploy-compose.yml
docker compose -f deploy-compose.yml up -d --no-deps --force-recreate api
```

> **Atenção:** voltar pro upstream público pode reintroduzir o problema do redirect URI no SSO (a versão upstream atual tem o mesmo bug do fork). Use só pra emergência absoluta. O fluxo correto pra reverter mudança de código é fazer `git revert` do commit ofensor + esperar o CI rebuildar.

---

## Pendências conhecidas

- **Authentik refresh token:** habilitar emissão de refresh token no provider `iazzas-librechat` (admin do Authentik). Sem isso, o workaround `OPENID_REUSE_TOKENS=` vazio é o que mantém sessões funcionando.
- **Favicon `<link>` relativo:** o template HTML do client tem `<link rel="icon" href="assets/favicon-32x32.png">` (sem `/`). Em rotas profundas o browser resolve errado. Fix: trocar pra path absoluto e novo build CI.
- **Renomear package** `iazzas-api` → `iazzas` (a imagem bundla API + client, o sufixo `-api` engana).
- **Cleanup orphan container** `iazzas-iazzas-code-gateway-1` na VM.
- **Rotacionar secrets:** `CREDS_KEY`, `CREDS_IV`, `JWT_SECRET`, `JWT_REFRESH_SECRET` em valores default. Também rotacionar o client_secret do Authentik (foi compartilhado em plaintext numa sessão de configuração inicial).
- **Migrar `CHECK_BALANCE`/`START_BALANCE`** env vars deprecadas pro `librechat.yaml`.
- **Ambiente de homologação:** alinhar com infra (Ricardo) — cobre risco de mudanças sensíveis (SSO, auth, configs do LibreChat) chegarem direto em produção.
