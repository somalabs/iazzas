import { useState, useRef } from 'react';
import { Paperclip, ChevronUp, X } from 'lucide-react';
import { dataService } from 'librechat-data-provider';
import type { StudioCreation } from 'librechat-data-provider';
import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudioEditMutation } from '~/data-provider';
import { useStudio, useStudioDispatch } from '../context';

type EditorTab = 'prompt' | 'visual';

type Attachment = {
  id: string;
  fileId: string | null;
  previewUrl: string;
  name: string;
  status: 'uploading' | 'ready' | 'error';
};

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

export default function InlineEditor() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const dispatch = useStudioDispatch();
  const { selectedCreation } = useStudio();
  const [tab, setTab] = useState<EditorTab>('prompt');
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editMutation = useStudioEditMutation();

  if (!selectedCreation) return null;

  function handleClose() {
    dispatch({ type: 'SET_MODE', payload: 'detail' });
  }

  async function uploadAttachment(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast({ status: 'error', message: localize('com_studio_ref_not_image') });
      return;
    }
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    setAttachments((prev) => [
      ...prev,
      { id, fileId: null, previewUrl, name: file.name, status: 'uploading' },
    ]);
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
      setAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, fileId, status: 'ready' } : a)),
      );
    } catch {
      setAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'error' } : a)),
      );
      showToast({ status: 'error', message: localize('com_studio_ref_upload_failed') });
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSubmit() {
    if (!selectedCreation || !value.trim() || editMutation.isLoading) {
      return;
    }
    const sourceImage = selectedCreation.images[0];
    if (!sourceImage) {
      return;
    }
    if (attachments.some((a) => a.status === 'uploading')) {
      showToast({ status: 'warning', message: localize('com_studio_refs_uploading') });
      return;
    }
    const referenceFileIds = attachments
      .filter((a) => a.status === 'ready' && a.fileId)
      .map((a) => a.fileId as string);
    const trimmed = value.trim();

    // Take the user straight to the in-progress project instead of
    // leaving them in the editor while the request blocks.
    const optimisticId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tmp-${Date.now()}`;
    const optimistic: StudioCreation = {
      id: optimisticId,
      prompt: trimmed,
      useCase: selectedCreation.useCase,
      model: selectedCreation.model,
      aspectRatio: selectedCreation.aspectRatio,
      resolution: selectedCreation.resolution,
      imageCount: 1,
      createdAt: new Date(),
      images: [],
      referenceCount: referenceFileIds.length + 1,
      collectionName: null,
      status: 'generating',
    };
    dispatch({ type: 'ADD_CREATION', payload: optimistic });
    dispatch({ type: 'SELECT_CREATION', payload: optimistic });
    dispatch({ type: 'SET_MODE', payload: 'detail' });
    setValue('');
    setAttachments([]);

    editMutation.mutate(
      {
        creationId: selectedCreation.id,
        imageId: sourceImage.id,
        prompt: trimmed,
        modelOverride: null,
        referenceFileIds,
      },
      {
        onSuccess: (creation) => {
          dispatch({ type: 'REPLACE_CREATION', payload: { fromId: optimisticId, creation } });
          dispatch({ type: 'SELECT_CREATION', payload: creation });
        },
        onError: () => {
          const errored = { ...optimistic, status: 'error' as const };
          dispatch({ type: 'REPLACE_CREATION', payload: { fromId: optimisticId, creation: errored } });
          dispatch({ type: 'SELECT_CREATION', payload: errored });
          showToast({ status: 'error', message: localize('com_studio_edit_failed') });
        },
      },
    );
  }

  return (
    <div className="flex h-full flex-col border-t border-border-medium bg-surface-primary">
      {/* Full-screen image area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-surface-chat">
        {selectedCreation.images[0] ? (
          <img
            src={selectedCreation.images[0].url}
            alt="Selected creation"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-medium border-t-text-secondary" />
          </div>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-surface-primary/70 text-text-secondary backdrop-blur-sm transition-colors hover:bg-surface-hover"
          aria-label="Close editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Prompt bar */}
      <div className="flex-shrink-0 border-t border-border-medium bg-surface-secondary px-4 py-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="group relative h-14 w-14 overflow-hidden rounded-lg border border-border-medium"
              >
                <img src={a.previewUrl} alt={a.name} className="h-full w-full object-cover" />
                {a.status === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  </div>
                )}
                {a.status === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/60 text-[9px] font-semibold text-white">
                    erro
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={`Remover ${a.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-start gap-2 rounded-xl border border-border-medium bg-surface-primary px-3 py-2.5 focus-within:border-border-heavy">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={localize('com_studio_prompt_change_placeholder')}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center gap-2 self-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                files.forEach((f) => void uploadAttachment(f));
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-text-tertiary transition-colors hover:text-text-secondary"
              aria-label={localize('com_studio_attach_reference')}
              title={localize('com_studio_attach_reference')}
            >
              <Paperclip className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-submit text-white disabled:opacity-30"
              aria-label="Submit edit"
            >
              <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('prompt')}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              tab === 'prompt'
                ? 'bg-surface-secondary text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {localize('com_studio_prompt_label')}
          </button>
          <button
            type="button"
            disabled
            title={`${localize('com_studio_visual_mode')} · ${localize('com_studio_coming_soon')}`}
            aria-label={`${localize('com_studio_visual_mode')} (${localize('com_studio_coming_soon')})`}
            className="flex cursor-not-allowed items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-text-tertiary opacity-50"
          >
            {localize('com_studio_visual_mode')}
            <span className="rounded bg-surface-active px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
              {localize('com_studio_coming_soon')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
