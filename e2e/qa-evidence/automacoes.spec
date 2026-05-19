QA SPEC — LEM-47 — Gate Playwright + regressão — Automações (Épico 2 / LEM-34)
Critério de aceite autoritativo: config/automacoes/CONTRACT.md
Harness executável: e2e/qa-evidence/automacoes-e2e.mjs  (rodado ao vivo em http://127.0.0.1:3080)
Rodada de QA: 1/3

Cenários (Task 8 do blueprint):

[S1] Logar; criar automação p/ flow do Épico 1 (diária 08:00, TZ America/Sao_Paulo)
     POST /api/automacoes {cron:'0 8 * * *', timezone:'America/Sao_Paulo'}  → esperado 201
     RESULTADO: ❌ 403 "Forbidden: Insufficient permissions" (bloqueado pelo gate RBAC)

[S2] "Rodar agora" → run no Histórico com status success
     POST /api/automacoes/:id/run → 202; GET /:id/runs → run.status=success
     RESULTADO: ⛔ NÃO EXECUTÁVEL — depende de S1 (automação não pôde ser criada)

[S3] Destinos: conversa nova (título "<flow> — <ts>", dona=criador) + notificação in-app
     RESULTADO: ⛔ NÃO EXECUTÁVEL — depende de S1/S2

[S4] Pausar (PATCH /:id/enabled {enabled:false}) → automação desativada
     RESULTADO: ⛔ NÃO EXECUTÁVEL — depende de S1

[S5] Criar automação p/ flow com nó human_approval → 422 approvalNodeIncompatible
     POST /api/automacoes (flow c/ human_approval) → esperado 422
     RESULTADO: ❌ 403 (gate RBAC dispara ANTES da verificação de approval node;
               regra de negócio não pôde ser exercida)

[S6] Gate de permissão: sem PermissionType AUTOMATIONS não cria (CTA disabled / 403)
     RESULTADO: ⚠️ O gate "nega" — mas nega TODOS os usuários (inclusive ADMIN/USER
               que o CONTRACT §9.2 exige USE+CREATE=true). Gate quebrado no sentido
               deny-all. UI /d/automacoes redireciona p/ /c/new p/ todo usuário.

[S7] Regressão inegociável: /c/new e /d/agent-studio intactos, 0 pageerror
     RESULTADO: ✅ PASSOU — /c/new e /d/agent-studio carregam, 0 pageerror,
               sem "Oops"/"Cannot read properties", sem jargão interno.

VEREDITO: REPROVADO (BLOCKED) — bloqueante único de RBAC impede S1–S6.

ROOT CAUSE (defeito de tech, classe LEM-38):
  packages/data-schemas/src/schema/role.ts → rolePermissionsSchema (Mongoose,
  strict:true, {_id:false}) NÃO declara [PermissionTypes.AUTOMATIONS].
  Consequência: initializeRoles() seta role.permissions.AUTOMATIONS a partir de
  roleDefaults (que JÁ contém AUTOMATIONS no build), mas o Mongoose strip
  silenciosamente o caminho não-declarado em role.save(). Os docs de role no
  Mongo ficam sem AUTOMATIONS → checkAccess() lê role.permissions.AUTOMATIONS =
  undefined → 403 universal em todas as rotas /api/automacoes; o frontend
  useHasAccess(AUTOMATIONS.USE)=false → AutomacoesScreen redireciona p/ /c/new.

  Prova ao vivo:
   - GET/POST /api/automacoes (user autenticado, role USER) → 403.
   - Mongo roles: ADMIN/USER.permissions sem chave AUTOMATIONS (demais 14 OK).
   - require('librechat-data-provider').roleDefaults.USER.permissions.AUTOMATIONS
     = {USE:true,CREATE:true} (build do data-provider está correto).
   - rolePermissionsSchema lista 14 PermissionTypes; AUTOMATIONS ausente.

FIX (1 ponto, espelhar AGENTS/REMOTE_AGENTS):
  Adicionar a packages/data-schemas/src/schema/role.ts, dentro de
  rolePermissionsSchema:
    [PermissionTypes.AUTOMATIONS]: {
      [Permissions.USE]: { type: Boolean },
      [Permissions.CREATE]: { type: Boolean },
    },
  Rebuild data-schemas; reiniciar server (re-seed via initializeRoles).

Evidência: e2e/qa-evidence/automacoes-{desktop-lista,mobile-lista,
regression-chat,regression-studio}.png + automacoes-e2e.mjs (RESULT JSON no stdout).
