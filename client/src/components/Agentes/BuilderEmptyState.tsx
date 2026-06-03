import { useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useChatFormContext } from '~/Providers';
import { useLocalize } from '~/hooks';

const EXAMPLE_KEYS = [
  'com_agents_builder_example_sales',
  'com_agents_builder_example_copy',
  'com_agents_builder_example_inventory',
  'com_agents_builder_example_brief',
] as const;

export default function BuilderEmptyState() {
  const localize = useLocalize();
  const { setValue } = useChatFormContext();

  const applyExample = useCallback(
    (text: string) => {
      setValue('text', text, { shouldValidate: true, shouldDirty: true });
      const input = document.querySelector<HTMLTextAreaElement>('[data-testid="text-input"]');
      input?.focus();
    },
    [setValue],
  );

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
      <span
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--azzas-navy)]"
        aria-hidden="true"
      >
        <Sparkles className="h-5 w-5 text-white" />
      </span>
      <h2 className="text-token-text-primary text-lg font-semibold">
        {localize('com_agents_builder_empty_title')}
      </h2>
      <p className="text-token-text-secondary mt-1.5 text-sm">
        {localize('com_agents_builder_empty_subtitle')}
      </p>
      <div className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLE_KEYS.map((key) => {
          const text = localize(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyExample(text)}
              className="text-token-text-secondary hover:text-token-text-primary rounded-lg border border-border-light bg-surface-secondary px-3 py-2.5 text-left text-sm transition-colors hover:border-[var(--azzas-navy)]"
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
