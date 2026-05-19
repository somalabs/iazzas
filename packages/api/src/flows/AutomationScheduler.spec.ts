import { AutomationScheduler, type AutomationSchedulerDeps } from './AutomationScheduler';

interface FakeTimer {
  ms: number;
  cb: () => void;
  cleared: boolean;
}

function makeHarness(overrides: Partial<AutomationSchedulerDeps> = {}) {
  const timers: FakeTimer[] = [];
  const persisted: Array<{ id: string; next: Date | null }> = [];
  const fired: string[] = [];
  let clock = new Date('2026-05-18T00:00:00.000Z');

  const deps: AutomationSchedulerDeps = {
    logger: { warn: () => undefined, error: () => undefined },
    now: () => clock,
    nextRunAt: (_c, _tz, from) => new Date(from.getTime() + 60_000),
    onFire: async (id) => {
      fired.push(id);
    },
    persistNextRun: async (id, next) => {
      persisted.push({ id, next });
    },
    setTimer: (ms, cb) => {
      const t: FakeTimer = { ms, cb, cleared: false };
      timers.push(t);
      return t;
    },
    clearTimer: (h) => {
      (h as FakeTimer).cleared = true;
    },
    ...overrides,
  };

  return {
    deps,
    timers,
    persisted,
    fired,
    advance: (ms: number) => {
      clock = new Date(clock.getTime() + ms);
    },
    setClock: (d: Date) => {
      clock = d;
    },
  };
}

describe('flows/AutomationScheduler', () => {
  it('registers an automation, persists nextRunAt and arms a timer', async () => {
    const h = makeHarness();
    const s = new AutomationScheduler(h.deps);
    await s.register({ id: 'a1', cron: '0 9 * * *', timezone: 'UTC' });

    expect(s.size()).toBe(1);
    expect(h.persisted[0]).toEqual({ id: 'a1', next: new Date('2026-05-18T00:01:00.000Z') });
    expect(h.timers).toHaveLength(1);
    expect(h.timers[0].ms).toBe(60_000);
  });

  it('skips scheduling and persists null when cron is invalid', async () => {
    const h = makeHarness({
      nextRunAt: () => {
        throw new Error('bad cron');
      },
    });
    const s = new AutomationScheduler(h.deps);
    await s.register({ id: 'bad', cron: 'nope', timezone: 'UTC' });

    expect(s.size()).toBe(0);
    expect(h.persisted[0]).toEqual({ id: 'bad', next: null });
    expect(h.timers).toHaveLength(0);
  });

  it('fires onFire and re-arms for the next window', async () => {
    const h = makeHarness();
    const s = new AutomationScheduler(h.deps);
    await s.register({ id: 'a1', cron: '* * * * *', timezone: 'UTC' });

    h.advance(60_000);
    await h.timers[0].cb();
    // allow the async fire() chain to settle
    await new Promise((r) => setTimeout(r, 0));

    expect(h.fired).toEqual(['a1']);
    expect(s.size()).toBe(1);
    expect(h.timers.length).toBeGreaterThanOrEqual(2); // re-armed
  });

  it('keeps the schedule when a run throws (no auto-disable, no retry)', async () => {
    const h = makeHarness({
      onFire: async () => {
        throw new Error('run blew up');
      },
    });
    const s = new AutomationScheduler(h.deps);
    await s.register({ id: 'a1', cron: '* * * * *', timezone: 'UTC' });

    h.advance(60_000);
    await h.timers[0].cb();
    await new Promise((r) => setTimeout(r, 0));

    expect(s.size()).toBe(1); // still scheduled
  });

  it('unregister clears the timer and drops the entry', async () => {
    const h = makeHarness();
    const s = new AutomationScheduler(h.deps);
    await s.register({ id: 'a1', cron: '0 9 * * *', timezone: 'UTC' });
    s.unregister('a1');

    expect(s.size()).toBe(0);
    expect(h.timers[0].cleared).toBe(true);
  });

  it('bootstrap registers every automation across pages (cursor-paginated)', async () => {
    const h = makeHarness();
    const s = new AutomationScheduler(h.deps);
    async function* pages() {
      yield [
        { id: 'a1', cron: '0 9 * * *', timezone: 'UTC' },
        { id: 'a2', cron: '0 10 * * *', timezone: 'UTC' },
      ];
      yield [{ id: 'a3', cron: '0 11 * * *', timezone: 'UTC' }];
    }
    await s.bootstrap(pages());
    expect(s.size()).toBe(3);
  });
});
