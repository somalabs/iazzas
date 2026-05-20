import { useState } from 'react';
import { useLocalize } from '~/hooks';
import { useAgentDraftContext } from '~/Providers';
import PreviewChatView from './PreviewChatView';

export default function TestPanel() {
  const localize = useLocalize();
  const { draftParams } = useAgentDraftContext();
  const [previewConvoId, setPreviewConvoId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col border-l border-border-medium">
      {/* Ephemeral badge */}
      <div className="flex justify-center py-1.5">
        <span className="rounded-full border border-yellow-400 bg-yellow-50 px-3 py-0.5 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          {localize('com_ui_ux_rascunho_efemero')}
        </span>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <PreviewChatView
          conversationId={previewConvoId}
          draftParams={draftParams}
          onConversationCreated={setPreviewConvoId}
        />
      </div>
    </div>
  );
}
