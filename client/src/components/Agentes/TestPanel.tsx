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
        <span className="rounded-full border border-border-light bg-surface-secondary px-3 py-0.5 text-xs text-text-secondary">
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
