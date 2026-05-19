import { useEffect, useRef } from 'react';
import { useLocalize } from '~/hooks';

interface DragHandleProps {
  onDrag: (clientX: number) => void;
}

export default function DragHandle({ onDrag }: DragHandleProps) {
  const localize = useLocalize();
  const isDragging = useRef(false);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDragging.current) {
        onDrag(e.clientX);
      }
    }
    function handleMouseUp() {
      isDragging.current = false;
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={localize('com_ui_ux_resize_panels')}
      className="relative flex w-1.5 flex-shrink-0 cursor-col-resize items-center justify-center bg-border-medium transition-colors hover:bg-surface-hover"
      onMouseDown={() => {
        isDragging.current = true;
      }}
    >
      <div className="h-8 w-1 rounded-full bg-border-heavy" aria-hidden="true" />
    </div>
  );
}
