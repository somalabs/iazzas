import { memo } from 'react';
import type { ReactNode } from 'react';
import { OpenSidebar } from '~/components/Chat/Menus';
import { cn } from '~/utils';

export const SCREEN_HEADER_HEIGHT = 52;

type ScreenHeaderProps = {
  /** Left-aligned content — scrolls horizontally on overflow, aligned to the sidebar. */
  children?: ReactNode;
  /** Right-aligned controls (the "second menu"). Pinned, never scrolls. Omit where it has no purpose. */
  right?: ReactNode;
  className?: string;
};

/**
 * Shared top bar across every primary surface (chat, studio, automações).
 *
 * Sits absolutely over the content so the surface reads through its translucent,
 * backdrop-blurred background, and aligns to the left of the sidebar. Surfaces
 * that adopt it must offset their content by {@link SCREEN_HEADER_HEIGHT}.
 */
function ScreenHeader({ children, right, className }: ScreenHeaderProps) {
  return (
    <div
      className={cn(
        'bg-surface-primary/90 absolute top-0 z-10 flex h-[52px] w-full items-center justify-between gap-2 border-b border-border-light p-2 font-semibold text-text-primary backdrop-blur-sm',
        className,
      )}
    >
      <div className="hide-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        <div className="mx-1 flex items-center gap-2">
          <OpenSidebar className="md:hidden" />
          {children}
        </div>
      </div>
      {right && <div className="flex flex-shrink-0 items-center gap-2 pr-1">{right}</div>}
    </div>
  );
}

const MemoizedScreenHeader = memo(ScreenHeader);
MemoizedScreenHeader.displayName = 'ScreenHeader';

export default MemoizedScreenHeader;
