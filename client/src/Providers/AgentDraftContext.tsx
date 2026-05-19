import React, { createContext, useContext, useState } from 'react';

export type AgentDraftParams = {
  provider: string;
  model: string;
  instructions: string;
  webSearch: boolean;
  fileSearch: boolean;
  executeCode: boolean;
  mcpServers: string[];
};

const defaultDraftParams: AgentDraftParams = {
  provider: '',
  model: '',
  instructions: '',
  webSearch: false,
  fileSearch: false,
  executeCode: false,
  mcpServers: [],
};

type AgentDraftContextValue = {
  draftParams: AgentDraftParams;
  setDraftParams: (params: AgentDraftParams) => void;
};

const AgentDraftContext = createContext<AgentDraftContextValue | null>(null);

export function AgentDraftProvider({ children }: { children: React.ReactNode }) {
  const [draftParams, setDraftParams] = useState<AgentDraftParams>(defaultDraftParams);
  return (
    <AgentDraftContext.Provider value={{ draftParams, setDraftParams }}>
      {children}
    </AgentDraftContext.Provider>
  );
}

export function useAgentDraftContext(): AgentDraftContextValue {
  const ctx = useContext(AgentDraftContext);
  if (!ctx) {
    throw new Error('useAgentDraftContext must be used within AgentDraftProvider');
  }
  return ctx;
}
