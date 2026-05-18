import { useState } from 'react';
import { Paperclip, ChevronUp, X } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudioEditMutation } from '~/data-provider';
import { useStudio, useStudioDispatch } from '../context';

type EditorTab = 'prompt' | 'visual';

export default function InlineEditor() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const dispatch = useStudioDispatch();
  const { selectedCreation } = useStudio();
  const [tab, setTab] = useState<EditorTab>('prompt');
  const [value, setValue] = useState('');
  const editMutation = useStudioEditMutation();

  if (!selectedCreation) return null;

  function handleClose() {
    dispatch({ type: 'SET_MODE', payload: 'detail' });
  }

  function handleSubmit() {
    if (!selectedCreation || !value.trim() || editMutation.isLoading) {
      return;
    }
    const sourceImage = selectedCreation.images[0];
    if (!sourceImage) {
      return;
    }
    editMutation.mutate(
      {
        creationId: selectedCreation.id,
        imageId: sourceImage.id,
        prompt: value.trim(),
        modelOverride: null,
      },
      {
        onSuccess: (creation) => {
          dispatch({ type: 'ADD_CREATION', payload: creation });
          dispatch({ type: 'SELECT_CREATION', payload: creation });
          setValue('');
          dispatch({ type: 'SET_MODE', payload: 'detail' });
        },
        onError: () => {
          // Without this the edit failed silently — the prompt just sat
          // there with no feedback. Keep the text so the user can retry.
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
            <button
              type="button"
              className="text-text-tertiary transition-colors hover:text-text-secondary"
              aria-label="Attach file"
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
          {(['prompt', 'visual'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                tab === t
                  ? 'bg-surface-secondary text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              {t === 'prompt'
                ? localize('com_studio_prompt_label')
                : localize('com_studio_visual_mode')}
            </button>
          ))}
          {tab === 'visual' && (
            <span className="ml-1 rounded bg-surface-active px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
              Roadmap
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
