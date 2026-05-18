import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { ReactFlowProvider } from '@xyflow/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHasAccess } from '~/hooks';
import { FlowProvider } from '../context';
import { Toolbar } from '../toolbar';
import { Palette } from '../palette';
import { Canvas } from '../canvas';
import { Inspector } from '../inspector';
import { RunsDrawer } from '../runs';
import { RunModal } from '../dialogs';

function StudioLayout() {
  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Palette />
        <main
          className="relative flex-1 overflow-hidden"
          aria-label="Canvas do flow de agentes"
        >
          <Canvas />
        </main>
        <Inspector />
        <RunsDrawer />
      </div>
      <RunModal />
    </div>
  );
}

export default function AgentStudioView() {
  const navigate = useNavigate();
  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.USE,
  });

  useEffect(() => {
    if (!hasAccess) {
      const id = setTimeout(() => navigate('/c/new'), 1000);
      return () => clearTimeout(id);
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) return null;

  return (
    <FlowProvider>
      <ReactFlowProvider>
        <StudioLayout />
      </ReactFlowProvider>
    </FlowProvider>
  );
}
