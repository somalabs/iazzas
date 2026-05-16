import { Heart, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '~/utils';
import { useStudioContext } from '../context';
import type { Creation } from '../types';

function StatusBadge({ status }: { status: Creation['status'] }) {
  if (status === 'done') return null;

  const map = {
    pending: { label: 'Pending', className: 'bg-surface-secondary text-text-tertiary' },
    processing: { label: 'Processing', className: 'bg-surface-secondary text-text-secondary', icon: Loader2 },
    error: { label: 'Error', className: 'bg-surface-destructive text-text-destructive', icon: AlertCircle },
  } as const;

  const config = map[status as keyof typeof map];
  if (!config) return null;
  const Icon = 'icon' in config ? config.icon : null;

  return (
    <span
      className={cn(
        'absolute left-1 top-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
        config.className,
      )}
    >
      {Icon && <Icon className={cn('h-2.5 w-2.5', status === 'processing' && 'animate-spin')} aria-hidden="true" />}
      {config.label}
    </span>
  );
}

type CreationItemProps = {
  creation: Creation;
  onFavoriteToggle?: (id: string) => void;
};

export default function CreationItem({ creation, onFavoriteToggle }: CreationItemProps) {
  const { setSelectedCreation, selectedCreation } = useStudioContext();
  const isSelected = selectedCreation?.id === creation.id;
  const thumb = creation.urls[0] ?? null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => setSelectedCreation(isSelected ? null : creation)}
      onKeyDown={(e) => e.key === 'Enter' && setSelectedCreation(isSelected ? null : creation)}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-150',
        isSelected
          ? 'border-text-primary ring-1 ring-text-primary'
          : 'border-border-light hover:border-border-medium',
      )}
    >
      <div className="aspect-square w-full bg-surface-secondary">
        {thumb ? (
          <img src={thumb} alt={creation.prompt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {creation.status === 'processing' ? (
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" aria-hidden="true" />
            ) : (
              <div className="h-5 w-5 rounded bg-border-light" aria-hidden="true" />
            )}
          </div>
        )}
      </div>

      <StatusBadge status={creation.status} />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onFavoriteToggle?.(creation.id);
        }}
        aria-label={creation.favorited ? 'Unfavorite' : 'Favorite'}
        aria-pressed={creation.favorited}
        className={cn(
          'absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100',
          creation.favorited && 'opacity-100',
        )}
      >
        <Heart
          className={cn('h-3 w-3', creation.favorited ? 'fill-white text-white' : 'text-white')}
          aria-hidden="true"
        />
      </button>

      <div className="px-1.5 pb-1.5 pt-1">
        <p className="truncate text-[10px] text-text-tertiary">{creation.prompt}</p>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="text-[9px] text-text-tertiary">{creation.aspectRatio}</span>
          <span className="text-[9px] text-text-tertiary">·</span>
          <span className="text-[9px] text-text-tertiary">{creation.resolution}</span>
          {creation.collection && (
            <>
              <span className="text-[9px] text-text-tertiary">·</span>
              <span className="text-[9px] font-medium text-text-secondary">{creation.collection}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
