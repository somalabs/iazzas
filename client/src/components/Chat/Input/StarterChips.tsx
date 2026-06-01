import { useCallback } from 'react';
import { useChatFormContext } from '~/Providers';
import { mainTextareaId } from '~/common';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * Ferramentas-como-modos: chips de ponto-de-partida fixos da marca sob o
 * composer (estado landing). Apertar um pré-preenche o composer e foca —
 * roteia a mesma conversa para a ferramenta, em vez de abrir um app vazio.
 * Creme + hairline, nunca navy (o navy é só o send).
 */
const STARTERS: { labelKey: string; promptKey: string }[] = [
  { labelKey: 'com_ui_starter_color_variants', promptKey: 'com_ui_starter_color_variants_prompt' },
  { labelKey: 'com_ui_starter_product_on_model', promptKey: 'com_ui_starter_product_on_model_prompt' },
  { labelKey: 'com_ui_starter_summarize_brief', promptKey: 'com_ui_starter_summarize_brief_prompt' },
  { labelKey: 'com_ui_starter_schedule_flow', promptKey: 'com_ui_starter_schedule_flow_prompt' },
];

const StarterChips = () => {
  const localize = useLocalize();
  const methods = useChatFormContext();

  const handlePick = useCallback(
    (promptKey: string) => {
      const prompt = localize(promptKey as Parameters<typeof localize>[0]);
      methods.setValue('text', prompt, { shouldValidate: true });
      const textarea = document.getElementById(mainTextareaId) as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
      }
    },
    [localize, methods],
  );

  return (
    <div className="mx-auto mt-3 flex max-w-[760px] flex-wrap justify-center gap-2 px-2">
      {STARTERS.map(({ labelKey, promptKey }) => (
        <button
          key={labelKey}
          type="button"
          onClick={() => handlePick(promptKey)}
          className={cn(
            'rounded-full border border-rule bg-canvas px-3.5 py-1.5 text-[13px] text-text-secondary',
            'transition-colors duration-150 hover:border-action/40 hover:text-text-primary',
          )}
        >
          {localize(labelKey as Parameters<typeof localize>[0])}
        </button>
      ))}
    </div>
  );
};

export default StarterChips;
