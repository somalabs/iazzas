import { AlertTriangle } from 'lucide-react';
import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { useStudioContext } from '../context';
import type { ImageCount as ImageCountType } from '../types';

const OPTIONS: ImageCountType[] = [1, 2, 4, 8];

export default function ImageCount() {
  const localize = useLocalize();
  const { imageCount, setImageCount } = useStudioContext();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">
        {localize('com_studio_image_count')}
      </span>
      <div
        role="group"
        aria-label={localize('com_studio_image_count')}
        className="flex gap-1.5"
      >
        {OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setImageCount(n)}
            aria-pressed={imageCount === n}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition-all duration-100',
              imageCount === n
                ? 'border-text-primary bg-surface-primary text-text-primary shadow-sm'
                : 'border-border-light bg-surface-secondary text-text-secondary hover:border-border-medium hover:text-text-primary',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {imageCount > 4 && (
        <p className="flex items-center gap-1 text-xs text-text-warning" role="alert">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {localize('com_studio_cost_warning')}
        </p>
      )}
    </div>
  );
}
