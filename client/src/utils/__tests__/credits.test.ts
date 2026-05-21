import { getCycleInfo, hoursUntilSaoPauloMidnight } from '../credits';

describe('getCycleInfo', () => {
  test('no auto-refill → no cycle, safe state', () => {
    const info = getCycleInfo({ tokenCredits: 5_000_000, autoRefillEnabled: false });
    expect(info.hasCycle).toBe(false);
    expect(info.pct).toBe(0);
    expect(info.colorState).toBe('safe');
    expect(info.hoursUntilRenewal).toBeNull();
    expect(info.displayCeiling).toBeNull();
  });

  test('refillAmount = 0 → no cycle', () => {
    const info = getCycleInfo({
      tokenCredits: 1_000_000,
      autoRefillEnabled: true,
      refillAmount: 0,
    });
    expect(info.hasCycle).toBe(false);
  });

  test('safe state: <70% consumed', () => {
    // ceiling 1000 display credits; balance 800 display => 200 raw*10000 consumed = 20%
    const info = getCycleInfo({
      tokenCredits: 800 * 10_000,
      autoRefillEnabled: true,
      refillAmount: 1000,
    });
    expect(info.hasCycle).toBe(true);
    expect(info.pct).toBe(20);
    expect(info.colorState).toBe('safe');
    expect(info.displayCeiling).toBe(1000);
  });

  test('warning state: 70-90% consumed', () => {
    const info = getCycleInfo({
      tokenCredits: 200 * 10_000,
      autoRefillEnabled: true,
      refillAmount: 1000,
    });
    expect(info.pct).toBe(80);
    expect(info.colorState).toBe('warning');
  });

  test('danger state: >90% consumed', () => {
    const info = getCycleInfo({
      tokenCredits: 50 * 10_000,
      autoRefillEnabled: true,
      refillAmount: 1000,
    });
    expect(info.pct).toBe(95);
    expect(info.colorState).toBe('danger');
  });

  test('pct clamped to [0, 100] when balance exceeds ceiling', () => {
    const info = getCycleInfo({
      tokenCredits: 2000 * 10_000,
      autoRefillEnabled: true,
      refillAmount: 1000,
    });
    expect(info.pct).toBe(0);
  });

  test('daily cycle exposes hoursUntilRenewal in [1, 24]', () => {
    const info = getCycleInfo({
      tokenCredits: 500 * 10_000,
      autoRefillEnabled: true,
      refillAmount: 1000,
    });
    expect(info.hoursUntilRenewal).not.toBeNull();
    expect(info.hoursUntilRenewal).toBeGreaterThanOrEqual(1);
    expect(info.hoursUntilRenewal).toBeLessThanOrEqual(24);
  });

  test('hoursUntilRenewal null when no cycle (refillAmount = 0)', () => {
    const info = getCycleInfo({
      tokenCredits: 500 * 10_000,
      autoRefillEnabled: true,
      refillAmount: 0,
    });
    expect(info.hoursUntilRenewal).toBeNull();
  });
});

describe('hoursUntilSaoPauloMidnight', () => {
  // America/Sao_Paulo is UTC-3 (no DST since 2019).
  test('at 21:00 São Paulo (00:00 UTC) → 3h until midnight', () => {
    expect(hoursUntilSaoPauloMidnight(new Date('2026-05-19T00:00:00Z'))).toBe(3);
  });

  test('at 00:00 São Paulo (03:00 UTC) → full 24h', () => {
    expect(hoursUntilSaoPauloMidnight(new Date('2026-05-19T03:00:00Z'))).toBe(24);
  });

  test('30min before midnight São Paulo rounds up to 1h', () => {
    expect(hoursUntilSaoPauloMidnight(new Date('2026-05-19T02:30:00Z'))).toBe(1);
  });

  test('result is always clamped to [1, 24]', () => {
    const h = hoursUntilSaoPauloMidnight(new Date('2026-05-19T15:00:00Z'));
    expect(h).toBeGreaterThanOrEqual(1);
    expect(h).toBeLessThanOrEqual(24);
  });
});
