import { Cron } from 'croner';

/**
 * Timezone-aware cron scheduling for Automations.
 *
 * Lib choice: `croner` (zero runtime dependencies, IANA-timezone & DST aware,
 * computes future fire times, throws on malformed patterns). `node-cron` does
 * not expose a next-fire calculation and has weaker timezone handling; a
 * `cron-parser` + `luxon` combo is heavier for the same result.
 */

export type ScheduleErrorCode = 'cronInvalid' | 'timezoneInvalid' | 'cronIntervalTooShort';

export class ScheduleValidationError extends Error {
  readonly code: ScheduleErrorCode;
  constructor(code: ScheduleErrorCode) {
    super(code);
    this.name = 'ScheduleValidationError';
    this.code = code;
  }
}

/** Reads the configured minimum interval (minutes); falls back to 5. */
export function getMinIntervalMinutes(): number {
  const raw = Number(process.env.AUTOMATION_MIN_INTERVAL_MIN);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
}

export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Contract mandates the classic 5-field cron (minute hour dom month dow). */
function assertFiveFieldCron(cron: string): void {
  if (typeof cron !== 'string' || cron.trim().split(/\s+/).length !== 5) {
    throw new ScheduleValidationError('cronInvalid');
  }
}

function buildJob(cron: string, timezone: string): Cron {
  try {
    return new Cron(cron, { timezone });
  } catch {
    throw new ScheduleValidationError('cronInvalid');
  }
}

/**
 * Next fire time (UTC Date) for `cron` resolved in `timezone`, strictly after
 * `from`. Throws {@link ScheduleValidationError} for malformed cron / timezone.
 */
export function nextRunAt(cron: string, timezone: string, from: Date = new Date()): Date {
  if (!isValidTimezone(timezone)) {
    throw new ScheduleValidationError('timezoneInvalid');
  }
  assertFiveFieldCron(cron);
  const job = buildJob(cron, timezone);
  const next = job.nextRun(from);
  if (!next) {
    throw new ScheduleValidationError('cronInvalid');
  }
  return next;
}

/**
 * Validates the schedule and enforces the minimum interval between two
 * consecutive fires. Returns the first `nextRunAt` so callers persist it.
 */
export function validateSchedule(
  cron: string,
  timezone: string,
  from: Date = new Date(),
): Date {
  if (!isValidTimezone(timezone)) {
    throw new ScheduleValidationError('timezoneInvalid');
  }
  assertFiveFieldCron(cron);
  const job = buildJob(cron, timezone);
  const [first, second] = job.nextRuns(2, from);
  if (!first || !second) {
    throw new ScheduleValidationError('cronInvalid');
  }
  const deltaMinutes = (second.getTime() - first.getTime()) / 60000;
  if (deltaMinutes + 1e-6 < getMinIntervalMinutes()) {
    throw new ScheduleValidationError('cronIntervalTooShort');
  }
  return first;
}
