import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  QueryKeys,
  Constants,
  EModelEndpoint,
  PermissionBits,
  LocalStorageKeys,
  AgentListResponse,
} from 'librechat-data-provider';
import type t from 'librechat-data-provider';
import { useLocalize, useDefaultConvo } from '~/hooks';
import { clearMessagesCache } from '~/utils';
import { useChatContext } from '~/Providers';

/**
 * Launches a fresh conversation with a marketplace agent. Marketplace agents are
 * not in the user's owned agents map, so we prime the agent into local caches
 * first. When a starter prompt is provided, route through /c/new so the composer
 * auto-fills and submits it.
 */
export default function useStartAgentChat() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getDefaultConversation = useDefaultConvo();
  const { conversation, newConversation } = useChatContext();

  return useCallback(
    (agent: t.Agent, prompt?: string) => {
      if (!agent) {
        return;
      }

      const keys = [QueryKeys.agents, { requiredPermission: PermissionBits.EDIT }];
      const listResp = queryClient.getQueryData<AgentListResponse>(keys);
      if (listResp != null && !listResp.data.some((a) => a.id === agent.id)) {
        const currentAgents = [agent, ...JSON.parse(JSON.stringify(listResp.data))];
        queryClient.setQueryData<AgentListResponse>(keys, { ...listResp, data: currentAgents });
      }

      localStorage.setItem(`${LocalStorageKeys.AGENT_ID_PREFIX}0`, agent.id);
      clearMessagesCache(queryClient, conversation?.conversationId);
      queryClient.invalidateQueries([QueryKeys.messages]);

      if (prompt) {
        navigate(`/c/new?agent_id=${agent.id}&prompt=${encodeURIComponent(prompt)}&submit=true`);
        return;
      }

      const template = {
        conversationId: Constants.NEW_CONVO as string,
        endpoint: EModelEndpoint.agents,
        agent_id: agent.id,
        title: localize('com_agents_chat_with', { name: agent.name || localize('com_ui_agent') }),
      };

      const currentConvo = getDefaultConversation({
        conversation: { ...(conversation ?? {}), ...template },
        preset: template,
      });

      newConversation({ template: currentConvo, preset: template });
    },
    [localize, navigate, queryClient, getDefaultConversation, conversation, newConversation],
  );
}
