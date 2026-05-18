import '@xyflow/react/dist/style.css';
import { useCallback, useRef } from 'react';
import type { TranslationKeys } from '~/hooks';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  BackgroundVariant,
  useReactFlow,
  type Connection,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { validateFlow } from './validation';
import type { FlowNodeType } from 'librechat-data-provider';

const HANDLE_LABELS: Record<string, string> = {
  true: 'Verdadeiro',
  false: 'Falso',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

function getEdgeLabel(connection: Connection): string | undefined {
  return connection.sourceHandle ? HANDLE_LABELS[connection.sourceHandle] : undefined;
}

export default function Canvas() {
  const localize = useLocalize();
  const { state, dispatch } = useFlowContext();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const next = applyNodeChanges(changes, state.nodes);
      dispatch({ type: 'SET_NODES', payload: next });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validateFlow(next, state.edges) });
    },
    [dispatch, state.nodes, state.edges],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const next = applyEdgeChanges(changes, state.edges);
      dispatch({ type: 'SET_EDGES', payload: next });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validateFlow(state.nodes, next) });
    },
    [dispatch, state.nodes, state.edges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `${connection.source}-${connection.sourceHandle ?? 'default'}-${connection.target}`,
        type: 'labeled',
        label: getEdgeLabel(connection),
      } as Edge;
      const next = addEdge(edge, state.edges);
      dispatch({ type: 'SET_EDGES', payload: next });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: validateFlow(state.nodes, next) });
    },
    [dispatch, state.nodes, state.edges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      dispatch({ type: 'SELECT_NODE', payload: node.id });
    },
    [dispatch],
  );

  const onPaneClick = useCallback(() => {
    dispatch({ type: 'SELECT_NODE', payload: null });
  }, [dispatch]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow') as FlowNodeType;
      if (!nodeType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      dispatch({ type: 'ADD_NODE', payload: { type: nodeType, position } });
    },
    [dispatch, screenToFlowPosition],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const errors = state.validationErrors.filter(
    (e) => e.key === 'com_studio_flow_error_no_trigger' || e.key === 'com_studio_flow_error_no_output',
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="relative h-full w-full"
      aria-label="Canvas do flow"
    >
      <ReactFlow
        nodes={state.nodes}
        edges={state.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode="Delete"
        className="bg-surface-primary"
        aria-label="Editor de flow visual"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="!fill-border-light"
        />
        <Controls
          className="!rounded-xl !border !border-border-medium !bg-surface-secondary [&>button]:!border-border-light [&>button]:!bg-surface-secondary [&>button]:!text-text-secondary [&>button:hover]:!bg-surface-hover"
          aria-label="Controles do canvas"
        />
        <MiniMap
          className="!rounded-xl !border !border-border-medium !bg-surface-secondary"
          nodeColor="var(--surface-tertiary)"
          maskColor="rgba(0,0,0,0.1)"
          aria-label="Mini-mapa do flow"
        />
      </ReactFlow>

      {state.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-text-tertiary">
            {localize('com_studio_flow_canvas_empty')}
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col gap-1"
        >
          {errors.map((err) => (
            <div
              key={err.key}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 shadow"
            >
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              {localize(err.key as TranslationKeys)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
