import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudioProvider } from '../context';
import ImageCount from '../controls/ImageCount';
import ResolutionSelector from '../controls/Resolution';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <StudioProvider>{children}</StudioProvider>;
}

describe('ImageCount', () => {
  it('renders all four options', () => {
    render(<Wrapper><ImageCount /></Wrapper>);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('marks 1 as selected by default', () => {
    render(<Wrapper><ImageCount /></Wrapper>);
    expect(screen.getByText('1').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('2').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates selection on click', () => {
    render(<Wrapper><ImageCount /></Wrapper>);
    fireEvent.click(screen.getByText('4'));
    expect(screen.getByText('4').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows cost warning when 8 is selected', () => {
    render(<Wrapper><ImageCount /></Wrapper>);
    fireEvent.click(screen.getByText('8'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('com_studio_cost_warning')).toBeInTheDocument();
  });

  it('does not show cost warning for 4 or fewer', () => {
    render(<Wrapper><ImageCount /></Wrapper>);
    fireEvent.click(screen.getByText('4'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ResolutionSelector', () => {
  it('renders all resolution options', () => {
    render(<Wrapper><ResolutionSelector /></Wrapper>);
    expect(screen.getByText('1K')).toBeInTheDocument();
    expect(screen.getByText('2K')).toBeInTheDocument();
    expect(screen.getByText('4K')).toBeInTheDocument();
  });

  it('marks 1K as selected by default', () => {
    render(<Wrapper><ResolutionSelector /></Wrapper>);
    expect(screen.getByText('1K').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('4K').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates selection on click', () => {
    render(<Wrapper><ResolutionSelector /></Wrapper>);
    fireEvent.click(screen.getByText('2K'));
    expect(screen.getByText('2K').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
