import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

// Mock DragHandle — its own tests cover it; here we just need it to render.
jest.mock('../DragHandle', () => ({
  __esModule: true,
  default: ({ onDrag }: { onDrag: (x: number) => void }) => (
    <div data-testid="drag-handle" onMouseDown={() => onDrag(500)} />
  ),
}));

import AgentesLayout from '../AgentesLayout';

describe('AgentesLayout — mobile (width < 768)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
  });

  it('renders the segmented toggle with both tabs', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    expect(screen.getByText('com_ui_ux_configurar_tab')).toBeInTheDocument();
    expect(screen.getByText('com_ui_ux_conversar_tab')).toBeInTheDocument();
  });

  it('shows the left panel by default', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    expect(screen.getByText('form')).toBeInTheDocument();
    expect(screen.queryByText('chat')).not.toBeInTheDocument();
  });

  it('switches to the right panel when "Conversar" tab is clicked', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    fireEvent.click(screen.getByText('com_ui_ux_conversar_tab'));
    expect(screen.queryByText('form')).not.toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
  });
});

describe('AgentesLayout — desktop (width >= 768)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  it('renders both panels simultaneously', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    expect(screen.getByText('form')).toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
  });

  it('renders the DragHandle', () => {
    render(<AgentesLayout left={<div>form</div>} right={<div>chat</div>} />);
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
  });
});
