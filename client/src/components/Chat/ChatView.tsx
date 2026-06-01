import { memo, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useAtom } from 'jotai';
import { useForm } from 'react-hook-form';
import { Spinner, useMediaQuery } from '@librechat/client';
import { useParams } from 'react-router-dom';
import { Constants, buildTree } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { ChatFormValues } from '~/common';
import { ChatContext, AddedChatContext, ChatFormProvider, useFileMapContext } from '~/Providers';
import { useAddedResponse, useResumeOnLoad, useAdaptiveSSE, useChatHelpers, useLocalize } from '~/hooks';
import ConversationStarters from './Input/ConversationStarters';
import StarterChips from './Input/StarterChips';
import RecentWork from './RecentWork';
import BrandDuotone from '~/components/ui/BrandDuotone';
import { useGetMessagesByConvoId } from '~/data-provider';
import ConversationsSection from '~/components/UnifiedSidebar/ConversationsSection';
import AtelierDrawer from '~/components/ui/AtelierDrawer';
import MessagesView from './Messages/MessagesView';
import { atelierChatOpenAtom } from '~/store/atelier';
import Presentation from './Presentation';
import ChatForm from './Input/ChatForm';
import Landing from './Landing';
import Header from './Header';
import Footer from './Footer';
import { cn } from '~/utils';
import store from '~/store';

function LoadingSpinner() {
  return (
    <div className="relative flex-1 overflow-hidden overflow-y-auto">
      <div className="relative flex h-full items-center justify-center">
        <Spinner className="text-text-primary" />
      </div>
    </div>
  );
}

function ChatView({ index = 0 }: { index?: number }) {
  const localize = useLocalize();
  const { conversationId } = useParams();
  const rootSubmission = useRecoilValue(store.submissionByIndex(index));
  const centerFormOnLanding = useRecoilValue(store.centerFormOnLanding);
  const [atelierOpen, setAtelierOpen] = useAtom(atelierChatOpenAtom);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const methods = useForm<ChatFormValues>({
    defaultValues: { text: '' },
  });

  const fileMap = useFileMapContext();

  const { data: messagesTree = null, isLoading } = useGetMessagesByConvoId(conversationId ?? '', {
    select: useCallback(
      (data: TMessage[]) => {
        const dataTree = buildTree({ messages: data, fileMap });
        return dataTree?.length === 0 ? null : (dataTree ?? null);
      },
      [fileMap],
    ),
    enabled: !!fileMap,
  });

  const chatHelpers = useChatHelpers(index, conversationId);
  const addedChatHelpers = useAddedResponse();

  useAdaptiveSSE(rootSubmission, chatHelpers, false, index);

  // Auto-resume if navigating back to conversation with active job
  // Wait for messages to load before resuming to avoid race condition
  useResumeOnLoad(conversationId, chatHelpers.getMessages, index, !isLoading);

  let content: JSX.Element | null | undefined;
  const isLandingPage =
    (!messagesTree || messagesTree.length === 0) &&
    (conversationId === Constants.NEW_CONVO || !conversationId);
  const isNavigating = (!messagesTree || messagesTree.length === 0) && conversationId != null;

  if (isLoading && conversationId !== Constants.NEW_CONVO) {
    content = <LoadingSpinner />;
  } else if ((isLoading || isNavigating) && !isLandingPage) {
    content = <LoadingSpinner />;
  } else if (!isLandingPage) {
    content = <MessagesView messagesTree={messagesTree} />;
  } else {
    content = <Landing centerFormOnLanding={centerFormOnLanding} />;
  }

  return (
    <ChatFormProvider {...methods}>
      <ChatContext.Provider value={chatHelpers}>
        <AddedChatContext.Provider value={addedChatHelpers}>
          <Presentation>
            <div className="flex h-full w-full overflow-hidden">
              <div className="relative flex h-full w-full min-w-0 flex-col">
                <Header />
              <>
                <div
                  className={cn(
                    'flex flex-col',
                    isLandingPage
                      ? 'relative isolate flex-1 items-center justify-end sm:justify-center'
                      : 'h-full overflow-y-auto',
                  )}
                >
                  {isLandingPage && (
                    <BrandDuotone
                      src="/assets/brand/azzas-campaign-1.jpg"
                      anchor="bottom"
                      imageOpacity={0.08}
                      className="-z-10"
                    />
                  )}
                  {content}
                  <div
                    className={cn(
                      'w-full',
                      isLandingPage && 'max-w-[760px] transition-all duration-200',
                    )}
                  >
                    <ChatForm index={index} />
                    {isLandingPage && <StarterChips />}
                    {isLandingPage ? <ConversationStarters /> : <Footer />}
                    {isLandingPage && <RecentWork />}
                  </div>
                </div>
                {isLandingPage && <Footer />}
              </>
              </div>
              <AtelierDrawer
                open={atelierOpen}
                title={localize('com_ui_atelier')}
                onClose={() => setAtelierOpen(false)}
                overlay={isSmallScreen}
                bodyClassName="p-0"
              >
                <ConversationsSection />
              </AtelierDrawer>
            </div>
          </Presentation>
        </AddedChatContext.Provider>
      </ChatContext.Provider>
    </ChatFormProvider>
  );
}

export default memo(ChatView);
