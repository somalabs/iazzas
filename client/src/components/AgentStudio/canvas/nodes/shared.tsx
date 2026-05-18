import { Trash2, AlertTriangle } from 'lucide-react';
import { useFlowContext } from '../../context';
import { cn } from '~/utils';

export type NodeAccent = 'violet' | 'blue' | 'amber' | 'sky' | 'orange' | 'emerald';

const accentClasses: Record<NodeAccent, { border: string; bg: string; icon: string; header: string }> = {
  violet: {
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/5',
    icon: 'text-violet-400',
    header: 'bg-violet-500/10 border-b border-violet-500/20',
  },
  blue: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/5',
    icon: 'text-blue-400',
    header: 'bg-blue-500/10 border-b border-blue-500/20',
  },
  amber: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    icon: 'text-amber-400',
    header: 'bg-amber-500/10 border-b border-amber-500/20',
  },
  sky: {
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/5',
    icon: 'text-sky-400',
    header: 'bg-sky-500/10 border-b border-sky-500/20',
  },
  orange: {
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/5',
    icon: 'text-orange-400',
    header: 'bg-orange-500/10 border-b border-orange-500/20',
  },
  emerald: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    icon: 'text-emerald-400',
    header: 'bg-emerald-500/10 border-b border-emerald-500/20',
  },
};

type BaseNodeProps = {
  id: string;
  selected?: boolean;
  accent: NodeAccent;
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  className?: string;
};

export function BaseNode({ id, selected, accent, icon, label, children, className }: BaseNodeProps) {
  const { state, dispatch } = useFlowContext();
  const a = accentClasses[accent];

  const hasError = state.validationErrors.some(
    (e) => e.nodeId === id && e.severity === 'error',
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'min-w-[200px] max-w-[260px] rounded-xl border shadow-sm',
        'bg-surface-primary transition-shadow',
        hasError ? 'border-red-500/60' : a.border,
        selected && !hasError && 'ring-2 ring-ring-primary ring-offset-1 ring-offset-surface-primary',
        hasError && 'ring-2 ring-red-500/50 ring-offset-1 ring-offset-surface-primary',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between rounded-t-xl px-3 py-2',
          hasError ? 'border-b border-red-500/20 bg-red-500/10' : a.header,
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('flex-shrink-0', hasError ? 'text-red-400' : a.icon)} aria-hidden="true">
            {icon}
          </span>
          <span className="text-xs font-semibold text-text-primary">{label}</span>
          {hasError && (
            <AlertTriangle className="h-3 w-3 flex-shrink-0 text-red-400" aria-label="Nó com erro" />
          )}
        </div>
        <button
          type="button"
          aria-label={`Remover nó ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'DELETE_NODE', payload: id });
          }}
          className="rounded p-0.5 text-text-tertiary opacity-0 transition-opacity hover:text-text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      {children && (
        <div className="px-3 py-2 text-xs text-text-secondary">{children}</div>
      )}
    </div>
  );
}
