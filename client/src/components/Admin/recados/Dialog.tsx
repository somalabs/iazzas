import { useState, useEffect } from 'react';
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
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { useCreateBannerMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type RecadoMode = 'popup' | 'banner';
type EditorTab = 'write' | 'preview';

interface RecadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecadoDialog({ open, onOpenChange }: RecadoDialogProps) {
  const localize = useLocalize();
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<RecadoMode>('popup');
  const [tab, setTab] = useState<EditorTab>('write');
  const [displayFrom, setDisplayFrom] = useState('');
  const [displayTo, setDisplayTo] = useState('');
  const [persistable, setPersistable] = useState(false);
  const [error, setError] = useState('');

  const mutation = useCreateBannerMutation({
    onSuccess: () => onOpenChange(false),
    onError: () => setError(localize('com_admin_recados_error')),
  });

  useEffect(() => {
    if (open) {
      setMessage('');
      setMode('popup');
      setTab('write');
      setDisplayFrom('');
      setDisplayTo('');
      setPersistable(false);
      setError('');
    }
  }, [open]);

  const trimmed = message.trim();

  const handleConfirm = () => {
    if (trimmed === '') {
      setError(localize('com_admin_recados_error_empty'));
      return;
    }
    const payload: TCreateBannerRequest = {
      message: trimmed,
      type: mode,
      isPublic: true,
      persistable: mode === 'banner' ? persistable : false,
      displayFrom: mode === 'banner' && displayFrom ? displayFrom : null,
      displayTo: mode === 'banner' && displayTo ? displayTo : null,
    };
    mutation.mutate(payload);
  };

  const tabClasses = (active: boolean) =>
    cn(
      'rounded-md px-3 py-1 text-sm font-medium transition-colors',
      active ? 'bg-surface-submit text-white' : 'text-text-secondary hover:bg-surface-hover',
    );

  const modeClasses = (active: boolean) =>
    cn(
      'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'border-surface-submit bg-surface-submit text-white'
        : 'border-border-medium text-text-secondary hover:bg-surface-hover',
    );

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-y-auto">
        <OGDialogTitle>{localize('com_admin_recados_new')}</OGDialogTitle>

        <div className="mt-4 space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium text-text-secondary">
              {localize('com_admin_recados_mode')}
            </Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('popup')}
                className={modeClasses(mode === 'popup')}
              >
                {localize('com_admin_recados_type_popup')}
              </button>
              <button
                type="button"
                onClick={() => setMode('banner')}
                className={modeClasses(mode === 'banner')}
              >
                {localize('com_admin_recados_type_faixa')}
              </button>
            </div>
          </div>

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
            </div>
            {tab === 'write' ? (
              <TextareaAutosize
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                minRows={6}
                maxRows={16}
                className="w-full resize-none rounded-lg border border-border-medium bg-surface-primary p-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-surface-submit focus:outline-none"
                placeholder={localize('com_admin_recados_placeholder')}
                aria-label={localize('com_admin_recados_write')}
              />
            ) : (
              <div className="min-h-[10rem] rounded-lg border border-border-medium bg-surface-primary p-3 text-sm text-text-primary [&_a]:text-blue-700 [&_a]:underline dark:[&_a]:text-blue-400">
                {trimmed === '' ? (
                  <p className="italic text-text-tertiary">
                    {localize('com_admin_recados_empty_preview')}
                  </p>
                ) : (
                  <MarkdownLite content={message} codeExecution={false} />
                )}
              </div>
            )}
          </div>

          {mode === 'banner' && (
            <div className="space-y-3 rounded-lg border border-border-light p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-sm font-medium text-text-secondary">
                    {localize('com_admin_recados_display_from')}
                  </Label>
                  <input
                    type="datetime-local"
                    value={displayFrom}
                    onChange={(e) => setDisplayFrom(e.target.value)}
                    className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium text-text-secondary">
                    {localize('com_admin_recados_display_to')}
                  </Label>
                  <input
                    type="datetime-local"
                    value={displayTo}
                    onChange={(e) => setDisplayTo(e.target.value)}
                    className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={!persistable}
                  onChange={(e) => setPersistable(!e.target.checked)}
                  className="h-4 w-4"
                />
                {localize('com_admin_recados_dismissible')}
              </label>
            </div>
          )}

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
