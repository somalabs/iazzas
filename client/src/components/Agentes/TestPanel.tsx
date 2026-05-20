import { useState } from 'react';
import { useLocalize } from '~/hooks';
import { useAgentDraftContext } from '~/Providers';
import PreviewChatView from './PreviewChatView';
import BuilderChatView from './BuilderChatView';

type ActiveTab = 'testar' | 'construir';

export default function TestPanel() {
  const localize = useLocalize();
  const { draftParams } = useAgentDraftContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('testar');
  const [previewConvoId, setPreviewConvoId] = useState<string | null>(null);
  const [builderConvoId, setBuilderConvoId] = useState<string | null>(null);

  const tabBase = 'cursor-pointer px-3 py-2 text-sm transition-colors';
  const activeStyle = 'border-b-2 border-green-500 font-semibold text-green-600';
  const inactiveStyle = 'text-text-secondary hover:text-text-primary';

  return (
    <div className="flex h-full flex-col border-l border-border-medium">
      {/* Tab bar */}
      <div className="flex border-b border-border-medium px-1">
        <button
          type="button"
          className={`${tabBase} ${activeTab === 'testar' ? activeStyle : inactiveStyle}`}
          onClick={() => setActiveTab('testar')}
        >
          {localize('com_ui_ux_testar_rascunho')}
        </button>
        <button
          type="button"
          className={`${tabBase} ${activeTab === 'construir' ? activeStyle : inactiveStyle}`}
          onClick={() => setActiveTab('construir')}
        >
          {localize('com_ui_ux_construir_agente')}
        </button>
      </div>

      {/* Ephemeral badge — only for Testar tab */}
      {activeTab === 'testar' && (
        <div className="flex justify-center py-1.5">
          <span className="rounded-full border border-yellow-400 bg-yellow-50 px-3 py-0.5 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
            {localize('com_ui_ux_rascunho_efemero')}
          </span>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'testar' && (
          <PreviewChatView
            conversationId={previewConvoId}
            draftParams={draftParams}
            onConversationCreated={setPreviewConvoId}
          />
        )}
        {activeTab === 'construir' && (
          <BuilderChatView
            conversationId={builderConvoId}
            draftParams={draftParams}
            onConversationCreated={setBuilderConvoId}
          />
        )}
      </div>
    </div>
  );
}
