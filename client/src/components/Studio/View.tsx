import { useState } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import AtelierDrawer from '~/components/ui/AtelierDrawer';
import AtelierTrigger from '~/components/ui/AtelierTrigger';
import ScreenHeader from '~/components/ui/ScreenHeader';
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
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <ScreenHeader
          right={
            <AtelierTrigger open={atelierOpen} onToggle={() => setAtelierOpen((prev) => !prev)} />
          }
        >
          <h1 className="pl-2 text-sm font-semibold text-text-primary">
            {localize('com_studio_title')}
          </h1>
        </ScreenHeader>

        {/* Content — workspace reads through the bar; the media viewer sits below it */}
        <div className={cn('flex-1 overflow-hidden', isDetail && 'pt-[52px]')}>
          {isDetail ? <ImageDetail /> : <Workspace />}
        </div>
      </div>

      {/* Atelier — creations browser */}
      <AtelierDrawer
        open={atelierOpen}
        title={localize('com_ui_atelier')}
        hideTitle
        headerClassName="h-[52px] px-4"
        onClose={() => setAtelierOpen(false)}
        bodyClassName="p-0"
      >
        <Creations />
      </AtelierDrawer>
    </div>
  );
}
