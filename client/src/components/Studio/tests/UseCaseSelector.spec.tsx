import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudioProvider } from '../context';
import UseCaseSelector from '../usecase/Selector';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

function Wrapper() {
  return <StudioProvider><UseCaseSelector /></StudioProvider>;
}

describe('UseCaseSelector', () => {
  it('renders all 5 use cases in guided mode', () => {
    render(<Wrapper />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Lookbook')).toBeInTheDocument();
    expect(screen.getByText('Editorial')).toBeInTheDocument();
    expect(screen.getByText('E-commerce')).toBeInTheDocument();
    expect(screen.getByText('Concept')).toBeInTheDocument();
  });

  it('starts in guided mode', () => {
    render(<Wrapper />);
    const guidedBtn = screen.getByText('com_studio_guided_mode');
    expect(guidedBtn.closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to advanced mode', () => {
    render(<Wrapper />);
    const advBtn = screen.getByText('com_studio_advanced_mode');
    fireEvent.click(advBtn);
    expect(advBtn.closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Product')).not.toBeInTheDocument();
  });

  it('selects a use case on click', () => {
    render(<Wrapper />);
    const productBtn = screen.getByText('Product').closest('button')!;
    fireEvent.click(productBtn);
    expect(productBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('deselects a use case on second click', () => {
    render(<Wrapper />);
    const productBtn = screen.getByText('Product').closest('button')!;
    fireEvent.click(productBtn);
    fireEvent.click(productBtn);
    expect(productBtn).toHaveAttribute('aria-checked', 'false');
  });
});
