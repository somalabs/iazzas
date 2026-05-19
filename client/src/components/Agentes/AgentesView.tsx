import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
import { useAgentsAccessRedirect } from '~/hooks/Agents';
import { useLocalize } from '~/hooks';

export default function AgentesView() {
  const localize = useLocalize();
  const hasAccess = useAgentsAccessRedirect();

  if (!hasAccess) {
    return null;
  }

  return (
    <main
      className="h-full w-full overflow-y-auto bg-surface-primary"
      aria-label={localize('com_ui_ux_nav_agentes')}
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <AgentPanelSwitch />
      </div>
    </main>
  );
}
