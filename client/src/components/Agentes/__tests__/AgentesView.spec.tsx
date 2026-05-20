import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));
jest.mock('~/hooks/Agents', () => ({
  useAgentsAccessRedirect: () => true,
}));
jest.mock('~/components/SidePanel/Agents/AgentPanelSwitch', () => ({
  __esModule: true,
  default: () => <div data-testid="agent-panel-switch" />,
}));
jest.mock('../TestPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="test-panel" />,
}));
jest.mock('../AgentesLayout', () => ({
  __esModule: true,
  default: ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
    <div>
      <div data-testid="left">{left}</div>
      <div data-testid="right">{right}</div>
    </div>
  ),
}));
jest.mock('~/Providers', () => ({
  AgentDraftProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AgentesView from '../AgentesView';

describe('AgentesView', () => {
  it('renders AgentPanelSwitch on the left and TestPanel on the right', () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <AgentesView />
      </MemoryRouter>,
    );
    expect(getByTestId('agent-panel-switch')).toBeInTheDocument();
    expect(getByTestId('test-panel')).toBeInTheDocument();
  });
});
