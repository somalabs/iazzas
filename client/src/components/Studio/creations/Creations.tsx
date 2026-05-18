import { useState } from 'react';
import { Search, ImageIcon, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useStudioDeleteMutation } from '~/data-provider';
import { useStudio, useStudioDispatch, useStudioHistory, useRetryGeneration } from '../context';
import { MODEL_DISPLAY_NAMES, useCaseHasRequiredInputs } from '../schemas';
import { formatStudioDate } from '../date';
import type { StudioCreation } from 'librechat-data-provider';

function CreationItem({
  creation,
  onSelect,
  onRetry,
  onDelete,
}: {
  creation: StudioCreation;
  onSelect: (c: StudioCreation) => void;
  onRetry: (creation: StudioCreation) => void;
  onDelete: (creation: StudioCreation) => void;
}) {
  const localize = useLocalize();
  const model = MODEL_DISPLAY_NAMES[creation.model] ?? creation.model;
  const date = formatStudioDate(creation.createdAt, false);

  const thumbnail = creation.images[0]?.thumbnailUrl ?? null;
  const isError = creation.status === 'error';
  const canRetry = !useCaseHasRequiredInputs(creation.useCase);

  return (
    <div className="group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover">
      <button
        type="button"
        onClick={() => onSelect(creation)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
        aria-label={isError ? localize('com_studio_error_status') : creation.prompt}
      >
        {/* Thumbnail */}
        <div
          className={`flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-surface-secondary ${
            isError ? 'border-red-500/40 bg-red-500/10' : 'border-border-medium'
          }`}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="" className="h-full w-full object-cover" />
          ) : creation.status === 'generating' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-medium border-t-text-secondary" />
          ) : isError ? (
            <AlertCircle className="h-5 w-5 text-red-400" strokeWidth={1.5} />
          ) : (
            <ImageIcon className="h-5 w-5 text-text-tertiary" strokeWidth={1.5} />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p
            className={`line-clamp-2 text-xs leading-relaxed ${isError ? 'text-red-400' : 'text-text-secondary'}`}
          >
            {isError ? localize('com_studio_error_status') : creation.prompt}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
              {creation.aspectRatio}
            </span>
            <span className="text-[10px] text-text-tertiary">{model}</span>
            <span className="ml-auto text-[10px] text-text-tertiary">{date}</span>
          </div>
        </div>
      </button>

      {/* Retry only re-sends prompt + base settings (no formValues/references),
          so it is disabled for use cases with required inputs — those must be
          redone via the form. */}
      {isError && (
        <div className="flex flex-shrink-0 items-center gap-1.5 self-center">
          <button
            type="button"
            onClick={() => canRetry && onRetry(creation)}
            disabled={!canRetry}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-500/10"
            aria-label={canRetry ? localize('com_studio_retry') : localize('com_studio_retry_unavailable')}
            title={canRetry ? localize('com_studio_retry') : localize('com_studio_retry_unavailable')}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(creation)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-red-500"
            aria-label={localize('com_studio_delete_creation')}
            title={localize('com_studio_delete_creation')}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Creations() {
  const localize = useLocalize();
  useStudioHistory();
  const { creations } = useStudio();
  const dispatch = useStudioDispatch();
  const retryGeneration = useRetryGeneration();
  const deleteMutation = useStudioDeleteMutation();
  const { showToast } = useToastContext();
  const [search, setSearch] = useState('');

  const filtered = creations.filter((c) =>
    c.prompt.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelect(creation: StudioCreation) {
    dispatch({ type: 'SELECT_CREATION', payload: creation });
  }

  function handleRetry(creation: StudioCreation) {
    retryGeneration(creation);
  }

  function handleDelete(creation: StudioCreation) {
    if (deleteMutation.isLoading) {
      return;
    }
    if (!window.confirm(localize('com_studio_delete_confirm'))) {
      return;
    }
    const id = creation.id;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        dispatch({ type: 'REMOVE_CREATION', payload: id });
        showToast({ status: 'success', message: localize('com_studio_deleted') });
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          // No server row under this id (still-optimistic failed card) —
          // clearing it from the UI loses nothing.
          dispatch({ type: 'REMOVE_CREATION', payload: id });
          showToast({ status: 'success', message: localize('com_studio_deleted') });
          return;
        }
        showToast({ status: 'error', message: localize('com_studio_delete_failed') });
      },
    });
  }

  return (
    <div className="flex h-full flex-col border-r border-border-medium bg-surface-primary">
      {/* Header tabs */}
      <div className="border-b border-border-medium px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md px-2.5 py-1 text-xs font-semibold text-text-primary"
          >
            {localize('com_studio_creations')}
          </button>
          <button
            type="button"
            disabled
            title={`${localize('com_studio_my_templates')} · ${localize('com_studio_coming_soon')}`}
            aria-label={`${localize('com_studio_my_templates')} (${localize('com_studio_coming_soon')})`}
            className="flex cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-text-tertiary opacity-50"
          >
            {localize('com_studio_my_templates')}
            <span className="rounded-full bg-surface-tertiary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
              {localize('com_studio_coming_soon')}
            </span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border-medium px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border-medium bg-surface-secondary px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-text-tertiary" strokeWidth={1.5} />
          <input
            type="search"
            placeholder={localize('com_studio_search_creations')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <ImageIcon className="h-8 w-8 text-text-tertiary" strokeWidth={1} />
            <p className="text-xs text-text-tertiary">{localize('com_studio_empty_creations')}</p>
          </div>
        ) : (
          filtered.map((creation) => (
            <CreationItem
              key={creation.id}
              creation={creation}
              onSelect={handleSelect}
              onRetry={handleRetry}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
