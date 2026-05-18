import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { ReactFlowProvider } from '@xyflow/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHasAccess } from '~/hooks';
import { useFlowsQuery, useFlowRunsQuery, useGetEndpointsQuery } from '~/data-provider';
import { FlowProvider, useFlowContext } from '../context';
import { deserializeNodes, deserializeEdges } from '../serialize';
import { Toolbar } from '../toolbar';
import { Palette } from '../palette';
import { Canvas } from '../canvas';
import { Inspector } from '../inspector';
import { RunsDrawer } from '../runs';
import { RunModal } from '../dialogs';

/** Loads the tenant's most recent flow + its runs into the reducer. */
function FlowLoader() {
  const { state, dispatch } = useFlowContext();
  useGetEndpointsQuery();
  const { data: flowsData } = useFlowsQuery();
  const firstFlow = flowsData?.flows?.[0];
  const { data: runsData } = useFlowRunsQuery(state.flowId ?? '');

  useEffect(() => {
    if (firstFlow && !state.flowId) {
      dispatch({
        type: 'SET_FLOW',
        payload: {
          id: firstFlow._id,
          name: firstFlow.name,
          nodes: deserializeNodes(firstFlow.nodes),
          edges: deserializeEdges(firstFlow.edges),
        },
      });
    }
  }, [firstFlow, state.flowId, dispatch]);

  useEffect(() => {
    if (runsData?.runs) {
      dispatch({ type: 'SET_RUNS', payload: runsData.runs });
    }
  }, [runsData, dispatch]);

  return null;
}

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
        <FlowLoader />
        <StudioLayout />
      </ReactFlowProvider>
    </FlowProvider>
  );
}
