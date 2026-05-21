import { useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from 'librechat-data-provider';
import useNewConvo from '~/hooks/useNewConvo';
import { clearMessagesCache } from '~/utils';
import store from '~/store';

export default function useGoToNewChat() {
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const conversation = useRecoilValue(store.conversationByIndex(0));

  return useCallback(() => {
    clearMessagesCache(queryClient, conversation?.conversationId);
    queryClient.invalidateQueries([QueryKeys.messages]);
    newConversation();
  }, [queryClient, newConversation, conversation?.conversationId]);
}
