import React, { createContext, useContext, useReducer } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { FlowRun, FlowNodeData, FlowNodeType } from 'librechat-data-provider';
import type { ValidationError } from './canvas/validation';

type FlowState = {
  flowId: string | null;
  flowName: string;
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  validationErrors: ValidationError[];
  runsOpen: boolean;
  runs: FlowRun[];
  runModalOpen: boolean;
  saving: boolean;
};

type FlowAction =
  | { type: 'SET_FLOW'; payload: { id: string; name: string; nodes: Node[]; edges: Edge[] } }
  | { type: 'SET_FLOW_NAME'; payload: string }
  | { type: 'SET_NODES'; payload: Node[] }
  | { type: 'SET_EDGES'; payload: Edge[] }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'UPDATE_NODE_DATA'; payload: { id: string; data: Partial<FlowNodeData> } }
  | { type: 'ADD_NODE'; payload: { type: FlowNodeType; position: { x: number; y: number } } }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationError[] }
  | { type: 'TOGGLE_RUNS' }
  | { type: 'SET_RUNS'; payload: FlowRun[] }
  | { type: 'TOGGLE_RUN_MODAL' }
  | { type: 'SET_SAVING'; payload: boolean };

const defaultDataForType = (nodeType: FlowNodeType): FlowNodeData => {
  switch (nodeType) {
    case 'trigger':
      return { type: 'trigger' };
    case 'agent':
      return { type: 'agent', agentId: '' };
    case 'condition':
      return { type: 'condition', criterio: '' };
    case 'http':
      return { type: 'http', method: 'GET', url: '', headers: [], timeout: 10000 };
    case 'human_approval':
      return { type: 'human_approval', prompt: '' };
    case 'output':
      return { type: 'output' };
  }
};

function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'SET_FLOW':
      return {
        ...state,
        flowId: action.payload.id,
        flowName: action.payload.name,
        nodes: action.payload.nodes,
        edges: action.payload.edges,
      };
    case 'SET_FLOW_NAME':
      return { ...state, flowName: action.payload };
    case 'SET_NODES':
      return { ...state, nodes: action.payload };
    case 'SET_EDGES':
      return { ...state, edges: action.payload };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload };
    case 'UPDATE_NODE_DATA':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id
            ? { ...n, data: { ...n.data, ...action.payload.data } }
            : n,
        ),
      };
    case 'ADD_NODE': {
      const id = crypto.randomUUID();
      const newNode: Node = {
        id,
        type: action.payload.type,
        position: action.payload.position,
        data: defaultDataForType(action.payload.type),
      };
      return { ...state, nodes: [...state.nodes, newNode], selectedNodeId: id };
    }
    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== action.payload),
        edges: state.edges.filter(
          (e) => e.source !== action.payload && e.target !== action.payload,
        ),
        selectedNodeId: state.selectedNodeId === action.payload ? null : state.selectedNodeId,
      };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };
    case 'TOGGLE_RUNS':
      return { ...state, runsOpen: !state.runsOpen };
    case 'SET_RUNS':
      return { ...state, runs: action.payload };
    case 'TOGGLE_RUN_MODAL':
      return { ...state, runModalOpen: !state.runModalOpen };
    case 'SET_SAVING':
      return { ...state, saving: action.payload };
    default:
      return state;
  }
}

const initialState: FlowState = {
  flowId: null,
  flowName: '',
  nodes: [],
  edges: [],
  selectedNodeId: null,
  validationErrors: [],
  runsOpen: false,
  runs: [],
  runModalOpen: false,
  saving: false,
};

type FlowContextType = {
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
};

const FlowContext = createContext<FlowContextType | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <FlowContext.Provider value={{ state, dispatch }}>{children}</FlowContext.Provider>;
}

export function useFlowContext() {
  const ctx = useContext(FlowContext);
  if (!ctx) {
    throw new Error('useFlowContext must be used inside FlowProvider');
  }
  return ctx;
}
