/**
 * In-process scheduler for Automations.
 *
 * Pure timing engine: it owns one self-rearming timer per registered
 * automation and, when a timer fires, delegates the actual run (atomic
 * concurrency claim → FlowRunner → output targets → persistence) to the
 * injected {@link AutomationSchedulerDeps.onFire}. All DB/Express coupling
 * lives behind the deps seam, mirroring the Épico 1 architecture.
 *
 * A run failure never unregisters the automation — the next cron window is
 * still scheduled (CONTRACT §5: no auto-disable, no retry).
 */

/** Node's setTimeout ceiling (2^31-1 ms ≈ 24.8 days); long waits re-arm. */
const MAX_TIMER_MS = 2_147_483_647;

export interface AutomationLite {
  id: string;
  cron: string;
  timezone: string;
}

export interface AutomationSchedulerDeps {
  logger: { warn: (msg: string) => void; error: (msg: string) => void };
  now: () => Date;
  /** Next UTC fire time, or null when the cron/timezone is unusable. */
  nextRunAt: (cron: string, timezone: string, from: Date) => Date | null;
  /** Runs the automation (claim+run+targets+persist). Must not throw. */
  onFire: (id: string) => Promise<void>;
  /** Persists the recomputed nextRunAt (or null) on the Automation doc. */
  persistNextRun: (id: string, next: Date | null) => Promise<void>;
  setTimer: (ms: number, cb: () => void) => unknown;
  clearTimer: (handle: unknown) => void;
}

interface Entry {
  automation: AutomationLite;
  handle: unknown;
  fireAt: Date | null;
}

export class AutomationScheduler {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly deps: AutomationSchedulerDeps) {}

  size(): number {
    return this.entries.size;
  }

  /** Recompute and (re)arm the timer for a single automation. */
  async register(automation: AutomationLite): Promise<void> {
    this.unregister(automation.id);

    const from = this.deps.now();
    let next: Date | null = null;
    try {
      next = this.deps.nextRunAt(automation.cron, automation.timezone, from);
    } catch {
      next = null;
    }

    try {
      await this.deps.persistNextRun(automation.id, next);
    } catch {
      this.deps.logger.warn(
        `[Automations] persistNextRun failed ${JSON.stringify({ automationId: automation.id })}`,
      );
    }

    if (!next) {
      this.deps.logger.warn(
        `[Automations] skipping schedule (invalid cron/timezone) ${JSON.stringify({
          automationId: automation.id,
        })}`,
      );
      return;
    }

    const entry: Entry = { automation, handle: null, fireAt: next };
    this.entries.set(automation.id, entry);
    this.arm(entry);
  }

  unregister(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      if (entry.handle != null) {
        this.deps.clearTimer(entry.handle);
      }
      this.entries.delete(id);
    }
  }

  stop(): void {
    for (const id of [...this.entries.keys()]) {
      this.unregister(id);
    }
  }

  /**
   * Initial scan at boot. `pages` yields batches of enabled automations
   * (cursor-paginated by the caller — never load-all).
   */
  async bootstrap(pages: AsyncIterable<AutomationLite[]>): Promise<void> {
    for await (const page of pages) {
      for (const automation of page) {
        await this.register(automation);
      }
    }
  }

  private arm(entry: Entry): void {
    if (!entry.fireAt) {
      return;
    }
    const delay = Math.max(0, entry.fireAt.getTime() - this.deps.now().getTime());
    if (delay > MAX_TIMER_MS) {
      entry.handle = this.deps.setTimer(MAX_TIMER_MS, () => this.arm(entry));
      return;
    }
    entry.handle = this.deps.setTimer(delay, () => {
      void this.fire(entry.automation.id);
    });
  }

  private async fire(id: string): Promise<void> {
    if (!this.entries.has(id)) {
      return;
    }
    try {
      await this.deps.onFire(id);
    } catch {
      this.deps.logger.error(
        `[Automations] onFire threw (will keep schedule) ${JSON.stringify({ automationId: id })}`,
      );
    }
    // Re-arm for the next cron window regardless of run outcome. Re-read the
    // live entry: a long-running onFire may have been concurrently
    // re-registered (new cron) — never resurrect the stale snapshot.
    const current = this.entries.get(id);
    if (current) {
      await this.register(current.automation);
    }
  }
}
