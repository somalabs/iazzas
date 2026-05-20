import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('../PreviewChatView', () => ({
  __esModule: true,
  default: () => <div data-testid="preview-chat" />,
}));

jest.mock('../BuilderChatView', () => ({
  __esModule: true,
  default: () => <div data-testid="builder-chat" />,
}));

import { AgentDraftProvider } from '~/Providers/AgentDraftContext';
import TestPanel from '../TestPanel';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AgentDraftProvider>{children}</AgentDraftProvider>;
}

describe('TestPanel', () => {
  it('renders the "Testar" tab as active by default', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_testar_rascunho')).toBeInTheDocument();
  });

  it('renders the "Construir" tab as clickable (no disabled, no badge)', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    const construirTab = screen.getByText('com_ui_ux_construir_agente');
    expect(construirTab).toBeInTheDocument();
    expect(screen.queryByText('com_ui_ux_fase3_badge')).not.toBeInTheDocument();
  });

  it('shows PreviewChatView when "Testar" is active', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByTestId('preview-chat')).toBeInTheDocument();
    expect(screen.queryByTestId('builder-chat')).not.toBeInTheDocument();
  });

  it('switches to BuilderChatView when "Construir" tab is clicked', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('com_ui_ux_construir_agente'));
    expect(screen.getByTestId('builder-chat')).toBeInTheDocument();
    expect(screen.queryByTestId('preview-chat')).not.toBeInTheDocument();
  });

  it('shows ephemeral badge only on Testar tab', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_rascunho_efemero')).toBeInTheDocument();

    fireEvent.click(screen.getByText('com_ui_ux_construir_agente'));
    expect(screen.queryByText('com_ui_ux_rascunho_efemero')).not.toBeInTheDocument();
  });
});
