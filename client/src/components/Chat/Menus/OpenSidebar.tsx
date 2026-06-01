import { startTransition } from 'react';
import { useSetRecoilState } from 'recoil';
import { PanelLeft } from 'lucide-react';
import { TooltipAnchor } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

export const CLOSE_SIDEBAR_ID = 'close-sidebar-button';
export const OPEN_SIDEBAR_ID = 'open-sidebar-button';

export default function OpenSidebar({ className }: { className?: string }) {
  const localize = useLocalize();
  const setSidebarExpanded = useSetRecoilState(store.sidebarExpanded);

  const handleClick = () => {
    startTransition(() => {
      setSidebarExpanded(true);
    });
    setTimeout(() => {
      document.getElementById(CLOSE_SIDEBAR_ID)?.focus();
    }, 250);
  };

  return (
    <TooltipAnchor
      description={localize('com_nav_open_sidebar')}
      render={
        <button
          type="button"
          id={OPEN_SIDEBAR_ID}
          data-testid="open-sidebar-button"
          aria-label={localize('com_nav_open_sidebar')}
          aria-expanded={false}
          aria-controls="chat-history-nav"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary',
            className,
          )}
          onClick={handleClick}
        >
          <PanelLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      }
    />
  );
}
