import { useState } from 'react';
import { Search, ImageIcon } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useStudio, useStudioDispatch, useStudioHistory } from '../context';
import { MODEL_DISPLAY_NAMES } from '../schemas';
import type { StudioCreation } from 'librechat-data-provider';

function CreationItem({
  creation,
  onSelect,
}: {
  creation: StudioCreation;
  onSelect: (c: StudioCreation) => void;
}) {
  const model = MODEL_DISPLAY_NAMES[creation.model] ?? creation.model;
  const date = new Date(creation.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  const thumbnail = creation.images[0]?.thumbnailUrl ?? null;

  return (
    <button
      type="button"
      onClick={() => onSelect(creation)}
      className="group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
    >
      {/* Thumbnail */}
      <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-medium bg-surface-secondary">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        ) : creation.status === 'generating' ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-medium border-t-text-secondary" />
        ) : (
          <ImageIcon className="h-5 w-5 text-text-tertiary" strokeWidth={1.5} />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs text-text-secondary leading-relaxed">
          {creation.prompt}
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
  );
}

export default function Creations() {
  const localize = useLocalize();
  useStudioHistory();
  const { creations } = useStudio();
  const dispatch = useStudioDispatch();
  const [search, setSearch] = useState('');

  const filtered = creations.filter((c) =>
    c.prompt.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelect(creation: StudioCreation) {
    dispatch({ type: 'SELECT_CREATION', payload: creation });
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
            className="rounded-md px-2.5 py-1 text-xs text-text-tertiary hover:text-text-secondary"
          >
            {localize('com_studio_my_templates')}
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
            <CreationItem key={creation.id} creation={creation} onSelect={handleSelect} />
          ))
        )}
      </div>
    </div>
  );
}
