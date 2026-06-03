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
            'sidebar-drawer-anim fixed left-0 top-0 z-[110] flex h-full bg-surface-primary-alt',
            expanded ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{ width: 'min(85vw, 320px)' }}
          {...{ inert: !expanded ? '' : undefined }}
        >
          <ExpandedPanel links={links} expanded onToggle={handleClose} />
        </div>
        <div
          className={cn(
            'sidebar-overlay-anim fixed inset-0 z-[109] bg-black/50',
            expanded ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
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
      className="sidebar-collapse-anim relative flex h-full flex-shrink-0 overflow-hidden"
      style={{
        width: EXPANDED_WIDTH,
        maxWidth: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
      }}
      aria-label={localize('com_nav_control_panel')}
    >
      <Sidebar links={links} expanded={expanded} onToggle={handleToggle} />
    </aside>
  );
}

export default memo(UnifiedSidebar);
