import { getCycleInfo } from '../credits';

describe('getCycleInfo', () => {
  test('no auto-refill → no cycle, safe state', () => {
    const info = getCycleInfo({ tokenCredits: 5_000_000, autoRefillEnabled: false });
    expect(info.hasCycle).toBe(false);
    expect(info.pct).toBe(0);
    expect(info.colorState).toBe('safe');
    expect(info.viraDDMM).toBeNull();
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

  test('viraDDMM computed for monthly cycle as DD/MM', () => {
    const lastRefill = new Date('2026-05-01T00:00:00Z');
    const info = getCycleInfo({
      tokenCredits: 500 * 10_000,
      autoRefillEnabled: true,
      refillAmount: 1000,
      lastRefill,
      refillIntervalUnit: 'months',
      refillIntervalValue: 1,
    });
    expect(info.viraDDMM).toMatch(/^\d{2}\/\d{2}$/);
  });

  test('viraDDMM null when interval data missing', () => {
    const info = getCycleInfo({
      tokenCredits: 500 * 10_000,
      autoRefillEnabled: true,
      refillAmount: 1000,
      lastRefill: new Date('2026-05-01T00:00:00Z'),
    });
    expect(info.viraDDMM).toBeNull();
  });
});
