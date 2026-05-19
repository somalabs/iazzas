import React from 'react';
import { render, fireEvent } from '@testing-library/react';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

import DragHandle from '../DragHandle';


describe('DragHandle', () => {
  it('calls onDrag with clientX after mousedown then mousemove', () => {
    const onDrag = jest.fn();
    render(<DragHandle onDrag={onDrag} />);
    const handle = document.querySelector('[role="separator"]')!;

    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(document, { clientX: 400 });

    expect(onDrag).toHaveBeenCalledWith(400);
    expect(onDrag).toHaveBeenCalledTimes(1);
  });

  it('does not call onDrag on mousemove without prior mousedown', () => {
    const onDrag = jest.fn();
    render(<DragHandle onDrag={onDrag} />);

    fireEvent.mouseMove(document, { clientX: 400 });

    expect(onDrag).not.toHaveBeenCalled();
  });

  it('stops calling onDrag after mouseup', () => {
    const onDrag = jest.fn();
    render(<DragHandle onDrag={onDrag} />);
    const handle = document.querySelector('[role="separator"]')!;

    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(document, { clientX: 300 });
    fireEvent.mouseUp(document);
    fireEvent.mouseMove(document, { clientX: 500 });

    expect(onDrag).toHaveBeenCalledTimes(1);
    expect(onDrag).toHaveBeenCalledWith(300);
  });
});
