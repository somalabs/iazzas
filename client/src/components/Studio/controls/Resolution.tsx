import { AlertTriangle } from 'lucide-react';
import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { useStudioContext } from '../context';
import type { Resolution as ResolutionType } from '../types';

const OPTIONS: ResolutionType[] = ['1K', '2K', '4K'];

const UNSUPPORTED: Record<string, ResolutionType[]> = {};

export default function ResolutionSelector() {
  const localize = useLocalize();
  const { resolution, setResolution, modelOverride } = useStudioContext();

  const unsupported = modelOverride ? (UNSUPPORTED[modelOverride] ?? []) : [];
  const isUnsupported = unsupported.includes(resolution);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">
        {localize('com_studio_resolution')}
      </span>
      <div
        role="group"
        aria-label={localize('com_studio_resolution')}
        className="flex gap-1.5"
      >
        {OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setResolution(r)}
            aria-pressed={resolution === r}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-100',
              resolution === r
                ? 'border-text-primary bg-surface-primary text-text-primary shadow-sm'
                : 'border-border-light bg-surface-secondary text-text-secondary hover:border-border-medium hover:text-text-primary',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {isUnsupported && (
        <p className="flex items-center gap-1 text-xs text-text-warning" role="alert">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {localize('com_studio_model_resolution_warning')}
        </p>
      )}
    </div>
  );
}
