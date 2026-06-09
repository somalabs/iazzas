# Local development — IAzzas

> Como rodar o IAzzas localmente em Windows + Docker, e workarounds que o fluxo oficial não cobre.

## Stack local

| Componente | Onde roda | Comando |
|---|---|---|
| MongoDB | Docker (`mongo:7`) | `docker run -d --name mongodb -p 27017:27017 mongo:7` |
| Backend Node | host (fora do container) | `npm run backend:dev` (porta 3080) |
| Frontend Vite | host | `npm run frontend:dev` (porta 3090, HMR, proxy para 3080) |
| Code Interpreter Gateway | host | `cd code-interpreter-gateway && GATEWAY_API_KEY=local-dev-key USE_LOCAL_EXEC=true PORT=8080 node dist/index.js` |

**Por que rodar o backend no host e não no container:** o `docker-compose.yml` oficial **não monta `librechat.yaml`** no container `LibreChat`. O yaml dentro do container é o embutido na imagem (default upstream). Para iterar em `librechat.yaml`, é mais simples parar o container e rodar `npm run backend:dev` direto no host.

## Setup inicial

1. Copiar o `.env` apropriado (cópia mais recente vive em Documents / Downloads do desenvolvedor — não está versionado).
2. Subir o Mongo via Docker.
3. Garantir que `client/dist/index.html` existe (mesmo que stub vazio) — o backend exige o arquivo em modo prod. Para dev rodando só `frontend:dev`, basta criar um stub:
   ```bash
   mkdir -p client/dist && echo "<!doctype html><html><body>stub</body></html>" > client/dist/index.html
   ```
4. `npm run build --workspace=@librechat/api` (necessário sempre que mexer em `packages/api`).
5. `npm run build:data-provider` (necessário sempre que mexer em `packages/data-provider`).
6. `npm run backend:dev` (3080).
7. `npm run frontend:dev` (3090).
8. Acessar `http://localhost:3090`.

## SSO Azzas ID em local — **não funciona**

O callback OAuth do Authentik (prod) e do Azure AD direto está registrado para o domínio público do IAzzas (`iazzas.somalabs.com.br`), **não** para `localhost`. Logo, **fluxo SSO local quebra no callback**.

Como o login por email/senha está hardcoded como `false` (decisão de segurança — ver `api/server/routes/config.js`), localmente você fica sem nenhum caminho de login disponível por padrão.

### Procedimento para testar local sem SSO

> **Importante:** todas as alterações abaixo são para uso local. **Reverter antes de commitar.**

1. **Reabrir login por email/senha** em `api/server/routes/config.js`:
   ```js
   // De:
   const emailLoginEnabled = false;
   // Para:
   const emailLoginEnabled =
     process.env.ALLOW_EMAIL_LOGIN === undefined || isEnabled(process.env.ALLOW_EMAIL_LOGIN);
   ```
   E:
   ```js
   // De:
   registrationEnabled: false,
   // Para:
   registrationEnabled: !ldap?.enabled && isEnabled(process.env.ALLOW_REGISTRATION),
   ```

2. **Confirmar no `.env` local** (já vem assim por padrão):
   ```bash
   ALLOW_EMAIL_LOGIN=true
   ALLOW_REGISTRATION=true
   ```

3. **Reiniciar o backend** (nodemon pega a mudança automaticamente).

4. Em `http://localhost:3090/login` agora aparecem campos email/senha + link Sign Up. Cadastre uma conta qualquer (`teste@local.dev` / `senha123` serve), faça login.

5. **Antes de commit, reverter os dois `= false`** em `config.js`. Os comentários no arquivo apontam para esta seção da documentação.

### Por que hardcoded e não env-driven

Há registro histórico (memória do time) de uma pessoa de fora da companhia ter conseguido se cadastrar quando o SSO ainda estava sendo amadurecido. Hardcoded em código garante que um misclick no `.env` de prod não reabra o caminho — fica explícito em PR.

## Balance / créditos em local

O usuário criado por `POST /api/auth/register` não passa pelo middleware `setBalanceConfig` (que só roda em `/login`). Resultado: o balance fica com defaults da schema (autoRefillEnabled=false, refillAmount=0), e o `BalanceWidget` não mostra a barra de % porque `hasCycle === false`.

Para visualizar o widget completo localmente, há dois caminhos:

**Opção 1 — Logout e login.** Mais limpo: depois de registrar, faz logout e login. Aí o `/login` dispara `setBalanceConfig` que sincroniza com a config de balance do `librechat.yaml`. Para isso, é preciso ter um bloco `balance:` no yaml com `autoRefillEnabled: true` e `refillAmount` definido — não tem por padrão (IAzzas usa CHECK_BALANCE/START_BALANCE legacy do `.env`, sem auto refill).

**Opção 2 — Patchar Mongo direto:**
```bash
docker exec mongodb mongosh --quiet LibreChat --eval \
  "db.balances.updateMany({}, { \$set: { autoRefillEnabled: true, refillAmount: 100, refillIntervalValue: 1, refillIntervalUnit: 'days', tokenCredits: 700000 } })"
```
Para simular uso parcial, ajustar `tokenCredits` (raw): 1.000.000 = 100 display credits = ciclo cheio; 700.000 = 70 display = 30% usado.

## Pitfalls conhecidos

- **`nodemon` deixa processo zumbi na porta 3080** após Ctrl+C ou restart. Se backend falhar com `EADDRINUSE`:
  ```bash
  netstat -ano | grep ":3080" | grep LISTENING
  taskkill //F //PID <pid>
  ```

- **Diretório `/mnt/data` no Windows.** Node resolve `/mnt/data` para `C:\mnt\data`. Criar antes de subir o Code Interpreter Gateway.

- **Vite production build estoura memória** em máquinas com pouco RAM. Para dev, sempre usar `frontend:dev`. Não tente `npm run frontend` localmente.

- **Container `LibreChat` não monta `librechat.yaml`.** Se subir via docker-compose oficial, o yaml dentro do container é o default upstream. Para testar mudanças no yaml, **parar o container e rodar `backend:dev` no host**.

- **Dockerfile WORKDIR pitfall.** Em prod, `process.cwd()` é `/app/api` (não a raiz). Em dev local (rodando a partir da raiz) isso fica mascarado. Cuidado ao resolver caminhos relativos — use `path.resolve(__dirname, ...)` ou similar.

- **Bind mount inode stale.** `git restore` / `sed -i` em arquivo único bind-mountado quebram o mount (inode diferente). Restartar o container pra re-mountar.

- **Build manual de packages.** Após editar `packages/api` ou `packages/data-provider`, **rebuildar antes** de o backend pegar:
  ```bash
  npm run build --workspace=@librechat/api
  npm run build:data-provider
  ```

## Estrutura de pacotes

Ver `CLAUDE.md` na raiz para mapeamento completo. Em resumo:

- `/api` — Express JS legacy (minimizar mudanças)
- `/packages/api` — TS novo (lógica de backend nova vive aqui, consumida por `/api`)
- `/packages/data-schemas` — Modelos/schemas MongoDB
- `/packages/data-provider` — Tipos e endpoints compartilhados entre frontend e backend
- `/client` — Frontend SPA (TS/React)
- `/packages/client` — UI utilities compartilhadas
