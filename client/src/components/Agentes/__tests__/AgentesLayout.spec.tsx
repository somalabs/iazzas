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
    render(
      <AgentesLayout
        left={<div data-testid="left-slot" />}
        right={<div data-testid="right-slot" />}
      />,
    );
    expect(screen.getByText('com_ui_ux_configurar_tab')).toBeInTheDocument();
    expect(screen.getByText('com_ui_ux_conversar_tab')).toBeInTheDocument();
  });

  it('shows the left panel by default', () => {
    render(
      <AgentesLayout
        left={<div data-testid="left-slot" />}
        right={<div data-testid="right-slot" />}
      />,
    );
    expect(screen.getByTestId('left-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('right-slot')).not.toBeInTheDocument();
  });

  it('switches to the right panel when "Conversar" tab is clicked', () => {
    render(
      <AgentesLayout
        left={<div data-testid="left-slot" />}
        right={<div data-testid="right-slot" />}
      />,
    );
    fireEvent.click(screen.getByText('com_ui_ux_conversar_tab'));
    expect(screen.queryByTestId('left-slot')).not.toBeInTheDocument();
    expect(screen.getByTestId('right-slot')).toBeInTheDocument();
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
    render(
      <AgentesLayout
        left={<div data-testid="left-slot" />}
        right={<div data-testid="right-slot" />}
      />,
    );
    expect(screen.getByTestId('left-slot')).toBeInTheDocument();
    expect(screen.getByTestId('right-slot')).toBeInTheDocument();
  });

  it('renders the DragHandle', () => {
    render(
      <AgentesLayout
        left={<div data-testid="left-slot" />}
        right={<div data-testid="right-slot" />}
      />,
    );
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
  });
});
