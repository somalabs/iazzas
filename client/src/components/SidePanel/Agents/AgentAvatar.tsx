import { memo, useRef, useCallback, useEffect, useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { Plus } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { useFormContext, useWatch } from 'react-hook-form';
import { mergeFileConfig, fileConfig as defaultFileConfig } from 'librechat-data-provider';
import type { AgentAvatar } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { DEFAULT_ICON_COLOR } from '~/common';
import { useGetFileConfig } from '~/data-provider';
import IconPicker from './IconPicker';
import { useLocalize } from '~/hooks';

type AvatarTab = 'image' | 'icon';

const TRIGGER_SIZE = 'h-16 w-16';

function Avatar({ avatar }: { avatar: AgentAvatar | null }) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { control, setValue } = useFormContext<AgentForm>();
  const avatarPreview = useWatch({ control, name: 'avatar_preview' }) ?? '';
  const avatarAction = useWatch({ control, name: 'avatar_action' });
  const avatarIcon = useWatch({ control, name: 'avatar_icon' }) ?? null;
  const avatarIconColor = useWatch({ control, name: 'avatar_icon_color' }) ?? null;
  const { data: fileConfig = defaultFileConfig } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<AvatarTab>(avatarIcon ? 'icon' : 'image');

  const hasRemoteAvatar = Boolean(avatar?.filepath);

  useEffect(() => {
    if (avatarAction || avatarIcon) {
      return;
    }
    if (avatar?.filepath && avatarPreview !== avatar.filepath) {
      setValue('avatar_preview', avatar.filepath);
    }
    if (!avatar?.filepath && avatarPreview !== '') {
      setValue('avatar_preview', '');
    }
  }, [avatar?.filepath, avatarAction, avatarIcon, avatarPreview, setValue]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      const sizeLimit = fileConfig.avatarSizeLimit ?? 0;
      if (!file) {
        return;
      }
      if (sizeLimit && file.size > sizeLimit) {
        const limitInMb = sizeLimit / (1024 * 1024);
        const displayLimit = Number.isInteger(limitInMb)
          ? limitInMb
          : parseFloat(limitInMb.toFixed(1));
        showToast({
          message: localize('com_ui_upload_invalid_var', { 0: displayLimit }),
          status: 'error',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('avatar_file', file, { shouldDirty: true });
        setValue('avatar_preview', (reader.result as string) ?? '', { shouldDirty: true });
        setValue('avatar_action', 'upload', { shouldDirty: true });
        setValue('avatar_icon', null, { shouldDirty: true });
        setValue('avatar_icon_color', null, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    },
    [fileConfig.avatarSizeLimit, localize, setValue, showToast],
  );

  const handleReset = useCallback(() => {
    const remoteAvatarExists = Boolean(avatar?.filepath);
    setValue('avatar_preview', '', { shouldDirty: true });
    setValue('avatar_file', null, { shouldDirty: true });
    setValue('avatar_action', remoteAvatarExists ? 'reset' : null, { shouldDirty: true });
  }, [avatar?.filepath, setValue]);

  const handleSelectIcon = useCallback(
    (icon: string) => {
      setValue('avatar_icon', icon, { shouldDirty: true });
      setValue('avatar_file', null, { shouldDirty: true });
      setValue('avatar_preview', '', { shouldDirty: true });
      setValue('avatar_action', null, { shouldDirty: true });
      if (!avatarIconColor) {
        setValue('avatar_icon_color', DEFAULT_ICON_COLOR, { shouldDirty: true });
      }
    },
    [setValue, avatarIconColor],
  );

  const handleSelectColor = useCallback(
    (color: string) => setValue('avatar_icon_color', color, { shouldDirty: true }),
    [setValue],
  );

  const hasImage = Boolean(avatarPreview) || hasRemoteAvatar;

  const tabButtonClass = (tab: AvatarTab) =>
    'flex-1 border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors ' +
    (activeTab === tab
      ? 'border-[var(--azzas-navy)] text-token-text-primary'
      : 'border-transparent text-token-text-secondary hover:text-token-text-primary');

  const preview = (() => {
    if (avatarIcon) {
      return (
        <span
          className="flex h-full w-full items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: avatarIconColor ?? DEFAULT_ICON_COLOR }}
          aria-hidden="true"
        >
          {avatarIcon}
        </span>
      );
    }
    if (avatarPreview) {
      return (
        <img
          src={avatarPreview}
          alt=""
          className="h-full w-full rounded-full object-cover"
          aria-hidden="true"
        />
      );
    }
    return (
      <span className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-border-medium bg-surface-secondary text-text-secondary">
        <Plus className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  })();

  return (
    <Ariakit.PopoverProvider placement="bottom-start">
      <Ariakit.PopoverDisclosure
        className={
          TRIGGER_SIZE +
          ' overflow-hidden rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
        }
        aria-label={localize('com_ui_upload_agent_avatar_label')}
      >
        {preview}
      </Ariakit.PopoverDisclosure>
      <Ariakit.Popover
        portal
        gutter={8}
        className="z-50 w-72 rounded-lg border border-border-light bg-surface-primary p-3 shadow-lg"
      >
        <div className="mb-3 flex border-b border-border-light">
          <button
            type="button"
            aria-pressed={activeTab === 'image'}
            onClick={() => setActiveTab('image')}
            className={tabButtonClass('image')}
          >
            {localize('com_ui_avatar_tab_image')}
          </button>
          <button
            type="button"
            aria-pressed={activeTab === 'icon'}
            onClick={() => setActiveTab('icon')}
            className={tabButtonClass('icon')}
          >
            {localize('com_ui_avatar_tab_icon')}
          </button>
        </div>

        {activeTab === 'image' ? (
          <div className="flex flex-col items-center gap-3 py-1">
            <div className={TRIGGER_SIZE + ' overflow-hidden rounded-full'}>{preview}</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-md bg-[var(--surface-submit)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--surface-submit-hover)]"
              >
                {localize('com_ui_upload_image')}
              </button>
              {hasImage && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-md border border-border-light px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                >
                  {localize('com_ui_remove')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <IconPicker
            icon={avatarIcon}
            iconColor={avatarIconColor}
            onSelectIcon={handleSelectIcon}
            onSelectColor={handleSelectColor}
          />
        )}
      </Ariakit.Popover>
    </Ariakit.PopoverProvider>
  );
}

const MemoizedAvatar = memo(
  Avatar,
  (prevProps, nextProps) =>
    prevProps.avatar?.filepath === nextProps.avatar?.filepath &&
    prevProps.avatar?.icon === nextProps.avatar?.icon &&
    prevProps.avatar?.iconColor === nextProps.avatar?.iconColor,
);
MemoizedAvatar.displayName = 'Avatar';

export default MemoizedAvatar;
