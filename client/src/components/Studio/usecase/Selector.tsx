import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { useStudioContext } from '../context';
import { USE_CASE_SCHEMAS } from './schemas';
import type { StudioMode, UseCaseId } from '../types';

const MODE_OPTIONS: { value: StudioMode; labelKey: string }[] = [
  { value: 'guided', labelKey: 'com_studio_guided_mode' },
  { value: 'advanced', labelKey: 'com_studio_advanced_mode' },
];

export default function UseCaseSelector() {
  const localize = useLocalize();
  const { mode, setMode, selectedUseCase, setSelectedUseCase } = useStudioContext();

  const handleUCClick = (id: UseCaseId) => {
    setSelectedUseCase(selectedUseCase === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-editorial text-sm font-medium text-text-secondary uppercase tracking-widest">
          {localize('com_studio_use_case')}
        </span>
        <div
          role="group"
          aria-label="Studio mode"
          className="flex items-center rounded-lg border border-border-light bg-surface-secondary p-0.5"
        >
          {MODE_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-all duration-150',
                mode === value
                  ? 'bg-surface-primary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {localize(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {mode === 'guided' && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={localize('com_studio_use_case')}>
          {USE_CASE_SCHEMAS.map((schema) => (
            <button
              key={schema.id}
              type="button"
              role="radio"
              aria-checked={selectedUseCase === schema.id}
              onClick={() => handleUCClick(schema.id)}
              className={cn(
                'group flex flex-col rounded-xl border px-3 py-2 text-left transition-all duration-150',
                selectedUseCase === schema.id
                  ? 'border-text-primary bg-surface-primary shadow-md'
                  : 'border-border-light bg-surface-secondary hover:border-border-medium hover:bg-surface-primary',
              )}
            >
              <span
                className={cn(
                  'text-xs font-semibold transition-colors',
                  selectedUseCase === schema.id ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary',
                )}
              >
                {schema.label}
              </span>
              <span className="mt-0.5 text-[10px] leading-tight text-text-tertiary">
                {schema.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
