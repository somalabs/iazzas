import { useState, useRef, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio, useStudioDispatch } from '../context';
import { RESOLUTION_OPTIONS } from '../schemas';
import type { Resolution } from 'librechat-data-provider';

export default function ResolutionSelector() {
  const localize = useLocalize();
  const { resolution } = useStudio();
  const dispatch = useStudioDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function select(value: Resolution) {
    dispatch({ type: 'SET_RESOLUTION', payload: value });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border-medium bg-surface-secondary px-2.5 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={localize('com_studio_resolution')}
      >
        <Copy className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={1.5} />
        {resolution}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={localize('com_studio_resolution')}
          className="absolute bottom-full left-0 z-50 mb-1 min-w-[80px] rounded-xl border border-border-medium bg-surface-dialog py-1 shadow-xl"
        >
          {RESOLUTION_OPTIONS.map((opt) => (
            <button
              key={opt}
              role="option"
              aria-selected={resolution === opt}
              type="button"
              onClick={() => select(opt)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-hover',
                resolution === opt ? 'text-text-primary' : 'text-text-secondary',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
