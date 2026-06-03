import { PanelRight } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type AtelierTriggerProps = {
  open: boolean;
  onToggle: () => void;
  className?: string;
};

export default function AtelierTrigger({ open, onToggle, className }: AtelierTriggerProps) {
  const localize = useLocalize();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={localize('com_ui_atelier')}
      aria-expanded={open}
      className={cn(
        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-surface-hover hover:text-text-primary',
        open && 'bg-surface-hover text-text-primary',
        className,
      )}
    >
      <PanelRight className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
