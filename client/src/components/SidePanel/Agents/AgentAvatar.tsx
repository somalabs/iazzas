import { memo, useCallback, useEffect, useState } from 'react';
import { useToastContext } from '@librechat/client';
import { useFormContext, useWatch } from 'react-hook-form';
import { mergeFileConfig, fileConfig as defaultFileConfig } from 'librechat-data-provider';
import type { AgentAvatar } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { DEFAULT_ICON_COLOR } from '~/common';
import { AgentAvatarRender, NoImage, AvatarMenu } from './Images';
import { useGetFileConfig } from '~/data-provider';
import IconPicker from './IconPicker';
import { useLocalize } from '~/hooks';

type AvatarTab = 'image' | 'icon';

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

  const [activeTab, setActiveTab] = useState<AvatarTab>(avatarIcon ? 'icon' : 'image');

  // Derive whether agent has a remote avatar from the avatar prop
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
  const canReset = hasImage;

  const tabButtonClass = (tab: AvatarTab) =>
    'border-b-2 px-3 pb-1.5 text-sm font-medium transition-colors ' +
    (activeTab === tab
      ? 'border-[var(--azzas-navy)] text-token-text-primary'
      : 'border-transparent text-token-text-secondary hover:text-token-text-primary');

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center justify-center">
        {avatarIcon ? (
          <AgentAvatarRender icon={avatarIcon} iconColor={avatarIconColor ?? undefined} />
        ) : avatarPreview ? (
          <AgentAvatarRender url={avatarPreview} />
        ) : (
          <NoImage />
        )}
      </div>

      <div className="flex w-full justify-center border-b border-border-light">
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
        <div className="flex w-full items-center justify-center">
          <AvatarMenu
            trigger={
              <button
                type="button"
                className="f h-20 w-20 outline-none ring-offset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={localize('com_ui_upload_agent_avatar_label')}
              >
                {avatarPreview ? <AgentAvatarRender url={avatarPreview} /> : <NoImage />}
              </button>
            }
            handleFileChange={handleFileChange}
            onReset={handleReset}
            canReset={canReset}
          />
        </div>
      ) : (
        <IconPicker
          icon={avatarIcon}
          iconColor={avatarIconColor}
          onSelectIcon={handleSelectIcon}
          onSelectColor={handleSelectColor}
        />
      )}
    </div>
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
