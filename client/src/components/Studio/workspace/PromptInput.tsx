import { useRef, useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio, useStudioDispatch } from '../context';

type AtChip = { label: string; start: number; end: number };

function parseChips(text: string, validLabels: string[]): AtChip[] {
  const chips: AtChip[] = [];
  const pattern = /@\w+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const label = match[0];
    if (validLabels.includes(label)) {
      chips.push({ label, start: match.index, end: match.index + label.length });
    }
  }
  return chips;
}

export default function PromptInput() {
  const localize = useLocalize();
  const dispatch = useStudioDispatch();
  const { prompt, imageRefLabels, advancedMode } = useStudio();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [atQuery, setAtQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);

  const chips = parseChips(prompt, imageRefLabels);
  const filteredSuggestions = imageRefLabels.filter((l) =>
    l.toLowerCase().includes(atQuery.toLowerCase()),
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const pos = e.target.selectionStart ?? val.length;
      dispatch({ type: 'SET_PROMPT', payload: val });
      setCursorPos(pos);

      const before = val.slice(0, pos);
      const atMatch = before.match(/@(\w*)$/);
      if (atMatch && imageRefLabels.length > 0) {
        setAtQuery(atMatch[1]);
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
      }
    },
    [dispatch, imageRefLabels],
  );

  function insertSuggestion(label: string) {
    const before = prompt.slice(0, cursorPos);
    const after = prompt.slice(cursorPos);
    const atMatch = before.match(/@(\w*)$/);
    const replaceStart = atMatch ? cursorPos - atMatch[0].length : cursorPos;
    const newPrompt = prompt.slice(0, replaceStart) + label + ' ' + after;
    dispatch({ type: 'SET_PROMPT', payload: newPrompt });
    setShowAutocomplete(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  const placeholder = advancedMode
    ? localize('com_studio_advanced_prompt_label')
    : localize('com_studio_prompt_placeholder');

  return (
    <div className="relative">
      <div className="relative rounded-xl border border-border-medium bg-surface-secondary transition-colors focus-within:border-border-heavy">
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pt-2">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center rounded bg-surface-tertiary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary"
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleChange}
          placeholder={placeholder}
          rows={3}
          className={cn(
            'w-full resize-none bg-transparent px-3 pb-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none',
            chips.length > 0 ? 'pt-1.5' : 'pt-3',
          )}
          aria-label={localize('com_studio_prompt_label')}
        />
      </div>

      {showAutocomplete && filteredSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[120px] rounded-lg border border-border-medium bg-surface-dialog py-1 shadow-lg">
          {filteredSuggestions.map((label) => (
            <button
              key={label}
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-surface-hover"
              onMouseDown={(e) => {
                e.preventDefault();
                insertSuggestion(label);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
