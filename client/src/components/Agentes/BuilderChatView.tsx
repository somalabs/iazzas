import { useState, useEffect, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useForm } from 'react-hook-form';
import { Constants, buildTree } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { ChatFormValues } from '~/common';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';
import { ChatContext, AddedChatContext, ChatFormProvider, useFileMapContext } from '~/Providers';
import useChatHelpers from '~/hooks/Chat/useChatHelpers';
import useAddedResponse from '~/hooks/Chat/useAddedResponse';
import useAdaptiveSSE from '~/hooks/SSE/useAdaptiveSSE';
import { useBuilderToolInterceptor } from '~/hooks/Agentes/useBuilderToolInterceptor';
import { useGetMessagesByConvoId } from '~/data-provider';
import { useAgentDraftContext } from '~/Providers/AgentDraftContext';
import MessagesView from '~/components/Chat/Messages/MessagesView';
import ChatForm from '~/components/Chat/Input/ChatForm';
import store from '~/store';

const BUILDER_CHAT_INDEX = 3;

interface BuilderChatViewProps {
  conversationId: string | null;
  draftParams: AgentDraftParams;
  onConversationCreated: (id: string) => void;
}

export default function BuilderChatView({
  conversationId,
  draftParams,
  onConversationCreated,
}: BuilderChatViewProps) {
  const [activeConvoId, setActiveConvoId] = useState(conversationId ?? Constants.NEW_CONVO);

  const methods = useForm<ChatFormValues>({ defaultValues: { text: '' } });
  const fileMap = useFileMapContext();
  const { setDraftParams, setFormValue } = useAgentDraftContext();

  const rootSubmission = useRecoilValue(store.submissionByIndex(BUILDER_CHAT_INDEX));

  const chatHelpers = useChatHelpers(BUILDER_CHAT_INDEX, activeConvoId);
  const addedChatHelpers = useAddedResponse();

  const { setConversation } = chatHelpers;

  useEffect(() => {
    setConversation((prev) => {
      const base = prev ?? null;
      return {
        ...base,
        conversationId: base?.conversationId ?? activeConvoId,
        title: base?.title ?? '',
        createdAt: base?.createdAt ?? '',
        updatedAt: base?.updatedAt ?? '',
        endpoint: base?.endpoint ?? null,
        agent_id: Constants.CONSTRUTOR_AGENT_ID,
        promptPrefix: `[Rascunho atual]:\n${JSON.stringify(draftParams)}`,
      } as Parameters<typeof setConversation>[0] extends (c: infer C) => unknown ? C : never;
    });
  }, [activeConvoId, draftParams, setConversation]);

  const recoilConvoId = chatHelpers.conversation?.conversationId;
  useEffect(() => {
    if (recoilConvoId && recoilConvoId !== Constants.NEW_CONVO && recoilConvoId !== activeConvoId) {
      setActiveConvoId(recoilConvoId);
      onConversationCreated(recoilConvoId);
    }
  }, [recoilConvoId, activeConvoId, onConversationCreated]);

  useAdaptiveSSE(rootSubmission, chatHelpers, false, BUILDER_CHAT_INDEX);

  const { data: messagesTree = null } = useGetMessagesByConvoId(activeConvoId, {
    select: useCallback(
      (data: TMessage[]) => {
        const tree = buildTree({ messages: data, fileMap });
        return tree?.length === 0 ? null : (tree ?? null);
      },
      [fileMap],
    ),
    enabled: !!fileMap && activeConvoId !== Constants.NEW_CONVO,
  });

  const messages = chatHelpers.getMessages() ?? [];
  useBuilderToolInterceptor(messages, setDraftParams, setFormValue);

  return (
    <ChatFormProvider {...methods}>
      <ChatContext.Provider value={chatHelpers}>
        <AddedChatContext.Provider value={addedChatHelpers}>
          <div className="flex h-full flex-col">
            <div className="relative flex-1 overflow-hidden overflow-y-auto">
              {messagesTree != null ? (
                <MessagesView messagesTree={messagesTree} />
              ) : (
                <div className="flex h-full items-center justify-center" />
              )}
            </div>
            <ChatForm index={BUILDER_CHAT_INDEX} />
          </div>
        </AddedChatContext.Provider>
      </ChatContext.Provider>
    </ChatFormProvider>
  );
}
