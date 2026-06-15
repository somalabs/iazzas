import { useEffect, useState } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { useLocalize } from '~/hooks';
import useRecados from './useRecados';

export default function RecadosPopup() {
  const localize = useLocalize();
  const { pendingPopup, markSeen } = useRecados();
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
        <div className="mt-2 break-words text-sm text-text-primary [&_a]:text-blue-700 [&_a]:underline dark:[&_a]:text-blue-400">
          <MarkdownLite content={pendingPopup.message} codeExecution={false} />
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
