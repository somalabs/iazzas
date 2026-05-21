import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { AgentPanelProvider, useAgentPanelContext } from '~/Providers/AgentPanelContext';
import { Panel, isEphemeralAgent } from '~/common';
import VersionPanel from './Version/VersionPanel';
import ActionsPanel from './ActionsPanel';
import AgentPanel from './AgentPanel';
import store from '~/store';

export default function AgentPanelSwitch() {
  return (
    <AgentPanelProvider>
      <AgentPanelSwitchWithContext />
    </AgentPanelProvider>
  );
}

function AgentPanelSwitchWithContext() {
  const { activePanel, setCurrentAgentId } = useAgentPanelContext();
  const recoilAgentId = useRecoilValue(store.conversationAgentIdByIndex(0));
  const { agentId: urlAgentId } = useParams<{ agentId?: string }>();

  useEffect(() => {
    const agent_id = urlAgentId ?? recoilAgentId ?? '';
    if (!isEphemeralAgent(agent_id)) {
      setCurrentAgentId(agent_id);
    }
  }, [setCurrentAgentId, urlAgentId, recoilAgentId]);

  if (activePanel === Panel.actions) {
    return <ActionsPanel />;
  }
  if (activePanel === Panel.version) {
    return <VersionPanel />;
  }
  return <AgentPanel />;
}
