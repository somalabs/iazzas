import { useEffect } from 'react';
import { ContentTypes } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';
import { applyDraftUpdate } from '~/utils/applyDraftUpdate';

type FormSetValue = ((field: string, value: unknown, options?: object) => void) | null;

const TOOL_NAME = 'atualizar_rascunho';

export function useBuilderToolInterceptor(
  messages: TMessage[],
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>,
  setFormValue: FormSetValue,
): void {
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last?.content) return;
    for (const part of last.content) {
      if (
        part.type === ContentTypes.TOOL_CALL &&
        part.tool_call?.name === TOOL_NAME &&
        part.tool_call.output != null
      ) {
        const args = (() => {
          try {
            return JSON.parse((part.tool_call.args as string) ?? '{}');
          } catch {
            return {};
          }
        })();
        applyDraftUpdate(args, setDraftParams, setFormValue);
      }
    }
  }, [messages, setDraftParams, setFormValue]);
}
