import { useState } from 'react';
import { useLocalize } from '~/hooks';
import AtelierDrawer from '~/components/ui/AtelierDrawer';
import AtelierTrigger from '~/components/ui/AtelierTrigger';
import { useStudio } from './context';
import Creations from './creations/Creations';
import Workspace from './workspace/Workspace';
import ImageDetail from './detail/ImageDetail';

export default function StudioView() {
  const localize = useLocalize();
  const { mode } = useStudio();
  const [atelierOpen, setAtelierOpen] = useState(false);

  const isDetail = mode === 'detail' || mode === 'editing';

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-primary">
      {/* Stage — full-bleed workspace / image detail */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex h-10 flex-shrink-0 items-center gap-2 border-b border-border-medium px-3">
          <h1 className="text-sm font-semibold text-text-primary">
            {localize('com_studio_title')}
          </h1>
          <AtelierTrigger
            open={atelierOpen}
            onToggle={() => setAtelierOpen((prev) => !prev)}
            className="ml-auto"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{isDetail ? <ImageDetail /> : <Workspace />}</div>
      </div>

      {/* Atelier — creations browser */}
      <AtelierDrawer
        open={atelierOpen}
        title={localize('com_ui_atelier')}
        onClose={() => setAtelierOpen(false)}
        bodyClassName="p-0"
      >
        <Creations />
      </AtelierDrawer>
    </div>
  );
}
