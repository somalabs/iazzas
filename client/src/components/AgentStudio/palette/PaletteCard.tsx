import { cn } from '~/utils';
import type { FlowNodeType } from 'librechat-data-provider';

type PaletteCardProps = {
  nodeType: FlowNodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
};

export default function PaletteCard({
  nodeType,
  label,
  description,
  icon,
  accentClass,
}: PaletteCardProps) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      role="button"
      tabIndex={0}
      aria-label={`Arrastar nó ${label} para o canvas`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.currentTarget.dispatchEvent(new DragEvent('dragstart'));
      }}
      className={cn(
        'flex cursor-grab items-center gap-2.5 rounded-lg border px-3 py-2',
        'bg-surface-primary transition-colors hover:bg-surface-hover active:cursor-grabbing',
        'border-border-light hover:border-border-medium',
      )}
    >
      <span className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md', accentClass)} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-primary">{label}</p>
        <p className="truncate text-[10px] text-text-tertiary">{description}</p>
      </div>
    </div>
  );
}
