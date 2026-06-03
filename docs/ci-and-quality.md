# CI & Quality — gates, local reproduction, and drift prevention

This repo's CI drifts red easily: the failures are almost always **stale tests, formatting, and dead i18n keys left behind by a change** — not real bugs. The fix is cheap if caught locally before the PR. This doc lists every PR gate, the exact command to reproduce it, the recurring pitfalls, and a pre-merge checklist.

## PR gates (GitHub Actions)

| Workflow / job | What it runs | Reproduce locally |
|---|---|---|
| `backend-review` · typecheck | `tsc --noEmit` on the four backend tsconfigs | `npx tsc --noEmit -p packages/<data-provider\|data-schemas\|api\|client>/tsconfig.json` |
| `backend-review` · circular-deps | builds `@librechat/api`, greps for `Circular` | `npm run build:api` then check output for `Circular` |
| `backend-review` · tests | `npm run test:ci` per backend workspace | `cd packages/<api\|data-provider\|data-schemas> && npm run test:ci`; `cd api && npm run test:ci` |
| `frontend-review` · tests | full client Jest suite (Ubuntu + Windows) | `cd client && npm run test:ci` |
| `frontend-review` · build-verify | Vite production build | `cd client && npm run build:ci` |
| `eslint-ci` | ESLint on **changed** `api/` & `client/` files | `npx eslint --config eslint.config.mjs <changed files>` |
| `i18n-unused-keys` | every key in `client/src/locales/en/translation.json` must appear in source | see [i18n](#i18n-unused-keys) below |
| `unused-packages` | depcheck-style; only relevant when `package.json` deps change | — |
| `a11y` | **skipped on this fork** (gated to `danny-avila/LibreChat`) | n/a |

The full local sweep before opening a PR:

```bash
# backend (run once)
cp api/test/.env.test.example api/test/.env.test    # REQUIRED — see pitfalls
mkdir -p api/data && echo '{}' > api/data/auth.json
npx tsc --noEmit -p packages/data-provider/tsconfig.json
npx tsc --noEmit -p packages/data-schemas/tsconfig.json
npx tsc --noEmit -p packages/api/tsconfig.json
npx tsc --noEmit -p packages/client/tsconfig.json
( cd packages/api && npm run test:ci )
( cd packages/data-provider && npm run test:ci )
( cd packages/data-schemas && npm run test:ci )

# frontend
( cd client && npm run test:ci )      # run ALONE — flakes under parallel load
( cd client && npm run build:ci )

# lint the files you changed (NOT the prettier CLI — see pitfalls)
git diff --name-only --diff-filter=ACMRTUXB main...HEAD \
  | grep -E '^(api|client)/.*\.(js|jsx|ts|tsx)$' > /tmp/changed.txt
test -s /tmp/changed.txt && npx eslint --fix --config eslint.config.mjs $(cat /tmp/changed.txt)
```

## Pitfalls that produce false signals

1. **`zsh` masks exit codes.** `${PIPESTATUS[0]}` is empty in zsh, so `cmd | tail; echo $?` reports the `echo`'s status, not `cmd`'s. **Grep the output** for `error TS`, `FAIL`, `✖ N problems` instead of trusting an exit code.
2. **`api` tests need a local env.** Without `api/test/.env.test` (copied from `.env.test.example`) and `api/data/auth.json`, ~6 backend suites fail on missing config. CI creates these; locally you must too.
3. **`prettier --write` ≠ `eslint`.** `prettier/prettier` is an ESLint error here, but the prettier CLI and `eslint-plugin-prettier` disagree (the tailwind plugin reorders differently). **Fix formatting with `eslint --fix`, never the prettier CLI.**
4. **`MongoMemoryServer` timeouts / race tests are flaky locally** (`api/.../prompts.test.js`, `packages/api` `accessControlService` / `MCPOAuthRaceCondition` / `ServerConfigsDB`). They pass on a warm runner and in isolation; don't treat them as real failures.
5. **The client suite flakes ~2 suites/run under parallel load.** Run it on its own and it is 142/142. Don't chase a flaky failure that moves between runs.

## i18n unused keys

`i18n-unused-keys` fails the build on **any** key in `en/translation.json` that doesn't appear in source (`client/src`, `api`, `packages/data-provider/src`, `packages/client`, `packages/data-schemas/src` — note `packages/api/src` is NOT scanned). It understands template-literal prefixes (`` localize(`com_x_${...}`) ``) but not much else. To check locally, for each added key:

```bash
grep -rq --include=*.{js,jsx,ts,tsx} "com_your_key" client/src api packages || echo "UNUSED → will fail CI"
```

Only edit **English** keys (`en/translation.json`); other locales are synced externally.

## How the drift happens — and how to not cause it

Every red gate in the LEM-88 sweep traced back to a change that didn't carry its tests/keys along:

- **Changing a shared default broke the tests that pinned the old default.** `i18n.ts` set `lng:'pt-BR'`, so every component test asserting English copy failed. `roles.ts` flipped USER `AGENTS.SHARE_PUBLIC` / `MARKETPLACE.USE` to `true`, so `permissions.spec.ts` (which hard-codes the defaults) failed. **When you change a default in `i18n.ts`, `roles.ts`, `config.ts`, or any shared schema, update its spec in the same commit.**
- **Editing a component without its test.** Dropping `strokeWidth`, adding a `useUpdate…Mutation` hook (test mock missing it), or changing a render guard (`MCPSelect` losing `isPinned`) each broke a spec the change didn't touch. **Grep for a spec next to any component you edit and run it.**
- **Loosening a type without fixing consumers.** Making `avatar.filepath` optional broke `tsc` in `avatars.spec.ts`. **Run the four typechecks after any type/schema change.**
- **Hardcoded UI strings.** New literal JSX text trips `i18next/no-literal-string`. Localize it, or — for intentional pt-BR/brand/demo copy — add `/* eslint-disable i18next/no-literal-string */` (the established escape hatch).
- **Dead i18n keys.** Keys added "for later" and never wired up fail `i18n-unused-keys`. Add a key only when you use it; remove it when you stop.

**Bottom line:** a change is not done when the feature works — it's done when the gate for the area you touched is green locally. The commands above make that a two-minute check.
