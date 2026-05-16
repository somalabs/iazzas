import { useState } from 'react';
import { Trash2, Heart, FolderOpen, Download, ChevronDown, X, Pencil } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio, useStudioDispatch } from '../context';
import { MODEL_DISPLAY_NAMES } from '../schemas';
import InlineEditor from './InlineEditor';

const USE_IMAGE_OPTIONS = [
  'com_studio_use_as_style',
  'com_studio_use_as_reference',
  'com_studio_recreate',
  'com_studio_variations',
  'com_studio_change_camera',
  'com_studio_upscale',
  'com_studio_skin_enhancer',
  'com_studio_3d_model',
  'com_studio_create_3d_scene',
] as const;

type DetailTab = 'details' | 'comments';

export default function ImageDetail() {
  const localize = useLocalize();
  const { selectedCreation, mode } = useStudio();
  const dispatch = useStudioDispatch();
  const [tab, setTab] = useState<DetailTab>('details');
  const [useImageOpen, setUseImageOpen] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);

  if (!selectedCreation) return null;

  const isEditing = mode === 'editing';
  const model = MODEL_DISPLAY_NAMES[selectedCreation.model] ?? selectedCreation.model;
  const date = new Date(selectedCreation.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const prompt = selectedCreation.prompt;
  const truncated = prompt.length > 140 && !promptExpanded;

  function handleClose() {
    dispatch({ type: 'SELECT_CREATION', payload: null });
  }

  function startEditing() {
    dispatch({ type: 'SET_MODE', payload: 'editing' });
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
        {selectedCreation.images[0] ? (
          <img
            src={selectedCreation.images[0].url}
            alt="Generated creation"
            className="max-h-full max-w-full object-contain"
          />
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

        {/* Bottom toolbar */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-medium bg-surface-primary/80 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-xs text-text-tertiary">{localize('com_studio_similar_images')}</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-[280px] flex-shrink-0 flex-col border-l border-border-medium bg-surface-primary">
        {/* Action buttons */}
        <div className="flex items-center gap-1.5 border-b border-border-medium p-3">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-destructive"
            aria-label={localize('com_studio_delete_creation')}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-medium text-text-secondary transition-colors hover:bg-surface-hover"
            aria-label="Favorite"
          >
            <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-medium text-text-secondary transition-colors hover:bg-surface-hover"
            aria-label={localize('com_studio_add_to_collection')}
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
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
          {(['details', 'comments'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors',
                tab === t
                  ? 'border-b-2 border-text-primary text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              {t === 'details'
                ? localize('com_studio_details')
                : localize('com_studio_comments')}
            </button>
          ))}
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

          {tab === 'comments' && (
            <p className="text-xs text-text-tertiary">
              {/* TODO(tech): wire comments */}
              Sem comentários ainda.
            </p>
          )}
        </div>

        {/* Use image */}
        <div className="border-t border-border-medium p-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setUseImageOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg bg-surface-submit px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-surface-submit-hover"
              aria-haspopup="menu"
              aria-expanded={useImageOpen}
            >
              {localize('com_studio_use_image')}
              <ChevronDown className={cn('h-4 w-4 transition-transform', useImageOpen && 'rotate-180')} />
            </button>

            {useImageOpen && (
              <div
                role="menu"
                className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-xl border border-border-medium bg-surface-dialog py-1 shadow-xl"
              >
                {USE_IMAGE_OPTIONS.map((key) => (
                  <button
                    key={key}
                    role="menuitem"
                    type="button"
                    onClick={() => setUseImageOpen(false)}
                    className="w-full px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  >
                    {localize(key)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
