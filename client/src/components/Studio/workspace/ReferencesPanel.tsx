import { useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Sparkles, User, Plus, X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio, useStudioDispatch } from '../context';
import type { StudioReference } from 'librechat-data-provider';

function ReferenceSlot({
  reference,
  onRemove,
}: {
  reference: StudioReference;
  onRemove: (id: string) => void;
}) {
  const isEmpty = !reference.previewUrl;

  return (
    <div className="group relative">
      <div
        className={cn(
          'relative flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg border transition-colors',
          isEmpty
            ? 'cursor-default border-border-medium bg-surface-secondary'
            : 'border-transparent',
        )}
      >
        {reference.previewUrl ? (
          <>
            <img
              src={reference.previewUrl}
              alt={reference.label}
              className="h-full w-full rounded-lg object-cover"
            />
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0 text-[10px] font-medium text-white">
              {reference.label}
            </span>
          </>
        ) : (
          <>
            {reference.slotType === 'style' ? (
              <Sparkles className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
            ) : (
              <User className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
            )}
            <span className="mt-1 text-[11px] text-text-secondary">{reference.label}</span>
          </>
        )}
      </div>
      {reference.previewUrl && (
        <button
          type="button"
          onClick={() => onRemove(reference.id)}
          className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-surface-destructive text-white group-hover:flex"
          aria-label={`Remove ${reference.label}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

export default function ReferencesPanel() {
  const localize = useLocalize();
  const dispatch = useStudioDispatch();
  const { references } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAdd = references.length < 8;

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const previewUrl = URL.createObjectURL(file);
    const ref: StudioReference = {
      id: crypto.randomUUID(),
      slotType: 'image',
      label: '',
      previewUrl,
      fileName: file.name,
    };
    dispatch({ type: 'ADD_REFERENCE', payload: ref });
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 8 - references.length;
    files.slice(0, remaining).forEach(handleFile);
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const remaining = 8 - references.length;
    files.slice(0, remaining).forEach(handleFile);
  }

  const typedSlots: StudioReference[] = [
    { id: '__style__', slotType: 'style', label: localize('com_studio_slot_style'), previewUrl: null, fileName: null },
    { id: '__character__', slotType: 'character', label: localize('com_studio_slot_character'), previewUrl: null, fileName: null },
  ];

  const imageRefs = references.filter((r) => r.slotType === 'image');
  const allSlots = [...typedSlots, ...imageRefs];

  return (
    <div
      className="rounded-xl border border-border-medium bg-surface-secondary p-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
          {localize('com_studio_references')}
        </span>
        <span className="text-[11px] text-text-secondary">
          {references.length}/8
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {allSlots.map((slot) => (
          <ReferenceSlot
            key={slot.id}
            reference={slot}
            onRemove={(id) => dispatch({ type: 'REMOVE_REFERENCE', payload: id })}
          />
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-border-medium bg-surface-tertiary text-text-tertiary transition-colors hover:border-border-heavy hover:bg-surface-hover hover:text-text-secondary"
            aria-label={localize('com_studio_add_reference')}
          >
            <Plus className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
