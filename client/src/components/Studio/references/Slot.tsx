import { X, ImagePlus } from 'lucide-react';
import { cn } from '~/utils';
import { useStudioContext } from '../context';
import type { ReferenceSlot as ReferenceSlotType, ReferenceType } from '../types';

const MAX_FREE_INDEX = 6;

function slotLabel(type: ReferenceType, index: number): string {
  if (type === 'style') return 'Style';
  if (type === 'character') return 'Character';
  return `@img${index + 1}`;
}

function EmptySlot({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Add ${label} reference`}
      className="group flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-medium bg-surface-secondary transition-all hover:border-border-heavy hover:bg-surface-hover"
    >
      <ImagePlus className="h-4 w-4 text-text-tertiary group-hover:text-text-secondary" aria-hidden="true" />
      <span className="text-[9px] font-medium text-text-tertiary group-hover:text-text-secondary leading-none">
        {label}
      </span>
    </button>
  );
}

function FilledSlot({ slot, onRemove }: { slot: ReferenceSlotType; onRemove: () => void }) {
  return (
    <div className="group relative h-16 w-16 rounded-xl overflow-hidden border border-border-light">
      <img
        src={slot.url}
        alt={slot.name}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/30" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${slot.name}`}
        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X className="h-2.5 w-2.5 text-white" aria-hidden="true" />
      </button>
      <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[8px] text-white truncate">
        {slot.slot}
      </span>
    </div>
  );
}

export default function ReferenceSlotGrid() {
  const { references, addReference, removeReference } = useStudioContext();

  const styleRef = references.find((r) => r.type === 'style');
  const characterRef = references.find((r) => r.type === 'character');
  const freeRefs = references.filter((r) => r.type === 'free');

  const handleAddPlaceholder = (type: ReferenceType, index = 0) => {
    addReference({
      id: `${type}-${Date.now()}`,
      slot: type === 'free' ? `@img${index + 1}` : type,
      type,
      url: '',
      name: slotLabel(type, index),
    });
  };

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Image references">
      {styleRef ? (
        <FilledSlot slot={styleRef} onRemove={() => removeReference(styleRef.id)} />
      ) : (
        <EmptySlot label="Style" onClick={() => handleAddPlaceholder('style')} />
      )}

      {characterRef ? (
        <FilledSlot slot={characterRef} onRemove={() => removeReference(characterRef.id)} />
      ) : (
        <EmptySlot label="Character" onClick={() => handleAddPlaceholder('character')} />
      )}

      {Array.from({ length: MAX_FREE_INDEX }).map((_, i) => {
        const ref = freeRefs[i];
        return ref ? (
          <FilledSlot key={ref.id} slot={ref} onRemove={() => removeReference(ref.id)} />
        ) : (
          <EmptySlot
            key={`free-${i}`}
            label={`@img${i + 1}`}
            onClick={() => handleAddPlaceholder('free', i)}
          />
        );
      })}
    </div>
  );
}
