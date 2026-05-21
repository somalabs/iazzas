/* eslint-disable i18next/no-literal-string */
import { render, screen, fireEvent } from '@testing-library/react';
import AdvancedSection from '../AdvancedSection';

describe('AdvancedSection', () => {
  it('esconde os filhos até o toggle ser clicado', () => {
    render(
      <AdvancedSection label="Ajustes avançados">
        <p>conteudo tecnico</p>
      </AdvancedSection>,
    );
    const toggle = screen.getByRole('button', { name: /Ajustes avançados/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('conteudo tecnico')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('conteudo tecnico')).toBeInTheDocument();
  });
});
