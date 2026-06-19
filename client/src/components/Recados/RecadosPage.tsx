import { useState } from 'react';
import { ChevronLeft, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { TBanner } from 'librechat-data-provider';
import RecadoMarkdown from './RecadoMarkdown';
import { recadoSnippet } from './snippet';
import { useLocalize } from '~/hooks';
import useRecados from './useRecados';
import { cn } from '~/utils';

export default function RecadosPage() {
  const localize = useLocalize();
  const { list, isSeen, markSeen } = useRecados();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = list.find((recado) => recado.bannerId === selectedId) ?? null;

  const handleSelect = (recado: TBanner) => {
    markSeen(recado.bannerId);
    setSelectedId(recado.bannerId);
  };

  return (
    <div className="flex h-full w-full bg-surface-primary">
      <div
        className={cn(
          'flex w-full shrink-0 flex-col border-border-medium md:w-80 md:border-r',
          selected && 'hidden md:flex',
        )}
      >
        <div className="border-b border-border-light px-4 py-4">
          <h1 className="text-xl font-bold text-text-primary">{localize('com_recados_title')}</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-tertiary">
              {localize('com_recados_empty')}
            </p>
          ) : (
            list.map((recado) => {
              const unread = !isSeen(recado.bannerId);
              const active = recado.bannerId === selectedId;
              return (
                <button
                  key={recado.bannerId}
                  type="button"
                  onClick={() => handleSelect(recado)}
                  className={cn(
                    'flex w-full flex-col items-start gap-1 border-b border-border-light px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-hover',
                    active && 'bg-surface-hover',
                  )}
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
                      {recadoSnippet(recado.message, localize('com_recados_image_attachment'))}
                    </span>
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {formatDistanceToNow(new Date(recado.createdAt), { addSuffix: true })}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={cn('flex-1 overflow-y-auto', !selected && 'hidden md:block')}>
        {selected ? (
          <div className="mx-auto max-w-3xl px-6 py-6">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="mb-4 flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary md:hidden"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              {localize('com_recados_back')}
            </button>
            <p className="mb-3 text-xs text-text-tertiary">
              {formatDistanceToNow(new Date(selected.createdAt), { addSuffix: true })}
            </p>
            <RecadoMarkdown content={selected.message} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-text-tertiary">
            <Megaphone className="size-10 opacity-40" aria-hidden="true" />
            <p className="text-sm">{localize('com_recados_select_prompt')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
