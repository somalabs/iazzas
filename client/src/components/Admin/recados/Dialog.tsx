import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  Label,
  OGDialog,
  OGDialogContent,
  OGDialogTitle,
  OGDialogTrigger,
  OGDialogTemplate,
  TextareaAutosize,
} from '@librechat/client';
import type { TCreateBannerRequest } from 'librechat-data-provider';
import RecadoMarkdown from '~/components/Recados/RecadoMarkdown';
import { useCreateBannerMutation, useUploadBannerImageMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type EditorTab = 'write' | 'preview';

interface RecadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecadoDialog({ open, onOpenChange }: RecadoDialogProps) {
  const localize = useLocalize();
  const [message, setMessage] = useState('');
  const [popup, setPopup] = useState(true);
  const [tab, setTab] = useState<EditorTab>('write');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useCreateBannerMutation({
    onSuccess: () => onOpenChange(false),
    onError: () => setError(localize('com_admin_recados_error')),
  });

  const imageMutation = useUploadBannerImageMutation();

  useEffect(() => {
    if (open) {
      setMessage('');
      setPopup(true);
      setTab('write');
      setError('');
    }
  }, [open]);

  const trimmed = message.trim();

  const insertAtCursor = (snippet: string) => {
    setMessage((prev) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? prev.length;
      const end = el?.selectionEnd ?? prev.length;
      const next = prev.slice(0, start) + snippet + prev.slice(end);
      requestAnimationFrame(() => {
        if (!el) {
          return;
        }
        const caret = start + snippet.length;
        el.focus();
        el.setSelectionRange(caret, caret);
      });
      return next;
    });
  };

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    setError('');
    setTab('write');
    const alt = file.name.replace(/\.[^./]+$/, '');
    const formData = new FormData();
    formData.append('file', file);
    imageMutation.mutate(formData, {
      onSuccess: ({ url }) => insertAtCursor(`\n![${alt}](${url})\n`),
      onError: () => setError(localize('com_admin_recados_image_error')),
    });
  };

  const handleConfirm = () => {
    if (trimmed === '') {
      setError(localize('com_admin_recados_error_empty'));
      return;
    }
    const payload: TCreateBannerRequest = {
      message: trimmed,
      type: popup ? 'popup' : 'inbox',
      isPublic: true,
    };
    mutation.mutate(payload);
  };

  const tabClasses = (active: boolean) =>
    cn(
      'rounded-md px-3 py-1 text-sm font-medium transition-colors',
      active ? 'bg-surface-submit text-white' : 'text-text-secondary hover:bg-surface-hover',
    );

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto">
        <OGDialogTitle>{localize('com_admin_recados_new')}</OGDialogTitle>

        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTab('write')}
                className={tabClasses(tab === 'write')}
              >
                {localize('com_admin_recados_write')}
              </button>
              <button
                type="button"
                onClick={() => setTab('preview')}
                className={tabClasses(tab === 'preview')}
              >
                {localize('com_admin_recados_preview')}
              </button>
              <div className="ml-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageMutation.isLoading}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
                >
                  <ImageIcon className="h-4 w-4" />
                  {imageMutation.isLoading
                    ? localize('com_admin_recados_image_uploading')
                    : localize('com_admin_recados_image')}
                </button>
              </div>
            </div>
            {tab === 'write' ? (
              <TextareaAutosize
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                minRows={10}
                maxRows={22}
                className="w-full resize-none rounded-lg border border-border-medium bg-surface-primary p-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-surface-submit focus:outline-none"
                placeholder={localize('com_admin_recados_placeholder')}
                aria-label={localize('com_admin_recados_write')}
              />
            ) : (
              <div className="min-h-[16rem] rounded-lg border border-border-medium bg-surface-primary p-3">
                {trimmed === '' ? (
                  <p className="text-sm italic text-text-tertiary">
                    {localize('com_admin_recados_empty_preview')}
                  </p>
                ) : (
                  <RecadoMarkdown content={message} />
                )}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={popup}
              onChange={(e) => setPopup(e.target.checked)}
              className="h-4 w-4"
            />
            {localize('com_admin_recados_popup_option')}
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border-medium px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            >
              {localize('com_ui_cancel')}
            </button>
            <OGDialog>
              <OGDialogTrigger asChild>
                <button
                  type="button"
                  disabled={mutation.isLoading || trimmed === ''}
                  className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {localize('com_admin_recados_send')}
                </button>
              </OGDialogTrigger>
              <OGDialogTemplate
                title={localize('com_admin_recados_send')}
                className="max-w-[450px]"
                main={
                  <div className="flex w-full flex-col items-center gap-2">
                    <div className="grid w-full items-center gap-2">
                      <Label className="text-left text-sm font-medium">
                        {localize('com_admin_recados_confirm')}
                      </Label>
                    </div>
                  </div>
                }
                selection={{
                  selectHandler: handleConfirm,
                  selectClasses: 'bg-surface-submit hover:opacity-90 text-white',
                  selectText: localize('com_admin_recados_send'),
                }}
              />
            </OGDialog>
          </div>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
