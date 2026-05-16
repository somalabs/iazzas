import { useCallback, useRef, useState } from 'react';
import { Sidebar, useMediaQuery } from '@librechat/client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@librechat/client';
import { ArrowLeft, ImagePlay } from 'lucide-react';
import { useLocalize, useCustomLink } from '~/hooks';
import { useDashboardContext } from '~/Providers';
import { cn } from '~/utils';
import { StudioProvider } from './context';
import Creations from './history/Creations';
import Workspace from './Workspace';

function StudioBreadcrumb({ onPanelToggle, panelVisible }: {
  onPanelToggle: () => void;
  panelVisible: boolean;
}) {
  const localize = useLocalize();
  const { prevLocationPath } = useDashboardContext();
  const location = useLocation();
  const isSmallerScreen = useMediaQuery('(max-width: 768px)');

  const lastConversationId = (() => {
    if (!prevLocationPath || prevLocationPath.includes('/d/')) return 'new';
    const parts = prevLocationPath.split('/');
    return parts[parts.length - 1];
  })();

  const chatLinkHandler = useCustomLink('/c/' + lastConversationId);
  const studioLinkHandler = useCustomLink('/d/studio');

  return (
    <div className="flex h-10 shrink-0 items-center justify-between px-2">
      <Breadcrumb className="text-sm">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/"
              className="flex items-center gap-1 text-text-secondary hover:text-text-primary"
              onClick={chatLinkHandler}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">{localize('com_ui_back_to_chat')}</span>
              <span className="md:hidden">{localize('com_ui_chat')}</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/d/studio"
              className="flex items-center gap-1 text-text-secondary hover:text-text-primary"
              onClick={studioLinkHandler}
            >
              <ImagePlay className="h-4 w-4" aria-hidden="true" />
              {localize('com_studio_title')}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isSmallerScreen && (
        <button
          type="button"
          onClick={onPanelToggle}
          aria-label={panelVisible ? 'Hide history' : 'Show history'}
          aria-expanded={panelVisible}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-medium bg-surface-primary text-text-primary hover:bg-surface-hover"
        >
          <Sidebar className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function StudioView() {
  const isSmallerScreen = useMediaQuery('(max-width: 768px)');
  const [panelVisible, setPanelVisible] = useState(!isSmallerScreen);
  const closePanelRef = useRef<HTMLButtonElement>(null);

  const togglePanel = useCallback(() => {
    setPanelVisible((prev) => !prev);
  }, []);

  return (
    <StudioProvider>
      <div className="flex h-screen w-full flex-col bg-surface-primary p-0 lg:p-2">
        <StudioBreadcrumb onPanelToggle={togglePanel} panelVisible={panelVisible} />

        <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
          {isSmallerScreen && panelVisible && (
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={togglePanel}
              role="button"
              tabIndex={0}
              aria-label="Close history panel"
            />
          )}

          {(!isSmallerScreen || panelVisible) && (
            <aside
              id="studio-history-panel"
              aria-label="Creations history"
              className={cn(
                'transition-transform duration-300 ease-in-out',
                isSmallerScreen
                  ? 'fixed left-0 top-0 z-50 h-full w-[320px] bg-surface-primary shadow-xl'
                  : 'flex w-[320px] shrink-0 flex-col border-r border-border-light',
              )}
            >
              {isSmallerScreen && (
                <button
                  ref={closePanelRef}
                  type="button"
                  onClick={togglePanel}
                  aria-label="Close history panel"
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border-medium bg-surface-primary hover:bg-surface-hover"
                >
                  <span aria-hidden="true" className="text-xs font-medium text-text-secondary">×</span>
                </button>
              )}
              <Creations />
            </aside>
          )}

          <main
            className={cn(
              'scrollbar-gutter-stable min-w-0 flex-1 overflow-y-auto',
            )}
          >
            <Workspace />
          </main>
        </div>
      </div>
    </StudioProvider>
  );
}
