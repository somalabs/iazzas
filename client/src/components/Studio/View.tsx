import { useCallback, useRef, useState } from 'react';
import { useMediaQuery } from '@librechat/client';
import { PanelLeftOpen } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudio } from './context';
import Creations from './creations/Creations';
import Workspace from './workspace/Workspace';
import ImageDetail from './detail/ImageDetail';

const PANEL_WIDTH = 340;

export default function StudioView() {
  const localize = useLocalize();
  const { mode } = useStudio();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [panelOpen, setPanelOpen] = useState(!isMobile);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev);
  }, []);

  const isDetail = mode === 'detail' || mode === 'editing';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-primary">
      {/* Overlay for mobile */}
      {isMobile && panelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={togglePanel}
          role="button"
          tabIndex={0}
          aria-label={localize('com_studio_close_sidebar')}
        />
      )}

      {/* Creations panel */}
      <div
        id="studio-panel"
        className={cn(
          'flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
          isMobile
            ? cn(
                'fixed left-0 top-0 z-50 h-full',
                panelOpen ? 'translate-x-0' : '-translate-x-full',
              )
            : panelOpen
              ? 'w-[340px]'
              : 'w-0',
        )}
        style={isMobile ? { width: PANEL_WIDTH } : undefined}
        aria-label={localize('com_studio_creations')}
      >
        <div className="h-full w-[340px]">
          <Creations />
        </div>
      </div>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex h-10 flex-shrink-0 items-center gap-2 border-b border-border-medium px-3">
          <button
            ref={openBtnRef}
            type="button"
            onClick={togglePanel}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover"
            aria-label={panelOpen ? localize('com_studio_close_sidebar') : localize('com_studio_open_sidebar')}
            aria-expanded={panelOpen}
            aria-controls="studio-panel"
          >
            <PanelLeftOpen className={cn('h-4 w-4 transition-transform', panelOpen && 'rotate-180')} />
          </button>
          <h1 className="font-editorial text-sm font-semibold text-text-primary">
            {localize('com_studio_title')}
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isDetail ? <ImageDetail /> : <Workspace />}
        </div>
      </div>
    </div>
  );
}
