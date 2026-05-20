import { useState } from 'react';
import { useLocalize } from '~/hooks';
import { useAgentDraftContext } from '~/Providers';
import PreviewChatView from './PreviewChatView';

export default function TestPanel() {
  const localize = useLocalize();
  const { draftParams } = useAgentDraftContext();
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col border-l border-border-medium">
      {/* Tab bar */}
      <div className="flex border-b border-border-medium px-1">
        <div className="border-b-2 border-green-500 px-3 py-2 text-sm font-semibold text-green-600">
          {localize('com_ui_ux_testar_rascunho')}
        </div>
        <div
          className="flex cursor-not-allowed items-center gap-1 px-3 py-2 text-sm text-text-tertiary opacity-50"
          aria-disabled="true"
        >
          {localize('com_ui_ux_construir_agente')}
          <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-secondary">
            {localize('com_ui_ux_fase3_badge')}
          </span>
        </div>
      </div>
      {/* Ephemeral badge */}
      <div className="flex justify-center py-1.5">
        <span className="rounded-full border border-yellow-400 bg-yellow-50 px-3 py-0.5 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          {localize('com_ui_ux_rascunho_efemero')}
        </span>
      </div>
      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <PreviewChatView
          conversationId={conversationId}
          draftParams={draftParams}
          onConversationCreated={setConversationId}
        />
      </div>
    </div>
  );
}
