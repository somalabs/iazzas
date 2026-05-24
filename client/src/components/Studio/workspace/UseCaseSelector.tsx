import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio, useStudioDispatch } from '../context';
import { USE_CASE_SCHEMAS } from '../schemas';
import type { StudioUseCase } from 'librechat-data-provider';

export default function UseCaseSelector() {
  const { activeUseCase, advancedMode } = useStudio();
  const dispatch = useStudioDispatch();
  const localize = useLocalize();

  function selectUC(id: StudioUseCase) {
    dispatch({ type: 'SET_USE_CASE', payload: id });
  }

  function toggleAdvanced() {
    dispatch({ type: 'SET_ADVANCED_MODE', payload: !advancedMode });
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {USE_CASE_SCHEMAS.map((schema) => (
        <button
          key={schema.id}
          type="button"
          onClick={() => selectUC(schema.id)}
          className={cn(
            'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all',
            activeUseCase === schema.id
              ? 'bg-surface-primary text-text-primary shadow ring-1 ring-border-heavy'
              : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary',
          )}
          aria-pressed={activeUseCase === schema.id}
        >
          {schema.displayName}
        </button>
      ))}

      <button
        type="button"
        onClick={toggleAdvanced}
        className={cn(
          'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all',
          advancedMode
            ? 'bg-surface-primary text-text-primary shadow ring-1 ring-border-heavy'
            : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover',
        )}
        aria-pressed={advancedMode}
      >
        {advancedMode
          ? localize('com_studio_guided_mode')
          : localize('com_studio_advanced_mode')}
      </button>
    </div>
  );
}
