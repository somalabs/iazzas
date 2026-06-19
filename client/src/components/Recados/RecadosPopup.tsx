import { useEffect, useState } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import RecadoMarkdown from './RecadoMarkdown';
import { useLocalize } from '~/hooks';
import useRecados from './useRecados';

export default function RecadosPopup() {
  const localize = useLocalize();
  const [visitStart] = useState(() => Date.now());
  const { pendingPopup, markSeen } = useRecados(visitStart);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pendingPopup) {
      setOpen(true);
    }
  }, [pendingPopup]);

  if (!pendingPopup) {
    return null;
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      markSeen(pendingPopup.bannerId);
    }
    setOpen(next);
  };

  return (
    <OGDialog open={open} onOpenChange={handleOpenChange}>
      <OGDialogContent className="max-h-[80vh] w-full max-w-lg overflow-y-auto">
        <OGDialogTitle>{localize('com_recados_title')}</OGDialogTitle>
        <RecadoMarkdown content={pendingPopup.message} className="mt-2" />
      </OGDialogContent>
    </OGDialog>
  );
}
