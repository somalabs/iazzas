import { Trash2, AlertTriangle } from 'lucide-react';
import { useFlowContext } from '../../context';
import { cn } from '~/utils';

type BaseNodeProps = {
  id: string;
  selected?: boolean;
  icon: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  className?: string;
};

export function BaseNode({ id, selected, icon, label, children, className }: BaseNodeProps) {
  const { state, dispatch } = useFlowContext();

  const hasError = state.validationErrors.some((e) => e.nodeId === id && e.severity === 'error');

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'min-w-[200px] max-w-[260px] rounded-xl border shadow-sm',
        'bg-surface-primary transition-shadow',
        hasError ? 'border-border-destructive' : 'border-border-light',
        selected &&
          !hasError &&
          'ring-2 ring-ring-primary ring-offset-1 ring-offset-surface-primary',
        hasError && 'ring-2 ring-destructive/50 ring-offset-1 ring-offset-surface-primary',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between rounded-t-xl border-b px-3 py-2',
          hasError
            ? 'border-border-destructive/30 bg-destructive/10'
            : 'border-border-light bg-surface-secondary',
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn('flex-shrink-0', hasError ? 'text-destructive' : 'text-text-secondary')}
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="text-xs font-semibold text-text-primary">{label}</span>
          {hasError && (
            <AlertTriangle
              className="h-3 w-3 flex-shrink-0 text-destructive"
              aria-label="Nó com erro"
            />
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
      {children && <div className="px-3 py-2 text-xs text-text-secondary">{children}</div>}
    </div>
  );
}
