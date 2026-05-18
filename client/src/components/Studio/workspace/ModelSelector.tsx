import { useState, useRef, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import type { StudioModel } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio, useStudioDispatch } from '../context';
import { MODEL_DISPLAY_NAMES } from '../schemas';

const ALL_MODELS = Object.entries(MODEL_DISPLAY_NAMES) as [StudioModel, string][];

export default function ModelSelector() {
  const localize = useLocalize();
  const { modelOverride, activeSchema } = useStudio();
  const dispatch = useStudioDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function select(value: StudioModel | null) {
    dispatch({ type: 'SET_MODEL_OVERRIDE', payload: value });
    setOpen(false);
  }

  const autoLabel = localize('com_studio_model_auto');
  const current = modelOverride ? MODEL_DISPLAY_NAMES[modelOverride] : autoLabel;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border-medium bg-surface-secondary px-2.5 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={localize('com_studio_model_label')}
        title={localize('com_studio_model_override_help')}
      >
        <Cpu className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={1.5} />
        {current}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={localize('com_studio_model_label')}
          className="absolute bottom-full left-0 z-50 mb-1 min-w-[200px] rounded-xl border border-border-medium bg-surface-dialog py-1 shadow-xl"
        >
          <button
            role="option"
            aria-selected={modelOverride == null}
            type="button"
            onClick={() => select(null)}
            className={cn(
              'flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-surface-hover',
              modelOverride == null ? 'text-text-primary' : 'text-text-secondary',
            )}
          >
            <span className="text-sm font-medium">{autoLabel}</span>
            <span className="text-[11px] text-text-tertiary">
              {activeSchema
                ? MODEL_DISPLAY_NAMES[activeSchema.defaultModel] ?? activeSchema.defaultModel
                : MODEL_DISPLAY_NAMES['nano-banana-pro']}
            </span>
          </button>
          {ALL_MODELS.map(([id, name]) => (
            <button
              key={id}
              role="option"
              aria-selected={modelOverride === id}
              type="button"
              onClick={() => select(id)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-hover',
                modelOverride === id ? 'text-text-primary' : 'text-text-secondary',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
