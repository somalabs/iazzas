import { AgentCapabilities } from 'librechat-data-provider';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';

type FormSetValue = ((field: string, value: unknown, options?: object) => void) | null;

/**
 * Maps AgentDraftParams keys to their corresponding AgentForm field names.
 * Fields absent here (mcpServers, temperature, top_p, provider) are updated
 * in context only — they require special handling not available in a pure function.
 */
export const DRAFT_FORM_FIELD_MAP: Partial<Record<keyof AgentDraftParams, string>> = {
  name: 'name',
  category: 'category',
  instructions: 'instructions',
  model: 'model',
  webSearch: AgentCapabilities.web_search,
  fileSearch: AgentCapabilities.file_search,
  executeCode: AgentCapabilities.execute_code,
};

export function applyDraftUpdate(
  args: Partial<AgentDraftParams>,
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>,
  setFormValue: FormSetValue,
): void {
  setDraftParams((prev) => {
    const next = { ...prev };
    for (const [key, value] of Object.entries(args) as [keyof AgentDraftParams, unknown][]) {
      if (value !== undefined) {
        (next as Record<string, unknown>)[key] = value;
      }
    }
    return next;
  });

  if (!setFormValue) return;

  for (const [draftKey, formField] of Object.entries(DRAFT_FORM_FIELD_MAP)) {
    const value = args[draftKey as keyof AgentDraftParams];
    if (value !== undefined && formField !== undefined) {
      setFormValue(formField, value, { shouldDirty: true });
    }
  }
}
