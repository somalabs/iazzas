import { useState, useRef, useEffect } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio, useStudioDispatch } from '../context';
import { ASPECT_RATIO_OPTIONS } from '../schemas';
import type { AspectRatio } from 'librechat-data-provider';

function AspectRatioIcon({ ratio }: { ratio: AspectRatio }) {
  const [w, h] = ratio.split(':').map(Number);
  const maxDim = 14;
  const scale = Math.min(maxDim / w, maxDim / h);
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  return (
    <span
      className="inline-block flex-shrink-0 rounded-[1px] border border-current opacity-70"
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export default function AspectRatioSelector() {
  const localize = useLocalize();
  const { aspectRatio } = useStudio();
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

  function select(value: AspectRatio) {
    dispatch({ type: 'SET_ASPECT_RATIO', payload: value });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border-medium bg-surface-secondary px-2.5 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-hover"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={localize('com_studio_aspect_ratio')}
      >
        <AspectRatioIcon ratio={aspectRatio} />
        <span className="font-medium">{aspectRatio}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={localize('com_studio_aspect_ratio')}
          className="absolute bottom-full left-0 z-50 mb-1 min-w-[180px] rounded-xl border border-border-medium bg-surface-dialog py-1 shadow-xl"
        >
          {ASPECT_RATIO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={aspectRatio === opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface-hover',
                aspectRatio === opt.value
                  ? 'text-text-primary'
                  : 'text-text-secondary',
              )}
            >
              <AspectRatioIcon ratio={opt.value} />
              <span className="font-medium">{opt.value}</span>
              <span className="ml-auto text-text-tertiary">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
