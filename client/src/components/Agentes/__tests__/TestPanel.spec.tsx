import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

// Stub PreviewChatView — it's wired in Task 8
jest.mock('../PreviewChatView', () => ({
  __esModule: true,
  default: () => <div data-testid="preview-chat" />,
}));

import { AgentDraftProvider } from '~/Providers/AgentDraftContext';
import TestPanel from '../TestPanel';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AgentDraftProvider>{children}</AgentDraftProvider>;
}

describe('TestPanel', () => {
  it('renders the "Testar" tab as active', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_testar_rascunho')).toBeInTheDocument();
  });

  it('renders the "Construir" tab with the Fase 3 badge', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_construir_agente')).toBeInTheDocument();
    expect(screen.getByText('com_ui_ux_fase3_badge')).toBeInTheDocument();
  });

  it('renders the ephemeral draft badge', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_rascunho_efemero')).toBeInTheDocument();
  });

  it('renders the PreviewChatView stub', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByTestId('preview-chat')).toBeInTheDocument();
  });
});
