import { render, screen } from '@testing-library/react';
import { AgentAvatarRender } from '../Images';

describe('AgentAvatarRender', () => {
  it('renders an <img> when given a url', () => {
    render(<AgentAvatarRender url="https://example.com/a.png" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders the emoji on a colored background when given an icon', () => {
    render(<AgentAvatarRender icon="✨" iconColor="#274566" />);
    expect(screen.getByText('✨')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
