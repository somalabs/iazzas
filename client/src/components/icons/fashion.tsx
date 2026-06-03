import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const svgBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '1.5',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Cabide (hanger) — Estúdio de imagens */
export function CabideIcon({ className, ...props }: IconProps) {
  return (
    <svg {...svgBase} className={className} {...props}>
      {/* Hook: arc from center top, curving up-right */}
      <path d="M10 7Q10 4 12 4Q14 4 14 7" />
      {/* Arch: center top → wide bottom → crossbar */}
      <path d="M12 7L3 20H21L12 7" />
    </svg>
  );
}

/** Cabide preenchido (filled) — estado ativo na nav */
export function CabideIconFilled({ className, ...props }: IconProps) {
  return (
    <svg {...svgBase} className={className} {...props}>
      {/* Filled arch body */}
      <path fill="currentColor" stroke="none" d="M12 7L3 20H21Z" />
      {/* Arch outline */}
      <path d="M12 7L3 20H21L12 7" />
      {/* Hook */}
      <path d="M10 7Q10 4 12 4Q14 4 14 7" />
    </svg>
  );
}

/** Manequim (dress form) — Agentes */
export function ManequimIcon({ className, ...props }: IconProps) {
  return (
    <svg {...svgBase} className={className} {...props}>
      {/* Dress form body: wide shoulders → narrow waist → hips */}
      <path d="M6 8Q9 5 12 5Q15 5 18 8Q19 13 16 15Q17 18 17 20Q12 22 7 20Q7 18 8 15Q5 13 6 8Z" />
      {/* Stand: stem + base */}
      <path d="M12 20V22M9 22H15" />
    </svg>
  );
}

/** Manequim preenchido — estado ativo na nav */
export function ManequimIconFilled({ className, ...props }: IconProps) {
  return (
    <svg {...svgBase} className={className} {...props}>
      {/* Filled dress form body */}
      <path
        fill="currentColor"
        d="M6 8Q9 5 12 5Q15 5 18 8Q19 13 16 15Q17 18 17 20Q12 22 7 20Q7 18 8 15Q5 13 6 8Z"
      />
      {/* Stand: stem + base */}
      <path d="M12 20V22M9 22H15" />
    </svg>
  );
}

/** Carretel (spool) — Fluxos */
export function CarretelIcon({ className, ...props }: IconProps) {
  return (
    <svg {...svgBase} className={className} {...props}>
      {/* Top flange */}
      <rect x={3} y={3} width={18} height={3.5} rx={1.5} />
      {/* Bottom flange */}
      <rect x={3} y={17.5} width={18} height={3.5} rx={1.5} />
      {/* Barrel sides */}
      <path d="M7 6.5V17.5M17 6.5V17.5" />
    </svg>
  );
}

/** Carretel preenchido — estado ativo na nav */
export function CarretelIconFilled({ className, ...props }: IconProps) {
  return (
    <svg {...svgBase} className={className} {...props}>
      {/* Filled top flange */}
      <rect x={3} y={3} width={18} height={3.5} rx={1.5} fill="currentColor" stroke="none" />
      {/* Filled bottom flange */}
      <rect x={3} y={17.5} width={18} height={3.5} rx={1.5} fill="currentColor" stroke="none" />
      {/* Barrel sides */}
      <path d="M7 6.5V17.5M17 6.5V17.5" />
    </svg>
  );
}
