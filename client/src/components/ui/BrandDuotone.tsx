import { cn } from '~/utils';

interface BrandDuotoneProps {
  /** Caminho absoluto do asset, ex.: /assets/brand/azzas-campaign-1.jpg */
  src: string;
  /** Ancoragem do crop visível */
  anchor?: 'bottom' | 'center';
  /** Dissolve a imagem no creme a partir do topo (ancora o material no terço inferior) */
  fade?: boolean;
  /** Opacidade base da imagem (default ~spec: 8–10%) */
  imageOpacity?: number;
  className?: string;
}

/**
 * Duotone editorial navy-sobre-creme (LEM-96 / P2-B). Imagem de campanha Azzas
 * em grayscale + tinta navy via mix-blend, bem sutil, dissolvendo no creme.
 * É material de marca de fundo — decorativo, nunca interativo (pointer-events-none,
 * aria-hidden). Opacidade exposta p/ ajuste fino no render.
 */
export default function BrandDuotone({
  src,
  anchor = 'bottom',
  fade = true,
  imageOpacity = 0.1,
  className,
}: BrandDuotoneProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden bg-canvas', className)}
    >
      <img
        src={src}
        alt=""
        className={cn(
          'h-full w-full object-cover contrast-[1.05] grayscale',
          anchor === 'bottom' ? 'object-bottom' : 'object-center',
        )}
        style={{ opacity: imageOpacity }}
      />
      {/* Sombras viram navy → leitura de duotone */}
      <div
        className="absolute inset-0 bg-action mix-blend-multiply"
        style={{ opacity: imageOpacity }}
      />
      {/* Dissolve no creme em ambas as bordas: o material vive no terço inferior
          mas nunca encosta numa borda dura — sem emenda visível ao rolar */}
      {fade && (
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--canvas),transparent_18%,transparent_52%,var(--canvas))]" />
      )}
    </div>
  );
}
