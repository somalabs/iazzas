/**
 * PT-BR is the product-decided default locale for Studio (Azzas is a
 * Brazilian audience) — this is intentional, not an i18n bug. The locale is
 * centralized here so both the creations list and the image detail format
 * dates consistently from a single source of truth.
 */
export const STUDIO_DATE_LOCALE = 'pt-BR';

export function formatStudioDate(input: string | number | Date, withYear: boolean): string {
  return new Date(input).toLocaleDateString(STUDIO_DATE_LOCALE, {
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}
