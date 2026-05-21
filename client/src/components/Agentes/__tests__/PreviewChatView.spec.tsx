import React from 'react';
import { render } from '@testing-library/react';

jest.mock('~/hooks/Chat/useChatHelpers', () => ({
  __esModule: true,
  default: () => ({
    conversation: { conversationId: 'new', endpoint: null, model: null },
    setConversation: jest.fn(),
    getMessages: jest.fn(),
    setMessages: jest.fn(),
    isSubmitting: false,
    ask: jest.fn(),
    regenerate: jest.fn(),
    stopGenerating: jest.fn(),
    latestMessage: null,
    setLatestMessage: jest.fn(),
    resetLatestMessage: jest.fn(),
    newConversation: jest.fn(),
    index: 2,
    files: [],
    setFiles: jest.fn(),
    filesLoading: false,
    setFilesLoading: jest.fn(),
    latestMessageId: undefined,
    latestMessageDepth: undefined,
    setSiblingIdx: jest.fn(),
    handleStopGenerating: jest.fn(),
    handleRegenerate: jest.fn(),
    handleContinue: jest.fn(),
    showPopover: false,
    setShowPopover: jest.fn(),
    abortScroll: false,
    setAbortScroll: jest.fn(),
    preset: null,
    setPreset: jest.fn(),
    optionSettings: {},
    setOptionSettings: jest.fn(),
  }),
}));

jest.mock('~/hooks/SSE/useAdaptiveSSE', () => ({ __esModule: true, default: jest.fn() }));

jest.mock('~/hooks/Chat/useAddedResponse', () => ({
  __esModule: true,
  default: () => ({
    conversation: null,
    setConversation: jest.fn(),
    generateConversation: jest.fn(),
  }),
}));

jest.mock('~/data-provider', () => ({
  useGetMessagesByConvoId: () => ({ data: null, isLoading: false }),
}));

jest.mock('~/Providers', () => ({
  ChatContext: { Provider: ({ children }: { children: unknown }) => children },
  AddedChatContext: { Provider: ({ children }: { children: unknown }) => children },
  ChatFormProvider: ({ children }: { children: unknown }) => children,
  useFileMapContext: () => ({}),
}));

jest.mock('~/components/Chat/Messages/MessagesView', () => ({
  __esModule: true,
  default: () => <div data-testid="messages-view" />,
}));

jest.mock('~/components/Chat/Input/ChatForm', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-form" />,
}));

jest.mock('~/store', () => ({
  submissionByIndex: (i: number) => `submissionByIndex_${i}`,
  ephemeralAgentByConvoId: (id: string) => `ephemeralAgentByConvoId_${id}`,
}));

jest.mock('recoil', () => ({
  ...jest.requireActual('recoil'),
  useRecoilValue: () => null,
  useSetRecoilState: () => jest.fn(),
}));

jest.mock('librechat-data-provider', () => ({
  Constants: { NEW_CONVO: 'new', EPHEMERAL_AGENT_ID: 'ephemeral' },
  buildTree: () => null,
  EModelEndpoint: { agents: 'agents' },
}));

jest.mock('~/Providers/AgentDraftContext', () => ({
  AgentDraftProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAgentDraftContext: () => ({ draftParams: {}, setDraftParams: jest.fn() }),
}));

import PreviewChatView from '../PreviewChatView';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';

const draftParams: AgentDraftParams = {
  name: '',
  category: '',
  provider: 'openAI',
  model: 'gpt-4o',
  instructions: 'Be helpful',
  webSearch: false,
  fileSearch: false,
  executeCode: false,
  mcpServers: [],
};

describe('PreviewChatView', () => {
  it('renders without crashing with null conversationId', () => {
    expect(() =>
      render(
        <PreviewChatView
          conversationId={null}
          draftParams={draftParams}
          onConversationCreated={jest.fn()}
        />,
      ),
    ).not.toThrow();
  });

  it('renders without crashing with an existing conversationId', () => {
    expect(() =>
      render(
        <PreviewChatView
          conversationId="conv-123"
          draftParams={draftParams}
          onConversationCreated={jest.fn()}
        />,
      ),
    ).not.toThrow();
  });
});
