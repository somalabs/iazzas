# Microsoft SSO + Auto-Assignment Rules

## Summary

Configure Microsoft Entra ID as the OIDC provider using the existing OpenID Connect strategy, and add a YAML-based rules engine that auto-assigns users to groups on first login based on OIDC claims (email domain, department, AD groups, job title, etc.).

## Audience

- **SSO configuration:** DevOps/infra team (env vars + YAML)
- **Post-login management:** Admin users via admin panel (Groups/Roles tabs)

## SSO Configuration (Existing — No New Code)

The existing `openidStrategy.js` already supports Microsoft Entra ID. Required env vars:

```
OPENID_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
OPENID_CLIENT_ID=<app-client-id>
OPENID_CLIENT_SECRET=<app-client-secret>
OPENID_CALLBACK_URL=/api/oauth/openid/callback
OPENID_SCOPE=openid profile email
OPENID_REUSE_TOKENS=true
```

### Entra ID App Registration Steps

1. Go to Azure Portal → App registrations → New registration
2. Set redirect URI: `https://<your-domain>/api/oauth/openid/callback`
3. Under "Certificates & secrets", create a client secret
4. Under "Token configuration", add optional claims to the ID token:
   - `email`, `groups`, `department`, `jobTitle` (or any custom claims needed for rules)
5. Under "API permissions", add `GroupMember.Read.All` (for group overage handling)
6. Under "Authentication", enable ID tokens

### Group Claims

For Entra ID group claims, configure the app to emit group IDs in the `groups` claim of the ID token. If the user is a member of more than 200 groups, Azure returns a `_claim_sources` overage indicator — the existing `openidStrategy.js` already handles this by calling the Microsoft Graph API.

### librechat.yaml

Ensure `openid` is in the socialLogins list:

```yaml
registration:
  socialLogins: ['openid']
  allowedDomains: ['azzas.com']  # optional domain restriction
```

## Rules Engine (New Feature)

### YAML Schema

New `ssoRules` section in `librechat.yaml`:

```yaml
ssoRules:
  - match:
      claim: "email"
      pattern: "*@marketing.azzas.com"
    addToGroups: ["marketing-team"]

  - match:
      claim: "department"
      value: "Engineering"
    addToGroups: ["eng-team", "dev-tools"]

  - match:
      claim: "groups"
      contains: "a1b2c3d4-entra-group-object-id"
    addToGroups: ["power-users"]

  - match:
      claim: "jobTitle"
      pattern: "Director*"
    addToGroups: ["leadership"]
```

### Match Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `value` | Exact string match (case-insensitive) | `value: "Engineering"` |
| `pattern` | Glob pattern with `*` wildcards (case-insensitive) | `pattern: "*@marketing.azzas.com"` |
| `contains` | Checks if an array claim includes the value | `contains: "entra-group-id"` |

Only one operator per rule. If none match, the rule is skipped.

### Evaluation Behavior

- **When:** On first login only (during `createSocialUser` in `api/strategies/process.js`)
- **Accumulation:** All rules are evaluated; user is added to ALL matching groups
- **Group auto-creation:** If a group named in `addToGroups` doesn't exist yet, it is created automatically with `source: 'sso'` and `description: 'Auto-created by SSO rule'`
- **No role assignment:** Rules only assign groups, not roles. Permissions flow through group membership and the existing AdminConfig override system
- **No re-evaluation:** Subsequent logins do not re-evaluate rules. Admin changes to group membership are permanent

### Claims Available

Standard OIDC claims from Entra ID tokens:

| Claim | Type | Description |
|-------|------|-------------|
| `email` | string | User's email address |
| `name` | string | Display name |
| `preferred_username` | string | UPN (usually email) |
| `groups` | string[] | Entra ID group object IDs |
| `department` | string | Department (requires optional claim config) |
| `jobTitle` | string | Job title (requires optional claim config) |
| `_claim_names` / `_claim_sources` | object | Group overage indicator |

Custom claims can also be configured in Entra ID and referenced in rules.

## Backend

### New Files

#### `packages/api/src/sso/rules.ts`

Exports `evaluateSSORules(claims, rules)` — pure function that takes the OIDC token claims and the parsed `ssoRules` config, returns a list of group names the user should be added to.

```
evaluateSSORules(
  claims: Record<string, unknown>,
  rules: SSORule[],
): string[]
```

**Match logic:**
- `value`: `String(claimValue).toLowerCase() === rule.match.value.toLowerCase()`
- `pattern`: convert glob to regex (`*` → `.*`), case-insensitive test
- `contains`: `Array.isArray(claimValue) && claimValue.includes(rule.match.contains)`

#### `packages/api/src/sso/index.ts`

Barrel export.

### Modified Files

#### `packages/data-provider/src/config.ts`

Add Zod schema for `ssoRules`:

```typescript
const ssoRuleMatchSchema = z.object({
  claim: z.string(),
  value: z.string().optional(),
  pattern: z.string().optional(),
  contains: z.string().optional(),
}).refine(
  (m) => [m.value, m.pattern, m.contains].filter(Boolean).length === 1,
  { message: 'Exactly one of value, pattern, or contains is required' },
);

const ssoRuleSchema = z.object({
  match: ssoRuleMatchSchema,
  addToGroups: z.array(z.string()).min(1),
});

// Add to customConfigSchema:
ssoRules: z.array(ssoRuleSchema).optional(),
```

Type export: `TSSORuleConfig`

#### `api/strategies/process.js`

In `createSocialUser()`, after user creation:

1. Read `ssoRules` from the app config
2. If rules exist, call `evaluateSSORules(tokenClaims, rules)`
3. For each returned group name:
   - Find or create the group (`findGroupByName` / `createGroup` with `source: 'sso'`)
   - Add user as member (`addGroupMember`)
4. Log which groups were assigned

The OIDC claims are available via the `profile._json` object (raw token claims) or the extracted profile fields.

#### `packages/data-schemas/src/schema/group.ts` (if needed)

Ensure the group schema supports `source: 'sso'` as a valid source value. Check if `source` field already exists and supports arbitrary strings.

### Files Summary

```
packages/data-provider/src/
  config.ts              — EDIT: add ssoRules schema + type export

packages/api/src/sso/
  rules.ts               — NEW: evaluateSSORules pure function
  index.ts               — NEW: barrel export

api/strategies/
  process.js             — EDIT: call evaluateSSORules after user creation
```

## Testing

- `packages/api/src/sso/rules.spec.ts` — unit tests for `evaluateSSORules`:
  - Exact value match (case-insensitive)
  - Glob pattern match
  - Array contains match
  - No match returns empty array
  - Multiple rules accumulate groups
  - Invalid/missing claims are skipped gracefully
  - Unknown operator is ignored

## Localization

No new UI, so no localization keys needed.

## Post-Login Admin Workflow

After SSO auto-assignment, admins manage users through the existing admin panel:

1. **View user's groups:** Users tab → click user → see assigned groups
2. **Change group membership:** Groups tab → select group → add/remove members
3. **Change role:** Roles tab → assign user to different role
4. **Set per-group config overrides:** Configs tab → create override for group with balance/permissions
