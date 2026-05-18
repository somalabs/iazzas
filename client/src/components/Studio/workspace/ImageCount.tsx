import { Minus, Plus, LayoutGrid } from 'lucide-react';
import { useStudio, useStudioDispatch } from '../context';

export default function ImageCount() {
  const { imageCount } = useStudio();
  const dispatch = useStudioDispatch();

  function decrement() {
    dispatch({ type: 'SET_IMAGE_COUNT', payload: imageCount - 1 });
  }
  function increment() {
    dispatch({ type: 'SET_IMAGE_COUNT', payload: imageCount + 1 });
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border-medium bg-surface-secondary px-2 py-1.5">
      <LayoutGrid className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={1.5} />
      <button
        type="button"
        onClick={decrement}
        disabled={imageCount <= 1}
        className="flex h-5 w-5 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-30"
        aria-label="Decrease image count"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-4 text-center text-sm font-medium text-text-primary">{imageCount}</span>
      <button
        type="button"
        onClick={increment}
        disabled={imageCount >= 8}
        className="flex h-5 w-5 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-30"
        aria-label="Increase image count"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
