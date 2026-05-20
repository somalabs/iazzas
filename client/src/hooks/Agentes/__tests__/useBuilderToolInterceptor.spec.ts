import { renderHook } from '@testing-library/react';
import { ContentTypes, ToolCallTypes } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { useBuilderToolInterceptor } from '../useBuilderToolInterceptor';

function makeMessage(toolName: string, args: object, hasOutput: boolean): TMessage {
  return {
    messageId: '1',
    conversationId: 'c1',
    parentMessageId: '0',
    role: 'assistant',
    text: '',
    content: [
      {
        type: ContentTypes.TOOL_CALL,
        tool_call: {
          type: ToolCallTypes.TOOL_CALL,
          name: toolName,
          args: JSON.stringify(args),
          output: hasOutput ? JSON.stringify({ aplicado: true }) : undefined,
        },
      },
    ],
  } as unknown as TMessage;
}

describe('useBuilderToolInterceptor', () => {
  it('calls applyDraftUpdate when atualizar_rascunho has output', () => {
    const setDraftParams = jest.fn();
    const setFormValue = jest.fn();
    const messages = [makeMessage('atualizar_rascunho', { name: 'Bot X' }, true)];

    renderHook(() =>
      useBuilderToolInterceptor(messages, setDraftParams, setFormValue),
    );

    expect(setDraftParams).toHaveBeenCalled();
  });

  it('ignores tool calls from other tools', () => {
    const setDraftParams = jest.fn();
    const messages = [makeMessage('web_search', { query: 'test' }, true)];

    renderHook(() =>
      useBuilderToolInterceptor(messages, setDraftParams, null),
    );

    expect(setDraftParams).not.toHaveBeenCalled();
  });

  it('ignores atualizar_rascunho without output (still streaming)', () => {
    const setDraftParams = jest.fn();
    const messages = [makeMessage('atualizar_rascunho', { name: 'Bot X' }, false)];

    renderHook(() =>
      useBuilderToolInterceptor(messages, setDraftParams, null),
    );

    expect(setDraftParams).not.toHaveBeenCalled();
  });

  it('does nothing with empty messages', () => {
    const setDraftParams = jest.fn();

    renderHook(() =>
      useBuilderToolInterceptor([], setDraftParams, null),
    );

    expect(setDraftParams).not.toHaveBeenCalled();
  });
});
