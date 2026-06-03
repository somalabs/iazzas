import { cn } from '~/utils';

/**
 * Skeleton creme com shimmer (P3-B · skeletons em todo load). Gradiente
 * creme→paper→creme varrendo — nunca flash de vazio. Use no lugar de spinners
 * de load de conteúdo. Dê dimensões/raio via className.
 */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-shimmer rounded-lg', className)}
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(230,224,207,0.30) 25%, rgba(255,255,255,0.70) 50%, rgba(230,224,207,0.30) 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}
