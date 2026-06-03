/* eslint-disable i18next/no-literal-string -- intentional hardcoded pt-BR/brand/demo copy in IAzzas fork */
import { useMemo, useRef, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { Constants, isAgentsEndpoint } from 'librechat-data-provider';
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
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  const { agentsList, presets, modelSpecs, endpointsConfig, options } = useMentions({
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
  const activeSpec = conversation?.spec;

  const specOptions = useMemo(
    () => (options ?? []).filter((o) => o.type === 'modelSpec'),
    [options],
  );

  const items = useMemo(() => [...specOptions, ...(agentsList ?? [])], [specOptions, agentsList]);

  const isItemActive = useCallback(
    (item: MentionOption) =>
      item.type === 'modelSpec' ? item.value === activeSpec : item.value === agentId,
    [activeSpec, agentId],
  );

  const currentName = useMemo(() => {
    const active = items.find((item) => isItemActive(item));
    return active?.label ?? localize('com_ui_select_agent');
  }, [items, isItemActive, localize]);

  // No fluxo de criação (chat com o agente construtor) trocar de agente não faz
  // sentido — o composer é só para descrever o agente que está sendo criado.
  if (agentId === Constants.CONSTRUTOR_AGENT_ID) {
    return null;
  }

  if (!isAgentsEndpoint(endpoint) || items.length === 0) {
    return null;
  }

  const toggle = () => {
    if (!open) {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) {
        const margin = 12;
        const gap = 6;
        const width = 320;
        const spaceBelow = window.innerHeight - r.bottom - margin;
        const spaceAbove = r.top - margin;
        const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
        const left = Math.max(margin, Math.min(r.left, window.innerWidth - width - margin));
        setMenuPos(
          openUp
            ? { left, bottom: window.innerHeight - r.top + gap, maxHeight: spaceAbove }
            : { left, top: r.bottom + gap, maxHeight: spaceBelow },
        );
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

      {open && menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="listbox"
            className="fixed z-50 w-[320px] overflow-y-auto rounded-[14px] border border-rule bg-paper p-2 shadow-atelier"
            style={{
              left: menuPos.left,
              top: menuPos.top,
              bottom: menuPos.bottom,
              maxHeight: Math.min(menuPos.maxHeight, window.innerHeight * 0.6),
            }}
          >
            <div className="flex flex-col gap-2">
              <div>
                <div className="px-1 pb-0.5 text-[11px] font-semibold text-text-tertiary">
                  Modelos IAzzas
                </div>
                <div className="flex flex-col gap-1">
                  {specOptions.map((item) => {
                    const isPro = String(item.label).toLowerCase().includes('pro');
                    return (
                      <button
                        key={`model-${String(item.value)}`}
                        type="button"
                        onClick={() => pick(item as MentionOption)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-[10px] border px-2 py-1.5 text-left transition-colors',
                          isItemActive(item)
                            ? 'border-action bg-paper'
                            : 'border-transparent hover:bg-surface-hover',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[9px] transition-colors',
                            isItemActive(item)
                              ? 'bg-action text-on-action'
                              : 'bg-[var(--azzas-blue-light)] text-action',
                          )}
                        >
                          {isPro ? (
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 19V11" />
                              <path d="M10 19V5" />
                              <path d="M16 19v-9" />
                              <path d="M22 19V8" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-primary">
                          {item.label}
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-[7px] w-[7px] flex-shrink-0 rounded-full bg-action transition-opacity',
                            isItemActive(item) ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              {agentsList && agentsList.length > 0 && (
                <div>
                  <div className="px-1 pb-0.5 text-[11px] font-semibold text-text-tertiary">
                    Seus agentes
                  </div>
                  <div className="flex flex-col gap-1">
                    {agentsList.map((item) => (
                      <button
                        key={`agent-${String(item.value)}`}
                        type="button"
                        onClick={() => pick(item as MentionOption)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-[10px] border px-2 py-1.5 text-left transition-colors',
                          isItemActive(item)
                            ? 'border-action bg-paper'
                            : 'border-transparent hover:bg-surface-hover',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-surface-hover text-[12px] font-bold text-text-secondary"
                        >
                          {String(item.label).trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text-primary">
                          {item.label}
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-[7px] w-[7px] flex-shrink-0 rounded-full bg-action transition-opacity',
                            isItemActive(item) ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
