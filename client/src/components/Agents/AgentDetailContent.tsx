import React, { useMemo } from 'react';
import { Link, Pin, PinOff } from 'lucide-react';
import { OGDialogContent, Button, useToastContext } from '@librechat/client';
import type t from 'librechat-data-provider';
import { useLocalize, useFavorites } from '~/hooks';
import { useGetAgentByIdQuery } from '~/data-provider/Agents';
import useStartAgentChat from '~/hooks/Agents/useStartAgentChat';
import { renderAgentAvatar } from '~/utils';
import { CAPABILITY_META } from './capabilities';

interface SupportContact {
  name?: string;
  email?: string;
}

interface AgentWithSupport extends t.Agent {
  support_contact?: SupportContact;
}

interface AgentDetailContentProps {
  agent: AgentWithSupport;
}

/**
 * Dialog content for displaying agent details
 * Used inside OGDialog with OGDialogTrigger for proper focus management
 */
const AgentDetailContent: React.FC<AgentDetailContentProps> = ({ agent }) => {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const startChat = useStartAgentChat();
  const { isFavoriteAgent, toggleFavoriteAgent } = useFavorites();
  const isFavorite = isFavoriteAgent(agent?.id);

  /**
   * Lazy-load the full (VIEW-level) agent when the dialog opens. The marketplace
   * list projection omits conversation starters, so we fetch them here and merge
   * over the list item we already have.
   */
  const { data: fullAgent } = useGetAgentByIdQuery(agent?.id, { enabled: !!agent?.id });
  const detail = useMemo<AgentWithSupport>(
    () => ({ ...agent, ...(fullAgent ?? {}) }),
    [agent, fullAgent],
  );

  const capabilities = useMemo(
    () => (detail.capabilities ?? []).filter((cap) => CAPABILITY_META[cap]),
    [detail.capabilities],
  );
  const starters = useMemo(
    () => (detail.conversation_starters ?? []).filter((text) => text.trim()).slice(0, 4),
    [detail.conversation_starters],
  );

  const handleFavoriteClick = () => {
    if (agent) {
      toggleFavoriteAgent(agent.id);
    }
  };

  /**
   * Copy the agent's shareable link to clipboard
   */
  const handleCopyLink = () => {
    const baseUrl = new URL(window.location.origin);
    const chatUrl = `${baseUrl.origin}/c/new?agent_id=${agent.id}`;
    navigator.clipboard
      .writeText(chatUrl)
      .then(() => {
        showToast({ message: localize('com_agents_link_copied') });
      })
      .catch(() => {
        showToast({ message: localize('com_agents_link_copy_failed') });
      });
  };

  /**
   * Format contact information with mailto links when appropriate
   */
  const formatContact = () => {
    if (!detail?.support_contact) {
      return null;
    }

    const { name, email } = detail.support_contact;

    if (email) {
      return (
        <a href={`mailto:${email}`} className="text-text-secondary hover:underline">
          {name || email}
        </a>
      );
    }

    if (name) {
      return <span>{name}</span>;
    }

    return null;
  };

  return (
    <OGDialogContent className="max-h-[90vh] w-11/12 max-w-lg overflow-y-auto">
      {/* Agent avatar */}
      <div className="mt-6 flex justify-center">{renderAgentAvatar(detail, { size: 'xl' })}</div>

      {/* Agent name */}
      <div className="mt-3 text-center">
        <h2 className="text-2xl font-bold text-text-primary">
          {detail?.name || localize('com_agents_loading')}
        </h2>
      </div>

      {/* Contact info */}
      {detail?.support_contact && formatContact() && (
        <div className="mt-1 text-center text-sm text-text-secondary">
          {localize('com_agents_contact')}: {formatContact()}
        </div>
      )}

      {/* Capability chips */}
      {capabilities.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {capabilities.map((cap) => {
            const { icon: Icon, label } = CAPABILITY_META[cap];
            return (
              <span
                key={cap}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {localize(label)}
              </span>
            );
          })}
        </div>
      )}

      {/* Agent description */}
      {detail?.description && (
        <p className="mx-auto mt-4 max-w-prose whitespace-pre-wrap px-6 text-left text-sm leading-relaxed text-text-primary">
          {detail.description}
        </p>
      )}

      {/* Example prompts */}
      {starters.length > 0 && (
        <div className="mt-6 px-6">
          <h3 className="mb-2 text-xs font-medium text-text-secondary">
            {localize('com_agents_examples_heading')}
          </h3>
          <div className="flex flex-col gap-2">
            {starters.map((text, index) => (
              <button
                key={index}
                type="button"
                onClick={() => startChat(agent, text)}
                className="rounded-lg border border-border-light bg-surface-primary px-3 py-2 text-left text-sm text-text-primary transition-colors duration-150 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring-primary"
              >
                <span className="line-clamp-2">{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mb-4 mt-6 flex justify-center gap-2 px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={handleFavoriteClick}
          title={isFavorite ? localize('com_ui_unpin') : localize('com_ui_pin')}
          aria-label={isFavorite ? localize('com_ui_unpin') : localize('com_ui_pin')}
        >
          {isFavorite ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopyLink}
          title={localize('com_agents_copy_link')}
          aria-label={localize('com_agents_copy_link')}
        >
          <Link className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button className="w-full max-w-xs" onClick={() => startChat(agent)} disabled={!agent}>
          {localize('com_agents_start_chat')}
        </Button>
      </div>
    </OGDialogContent>
  );
};

export default AgentDetailContent;
