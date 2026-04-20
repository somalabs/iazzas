import { logger } from '@librechat/data-schemas';

export interface BalanceSchedulerDeps {
  /** Reset all users' balances to startBalance. Returns number of documents updated. */
  resetAllBalances: () => Promise<number>;
  /** Most recent lastRefill timestamp across all Balance docs, or null if no docs exist. */
  getLatestRefill: () => Promise<Date | null>;
}

const BRASILIA_UTC_OFFSET_HOURS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Compute the next 00:00 Brasília (UTC-3) moment strictly after `now`. */
export function nextScheduledReset(now: Date = new Date()): Date {
  const next = new Date(now);
  next.setUTCHours(BRASILIA_UTC_OFFSET_HOURS, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

/** The most recent 00:00 Brasília moment at or before `now`. */
export function lastScheduledReset(now: Date = new Date()): Date {
  return new Date(nextScheduledReset(now).getTime() - DAY_MS);
}

/**
 * Schedules a daily job that resets every user's credits at 00:00 Brasília (UTC-3).
 * On startup, runs a catch-up reset if the most recent refill is older than the last
 * scheduled moment (e.g., server was down when the job should have fired).
 *
 * Returns a stop handle for graceful shutdown.
 */
export function startBalanceResetScheduler(deps: BalanceSchedulerDeps): () => void {
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;

  const runReset = async () => {
    try {
      const updatedCount = await deps.resetAllBalances();
      logger.info('[BalanceScheduler] Daily reset complete', { updatedCount });
    } catch (error) {
      logger.error('[BalanceScheduler] Daily reset failed', error);
    }
  };

  const scheduleNext = () => {
    if (stopped) {
      return;
    }
    const now = new Date();
    const next = nextScheduledReset(now);
    const delay = next.getTime() - now.getTime();
    logger.info('[BalanceScheduler] Next reset scheduled', { at: next.toISOString() });
    timer = setTimeout(async () => {
      await runReset();
      scheduleNext();
    }, delay);
  };

  const catchUpIfNeeded = async () => {
    try {
      const latestRefill = await deps.getLatestRefill();
      const expectedSince = lastScheduledReset();
      if (latestRefill == null || latestRefill.getTime() < expectedSince.getTime()) {
        logger.info('[BalanceScheduler] Missed reset detected, running catch-up', {
          latestRefill: latestRefill?.toISOString() ?? 'never',
          expectedSince: expectedSince.toISOString(),
        });
        await runReset();
      }
    } catch (error) {
      logger.error('[BalanceScheduler] Catch-up check failed', error);
    }
  };

  void catchUpIfNeeded().finally(scheduleNext);

  return () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
