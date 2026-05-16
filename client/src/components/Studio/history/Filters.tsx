import { X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useStudioContext } from '../context';
import { USE_CASE_SCHEMAS } from '../usecase/schemas';

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '2:3', '3:4', '4:5'] as const;
const STATUSES = ['pending', 'processing', 'done', 'error'] as const;

export default function HistoryFilters({ onClose }: { onClose: () => void }) {
  const localize = useLocalize();
  const { filters, setFilters } = useStudioContext();

  const clearAll = () => setFilters({});

  const hasActive =
    !!filters.useCase ||
    !!filters.aspectRatio ||
    !!filters.status ||
    !!filters.collection ||
    !!filters.favoritedOnly;

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border-light bg-surface-primary p-4 shadow-lg"
      aria-label="Creation filters"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">
          {localize('com_studio_filter')}
        </span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-md p-1 hover:bg-surface-hover"
          >
            <X className="h-4 w-4 text-text-secondary" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Use case</p>
          <div className="flex flex-wrap gap-1.5">
            {USE_CASE_SCHEMAS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={filters.useCase === s.id}
                onClick={() =>
                  setFilters({ ...filters, useCase: filters.useCase === s.id ? undefined : s.id })
                }
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  filters.useCase === s.id
                    ? 'border-text-primary bg-surface-active text-text-primary'
                    : 'border-border-light text-text-secondary hover:border-border-medium'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Aspect ratio</p>
          <div className="flex flex-wrap gap-1.5">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar}
                type="button"
                aria-pressed={filters.aspectRatio === ar}
                onClick={() =>
                  setFilters({
                    ...filters,
                    aspectRatio: filters.aspectRatio === ar ? undefined : ar,
                  })
                }
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  filters.aspectRatio === ar
                    ? 'border-text-primary bg-surface-active text-text-primary'
                    : 'border-border-light text-text-secondary hover:border-border-medium'
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={filters.status === s}
                onClick={() =>
                  setFilters({ ...filters, status: filters.status === s ? undefined : s })
                }
                className={`rounded-full border px-2.5 py-1 text-xs capitalize transition-colors ${
                  filters.status === s
                    ? 'border-text-primary bg-surface-active text-text-primary'
                    : 'border-border-light text-text-secondary hover:border-border-medium'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="studio-filter-collection" className="mb-1.5 block text-xs font-medium text-text-secondary">
            {localize('com_studio_collection')}
          </label>
          <input
            id="studio-filter-collection"
            type="text"
            value={filters.collection ?? ''}
            onChange={(e) => setFilters({ ...filters, collection: e.target.value || undefined })}
            placeholder={localize('com_studio_collection_placeholder')}
            className="w-full rounded-lg border border-border-light bg-surface-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.favoritedOnly ?? false}
            onChange={(e) => setFilters({ ...filters, favoritedOnly: e.target.checked || undefined })}
            className="rounded border-border-medium"
          />
          <span className="text-xs text-text-secondary">Favorites only</span>
        </label>
      </div>
    </div>
  );
}
