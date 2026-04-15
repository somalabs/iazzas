import { useMemo, useState } from 'react';
import { Spinner } from '@librechat/client';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_TRIGGERS,
  FEEDBACK_TRIGGER_LABELS,
  dataService,
} from 'librechat-data-provider';
import type {
  TFeedbackEntry,
  TFeedbackEntryCategory,
  TFeedbackEntryTrigger,
  TListFeedbackEntriesParams,
} from 'librechat-data-provider';
import { useListAdminFeedbacksQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const PAGE_SIZE = 20;

type Filters = {
  category?: TFeedbackEntryCategory;
  trigger?: TFeedbackEntryTrigger;
  modelName?: string;
  from?: string;
  to?: string;
};

const formatDate = (iso?: string): string => {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const truncate = (text: string | undefined, max = 80): string => {
  if (!text) {
    return '—';
  }
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max) + '…';
};

export default function FeedbacksView() {
  const localize = useLocalize();
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<Filters>({});
  const [selected, setSelected] = useState<TFeedbackEntry | null>(null);

  const params: TListFeedbackEntriesParams = useMemo(
    () => ({ limit: PAGE_SIZE, offset, ...filters }),
    [offset, filters],
  );

  const query = useListAdminFeedbacksQuery(params);
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setOffset(0);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const response = await dataService.downloadAdminFeedbacksExport(format, filters);
    const blob = response.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `feedbacks-${timestamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {localize('com_admin_nav_feedbacks')}
        </h1>
        <div className="flex items-center gap-2">
          <span className="mr-3 text-sm text-text-secondary">
            {total} {total === 1 ? 'entrada' : 'entradas'}
          </span>
          <button
            onClick={() => handleExport('csv')}
            className="rounded-lg border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="rounded-lg border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <select
          value={filters.category ?? ''}
          onChange={(e) =>
            updateFilter('category', (e.target.value || undefined) as TFeedbackEntryCategory | undefined)
          }
          className="rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary"
        >
          <option value="">Todas categorias</option>
          {FEEDBACK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {FEEDBACK_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          value={filters.trigger ?? ''}
          onChange={(e) =>
            updateFilter('trigger', (e.target.value || undefined) as TFeedbackEntryTrigger | undefined)
          }
          className="rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary"
        >
          <option value="">Todos triggers</option>
          {FEEDBACK_TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {FEEDBACK_TRIGGER_LABELS[t]}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={filters.modelName ?? ''}
          onChange={(e) => updateFilter('modelName', e.target.value)}
          placeholder="Modelo"
          className="rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
        />

        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => updateFilter('from', e.target.value)}
          className="rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary"
        />

        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => updateFilter('to', e.target.value)}
          className="rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary"
        />
      </div>

      <div className="flex gap-4">
        <div className={cn('min-w-0 flex-1', selected != null && 'max-w-[60%]')}>
          {query.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-border-medium">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border-medium bg-surface-secondary">
                    <tr>
                      <th className="px-4 py-3 font-medium text-text-secondary">Data</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Trigger</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Categoria</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Modelo</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const isSelected = selected?._id === item._id;
                      return (
                        <tr
                          key={item._id}
                          onClick={() => setSelected(isSelected ? null : item)}
                          className={cn(
                            'cursor-pointer border-b border-border-light last:border-0',
                            isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                          )}
                        >
                          <td className="px-4 py-3 text-text-secondary">{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary">
                              {FEEDBACK_TRIGGER_LABELS[item.trigger]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {item.category ? FEEDBACK_CATEGORY_LABELS[item.category] : '—'}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{item.modelName ?? '—'}</td>
                          <td className="px-4 py-3 text-text-secondary">{truncate(item.reason)}</td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-text-tertiary">
                          Nenhum feedback encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                    className="rounded-lg border border-border-medium px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-text-secondary">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-border-medium px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {selected != null && <Detail entry={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function Detail({ entry, onClose }: { entry: TFeedbackEntry; onClose: () => void }) {
  return (
    <div className="w-[40%] min-w-[320px] rounded-lg border border-border-medium bg-surface-secondary p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Detalhes</h2>
        <button
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-text-secondary hover:bg-surface-hover"
        >
          Fechar
        </button>
      </div>
      <dl className="space-y-3 text-sm">
        <Field label="Data" value={formatDate(entry.createdAt)} />
        <Field label="Trigger" value={FEEDBACK_TRIGGER_LABELS[entry.trigger]} />
        <Field
          label="Categoria"
          value={entry.category ? FEEDBACK_CATEGORY_LABELS[entry.category] : '—'}
        />
        <Field label="Modelo" value={entry.modelName ?? '—'} />
        <Field label="Conversa" value={entry.conversationId ?? '—'} />
        <Field label="Mensagem" value={entry.messageId ?? '—'} />
        <Field label="Motivo" value={entry.reason ?? '—'} multiline />
        <Field label="Pergunta do usuário" value={entry.userMessage ?? '—'} multiline />
        <Field label="Resposta do assistente" value={entry.assistantMessage ?? '—'} multiline />
      </dl>
    </div>
  );
}

function Field({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-text-primary',
          multiline && 'whitespace-pre-wrap break-words rounded bg-surface-primary p-2 text-xs',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
