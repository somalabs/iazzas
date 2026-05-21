import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
import { useAgentsAccessRedirect } from '~/hooks/Agents';
import { useLocalize } from '~/hooks';
import { AgentDraftProvider } from '~/Providers';
import AgentesLayout from './AgentesLayout';
import TestPanel from './TestPanel';

export default function AgentesView() {
  const localize = useLocalize();
  const hasAccess = useAgentsAccessRedirect();

  if (!hasAccess) {
    return null;
  }

  return (
    <AgentDraftProvider>
      <main
        className="h-full w-full overflow-hidden bg-surface-primary"
        aria-label={localize('com_ui_ux_nav_agentes')}
      >
        <AgentesLayout left={<AgentPanelSwitch />} right={<TestPanel />} />
      </main>
    </AgentDraftProvider>
  );
}
