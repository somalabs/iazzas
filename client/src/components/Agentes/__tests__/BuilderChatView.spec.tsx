import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('../PreviewChatView', () => ({ __esModule: true, default: () => null }));
jest.mock('~/Providers', () => ({
  ChatContext: { Provider: ({ children }: any) => children },
  AddedChatContext: { Provider: ({ children }: any) => children },
  ChatFormProvider: ({ children }: any) => children,
  useFileMapContext: () => ({}),
}));
jest.mock('~/hooks/Chat/useChatHelpers', () => ({
  __esModule: true,
  default: () => ({
    conversation: null,
    setConversation: jest.fn(),
    getMessages: jest.fn(() => []),
  }),
}));
jest.mock('~/hooks/Chat/useAddedResponse', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('~/hooks/SSE/useAdaptiveSSE', () => ({ __esModule: true, default: () => {} }));
jest.mock('~/data-provider', () => ({ useGetMessagesByConvoId: () => ({ data: null }) }));
jest.mock('~/store', () => ({ submissionByIndex: (i: number) => `submissionByIndex_${i}` }));
jest.mock('recoil', () => ({
  ...jest.requireActual('recoil'),
  useRecoilValue: () => null,
  useSetRecoilState: () => jest.fn(),
}));
jest.mock('librechat-data-provider', () => ({
  Constants: {
    NEW_CONVO: 'new',
    EPHEMERAL_AGENT_ID: 'ephemeral',
    CONSTRUTOR_AGENT_ID: 'construtor-agente-iazzas',
  },
  buildTree: () => null,
  EModelEndpoint: { agents: 'agents' },
}));
jest.mock('~/hooks/Agentes/useBuilderToolInterceptor', () => ({
  useBuilderToolInterceptor: jest.fn(),
}));
jest.mock('~/components/Chat/Messages/MessagesView', () => ({
  __esModule: true,
  default: () => <div data-testid="messages-view" />,
}));
jest.mock('~/components/Chat/Input/ChatForm', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-form" />,
}));
jest.mock('~/Providers/AgentDraftContext', () => ({
  useAgentDraftContext: () => ({
    setDraftParams: jest.fn(),
    setFormValue: null,
  }),
}));

import BuilderChatView from '../BuilderChatView';

const defaultDraft: AgentDraftParams = {
  name: 'Test',
  category: '',
  provider: 'openAI',
  model: 'gpt-4o',
  instructions: 'Be helpful',
  webSearch: false,
  fileSearch: false,
  executeCode: false,
  mcpServers: [],
};

describe('BuilderChatView', () => {
  it('renders without conversationId', () => {
    render(
      <BuilderChatView
        conversationId={null}
        draftParams={defaultDraft}
        onConversationCreated={jest.fn()}
      />,
    );
    expect(screen.getByTestId('chat-form')).toBeInTheDocument();
  });

  it('renders with existing conversationId', () => {
    render(
      <BuilderChatView
        conversationId="existing-convo-123"
        draftParams={defaultDraft}
        onConversationCreated={jest.fn()}
      />,
    );
    expect(screen.getByTestId('chat-form')).toBeInTheDocument();
  });
});
