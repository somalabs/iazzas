import { useState } from 'react';
import { Brush, Type, Send } from 'lucide-react';
import { cn } from '~/utils';
import { useLocalize } from '~/hooks';

type EditorTab = 'prompt' | 'visual';

export default function InlineEditor() {
  const localize = useLocalize();
  const [activeTab, setActiveTab] = useState<EditorTab>('prompt');
  const [editPrompt, setEditPrompt] = useState('');

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-surface-secondary p-4">
      <div className="flex items-center gap-2 border-b border-border-light pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('prompt')}
          aria-pressed={activeTab === 'prompt'}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            activeTab === 'prompt'
              ? 'bg-surface-primary text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          <Type className="h-3 w-3" aria-hidden="true" />
          Prompt
        </button>
        <button
          type="button"
          disabled
          aria-pressed={false}
          aria-disabled="true"
          title={localize('com_studio_visual_edit_soon')}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-tertiary cursor-not-allowed opacity-50"
        >
          <Brush className="h-3 w-3" aria-hidden="true" />
          Visual
          <span className="ml-1 rounded-full bg-surface-tertiary px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
            Soon
          </span>
        </button>
      </div>

      {activeTab === 'prompt' && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder={localize('com_studio_edit_prompt_placeholder')}
              rows={3}
              aria-label={localize('com_studio_edit_prompt_placeholder')}
              className="w-full resize-none rounded-lg border border-border-light bg-surface-primary px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none focus:ring-1 focus:ring-ring-primary"
            />
            <button
              type="button"
              disabled={editPrompt.trim().length === 0}
              aria-label="Apply edit"
              className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-surface-submit text-white transition-opacity disabled:opacity-30 hover:bg-surface-submit-hover"
            >
              <Send className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
