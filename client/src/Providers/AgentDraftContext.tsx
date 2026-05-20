import React, { createContext, useContext, useState } from 'react';

export type AgentDraftParams = {
  name: string;
  category: string;
  provider: string;
  model: string;
  instructions: string;
  webSearch: boolean;
  fileSearch: boolean;
  executeCode: boolean;
  mcpServers: string[];
  temperature?: number;
  top_p?: number;
};

type FormSetValue = (field: string, value: unknown, options?: object) => void;

type AgentDraftContextValue = {
  draftParams: AgentDraftParams;
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>;
  /** Called by AgentPanel on mount to register its react-hook-form setValue. */
  registerFormSetValue: (fn: FormSetValue) => void;
  /** Used by BuilderChatView to update AgentForm fields cross-panel. Null until AgentPanel mounts. */
  setFormValue: FormSetValue | null;
};

const defaultDraftParams: AgentDraftParams = {
  name: '',
  category: '',
  provider: '',
  model: '',
  instructions: '',
  webSearch: false,
  fileSearch: false,
  executeCode: false,
  mcpServers: [],
};

const AgentDraftContext = createContext<AgentDraftContextValue | null>(null);

export function AgentDraftProvider({ children }: { children: React.ReactNode }) {
  const [draftParams, setDraftParams] = useState<AgentDraftParams>(defaultDraftParams);
  const [setFormValue, setSetFormValue] = useState<FormSetValue | null>(null);

  const registerFormSetValue = (fn: FormSetValue) => {
    // Pass a function-returning-function so React doesn't invoke fn as a state initializer.
    setSetFormValue(() => fn);
  };

  return (
    <AgentDraftContext.Provider value={{ draftParams, setDraftParams, registerFormSetValue, setFormValue }}>
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
