import { cn } from '~/utils';

type InlineConfirmProps = {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
};

export default function InlineConfirm({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  className,
}: InlineConfirmProps) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      role="alertdialog"
      aria-label={message}
      onClick={stop}
      className={cn('flex min-w-0 items-center gap-2', className)}
    >
      <span className="min-w-0 flex-1 truncate text-[11px] leading-snug text-ink-700">
        {message}
      </span>
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          onCancel();
        }}
        className="flex-shrink-0 rounded px-2 py-1 text-[11px] font-medium text-ink-700 transition-colors hover:bg-surface-hover hover:text-ink-900"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={(e) => {
          stop(e);
          onConfirm();
        }}
        className="flex-shrink-0 rounded px-2 py-1 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
