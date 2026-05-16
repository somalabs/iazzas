import { useState, useMemo } from 'react';
import { SlidersHorizontal, Search, Grid2x2, List, X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudioContext } from '../context';
import { useStudioCreationsQuery } from '~/data-provider/Studio';
import CreationItem from './Item';
import HistoryFilters from './Filters';

type ViewMode = 'grid' | 'list';

export default function Creations() {
  const localize = useLocalize();
  const { filters, setFilters } = useStudioContext();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { data: creations = [], isLoading } = useStudioCreationsQuery();

  const filtered = useMemo(() => {
    let result = creations;
    const search = searchValue.trim().toLowerCase();

    if (search) {
      result = result.filter((c) => c.prompt.toLowerCase().includes(search));
    }
    if (filters.useCase) {
      result = result.filter((c) => c.useCase === filters.useCase);
    }
    if (filters.aspectRatio) {
      result = result.filter((c) => c.aspectRatio === filters.aspectRatio);
    }
    if (filters.status) {
      result = result.filter((c) => c.status === filters.status);
    }
    if (filters.collection) {
      result = result.filter((c) =>
        c.collection?.toLowerCase().includes(filters.collection!.toLowerCase()),
      );
    }
    if (filters.favoritedOnly) {
      result = result.filter((c) => c.favorited);
    }
    return result;
  }, [creations, filters, searchValue]);

  const hasFilters =
    !!filters.useCase || !!filters.aspectRatio || !!filters.status || !!filters.collection || !!filters.favoritedOnly;

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="font-editorial text-base font-semibold tracking-tight text-text-primary">
          {localize('com_studio_creations')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
            aria-label="Grid view"
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewMode === 'grid' ? 'bg-surface-active text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <Grid2x2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            aria-label="List view"
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewMode === 'list' ? 'bg-surface-active text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={localize('com_studio_search_placeholder')}
            aria-label={localize('com_studio_search_placeholder')}
            className="w-full rounded-lg border border-border-light bg-surface-secondary py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-pressed={showFilters}
          aria-label={localize('com_studio_filter')}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
            hasFilters || showFilters
              ? 'border-text-primary bg-surface-active text-text-primary'
              : 'border-border-light bg-surface-secondary text-text-tertiary hover:text-text-secondary',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {showFilters && (
        <div className="px-4">
          <HistoryFilters onClose={() => setShowFilters(false)} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-medium border-t-text-primary" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-text-tertiary">
              {hasFilters || searchValue
                ? localize('com_studio_no_results')
                : localize('com_studio_creations_empty')}
            </p>
            {(hasFilters || searchValue) && (
              <button
                type="button"
                onClick={() => {
                  setFilters({});
                  setSearchValue('');
                }}
                className="text-xs text-text-secondary underline hover:text-text-primary"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-2 gap-2'
                : 'flex flex-col gap-2',
            )}
            role="list"
            aria-label={localize('com_studio_creations')}
          >
            {filtered.map((creation) => (
              <CreationItem key={creation.id} creation={creation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
