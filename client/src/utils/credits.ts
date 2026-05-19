/** Divisor to convert raw tokenCredits into user-friendly display credits. */
const DISPLAY_DIVISOR = 10_000;
/** Raw tokenCredits that equal 1 USD. */
const CREDITS_PER_USD = 1_000_000;

/** Convert raw tokenCredits to display credits (100 display = $1). */
export function toDisplayCredits(raw: number): number {
  return raw / DISPLAY_DIVISOR;
}

/** Convert display credits back to raw tokenCredits. */
export function toRawCredits(display: number): number {
  return display * DISPLAY_DIVISOR;
}

/** Convert raw tokenCredits to USD. */
export function toUSD(raw: number): number {
  return raw / CREDITS_PER_USD;
}

/** Format display credits with abbreviations (K/M). */
export function formatDisplayCredits(raw: number): string {
  const display = toDisplayCredits(raw);
  if (display >= 1_000_000) {
    return `${(display / 1_000_000).toFixed(1)}M`;
  }
  if (display >= 1_000) {
    return `${(display / 1_000).toFixed(1)}K`;
  }
  if (display >= 1) {
    return new Intl.NumberFormat().format(Math.round(display));
  }
  return display.toFixed(2);
}

/** Format raw tokenCredits as a USD string (e.g. "$1.23"). */
export function formatUSD(raw: number): string {
  return `$${toUSD(raw).toFixed(2)}`;
}

export type CycleColorState = 'safe' | 'warning' | 'danger';

export type CycleInfo = {
  /** Percent of the daily ceiling already consumed (0-100). */
  pct: number;
  colorState: CycleColorState;
  /** Hours (rounded up, 1-24) until the next daily renewal at 00:00
   * America/Sao_Paulo, or null when there is no cycle. */
  hoursUntilRenewal: number | null;
  /** Daily ceiling in display credits (= refillAmount), or null. */
  displayCeiling: number | null;
  /** True when a progress bar/ring should be shown. */
  hasCycle: boolean;
};

const SAO_PAULO_TZ = 'America/Sao_Paulo';

/**
 * Hours (rounded up, clamped to 1-24) until the next 00:00 in
 * America/Sao_Paulo. The credit cycle renews daily at local midnight,
 * independent of the backend refill interval fields.
 */
export function hoursUntilSaoPauloMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);

  const part = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  let hour = part('hour');
  if (hour === 24) {
    hour = 0;
  }
  const elapsedSeconds = hour * 3600 + part('minute') * 60 + part('second');
  const remainingSeconds = 86_400 - elapsedSeconds;

  return Math.min(24, Math.max(1, Math.ceil(remainingSeconds / 3600)));
}

type CycleInput = {
  tokenCredits: number;
  autoRefillEnabled?: boolean;
  refillAmount?: number;
  lastRefill?: Date | string;
  refillIntervalUnit?: RefillIntervalUnit;
  refillIntervalValue?: number;
};

/** Derives daily-cycle progress (percent, color, renewal countdown). */
export function getCycleInfo(balance: CycleInput): CycleInfo {
  const { tokenCredits, autoRefillEnabled, refillAmount } = balance;

  const hasCycle =
    !!autoRefillEnabled && refillAmount !== undefined && refillAmount > 0;

  const pct = hasCycle
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((refillAmount! - toDisplayCredits(tokenCredits)) / refillAmount!) * 100,
          ),
        ),
      )
    : 0;

  const colorState: CycleColorState =
    pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'safe';

  return {
    pct,
    colorState,
    hoursUntilRenewal: hasCycle ? hoursUntilSaoPauloMidnight() : null,
    displayCeiling: refillAmount ?? null,
    hasCycle,
  };
}

export type RefillIntervalUnit =
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months';
