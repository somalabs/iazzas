# Configuração de Roles e Grupos via OpenID (Microsoft Entra)

Guia para configurar atribuição automática de roles e grupos de usuários via tokens do Microsoft Entra ID.

---

## Conceitos

O sistema tem três mecanismos independentes que podem ser combinados:

| Mecanismo | Finalidade | Onde configura |
|---|---|---|
| **Required Role** | Bloquear login se o usuário não tiver um role específico | `.env` |
| **Admin Role** | Promover automaticamente um usuário a admin | `.env` |
| **SSO Rules** | Atribuir usuários a grupos internos com base em claims do token | `librechat.yaml` |

---

## 1. Required Role — Restringir quem pode fazer login

Bloqueia o login de qualquer usuário que não possua um dos roles listados.

```env
# Role(s) obrigatórios (separados por vírgula)
OPENID_REQUIRED_ROLE=grupo-id-1,grupo-id-2

# Caminho da claim no token que contém os roles
# Exemplos: "groups", "roles", "appRoles[0].value"
OPENID_REQUIRED_ROLE_PARAMETER_PATH=groups

# Qual token usar para ler a claim: "access" ou "id"
OPENID_REQUIRED_ROLE_TOKEN_KIND=id
```

### Exemplo com Grupo do Entra

Para restringir o login a membros do grupo "IAzzas Users" (ID: `abc-123-def`):

```env
OPENID_REQUIRED_ROLE=abc-123-def
OPENID_REQUIRED_ROLE_PARAMETER_PATH=groups
OPENID_REQUIRED_ROLE_TOKEN_KIND=id
```

> **Pré-requisito no Entra:** O app registration precisa ter a claim `groups` habilitada no token. Vá em **Token configuration > Add groups claim** e marque **Security groups**.

### Exemplo com App Role

Para restringir via App Role em vez de grupo:

```env
OPENID_REQUIRED_ROLE=IAzzas.User
OPENID_REQUIRED_ROLE_PARAMETER_PATH=roles
OPENID_REQUIRED_ROLE_TOKEN_KIND=id
```

> **Pré-requisito no Entra:** Crie o App Role em **App registrations > App roles** e atribua usuários em **Enterprise applications > Users and groups**.

---

## 2. Admin Role — Promoção automática a admin

Promove automaticamente o usuário a `ADMIN` se o token contiver o role especificado. Se o role for removido no Entra, o usuário é rebaixado para `USER` no próximo login.

```env
# O valor do role/grupo que identifica um admin
OPENID_ADMIN_ROLE=admin-group-id

# Caminho da claim no token
OPENID_ADMIN_ROLE_PARAMETER_PATH=groups

# Qual token: "access", "id", ou "userinfo"
OPENID_ADMIN_ROLE_TOKEN_KIND=id
```

### Exemplo com Grupo do Entra

Criar um grupo "IAzzas Admins" no Entra (ID: `xyz-789-abc`) e configurar:

```env
OPENID_ADMIN_ROLE=xyz-789-abc
OPENID_ADMIN_ROLE_PARAMETER_PATH=groups
OPENID_ADMIN_ROLE_TOKEN_KIND=id
```

### Exemplo com App Role

```env
OPENID_ADMIN_ROLE=IAzzas.Admin
OPENID_ADMIN_ROLE_PARAMETER_PATH=roles
OPENID_ADMIN_ROLE_TOKEN_KIND=id
```

---

## 3. SSO Rules — Atribuir grupos internos por claims

Regras definidas no `librechat.yaml` que mapeiam claims do token OpenID para **grupos internos** do sistema. Grupos são criados automaticamente se não existirem.

> SSO Rules são avaliadas **apenas no primeiro login** (criação do usuário).

### Estrutura de uma regra

```yaml
ssoRules:
  - match:
      claim: <nome-da-claim>    # claim do token a avaliar
      value: <valor-exato>      # match exato (case-insensitive)
      # OU
      pattern: <glob-pattern>   # match com wildcard (*)
      # OU
      contains: <valor>         # verifica se array contém o valor
    addToGroups:
      - grupo-interno-1
      - grupo-interno-2
```

Cada regra aceita **exatamente um** dos operadores: `value`, `pattern` ou `contains`.

### Exemplo completo no librechat.yaml

```yaml
version: 1.3.7

registration:
  socialLogins: ['openid']

ssoRules:
  # Usuários do departamento de TI vão para o grupo "tecnologia"
  - match:
      claim: department
      value: "TI"
    addToGroups:
      - tecnologia

  # Usuários com email @azzas2154.com.br vão para "corporativo"
  - match:
      claim: email
      pattern: "*@azzas2154.com.br"
    addToGroups:
      - corporativo

  # Usuários que pertencem a um grupo específico do Entra vão para "power-users"
  - match:
      claim: groups
      contains: "abc-123-def"
    addToGroups:
      - power-users

  # Múltiplos padrões de departamento
  - match:
      claim: department
      pattern: "Marketing*"
    addToGroups:
      - marketing
      - comunicacao
```

### Claims disponíveis

As claims avaliadas pelas SSO Rules vêm do **userinfo** do OpenID (não do token decodificado). Claims comuns do Microsoft Entra:

| Claim | Descrição | Exemplo |
|---|---|---|
| `email` | Email do usuário | `joao@azzas2154.com.br` |
| `preferred_username` | UPN do usuário | `joao@azzas2154.com.br` |
| `name` | Nome completo | `João Silva` |
| `given_name` | Primeiro nome | `João` |
| `family_name` | Sobrenome | `Silva` |
| `groups` | IDs dos grupos do Entra (array) | `["abc-123", "def-456"]` |
| `roles` | App Roles atribuídos (array) | `["IAzzas.User"]` |
| `department` | Departamento | `TI` |
| `jobTitle` | Cargo | `Analista de Dados` |
| `oid` | Object ID no Entra | `a1b2c3d4-...` |

> Para que claims como `department` e `jobTitle` apareçam, configure **optional claims** no App Registration do Entra: **Token configuration > Add optional claim > ID token**.

---

## Azure AD Group Overage

Quando um usuário pertence a muitos grupos (>200), o Entra não inclui todos os IDs no token. Em vez disso, sinaliza um "group overage". O sistema detecta isso automaticamente e resolve os grupos via **Microsoft Graph API** usando o fluxo On-Behalf-Of (OBO).

Para que isso funcione:

1. O App Registration precisa da permissão `GroupMember.Read.All` (delegada)
2. Configure o scope no `.env`:
   ```env
   OPENID_GRAPH_SCOPES=User.Read,People.Read,GroupMember.Read.All
   ```

---

## Resumo de configuração típica

### `.env`

```env
# Restringir login ao grupo "iazzas-users"
OPENID_REQUIRED_ROLE=<id-do-grupo-iazzas-users>
OPENID_REQUIRED_ROLE_PARAMETER_PATH=groups
OPENID_REQUIRED_ROLE_TOKEN_KIND=id

# Promover membros do grupo "iazzas-admins" a admin
OPENID_ADMIN_ROLE=<id-do-grupo-iazzas-admins>
OPENID_ADMIN_ROLE_PARAMETER_PATH=groups
OPENID_ADMIN_ROLE_TOKEN_KIND=id
```

### `librechat.yaml`

```yaml
version: 1.3.7

registration:
  socialLogins: ['openid']

ssoRules:
  - match:
      claim: email
      pattern: "*@azzas2154.com.br"
    addToGroups:
      - corporativo
  - match:
      claim: groups
      contains: "<id-do-grupo-power-users>"
    addToGroups:
      - power-users
```

### Pré-requisitos no Microsoft Entra

1. **App Registration > Token configuration**: adicionar group claim (Security groups)
2. **App Registration > Token configuration**: adicionar optional claims (`department`, `jobTitle`, etc.) se necessário para SSO Rules
3. **App Registration > API permissions**: `GroupMember.Read.All` (delegada) para group overage
4. **Enterprise Application > Users and groups**: atribuir os grupos/roles aos usuários
