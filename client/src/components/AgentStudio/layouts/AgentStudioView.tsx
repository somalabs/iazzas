import { ReactFlowProvider } from '@xyflow/react';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useToastContext } from '@librechat/client';
import { useAgentsAccessRedirect } from '~/hooks/Agents';
import { useLocalize } from '~/hooks';
import { useFlowQuery, useFlowRunsQuery, useGetEndpointsQuery } from '~/data-provider';
import { FlowProvider, useFlowContext } from '../context';
import { deserializeNodes, deserializeEdges } from '../serialize';
import { Toolbar } from '../toolbar';
import { Palette } from '../palette';
import { Canvas } from '../canvas';
import { Inspector } from '../inspector';
import { RunsDrawer } from '../runs';
import { RunModal } from '../dialogs';

function FlowLoader({ flowId }: { flowId?: string }) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { state, dispatch } = useFlowContext();
  useGetEndpointsQuery();
  const { data: flowData } = useFlowQuery(flowId ?? '');
  const flow = flowData?.flow;
  const hasActiveRun = state.runs.some((r) => r.status === 'running' || r.status === 'paused');
  const { data: runsData } = useFlowRunsQuery(state.flowId ?? '', {
    refetchInterval: hasActiveRun ? 2000 : false,
  });
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (flow && state.flowId !== flow._id) {
      dispatch({
        type: 'SET_FLOW',
        payload: {
          id: flow._id,
          name: flow.name,
          nodes: deserializeNodes(flow.nodes),
          edges: deserializeEdges(flow.edges),
        },
      });
    }
  }, [flow, state.flowId, dispatch]);

  useEffect(() => {
    if (!runsData?.runs) {
      return;
    }
    const prev = prevStatusRef.current;
    const next = new Map<string, string>();
    for (const run of runsData.runs) {
      next.set(run._id, run.status);
      const before = prev.get(run._id);
      if (before && before !== run.status) {
        if (run.status === 'success') {
          showToast({ message: localize('com_studio_flow_run_status_success'), status: 'success' });
        } else if (run.status === 'failed') {
          showToast({ message: localize('com_studio_flow_run_status_failed'), status: 'error' });
        }
      }
    }
    prevStatusRef.current = next;
    dispatch({ type: 'SET_RUNS', payload: runsData.runs });
  }, [runsData, dispatch, localize, showToast]);

  return null;
}

function StudioLayout() {
  const localize = useLocalize();
  const { state } = useFlowContext();
  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Palette />
        <main
          className="relative flex-1 overflow-hidden"
          aria-label={localize('com_ui_ux_flows_canvas')}
        >
          <Canvas />
        </main>
        {state.runsOpen ? <RunsDrawer /> : <Inspector />}
      </div>
      <RunModal />
    </div>
  );
}

export default function AgentStudioView() {
  const hasAccess = useAgentsAccessRedirect();
  const { flowId } = useParams<{ flowId?: string }>();

  if (!hasAccess) {
    return null;
  }

  return (
    <FlowProvider>
      <ReactFlowProvider>
        <FlowLoader flowId={flowId} />
        <StudioLayout />
      </ReactFlowProvider>
    </FlowProvider>
  );
}
