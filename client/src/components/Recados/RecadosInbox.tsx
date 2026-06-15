import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { OGDialog, OGDialogContent, OGDialogTitle, Button } from '@librechat/client';
import type { TBanner } from 'librechat-data-provider';
import RecadoMarkdown from './RecadoMarkdown';
import { useLocalize } from '~/hooks';
import useRecados from './useRecados';
import { cn } from '~/utils';

const snippet = (message: string): string => {
  const firstLine =
    message
      .replace(/[#*_>`-]/g, '')
      .trim()
      .split('\n')[0] ?? '';
  return firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine;
};

export default function RecadosInbox({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const localize = useLocalize();
  const { list, isSeen, markSeen } = useRecados();
  const [selected, setSelected] = useState<TBanner | null>(null);

  useEffect(() => {
    if (!open) {
      setSelected(null);
    }
  }, [open]);

  const handleOpen = (recado: TBanner) => {
    markSeen(recado.bannerId);
    setSelected(recado);
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="flex max-h-[80vh] w-full max-w-lg flex-col">
        <OGDialogTitle className="flex items-center gap-2">
          {selected && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={localize('com_recados_back')}
              onClick={() => setSelected(null)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
          )}
          {localize('com_recados_title')}
        </OGDialogTitle>

        {selected ? (
          <div className="mt-2 overflow-y-auto">
            <p className="mb-2 text-xs text-text-tertiary">
              {formatDistanceToNow(new Date(selected.createdAt), { addSuffix: true })}
            </p>
            <RecadoMarkdown content={selected.message} />
          </div>
        ) : (
          <div className="mt-2 flex flex-col overflow-y-auto">
            {list.length === 0 && (
              <p className="py-8 text-center text-sm text-text-tertiary">
                {localize('com_recados_empty')}
              </p>
            )}
            {list.map((recado) => {
              const unread = !isSeen(recado.bannerId);
              return (
                <button
                  key={recado.bannerId}
                  type="button"
                  onClick={() => handleOpen(recado)}
                  className="flex w-full flex-col items-start gap-1 border-b border-border-light px-2 py-3 text-left transition-colors last:border-0 hover:bg-surface-hover"
                >
                  <div className="flex w-full items-center gap-2">
                    {unread && (
                      <span
                        className="size-2 flex-shrink-0 rounded-full bg-surface-submit"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm text-text-primary',
                        unread && 'font-semibold',
                      )}
                    >
                      {snippet(recado.message)}
                    </span>
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {formatDistanceToNow(new Date(recado.createdAt), { addSuffix: true })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </OGDialogContent>
    </OGDialog>
  );
}
