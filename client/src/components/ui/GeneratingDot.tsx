import { cn } from '~/utils';

/**
 * "Gerando" = dot terracota pulsando 1.4s (P3-A · motion material).
 * Substitui spinners em estados de geração — calmo, editorial, nunca girando.
 */
export default function GeneratingDot({
  className,
  size = 8,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-block animate-ember-pulse rounded-full bg-ember', className)}
      style={{ width: size, height: size }}
    />
  );
}
