import { useRef, useState, useCallback } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudioContext } from '../context';

const MAX_FREE_SLOTS = 6;

function buildSlotOptions(): string[] {
  return Array.from({ length: MAX_FREE_SLOTS }, (_, i) => `@img${i + 1}`);
}

type AutocompleteProps = {
  options: string[];
  onSelect: (slot: string) => void;
  query: string;
};

function Autocomplete({ options, onSelect, query }: AutocompleteProps) {
  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  if (filtered.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Reference suggestions"
      className="absolute bottom-full left-0 z-50 mb-1 min-w-[120px] rounded-xl border border-border-medium bg-surface-primary py-1 shadow-lg"
    >
      {filtered.map((opt) => (
        <li key={opt} role="option" aria-selected={false}>
          <button
            type="button"
            onClick={() => onSelect(opt)}
            className="w-full px-3 py-1.5 text-left text-sm font-mono text-text-primary hover:bg-surface-hover"
          >
            {opt}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function PromptInput() {
  const localize = useLocalize();
  const { prompt, setPrompt, references } = useStudioContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [atQuery, setAtQuery] = useState<string | null>(null);

  const slotOptions = buildSlotOptions();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setPrompt(value);

      const cursorPos = e.target.selectionStart ?? value.length;
      const textBefore = value.slice(0, cursorPos);
      const atMatch = textBefore.match(/@(\w*)$/);
      setAtQuery(atMatch ? atMatch[1] : null);
    },
    [setPrompt],
  );

  const handleSlotSelect = useCallback(
    (slot: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart ?? prompt.length;
      const textBefore = prompt.slice(0, cursorPos);
      const textAfter = prompt.slice(cursorPos);
      const atIndex = textBefore.lastIndexOf('@');
      const newText = textBefore.slice(0, atIndex) + slot + ' ' + textAfter;

      setPrompt(newText);
      setAtQuery(null);

      requestAnimationFrame(() => {
        const newPos = atIndex + slot.length + 1;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      });
    },
    [prompt, setPrompt],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape' && atQuery !== null) {
        setAtQuery(null);
      }
    },
    [atQuery],
  );

  const chips = prompt.match(/@\w+/g) ?? [];
  const validChips = chips.filter((c) => slotOptions.includes(c));
  const invalidChips = chips.filter((c) => !slotOptions.includes(c) && c.startsWith('@img'));

  return (
    <section aria-label={localize('com_studio_prompt_title')} className="flex flex-col gap-2">
      <span className="font-editorial text-sm font-medium text-text-secondary uppercase tracking-widest">
        {localize('com_studio_prompt_title')}
      </span>

      <div className="relative">
        {atQuery !== null && (
          <Autocomplete
            options={slotOptions}
            query={atQuery}
            onSelect={handleSlotSelect}
          />
        )}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={localize('com_studio_prompt_placeholder')}
          rows={4}
          aria-label={localize('com_studio_prompt_title')}
          className="w-full resize-none rounded-xl border border-border-light bg-surface-secondary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none focus:ring-2 focus:ring-ring-primary transition-colors"
        />
      </div>

      {validChips.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="Referenced image slots">
          {validChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full bg-surface-active px-2 py-0.5 text-xs font-mono font-medium text-text-primary"
            >
              {chip}
            </span>
          ))}
          {invalidChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full bg-surface-destructive px-2 py-0.5 text-xs font-mono font-medium text-text-destructive"
              aria-label={`${chip} — reference not found`}
            >
              {chip} ✗
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
