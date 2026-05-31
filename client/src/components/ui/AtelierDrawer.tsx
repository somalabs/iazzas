import { X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import type { ReactNode } from 'react';

type AtelierDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  subtitle?: string;
  className?: string;
  bodyClassName?: string;
  overlay?: boolean;
};

export default function AtelierDrawer({
  open,
  title,
  onClose,
  children,
  subtitle,
  className,
  bodyClassName = 'p-3',
  overlay = false,
}: AtelierDrawerProps) {
  const localize = useLocalize();

  if (!open) {
    return null;
  }

  const panel = (
    <aside
      role="complementary"
      aria-label={title}
      className={cn(
        'flex h-full w-[320px] flex-shrink-0 animate-atelier-in flex-col border-l border-rule bg-paper motion-reduce:animate-none',
        overlay && 'fixed inset-y-0 right-0 z-50 max-w-[85vw] shadow-xl',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-rule px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-text-primary">{title}</p>
          {subtitle != null && subtitle !== '' && (
            <p className="max-w-[220px] truncate text-[11px] text-text-tertiary">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={localize('com_ui_close')}
          className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className={cn('flex-1 overflow-y-auto', bodyClassName)}>{children}</div>
    </aside>
  );

  if (!overlay) {
    return panel;
  }

  return (
    <>
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-ink-900/30 motion-safe:animate-fade-in"
      />
      {panel}
    </>
  );
}
