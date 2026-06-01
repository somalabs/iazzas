import { useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { isAgentsEndpoint } from 'librechat-data-provider';
import type { MentionOption } from '~/common';
import { useChatContext, useAssistantsMapContext } from '~/Providers';
import useMentions from '~/hooks/Input/useMentions';
import useSelectMention from '~/hooks/Input/useSelectMention';
import { useGetConversation, useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * Chip "para [Agente ▾]" no topo-esquerdo do composer (F4 / P1-A). Mostra o
 * agente atual e abre um popover de agentes como FOTO-CARDS (avatar + nome).
 * Seleção reusa o caminho provado do Mention (onSelectMention). Só aparece no
 * endpoint de agentes — não muda nada nos demais. Popover é position:fixed p/
 * escapar do overflow-hidden do composer.
 */
export default function AgentChip() {
  const localize = useLocalize();
  const { conversation, newConversation } = useChatContext();
  const assistantsMap = useAssistantsMapContext();
  const getConversation = useGetConversation(0);

  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const { agentsList, presets, modelSpecs, endpointsConfig } = useMentions({
    assistantMap: assistantsMap || {},
    includeAssistants: false,
  });
  const { onSelectMention } = useSelectMention({
    presets,
    modelSpecs,
    assistantsMap,
    endpointsConfig,
    getConversation,
    newConversation,
  });

  const endpoint = conversation?.endpointType ?? conversation?.endpoint;
  const agentId = conversation?.agent_id;

  const currentName = useMemo(() => {
    const found = (agentsList ?? []).find((a) => a.value === agentId);
    return found?.label ?? localize('com_ui_select_agent');
  }, [agentsList, agentId, localize]);

  if (!isAgentsEndpoint(endpoint) || !agentsList || agentsList.length === 0) {
    return null;
  }

  const toggle = () => {
    if (!open) {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) {
        setCoords({ top: r.bottom + 6, left: r.left });
      }
    }
    setOpen((o) => !o);
  };

  const pick = (agent: MentionOption) => {
    onSelectMention?.(agent);
    setOpen(false);
  };

  return (
    <div className="relative px-3 pt-2.5">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 rounded-full bg-action px-3 py-1 text-xs text-on-action transition-colors hover:bg-action-hover"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="opacity-70">{localize('com_ui_for')}</span>
        <span className="max-w-[160px] truncate font-medium">{currentName}</span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>

      {open && coords && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="listbox"
            className="fixed z-50 max-h-[60vh] w-[320px] overflow-y-auto rounded-[14px] border border-rule bg-paper p-2 shadow-atelier"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="grid grid-cols-2 gap-2">
              {agentsList.map((agent) => (
                <button
                  key={String(agent.value)}
                  type="button"
                  role="option"
                  aria-selected={agent.value === agentId}
                  onClick={() => pick(agent as MentionOption)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border bg-canvas p-2 text-left transition-colors hover:border-action/40',
                    agent.value === agentId ? 'border-action' : 'border-rule',
                  )}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
                    {agent.icon}
                  </span>
                  <span className="line-clamp-2 text-xs font-medium text-text-primary">
                    {agent.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
