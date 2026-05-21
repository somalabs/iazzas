import { useCallback, useEffect, memo, startTransition } from 'react';
import { useRecoilState } from 'recoil';
import { useMediaQuery } from '@librechat/client';
import useUnifiedSidebarLinks from '~/hooks/Nav/useUnifiedSidebarLinks';
import { useLocalize } from '~/hooks';
import ExpandedPanel from './ExpandedPanel';
import Sidebar from './Sidebar';
import { cn } from '~/utils';
import store from '~/store';

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = 256;
const TRANSITION_MS = 200;
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

function UnifiedSidebar() {
  const localize = useLocalize();
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const [expanded, setExpanded] = useRecoilState(store.sidebarExpanded);

  const links = useUnifiedSidebarLinks();

  const handleToggle = useCallback(() => {
    startTransition(() => {
      setExpanded((prev) => !prev);
    });
  }, [setExpanded]);

  const handleClose = useCallback(() => {
    startTransition(() => {
      setExpanded(false);
    });
  }, [setExpanded]);

  useEffect(() => {
    if (!isSmallScreen || !expanded) {
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isSmallScreen, expanded, handleClose]);

  if (isSmallScreen) {
    return (
      <>
        <div
          className={cn(
            'fixed left-0 top-0 z-[110] flex h-full bg-surface-primary-alt',
            expanded ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{
            width: 'min(85vw, 320px)',
            transition: `transform ${TRANSITION_MS}ms ${EASING}`,
          }}
          {...{ inert: !expanded ? '' : undefined }}
        >
          <ExpandedPanel links={links} expanded onToggle={handleClose} />
        </div>
        <div
          className={cn(
            'fixed inset-0 z-[109] bg-black/50',
            expanded ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
          style={{ transition: `opacity ${TRANSITION_MS}ms ${EASING}` }}
          role="presentation"
        >
          <button
            className="h-full w-full"
            onClick={handleClose}
            aria-label={localize('com_nav_close_sidebar')}
            tabIndex={expanded ? 0 : -1}
          />
        </div>
      </>
    );
  }

  return (
    <aside
      className="relative flex h-full flex-shrink-0 overflow-hidden"
      style={{
        width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        transition: `width ${TRANSITION_MS}ms ${EASING}`,
      }}
      aria-label={localize('com_nav_control_panel')}
    >
      <Sidebar links={links} expanded={expanded} onToggle={handleToggle} />
    </aside>
  );
}

export default memo(UnifiedSidebar);
