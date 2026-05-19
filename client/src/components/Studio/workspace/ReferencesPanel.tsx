import { useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Plus, X, Loader2, AlertCircle, ImagePlus } from 'lucide-react';
import { dataService } from 'librechat-data-provider';
import { useToastContext } from '@librechat/client';
import type { StudioReference, StudioImageSlot } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio, useStudioDispatch } from '../context';

/** Reads an image File's natural pixel dimensions (the LibreChat image
 * upload endpoint requires width/height in the multipart body). */
function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 1024, height: img.naturalHeight || 1024 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 1024, height: 1024 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function FilledSlot({
  reference,
  onRemove,
}: {
  reference: StudioReference;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group relative">
      <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-transparent">
        <img
          src={reference.previewUrl ?? ''}
          alt={reference.label}
          className="h-full w-full rounded-lg object-cover"
        />
        {reference.uploadStatus === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
        {reference.uploadStatus === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-red-900/70">
            <AlertCircle className="h-4 w-4 text-white" />
          </div>
        )}
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0 text-[10px] font-medium text-white">
          {reference.label}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(reference.id)}
        className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-surface-destructive text-white group-hover:flex"
        aria-label={`Remover ${reference.label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function EmptySlot({
  slot,
  onClick,
}: {
  slot: StudioImageSlot;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={slot.description}
      aria-label={`${slot.label}${slot.required ? ' (obrigatório)' : ''}`}
      className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border-medium bg-surface-tertiary px-1 text-text-tertiary transition-colors hover:border-border-heavy hover:bg-surface-hover hover:text-text-secondary"
    >
      <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
      <span className="line-clamp-2 text-center text-[9px] leading-tight">
        {slot.label}
        {slot.required && <span className="text-red-500"> *</span>}
      </span>
    </button>
  );
}

export default function ReferencesPanel() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const dispatch = useStudioDispatch();
  const { references, activeSchema } = useStudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<StudioImageSlot | null>(null);

  const slots: StudioImageSlot[] = activeSchema?.imageSlots ?? [];

  async function uploadOne(file: File, slot: StudioImageSlot) {
    if (!file.type.startsWith('image/')) {
      showToast({ status: 'error', message: localize('com_studio_ref_not_image') });
      return;
    }
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    dispatch({
      type: 'ADD_REFERENCE',
      payload: {
        id,
        slotType: 'image',
        slotId: slot.id,
        label: '',
        previewUrl,
        fileName: file.name,
        uploadStatus: 'uploading',
      } as StudioReference,
    });

    // The reference must exist as a real uploaded file so the studio
    // backend can resolve it (getFiles by file_id). Without this upload
    // `fileId` stayed undefined and generate silently dropped every ref.
    try {
      const { width, height } = await readImageSize(file);
      const formData = new FormData();
      formData.append('endpoint', 'default');
      formData.append('file', file, encodeURIComponent(file.name));
      formData.append('file_id', crypto.randomUUID());
      formData.append('width', String(width));
      formData.append('height', String(height));
      const uploaded = await dataService.uploadImage(formData);
      const fileId = uploaded?.file_id;
      if (!fileId) {
        throw new Error('upload returned no file_id');
      }
      dispatch({
        type: 'UPDATE_REFERENCE',
        payload: { id, patch: { fileId, uploadStatus: undefined } },
      });
    } catch (e) {
      dispatch({ type: 'UPDATE_REFERENCE', payload: { id, patch: { uploadStatus: 'error' } } });
      showToast({ status: 'error', message: localize('com_studio_ref_upload_failed') });
    }
  }

  function openPickerFor(slot: StudioImageSlot) {
    pendingSlot.current = slot;
    fileInputRef.current?.click();
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const slot = pendingSlot.current;
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!slot) {
      return;
    }
    const limit = slot.multiple ? (slot.maxCount ?? 8) : 1;
    files.slice(0, limit).forEach((f) => uploadOne(f, slot));
    pendingSlot.current = null;
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    // Drop targets the first slot still missing an image, else the first
    // multiple-capable slot (keeps drag-drop usable without per-slot DnD).
    const target =
      slots.find((s) => !references.some((r) => r.slotId === s.id)) ??
      slots.find((s) => s.multiple) ??
      slots[0];
    if (!target) {
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    const limit = target.multiple ? (target.maxCount ?? 8) : 1;
    files.slice(0, limit).forEach((f) => uploadOne(f, target));
  }

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
        <span className="text-[11px] text-text-secondary">{references.length}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const slotRefs = references.filter((r) => r.slotId === slot.id);
          const canAddMore = slot.multiple && slotRefs.length < (slot.maxCount ?? 8);
          return (
            <div key={slot.id} className="flex gap-2">
              {slotRefs.map((ref) => (
                <FilledSlot
                  key={ref.id}
                  reference={ref}
                  onRemove={(rid) => dispatch({ type: 'REMOVE_REFERENCE', payload: rid })}
                />
              ))}
              {(slotRefs.length === 0 || canAddMore) && (
                <EmptySlot slot={slot} onClick={() => openPickerFor(slot)} />
              )}
            </div>
          );
        })}
        {slots.length === 0 && (
          <span className="py-2 text-[11px] text-text-tertiary">
            {localize('com_studio_references')}
          </span>
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
