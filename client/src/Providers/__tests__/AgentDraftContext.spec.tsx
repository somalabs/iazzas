import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { AgentDraftProvider, useAgentDraftContext } from '../AgentDraftContext';
import type { AgentDraftParams } from '../AgentDraftContext';

const blank: AgentDraftParams = {
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

function Consumer() {
  const { draftParams, setDraftParams } = useAgentDraftContext();
  return (
    <div>
      <span data-testid="model">{draftParams.model}</span>
      <span data-testid="web">{String(draftParams.webSearch)}</span>
      <button
        onClick={() => setDraftParams({ ...blank, model: 'gpt-4o', webSearch: true })}
      >
        update
      </button>
    </div>
  );
}

describe('AgentDraftContext', () => {
  it('provides default empty draft params', () => {
    render(
      <AgentDraftProvider>
        <Consumer />
      </AgentDraftProvider>,
    );
    expect(screen.getByTestId('model').textContent).toBe('');
    expect(screen.getByTestId('web').textContent).toBe('false');
  });

  it('updates when setDraftParams is called', () => {
    render(
      <AgentDraftProvider>
        <Consumer />
      </AgentDraftProvider>,
    );
    act(() => {
      screen.getByRole('button', { name: 'update' }).click();
    });
    expect(screen.getByTestId('model').textContent).toBe('gpt-4o');
    expect(screen.getByTestId('web').textContent).toBe('true');
  });

  it('throws when used outside AgentDraftProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      'useAgentDraftContext must be used within AgentDraftProvider',
    );
    spy.mockRestore();
  });
});
