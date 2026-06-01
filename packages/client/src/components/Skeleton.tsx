import { cn } from '~/utils';

// Skeleton creme com shimmer (P3-B · skeletons em todo load). Gradiente
// creme→paper→creme varrendo — nunca flash de vazio. Global: todo Skeleton
// do app herda este clima. O gradiente é inline (independe do Tailwind);
// animate-shimmer é gerado pelo build do client (scaneia este pacote).
function Skeleton({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-shimmer rounded-md', className)}
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(230,224,207,0.30) 25%, rgba(255,255,255,0.70) 50%, rgba(230,224,207,0.30) 75%)',
        backgroundSize: '200% 100%',
        ...style,
      }}
      {...props}
    />
  );
}

export { Skeleton };
