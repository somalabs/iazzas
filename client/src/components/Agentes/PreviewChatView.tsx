import type { AgentDraftParams } from '~/Providers/AgentDraftContext';

interface PreviewChatViewProps {
  conversationId: string | null;
  draftParams: AgentDraftParams;
  onConversationCreated: (id: string) => void;
}

export default function PreviewChatView(_props: PreviewChatViewProps) {
  return <div className="h-full w-full" />;
}
