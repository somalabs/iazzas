import React, { useMemo, useState } from 'react';
import { Label, Button, OGDialog, OGDialogTrigger } from '@librechat/client';
import type t from 'librechat-data-provider';
import { useLocalize, TranslationKeys, useAgentCategories } from '~/hooks';
import useStartAgentChat from '~/hooks/Agents/useStartAgentChat';
import { cn, renderAgentAvatar, getContactDisplayName } from '~/utils';
import { CAPABILITY_META } from './capabilities';
import AgentDetailContent from './AgentDetailContent';

interface AgentCardProps {
  agent: t.Agent;
  onSelect?: (agent: t.Agent) => void;
  className?: string;
}

/**
 * Card component to display agent information with integrated detail dialog
 */
const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, className = '' }) => {
  const localize = useLocalize();
  const { categories } = useAgentCategories();
  const startChat = useStartAgentChat();
  const [isOpen, setIsOpen] = useState(false);

  const capabilities = useMemo(
    () => (agent.capabilities ?? []).filter((cap) => CAPABILITY_META[cap]),
    [agent.capabilities],
  );

  const categoryLabel = useMemo(() => {
    if (!agent.category) return '';

    const category = categories.find((cat) => cat.value === agent.category);
    if (category) {
      if (category.label && category.label.startsWith('com_')) {
        return localize(category.label as TranslationKeys);
      }
      return category.label;
    }

    return agent.category.charAt(0).toUpperCase() + agent.category.slice(1);
  }, [agent.category, categories, localize]);

  const displayName = getContactDisplayName(agent);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && onSelect) {
      onSelect(agent);
    }
  };

  return (
    <OGDialog open={isOpen} onOpenChange={handleOpenChange}>
      <OGDialogTrigger asChild>
        <div
          className={cn(
            'group relative flex h-32 gap-5 overflow-hidden rounded-xl',
            'cursor-pointer select-none px-6 py-4',
            'bg-surface-tertiary transition-colors duration-150 hover:bg-surface-hover',
            'md:h-36 lg:h-40',
            '[&_*]:cursor-pointer',
            className,
          )}
          aria-label={localize('com_agents_agent_card_label', {
            name: agent.name,
            description: agent.description ?? '',
          })}
          aria-describedby={agent.description ? `agent-${agent.id}-description` : undefined}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          {/* Category badge - top right */}
          {categoryLabel && (
            <span className="absolute right-4 top-3 rounded-md bg-surface-hover px-2 py-0.5 text-xs text-text-secondary">
              {categoryLabel}
            </span>
          )}

          {/* Avatar */}
          <div className="flex-shrink-0 self-center">
            <div className="overflow-hidden rounded-full ring-1 ring-border-light">
              {renderAgentAvatar(agent, { size: 'sm', showBorder: false })}
            </div>
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
            {/* Agent name */}
            <div className="flex items-center gap-2">
              <Label className="line-clamp-2 text-base font-semibold text-text-primary md:text-lg">
                {agent.name}
              </Label>
              {agent.isPublic && (
                <span className="text-token-text-secondary flex-shrink-0 rounded-md border border-border-light px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  {localize('com_ui_public')}
                </span>
              )}
            </div>

            {/* Agent description */}
            {agent.description && (
              <p
                id={`agent-${agent.id}-description`}
                className="text-token-text-secondary mt-0.5 line-clamp-2 text-sm leading-snug md:line-clamp-3"
                aria-label={localize('com_agents_description_card', {
                  description: agent.description,
                })}
              >
                {agent.description}
              </p>
            )}

            {/* Author + capability glyphs */}
            {(displayName || capabilities.length > 0) && (
              <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary">
                {displayName && (
                  <span className="truncate">
                    {localize('com_ui_by_author', { 0: displayName || '' })}
                  </span>
                )}
                {capabilities.length > 0 && (
                  <span className="flex flex-shrink-0 items-center gap-1.5">
                    {capabilities.map((cap) => {
                      const { icon: Icon, label } = CAPABILITY_META[cap];
                      return (
                        <Icon
                          key={cap}
                          className="size-3.5"
                          role="img"
                          aria-label={localize(label)}
                        />
                      );
                    })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick start on hover (mouse) / focus (keyboard) */}
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              startChat(agent);
            }}
            className="absolute bottom-3 right-4 h-7 px-3 text-xs opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={localize('com_agents_start_chat')}
          >
            {localize('com_agents_start_chat')}
          </Button>
        </div>
      </OGDialogTrigger>

      <AgentDetailContent agent={agent} />
    </OGDialog>
  );
};

export default AgentCard;
