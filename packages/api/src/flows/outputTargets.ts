/**
 * Result destinations for an Automation run (CONTRACT §7).
 *
 * Pure orchestration: the History destination is the persisted FlowRun itself
 * (handled by the scheduler/sink). This module fans the result out to the two
 * best-effort destinations — a new Conversation and an in-app Notification.
 *
 * Engine-side coupling (saveConvo/saveMessage, Notification model) is injected
 * via {@link OutputTargetDeps}, mirroring the Épico 1 DI seam (runAgent.js):
 * `packages/api/src/flows` stays pure and unit-tested; the /api wrapper binds
 * the real DB helpers.
 *
 * Best-effort & scrubbed: a failure in either destination is logged (scrubbed)
 * and never propagated — it must not fail the run or the scheduler.
 */

export type OutputRunStatus = 'success' | 'failed';

export interface OutputTargetParams {
  userId: string;
  automationId: string;
  runId: string;
  flowName: string;
  /** IANA timezone of the automation; used only for the conversation title. */
  timezone: string;
  status: OutputRunStatus;
  /** Final flow output (when status === 'success'). */
  output?: string;
  /** Already engine-scrubbed failure reason (when status === 'failed'). */
  errorReason?: string;
  /** Wall clock; injectable for deterministic tests. */
  now?: Date;
}

export interface OutputTargetDeps {
  createConversation: (params: {
    userId: string;
    title: string;
    text: string;
  }) => Promise<void>;
  notify: (params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    link: string;
  }) => Promise<void>;
  logger: { warn: (msg: string) => void };
}

const CONVO_TEXT_MAX = 4000;
const NOTIF_BODY_MAX = 200;

/** Defensive scrub: drop control chars, collapse whitespace, truncate. */
export function scrubReason(reason: string | undefined, max = NOTIF_BODY_MAX): string {
  if (!reason) {
    return 'Erro desconhecido';
  }
  let stripped = '';
  for (const ch of reason) {
    const code = ch.charCodeAt(0);
    stripped += code < 32 || code === 127 ? ' ' : ch;
  }
  const cleaned = stripped.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** `DD/MM/YYYY HH:mm` in the automation timezone (CONTRACT §4 / §7.2). */
export function formatInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

export async function publishOutputTargets(
  params: OutputTargetParams,
  deps: OutputTargetDeps,
): Promise<void> {
  const now = params.now ?? new Date();
  const isSuccess = params.status === 'success';
  const title = `${params.flowName} — ${formatInTimezone(now, params.timezone)}`;

  const bodyText = isSuccess
    ? params.output && params.output.trim().length > 0
      ? params.output
      : 'Execução concluída sem saída textual.'
    : `Execução falhou: ${scrubReason(params.errorReason, 1000)}`;

  try {
    await deps.createConversation({
      userId: params.userId,
      title,
      text: truncate(bodyText, CONVO_TEXT_MAX),
    });
  } catch {
    deps.logger.warn(
      `[Automations] conversation target failed ${JSON.stringify({
        automationId: params.automationId,
        runId: params.runId,
        target: 'conversation',
      })}`,
    );
  }

  try {
    await deps.notify({
      userId: params.userId,
      type: 'automation_run',
      title: isSuccess
        ? `${params.flowName}: execução concluída`
        : `${params.flowName}: execução falhou`,
      body: isSuccess
        ? truncate(params.output?.trim() || 'Concluído', NOTIF_BODY_MAX)
        : scrubReason(params.errorReason),
      link: `/d/automacoes/${params.automationId}/runs/${params.runId}`,
    });
  } catch {
    deps.logger.warn(
      `[Automations] notification target failed ${JSON.stringify({
        automationId: params.automationId,
        runId: params.runId,
        target: 'notification',
      })}`,
    );
  }
}
