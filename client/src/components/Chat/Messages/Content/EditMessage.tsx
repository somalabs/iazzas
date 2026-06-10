import { Paperclip } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRecoilValue } from 'recoil';
import { useRef, useState, useEffect, useCallback } from 'react';
import { TextareaAutosize, TooltipAnchor } from '@librechat/client';
import type { TMessage, TFile } from 'librechat-data-provider';
import type { TEditProps, ExtendedFile } from '~/common';
import { useMessagesOperations, useMessagesConversation } from '~/Providers';
import { useFileHandlingNoChatContext, useLocalize } from '~/hooks';
import FileContainer from '../../Input/Files/FileContainer';
import { cn, removeFocusRings, getCachedPreview } from '~/utils';
import Image from '../../Input/Files/Image';
import { useGetAddedConvo } from '~/hooks/Chat';
import Container from './Container';
import store from '~/store';

const seedEditFiles = (files?: TMessage['files']): Map<string, ExtendedFile> => {
  const map = new Map<string, ExtendedFile>();
  (files ?? []).forEach((file) => {
    if (!file.file_id) {
      return;
    }
    map.set(file.file_id, {
      file_id: file.file_id,
      filepath: file.filepath,
      filename: file.filename,
      type: file.type,
      height: file.height,
      width: file.width,
      size: file.bytes ?? 0,
      source: file.source,
      preview: file.filepath,
      progress: 1,
      attached: true,
    });
  });
  return map;
};

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
  const { conversation } = useMessagesConversation();

  const canEditFiles = message.isCreatedByUser === true;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editFiles, setEditFiles] = useState<Map<string, ExtendedFile>>(() =>
    seedEditFiles(message.files),
  );
  const { handleFileChange, abortUpload } = useFileHandlingNoChatContext(undefined, {
    files: editFiles,
    setFiles: setEditFiles,
    conversation,
  });

  const editFileList = Array.from(editFiles.values());
  const isUploadingFiles = editFileList.some((file) => file.progress < 1);

  const removeEditFile = useCallback(
    (fileId: string) => {
      const file = editFiles.get(fileId);
      if (abortUpload && file && file.progress < 1) {
        abortUpload();
      }
      setEditFiles((prev) => {
        const next = new Map(prev);
        next.delete(fileId);
        return next;
      });
    },
    [editFiles, abortUpload],
  );

  const buildOverrideFiles = (): TMessage['files'] =>
    editFileList
      .filter((file) => file.file_id && file.progress >= 1)
      .map(
        (file): TFile =>
          ({
            file_id: file.file_id,
            filepath: file.filepath,
            type: file.type ?? '',
            height: file.height,
            width: file.width,
          }) as TFile,
      );

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
          overrideFiles: buildOverrideFiles(),
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
      {canEditFiles && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {editFileList.map((file) => {
            const isImage = file.type?.startsWith('image') ?? false;
            return (
              <div key={file.file_id} style={{ flexBasis: '70px', flexGrow: 0, flexShrink: 0 }}>
                {isImage ? (
                  <Image
                    url={getCachedPreview(file.file_id) ?? file.preview ?? file.filepath}
                    onDelete={() => removeEditFile(file.file_id)}
                    progress={file.progress}
                    source={file.source}
                  />
                ) : (
                  <FileContainer file={file} onDelete={() => removeEditFile(file.file_id)} />
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={localize('com_sidepanel_attach_files')}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border-medium px-3 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
          >
            <Paperclip className="icon-sm" />
            {localize('com_sidepanel_attach_files')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
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
              disabled={isSubmitting || isUploadingFiles}
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
