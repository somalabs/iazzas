import { memo, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { useAtom } from 'jotai';
import { useMediaQuery } from '@librechat/client';
import { getConfigDefaults, PermissionTypes, Permissions } from 'librechat-data-provider';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import ScreenHeader from '~/components/ui/ScreenHeader';
import AtelierTrigger from '~/components/ui/AtelierTrigger';
import BookmarkMenu from './Menus/BookmarkMenu';
import { PresetsMenu } from './Menus';
import { TemporaryChat } from './TemporaryChat';
import { atelierChatOpenAtom } from '~/store/atelier';
import AddMultiConvo from './AddMultiConvo';
import { useHasAccess } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

function Header() {
  const { data: startupConfig } = useGetStartupConfig();
  const navVisible = useRecoilValue(store.sidebarExpanded);

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const hasAccessToMultiConvo = useHasAccess({
    permissionType: PermissionTypes.MULTI_CONVO,
    permission: Permissions.USE,
  });

  const hasAccessToTemporaryChat = useHasAccess({
    permissionType: PermissionTypes.TEMPORARY_CHAT,
    permission: Permissions.USE,
  });

  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const [atelierOpen, setAtelierOpen] = useAtom(atelierChatOpenAtom);

  const exportAndShare = (
    <>
      <ExportAndShareMenu isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false} />
      {hasAccessToTemporaryChat === true && <TemporaryChat />}
    </>
  );

  return (
    <ScreenHeader
      right={
        <>
          {!isSmallScreen && exportAndShare}
          <AtelierTrigger open={atelierOpen} onToggle={() => setAtelierOpen((prev) => !prev)} />
        </>
      }
    >
      {!(navVisible && isSmallScreen) && (
        <div
          className={cn(
            'flex items-center gap-2 pl-2',
            !isSmallScreen ? 'transition-all duration-200 ease-in-out' : '',
          )}
        >
          {interfaceConfig.presets === true && interfaceConfig.modelSelect && <PresetsMenu />}
          {hasAccessToBookmarks === true && <BookmarkMenu />}
          {hasAccessToMultiConvo === true && <AddMultiConvo />}
          {isSmallScreen && exportAndShare}
        </div>
      )}
    </ScreenHeader>
  );
}

const MemoizedHeader = memo(Header);
MemoizedHeader.displayName = 'Header';

export default MemoizedHeader;
