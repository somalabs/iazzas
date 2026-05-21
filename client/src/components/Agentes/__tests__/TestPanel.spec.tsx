import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

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
  it('renders the ephemeral badge', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByText('com_ui_ux_rascunho_efemero')).toBeInTheDocument();
  });

  it('renders PreviewChatView', () => {
    render(<TestPanel />, { wrapper: Wrapper });
    expect(screen.getByTestId('preview-chat')).toBeInTheDocument();
  });
});
