import { memo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '~/utils';

function AdvancedSection({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded-lg border border-border-light">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text-primary"
      >
        <ChevronRight
          className={cn('h-4 w-4 transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
        {label}
      </button>
      {open && <div className="border-t border-border-light px-3 pt-3">{children}</div>}
    </div>
  );
}

export default memo(AdvancedSection);
