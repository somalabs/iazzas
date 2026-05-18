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
  /** Percent of the cycle ceiling already consumed (0-100). */
  pct: number;
  colorState: CycleColorState;
  /** Short "DD/MM" date of the next refill, or null when not applicable. */
  viraDDMM: string | null;
  /** Cycle ceiling in display credits (= refillAmount), or null. */
  displayCeiling: number | null;
  /** True when a progress bar/ring should be shown. */
  hasCycle: boolean;
};

type CycleInput = {
  tokenCredits: number;
  autoRefillEnabled?: boolean;
  refillAmount?: number;
  lastRefill?: Date | string;
  refillIntervalUnit?: RefillIntervalUnit;
  refillIntervalValue?: number;
};

/** Derives cycle progress (percent, color, next-refill date) from balance data. */
export function getCycleInfo(balance: CycleInput): CycleInfo {
  const {
    tokenCredits,
    autoRefillEnabled,
    refillAmount,
    lastRefill,
    refillIntervalUnit,
    refillIntervalValue,
  } = balance;

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

  const canComputeDate =
    !!autoRefillEnabled &&
    lastRefill != null &&
    refillIntervalUnit !== undefined &&
    refillIntervalValue !== undefined;

  const nextRefillDate = canComputeDate
    ? getNextFutureInterval(new Date(lastRefill!), refillIntervalValue!, refillIntervalUnit!)
    : null;

  const viraDDMM = nextRefillDate
    ? nextRefillDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : null;

  return {
    pct,
    colorState,
    viraDDMM,
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

/** Adds a time interval to a given date. */
export function addIntervalToDate(
  date: Date,
  value: number,
  unit: RefillIntervalUnit,
): Date {
  const result = new Date(date);
  switch (unit) {
    case 'seconds':
      result.setSeconds(result.getSeconds() + value);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + value);
      break;
    case 'hours':
      result.setHours(result.getHours() + value);
      break;
    case 'days':
      result.setDate(result.getDate() + value);
      break;
    case 'weeks':
      result.setDate(result.getDate() + value * 7);
      break;
    case 'months':
      result.setMonth(result.getMonth() + value);
      break;
    default:
      break;
  }
  return result;
}

/**
 * Calculates the next future refill date from a base date, advancing past any
 * intervals that have already elapsed. Handles both fixed-duration intervals
 * (days, weeks) and variable-duration intervals (months).
 */
export function getNextFutureInterval(
  baseDate: Date,
  value: number,
  unit: RefillIntervalUnit,
): Date {
  const now = new Date();

  if (baseDate > now) {
    return addIntervalToDate(baseDate, value, unit);
  }

  if (unit === 'months') {
    let nextRefillDate = new Date(baseDate);
    while (nextRefillDate <= now) {
      nextRefillDate = addIntervalToDate(nextRefillDate, value, unit);
    }
    return nextRefillDate;
  }

  const intervalInMs = {
    seconds: value * 1000,
    minutes: value * 1000 * 60,
    hours: value * 1000 * 60 * 60,
    days: value * 1000 * 60 * 60 * 24,
    weeks: value * 1000 * 60 * 60 * 24 * 7,
  }[unit];

  if (intervalInMs <= 0) {
    return addIntervalToDate(baseDate, value, unit);
  }

  const timeSinceBase = now.getTime() - baseDate.getTime();
  const intervalsPassed = Math.floor(timeSinceBase / intervalInMs);
  const intervalsToNext = intervalsPassed + 1;
  const nextRefillTime = baseDate.getTime() + intervalsToNext * intervalInMs;

  return new Date(nextRefillTime);
}
