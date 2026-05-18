import {
  lastScheduledReset,
  nextScheduledReset,
  startBalanceResetScheduler,
} from './scheduler';

jest.mock('@librechat/data-schemas', () => ({
  ...jest.requireActual('@librechat/data-schemas'),
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

describe('scheduled reset time helpers', () => {
  it('rolls forward when current time is already past 03:00 UTC', () => {
    const now = new Date('2026-04-20T10:00:00Z');
    expect(nextScheduledReset(now).toISOString()).toBe('2026-04-21T03:00:00.000Z');
    expect(lastScheduledReset(now).toISOString()).toBe('2026-04-20T03:00:00.000Z');
  });

  it('treats same-day 03:00 UTC as the next reset when called before it', () => {
    const now = new Date('2026-04-20T02:00:00Z');
    expect(nextScheduledReset(now).toISOString()).toBe('2026-04-20T03:00:00.000Z');
    expect(lastScheduledReset(now).toISOString()).toBe('2026-04-19T03:00:00.000Z');
  });

  it('rolls forward from exactly 03:00 UTC (strictly after)', () => {
    const now = new Date('2026-04-20T03:00:00Z');
    expect(nextScheduledReset(now).toISOString()).toBe('2026-04-21T03:00:00.000Z');
  });
});

describe('startBalanceResetScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const flushMicrotasks = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  it('runs a catch-up reset when the latest refill is older than the last scheduled moment', async () => {
    jest.setSystemTime(new Date('2026-04-20T10:00:00Z'));
    const resetAllBalances = jest.fn().mockResolvedValue(5);
    const getLatestRefill = jest.fn().mockResolvedValue(new Date('2026-04-19T00:00:00Z'));

    const stop = startBalanceResetScheduler({ resetAllBalances, getLatestRefill });
    await flushMicrotasks();

    expect(getLatestRefill).toHaveBeenCalledTimes(1);
    expect(resetAllBalances).toHaveBeenCalledTimes(1);
    stop();
  });

  it('skips catch-up when the latest refill is after the last scheduled moment', async () => {
    jest.setSystemTime(new Date('2026-04-20T10:00:00Z'));
    const resetAllBalances = jest.fn().mockResolvedValue(5);
    const getLatestRefill = jest.fn().mockResolvedValue(new Date('2026-04-20T03:00:00Z'));

    const stop = startBalanceResetScheduler({ resetAllBalances, getLatestRefill });
    await flushMicrotasks();

    expect(resetAllBalances).not.toHaveBeenCalled();
    stop();
  });

  it('fires a reset when the scheduled time arrives and reschedules the next day', async () => {
    jest.setSystemTime(new Date('2026-04-20T10:00:00Z'));
    const resetAllBalances = jest.fn().mockResolvedValue(5);
    const getLatestRefill = jest.fn().mockResolvedValue(new Date('2026-04-20T03:00:00Z'));

    const stop = startBalanceResetScheduler({ resetAllBalances, getLatestRefill });
    await flushMicrotasks();
    expect(resetAllBalances).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(17 * 60 * 60 * 1000);
    expect(resetAllBalances).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(resetAllBalances).toHaveBeenCalledTimes(2);

    stop();
  });

  it('stop() prevents future scheduled resets', async () => {
    jest.setSystemTime(new Date('2026-04-20T10:00:00Z'));
    const resetAllBalances = jest.fn().mockResolvedValue(5);
    const getLatestRefill = jest.fn().mockResolvedValue(new Date('2026-04-20T03:00:00Z'));

    const stop = startBalanceResetScheduler({ resetAllBalances, getLatestRefill });
    await flushMicrotasks();
    stop();

    await jest.advanceTimersByTimeAsync(48 * 60 * 60 * 1000);
    expect(resetAllBalances).not.toHaveBeenCalled();
  });
});
