import { useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useRecoilValue } from 'recoil';
import { TextareaAutosize, TooltipAnchor } from '@librechat/client';
import type { TEditProps } from '~/common';
import { useMessagesOperations } from '~/Providers';
import { useGetAddedConvo } from '~/hooks/Chat';
import { cn, removeFocusRings } from '~/utils';
import { useLocalize } from '~/hooks';
import Container from './Container';
import store from '~/store';

const EditMessage = ({
  text,
  message,
  isSubmitting,
  ask,
  enterEdit,
  siblingIdx,
  setSiblingIdx,
}: TEditProps) => {
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const { getMessages } = useMessagesOperations();

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const { conversationId, parentMessageId, messageId } = message;
  const localize = useLocalize();

  const chatDirection = useRecoilValue(store.chatDirection).toLowerCase();
  const isRTL = chatDirection === 'rtl';

  const getAddedConvo = useGetAddedConvo();

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      text: text ?? '',
    },
  });

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (textArea) {
      const length = textArea.value.length;
      textArea.focus();
      textArea.setSelectionRange(length, length);
    }
  }, []);

  const resubmitMessage = (data: { text: string }) => {
    if (message.isCreatedByUser) {
      ask(
        {
          text: data.text,
          parentMessageId,
          conversationId,
        },
        {
          overrideFiles: message.files,
          addedConvo: getAddedConvo() || undefined,
        },
      );

      setSiblingIdx((siblingIdx ?? 0) - 1);
    } else {
      const messages = getMessages();
      const parentMessage = messages?.find((msg) => msg.messageId === parentMessageId);

      if (!parentMessage) {
        return;
      }
      ask(
        { ...parentMessage },
        {
          editedText: data.text,
          editedMessageId: messageId,
          isRegenerate: true,
          isEdited: true,
          addedConvo: getAddedConvo() || undefined,
        },
      );

      setSiblingIdx((siblingIdx ?? 0) - 1);
    }

    enterEdit(true);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitButtonRef.current?.click();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        enterEdit(true);
      }
    },
    [enterEdit],
  );

  const { ref, ...registerProps } = register('text', {
    required: true,
    onChange: (e) => {
      setValue('text', e.target.value, { shouldValidate: true });
    },
  });

  return (
    <Container message={message}>
      <div className="bg-token-main-surface-primary relative mt-2 flex w-full flex-grow flex-col overflow-hidden rounded-2xl border border-border-medium text-text-primary transition-shadow duration-150 [&:has(textarea:focus)]:border-action [&:has(textarea:focus)]:shadow-[0_0_0_3px_rgba(39,69,102,0.14)]">
        <TextareaAutosize
          {...registerProps}
          ref={(e) => {
            ref(e);
            textAreaRef.current = e;
          }}
          onKeyDown={handleKeyDown}
          data-testid="message-text-editor"
          className={cn(
            'markdown prose dark:prose-invert light whitespace-pre-wrap break-words pl-3 md:pl-4',
            'm-0 w-full resize-none border-0 bg-transparent py-[10px]',
            'placeholder-text-secondary focus:ring-0 focus-visible:ring-0 md:py-3.5',
            isRTL ? 'text-right' : 'text-left',
            'max-h-[65vh] pr-3 md:max-h-[75vh] md:pr-4',
            removeFocusRings,
          )}
          aria-label={localize('com_ui_message_input')}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      </div>
      <div className="mt-2 flex w-full flex-wrap items-center justify-end gap-2">
        <span className="mr-auto hidden select-none text-xs text-text-tertiary sm:inline">
          {localize('com_ui_edit_shortcut_hint')}
        </span>
        <button
          className="btn relative bg-transparent text-text-secondary transition-colors hover:bg-surface-hover"
          onClick={() => enterEdit(true)}
        >
          {localize('com_ui_cancel')}
        </button>
        <TooltipAnchor
          description="Ctrl + Enter / ⌘ + Enter"
          render={
            <button
              ref={submitButtonRef}
              className="btn relative bg-action text-on-action transition-colors hover:bg-action-hover disabled:opacity-50"
              disabled={isSubmitting}
              onClick={handleSubmit(resubmitMessage)}
            >
              {localize('com_ui_submit')}
            </button>
          }
        />
      </div>
    </Container>
  );
};

export default EditMessage;
