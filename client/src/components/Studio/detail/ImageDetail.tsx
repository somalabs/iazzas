import { useState } from 'react';
import { Trash2, Heart, FolderOpen, Download, X, Pencil, AlertCircle } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudioDeleteMutation } from '~/data-provider';
import { useStudio, useStudioDispatch } from '../context';
import { MODEL_DISPLAY_NAMES } from '../schemas';
import { formatStudioDate } from '../date';
import InlineEditor from './InlineEditor';

type DetailTab = 'details' | 'comments';

export default function ImageDetail() {
  const localize = useLocalize();
  const { selectedCreation, mode } = useStudio();
  const dispatch = useStudioDispatch();
  const { showToast } = useToastContext();
  const deleteMutation = useStudioDeleteMutation();
  const [tab, setTab] = useState<DetailTab>('details');
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  if (!selectedCreation) return null;
  const creation = selectedCreation;

  const isEditing = mode === 'editing';
  const model = MODEL_DISPLAY_NAMES[creation.model] ?? creation.model;
  const date = formatStudioDate(selectedCreation.createdAt, true);
  const prompt = selectedCreation.prompt;
  const truncated = prompt.length > 140 && !promptExpanded;
  const comingSoon = localize('com_studio_coming_soon');
  const images = selectedCreation.images;
  const currentImage = images[imageIdx] ?? images[0];

  function handleClose() {
    dispatch({ type: 'SELECT_CREATION', payload: null });
  }

  function startEditing() {
    dispatch({ type: 'SET_MODE', payload: 'editing' });
  }

  function handleDelete() {
    if (deleteMutation.isLoading) {
      return;
    }
    const id = creation.id;
    if (!window.confirm(localize('com_studio_delete_confirm'))) {
      return;
    }
    deleteMutation.mutate(id, {
      onSuccess: () => {
        dispatch({ type: 'REMOVE_CREATION', payload: id });
        showToast({ status: 'success', message: localize('com_studio_deleted') });
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          // Nothing exists server-side under this id (a still-optimistic
          // card from a failed generation, or already deleted). Clearing
          // the stuck client card loses nothing.
          dispatch({ type: 'REMOVE_CREATION', payload: id });
          showToast({ status: 'success', message: localize('com_studio_deleted') });
          return;
        }
        showToast({ status: 'error', message: localize('com_studio_delete_failed') });
      },
    });
  }

  async function handleDownload() {
    const image = images[imageIdx] ?? images[0];
    if (!image) {
      return;
    }
    try {
      const res = await fetch(image.url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `studio-${creation.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(image.url, '_blank', 'noopener');
    }
  }

  if (isEditing) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-hidden">
          <InlineEditor />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Image area */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-surface-chat">
        {currentImage ? (
          <img
            src={currentImage.url}
            alt="Generated creation"
            className="max-h-full max-w-full object-contain"
          />
        ) : selectedCreation.status === 'error' ? (
          <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center text-text-secondary">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="text-sm font-medium">
              {localize('com_studio_generation_failed')}
            </span>
            <span className="text-xs text-text-tertiary">
              {localize('com_studio_generation_failed_hint')}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-text-tertiary">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-medium border-t-text-secondary" />
            <span className="text-xs">{localize('com_studio_generating')}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-surface-primary/70 text-text-secondary backdrop-blur-sm transition-colors hover:bg-surface-hover"
          aria-label={localize('com_studio_close_detail')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image picker — shows every image the creation generated */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-medium bg-surface-primary/80 px-2 py-1.5 backdrop-blur-sm">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setImageIdx(i)}
                className={cn(
                  'h-10 w-10 overflow-hidden rounded-md border-2 transition-colors',
                  i === imageIdx ? 'border-text-primary' : 'border-transparent opacity-60 hover:opacity-100',
                )}
                aria-label={`Imagem ${i + 1} de ${images.length}`}
                aria-pressed={i === imageIdx}
              >
                <img
                  src={img.thumbnailUrl ?? img.url}
                  alt={`Variação ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex w-[280px] flex-shrink-0 flex-col border-l border-border-medium bg-surface-primary">
        {/* Action buttons */}
        <div className="flex items-center gap-1.5 border-b border-border-medium p-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isLoading}
            title={localize('com_studio_delete_creation')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={localize('com_studio_delete_creation')}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            disabled
            title={`Favoritar · ${comingSoon}`}
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-border-medium text-text-secondary opacity-40"
            aria-label={`Favoritar (${comingSoon})`}
          >
            <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            disabled
            title={`${localize('com_studio_add_to_collection')} · ${comingSoon}`}
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-border-medium text-text-secondary opacity-40"
            aria-label={`${localize('com_studio_add_to_collection')} (${comingSoon})`}
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-medium text-text-secondary transition-colors hover:bg-surface-hover"
            aria-label={localize('com_studio_download')}
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={startEditing}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-border-medium px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            aria-label={localize('com_studio_edit_inline')}
          >
            <Pencil className="h-3 w-3" strokeWidth={1.5} />
            {localize('com_studio_edit_inline')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-medium">
          <button
            type="button"
            onClick={() => setTab('details')}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors',
              tab === 'details'
                ? 'border-b-2 border-text-primary text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {localize('com_studio_details')}
          </button>
          <button
            type="button"
            disabled
            title={`${localize('com_studio_comments')} · ${comingSoon}`}
            aria-label={`${localize('com_studio_comments')} (${comingSoon})`}
            className="flex flex-1 cursor-not-allowed items-center justify-center gap-1 py-2 text-xs font-medium text-text-tertiary opacity-50"
          >
            {localize('com_studio_comments')}
            <span className="rounded-full bg-surface-active px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
              {comingSoon}
            </span>
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {tab === 'details' && (
            <>
              {/* Author / collection */}
              <div className="text-xs text-text-tertiary">
                {date}
                {selectedCreation.collectionName && (
                  <> · {localize('com_studio_saved_in')} <span className="text-text-secondary">{selectedCreation.collectionName}</span></>
                )}
              </div>

              {/* Prompt */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                  {localize('com_studio_prompt_label')}
                </p>
                <p className="text-xs leading-relaxed text-text-secondary">
                  {truncated ? `${prompt.slice(0, 140)}…` : prompt}
                </p>
                {prompt.length > 140 && (
                  <button
                    type="button"
                    onClick={() => setPromptExpanded((v) => !v)}
                    className="text-[11px] text-text-tertiary underline hover:text-text-secondary"
                  >
                    {promptExpanded
                      ? 'See less'
                      : localize('com_studio_see_more')}
                  </button>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                  {localize('com_studio_settings')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-md border border-border-medium px-2 py-0.5 text-[11px] text-text-secondary">
                    {selectedCreation.aspectRatio}
                  </span>
                  <span className="rounded-md border border-border-medium px-2 py-0.5 text-[11px] text-text-secondary">
                    {model}
                  </span>
                  <span className="rounded-md border border-border-medium px-2 py-0.5 text-[11px] text-text-secondary">
                    {selectedCreation.resolution}
                  </span>
                </div>
              </div>

              {/* References count */}
              {selectedCreation.referenceCount > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
                    {localize('com_studio_references_label')}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {selectedCreation.referenceCount} referência{selectedCreation.referenceCount !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Use image */}
        <div className="border-t border-border-medium p-3">
          <div className="relative">
            <button
              type="button"
              disabled
              title={`${localize('com_studio_use_image')} · ${comingSoon}`}
              className="flex w-full cursor-not-allowed items-center justify-between rounded-lg bg-surface-submit px-3 py-2 text-sm font-semibold text-white opacity-50"
              aria-label={`${localize('com_studio_use_image')} (${comingSoon})`}
            >
              {localize('com_studio_use_image')}
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {comingSoon}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
