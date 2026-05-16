import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudioProvider, useStudioContext } from '../context';

function Inspector() {
  const ctx = useStudioContext();
  return (
    <div>
      <span data-testid="mode">{ctx.mode}</span>
      <span data-testid="prompt">{ctx.prompt}</span>
      <span data-testid="refs">{ctx.references.length}</span>
      <span data-testid="count">{ctx.imageCount}</span>
      <span data-testid="ratio">{ctx.aspectRatio}</span>
      <span data-testid="res">{ctx.resolution}</span>
      <button onClick={() => ctx.setMode('advanced')} data-testid="set-advanced">adv</button>
      <button onClick={() => ctx.setPrompt('hello')} data-testid="set-prompt">prompt</button>
      <button
        onClick={() => ctx.addReference({ id: 'r1', slot: '@img1', type: 'free', url: '', name: '@img1' })}
        data-testid="add-ref"
      >add</button>
      <button onClick={() => ctx.removeReference('r1')} data-testid="rm-ref">rm</button>
    </div>
  );
}

function Wrapper() {
  return <StudioProvider><Inspector /></StudioProvider>;
}

describe('StudioContext', () => {
  it('provides default values', () => {
    render(<Wrapper />);
    expect(screen.getByTestId('mode').textContent).toBe('guided');
    expect(screen.getByTestId('prompt').textContent).toBe('');
    expect(screen.getByTestId('refs').textContent).toBe('0');
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('ratio').textContent).toBe('1:1');
    expect(screen.getByTestId('res').textContent).toBe('1K');
  });

  it('updates mode', () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId('set-advanced'));
    expect(screen.getByTestId('mode').textContent).toBe('advanced');
  });

  it('updates prompt', () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId('set-prompt'));
    expect(screen.getByTestId('prompt').textContent).toBe('hello');
  });

  it('adds and removes references', () => {
    render(<Wrapper />);
    fireEvent.click(screen.getByTestId('add-ref'));
    expect(screen.getByTestId('refs').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('rm-ref'));
    expect(screen.getByTestId('refs').textContent).toBe('0');
  });

  it('enforces 8-reference limit', () => {
    function SpamAdder() {
      const ctx = useStudioContext();
      return (
        <div>
          <span data-testid="count">{ctx.references.length}</span>
          <button
            data-testid="add"
            onClick={() =>
              ctx.addReference({ id: `r${ctx.references.length}`, slot: `@img${ctx.references.length + 1}`, type: 'free', url: '', name: '' })
            }
          >+</button>
        </div>
      );
    }
    render(<StudioProvider><SpamAdder /></StudioProvider>);
    for (let i = 0; i < 12; i++) {
      fireEvent.click(screen.getByTestId('add'));
    }
    expect(parseInt(screen.getByTestId('count').textContent ?? '0', 10)).toBe(8);
  });
});
