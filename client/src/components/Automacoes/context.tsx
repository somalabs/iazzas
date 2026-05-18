import React, { createContext, useContext, useReducer } from 'react';

export type Automation = {
  _id: string;
  flowId: string;
  flowName?: string;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  triggerInput?: string;
  lastRunAt?: string;
  lastStatus?: 'running' | 'success' | 'failed' | 'skipped';
  nextRunAt?: string;
  createdAt: string;
};

export type AutomationRun = {
  _id: string;
  automationId: string;
  status: 'running' | 'success' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  input?: string;
  output?: string;
  conversationId?: string;
};

type AutomacoesState = {
  selectedId: string | null;
  isCreating: boolean;
  runsAutomationId: string | null;
};

type AutomacoesAction =
  | { type: 'SELECT'; payload: string }
  | { type: 'CREATE' }
  | { type: 'CANCEL' }
  | { type: 'OPEN_RUNS'; payload: string }
  | { type: 'CLOSE_RUNS' };

function reducer(state: AutomacoesState, action: AutomacoesAction): AutomacoesState {
  switch (action.type) {
    case 'SELECT':
      return { selectedId: action.payload, isCreating: false, runsAutomationId: null };
    case 'CREATE':
      return { selectedId: null, isCreating: true, runsAutomationId: null };
    case 'CANCEL':
      return { selectedId: null, isCreating: false, runsAutomationId: state.runsAutomationId };
    case 'OPEN_RUNS':
      return { ...state, runsAutomationId: action.payload };
    case 'CLOSE_RUNS':
      return { ...state, runsAutomationId: null };
    default:
      return state;
  }
}

const initialState: AutomacoesState = {
  selectedId: null,
  isCreating: false,
  runsAutomationId: null,
};

type AutomacoesContextType = {
  state: AutomacoesState;
  dispatch: React.Dispatch<AutomacoesAction>;
};

const AutomacoesContext = createContext<AutomacoesContextType | null>(null);

export function AutomacoesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AutomacoesContext.Provider value={{ state, dispatch }}>{children}</AutomacoesContext.Provider>;
}

export function useAutomacoesContext() {
  const ctx = useContext(AutomacoesContext);
  if (!ctx) throw new Error('useAutomacoesContext must be used inside AutomacoesProvider');
  return ctx;
}
