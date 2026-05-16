import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudioProvider } from '../context';
import Creations from '../history/Creations';
import type { Creation } from '../types';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('~/data-provider/Studio', () => ({
  useStudioCreationsQuery: jest.fn(),
}));

const { useStudioCreationsQuery } = jest.requireMock('~/data-provider/Studio');

function Wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <StudioProvider>{children}</StudioProvider>
    </QueryClientProvider>
  );
}

const mockCreation: Creation = {
  id: 'c1',
  prompt: 'A beautiful dress',
  model: 'dall-e-3',
  aspectRatio: '1:1',
  resolution: '1K',
  useCase: 'product',
  imageCount: 1,
  urls: [],
  createdAt: new Date().toISOString(),
  favorited: false,
  status: 'done',
  references: [],
};

describe('Creations (F5)', () => {
  it('shows loading spinner while fetching', () => {
    useStudioCreationsQuery.mockReturnValue({ data: undefined, isLoading: true });
    render(<Wrapper><Creations /></Wrapper>);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no creations', () => {
    useStudioCreationsQuery.mockReturnValue({ data: [], isLoading: false });
    render(<Wrapper><Creations /></Wrapper>);
    expect(screen.getByText('com_studio_creations_empty')).toBeInTheDocument();
  });

  it('renders creations when data is returned', () => {
    useStudioCreationsQuery.mockReturnValue({ data: [mockCreation], isLoading: false });
    render(<Wrapper><Creations /></Wrapper>);
    expect(screen.getByText('A beautiful dress')).toBeInTheDocument();
  });

  it('renders the title', () => {
    useStudioCreationsQuery.mockReturnValue({ data: [], isLoading: false });
    render(<Wrapper><Creations /></Wrapper>);
    expect(screen.getByText('com_studio_creations')).toBeInTheDocument();
  });

  it('toggles filter panel on button click', () => {
    useStudioCreationsQuery.mockReturnValue({ data: [], isLoading: false });
    render(<Wrapper><Creations /></Wrapper>);
    const filterBtn = screen.getByLabelText('com_studio_filter');
    fireEvent.click(filterBtn);
    expect(screen.getByText('com_studio_filter', { selector: 'span' })).toBeInTheDocument();
  });

  it('filters by search text', () => {
    useStudioCreationsQuery.mockReturnValue({
      data: [
        mockCreation,
        { ...mockCreation, id: 'c2', prompt: 'A sporty jacket' },
      ],
      isLoading: false,
    });
    render(<Wrapper><Creations /></Wrapper>);
    const search = screen.getByPlaceholderText('com_studio_search_placeholder');
    fireEvent.change(search, { target: { value: 'dress' } });
    expect(screen.getByText('A beautiful dress')).toBeInTheDocument();
    expect(screen.queryByText('A sporty jacket')).not.toBeInTheDocument();
  });

  it('shows no-results message when filters match nothing', () => {
    useStudioCreationsQuery.mockReturnValue({ data: [mockCreation], isLoading: false });
    render(<Wrapper><Creations /></Wrapper>);
    const search = screen.getByPlaceholderText('com_studio_search_placeholder');
    fireEvent.change(search, { target: { value: 'xyznotfound' } });
    expect(screen.getByText('com_studio_no_results')).toBeInTheDocument();
  });
});
