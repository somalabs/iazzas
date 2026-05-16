import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { useStudioContext } from '../context';
import type { AspectRatioValue } from '../types';

const PRESETS: { value: AspectRatioValue; w: number; h: number }[] = [
  { value: '1:1',  w: 1,  h: 1  },
  { value: '16:9', w: 16, h: 9  },
  { value: '9:16', w: 9,  h: 16 },
  { value: '2:3',  w: 2,  h: 3  },
  { value: '3:4',  w: 3,  h: 4  },
  { value: '1:2',  w: 1,  h: 2  },
  { value: '2:1',  w: 2,  h: 1  },
  { value: '4:5',  w: 4,  h: 5  },
  { value: '3:2',  w: 3,  h: 2  },
  { value: '4:3',  w: 4,  h: 3  },
];

const ICON_SIZE = 24;

function RatioIcon({ w, h, selected }: { w: number; h: number; selected: boolean }) {
  const maxDim = Math.max(w, h);
  const iconW = Math.round((w / maxDim) * ICON_SIZE);
  const iconH = Math.round((h / maxDim) * ICON_SIZE);

  return (
    <div
      className={cn(
        'rounded border transition-colors',
        selected ? 'border-text-primary bg-text-primary/10' : 'border-border-medium',
      )}
      style={{ width: iconW, height: iconH }}
      aria-hidden="true"
    />
  );
}

export default function AspectRatioSelector() {
  const localize = useLocalize();
  const { aspectRatio, setAspectRatio } = useStudioContext();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">
        {localize('com_studio_aspect_ratio')}
      </span>
      <div
        role="radiogroup"
        aria-label={localize('com_studio_aspect_ratio')}
        className="flex flex-wrap gap-1.5"
      >
        {PRESETS.map(({ value, w, h }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={aspectRatio === value}
            onClick={() => setAspectRatio(value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-all duration-100',
              aspectRatio === value
                ? 'border-text-primary bg-surface-primary text-text-primary shadow-sm'
                : 'border-border-light bg-surface-secondary text-text-tertiary hover:border-border-medium hover:text-text-secondary',
            )}
          >
            <RatioIcon w={w} h={h} selected={aspectRatio === value} />
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
