import { useEffect, useRef } from 'react';
import { ContentTypes } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';
import { applyDraftUpdate } from '~/utils/applyDraftUpdate';

type FormSetValue = ((field: string, value: unknown, options?: object) => void) | null;

const UPDATE_TOOL = 'atualizar_rascunho';
const SAVE_TOOL = 'salvar_agente';

export function useBuilderToolInterceptor(
  messages: TMessage[],
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>,
  setFormValue: FormSetValue,
  saveAgent: (() => void) | null,
): void {
  const processedSaveIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last?.content) return;
    for (const part of last.content) {
      if (part.type !== ContentTypes.TOOL_CALL || part.tool_call?.output == null) {
        continue;
      }
      const toolName = part.tool_call.name;
      if (toolName === UPDATE_TOOL) {
        const args = (() => {
          try {
            return JSON.parse((part.tool_call.args as string) ?? '{}');
          } catch {
            return {};
          }
        })();
        applyDraftUpdate(args, setDraftParams, setFormValue);
        continue;
      }
      if (toolName === SAVE_TOOL && saveAgent) {
        const id = `${last.messageId ?? ''}:${part.tool_call.id ?? part.tool_call.name}`;
        if (processedSaveIds.current.has(id)) continue;
        processedSaveIds.current.add(id);
        saveAgent();
      }
    }
  }, [messages, setDraftParams, setFormValue, saveAgent]);
}
