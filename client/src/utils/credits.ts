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
