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

export type CreationMode = 'manual' | 'prompt';

type AgentDraftContextValue = {
  draftParams: AgentDraftParams;
  setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>>;
  /** Called by AgentPanel on mount to register its react-hook-form setValue. */
  registerFormSetValue: (fn: FormSetValue) => void;
  /** Used by BuilderChatView to update AgentForm fields cross-panel. Null until AgentPanel mounts. */
  setFormValue: FormSetValue | null;
  /** Called by AgentPanel on mount to register a save trigger that submits the form. */
  registerSaveAgent: (fn: () => void) => void;
  /** Used by BuilderChatView to trigger the agent save flow. Null until AgentPanel mounts. */
  saveAgent: (() => void) | null;
  creationMode: CreationMode;
  setCreationMode: React.Dispatch<React.SetStateAction<CreationMode>>;
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
  const [saveAgent, setSaveAgentState] = useState<(() => void) | null>(null);
  const [creationMode, setCreationMode] = useState<CreationMode>('manual');

  const registerFormSetValue = (fn: FormSetValue) => {
    // Pass a function-returning-function so React doesn't invoke fn as a state initializer.
    setSetFormValue(() => fn);
  };

  const registerSaveAgent = (fn: () => void) => {
    setSaveAgentState(() => fn);
  };

  return (
    <AgentDraftContext.Provider
      value={{
        draftParams,
        setDraftParams,
        registerFormSetValue,
        setFormValue,
        registerSaveAgent,
        saveAgent,
        creationMode,
        setCreationMode,
      }}
    >
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

/** Same as useAgentDraftContext but returns null when used outside AgentDraftProvider. */
export function useAgentDraftContextOptional(): AgentDraftContextValue | null {
  return useContext(AgentDraftContext);
}
