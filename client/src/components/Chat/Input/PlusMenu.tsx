import React, { useMemo, useState, useCallback } from 'react';
import * as Ariakit from '@ariakit/react';
import {
  Check,
  Plus,
  Globe,
  Settings,
  Paperclip,
  WandSparkles,
  TerminalSquareIcon,
} from 'lucide-react';
import { TooltipAnchor, DropdownPopup, VectorIcon } from '@librechat/client';
import {
  AuthType,
  Permissions,
  ArtifactModes,
  PermissionTypes,
  defaultAgentCapabilities,
} from 'librechat-data-provider';
import type { TConversation } from 'librechat-data-provider';
import type { MenuItemProps, ExtendedFile, FileSetter } from '~/common';
import { useLocalize, useHasAccess, useAgentCapabilities } from '~/hooks';
import { useBadgeRowContext, useAgentDraftContextOptional } from '~/Providers';
import useComposerUpload, { FileUpload } from './Files/useComposerUpload';
import { useGetStartupConfig } from '~/data-provider';
import MCPSubMenu from './MCPSubMenu';
import { cn } from '~/utils';

interface PlusMenuProps {
  conversation: TConversation | null;
  disabled?: boolean;
  /** Show the ephemeral tools + connectors. False for saved agents (which define
   * their own tools); upload stays available regardless. */
  showTools?: boolean;
  files: Map<string, ExtendedFile>;
  setFiles: FileSetter;
  setFilesLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * The composer's single entry point, Claude-style: one "+" trigger whose menu
 * holds file upload, the ephemeral tools (web search, code, file search,
 * artifacts) and the connectors ("Conectores"). No pinning — enabled tools
 * surface as dismissible chips in the BadgeRow.
 */
function PlusMenu({
  conversation,
  disabled,
  showTools = true,
  files,
  setFiles,
  setFilesLoading,
}: PlusMenuProps) {
  const localize = useLocalize();
  const isDisabled = disabled ?? false;
  const [isOpen, setIsOpen] = useState(false);

  const {
    webSearch,
    artifacts,
    fileSearch,
    agentsConfig,
    mcpServerManager,
    codeApiKeyForm,
    codeInterpreter,
    searchApiKeyForm,
  } = useBadgeRowContext();
  const { data: startupConfig } = useGetStartupConfig();

  const upload = useComposerUpload({
    conversation,
    disabled: isDisabled,
    files,
    setFiles,
    setFilesLoading,
  });

  const {
    codeEnabled: rawCodeEnabled,
    webSearchEnabled: rawWebSearchEnabled,
    artifactsEnabled,
    fileSearchEnabled: rawFileSearchEnabled,
  } = useAgentCapabilities(agentsConfig?.capabilities ?? defaultAgentCapabilities);

  const draftCtx = useAgentDraftContextOptional();
  const codeEnabled = draftCtx
    ? rawCodeEnabled && draftCtx.draftParams.executeCode
    : rawCodeEnabled;
  const webSearchEnabled = draftCtx
    ? rawWebSearchEnabled && draftCtx.draftParams.webSearch
    : rawWebSearchEnabled;
  const fileSearchEnabled = draftCtx
    ? rawFileSearchEnabled && draftCtx.draftParams.fileSearch
    : rawFileSearchEnabled;
  const mcpAllowed = draftCtx ? draftCtx.draftParams.mcpServers.length > 0 : true;

  const { setIsDialogOpen: setIsCodeDialogOpen, menuTriggerRef: codeMenuTriggerRef } =
    codeApiKeyForm;
  const { setIsDialogOpen: setIsSearchDialogOpen, menuTriggerRef: searchMenuTriggerRef } =
    searchApiKeyForm;
  const { authData: webSearchAuthData } = webSearch;
  const { authData: codeAuthData } = codeInterpreter;

  const canUseWebSearch = useHasAccess({
    permissionType: PermissionTypes.WEB_SEARCH,
    permission: Permissions.USE,
  });
  const canRunCode = useHasAccess({
    permissionType: PermissionTypes.RUN_CODE,
    permission: Permissions.USE,
  });
  const canUseFileSearch = useHasAccess({
    permissionType: PermissionTypes.FILE_SEARCH,
    permission: Permissions.USE,
  });
  const canUseMcp = useHasAccess({
    permissionType: PermissionTypes.MCP_SERVERS,
    permission: Permissions.USE,
  });

  const showWebSearchSettings = useMemo(() => {
    const authTypes = webSearchAuthData?.authTypes ?? [];
    if (authTypes.length === 0) return true;
    return !authTypes.every(([, authType]) => authType === AuthType.SYSTEM_DEFINED);
  }, [webSearchAuthData?.authTypes]);

  const showCodeSettings = useMemo(
    () => codeAuthData?.message !== AuthType.SYSTEM_DEFINED,
    [codeAuthData?.message],
  );

  const handleWebSearchToggle = useCallback(() => {
    webSearch.debouncedChange({ value: !webSearch.toggleState });
  }, [webSearch]);
  const handleCodeToggle = useCallback(() => {
    codeInterpreter.debouncedChange({ value: !codeInterpreter.toggleState });
  }, [codeInterpreter]);
  const handleFileSearchToggle = useCallback(() => {
    fileSearch.debouncedChange({ value: !fileSearch.toggleState });
  }, [fileSearch]);
  const handleArtifactsToggle = useCallback(() => {
    const current = artifacts.toggleState;
    artifacts.debouncedChange({ value: !current || current === '' ? ArtifactModes.DEFAULT : '' });
  }, [artifacts]);

  const toggleItem = (
    active: boolean,
    icon: React.ReactNode,
    label: string,
    onToggle: () => void,
    settings?: { show: boolean; onOpen: () => void; ref?: React.Ref<HTMLButtonElement> },
  ): MenuItemProps => ({
    onClick: onToggle,
    hideOnClick: false,
    ariaChecked: active,
    render: (props) => (
      <div {...props}>
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {settings?.show && (
            <button
              type="button"
              ref={settings.ref}
              aria-label={localize('com_ui_settings')}
              onClick={(e) => {
                e.stopPropagation();
                settings.onOpen();
              }}
              className="rounded p-1 text-text-secondary transition-all duration-200 hover:bg-surface-secondary hover:text-text-primary"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <Check
            className={cn(
              'h-4 w-4 text-text-primary transition-opacity',
              active ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden="true"
          />
        </div>
      </div>
    ),
  });

  const items: MenuItemProps[] = [];

  if (upload.available && upload.uploadItems.length > 0) {
    items.push({
      label: localize('com_ui_add_photos_files'),
      icon: <Paperclip className="icon-md" aria-hidden="true" />,
      subItems: upload.uploadItems,
    });
  }

  const toolItems: MenuItemProps[] = [];
  if (showTools && canUseFileSearch && fileSearchEnabled) {
    toolItems.push(
      toggleItem(
        !!fileSearch.toggleState,
        <VectorIcon className="icon-md" />,
        localize('com_assistants_file_search'),
        handleFileSearchToggle,
      ),
    );
  }
  if (showTools && canUseWebSearch && webSearchEnabled) {
    toolItems.push(
      toggleItem(
        !!webSearch.toggleState,
        <Globe className="icon-md" aria-hidden="true" />,
        localize('com_ui_web_search'),
        handleWebSearchToggle,
        {
          show: showWebSearchSettings,
          onOpen: () => setIsSearchDialogOpen(true),
          ref: searchMenuTriggerRef,
        },
      ),
    );
  }
  if (showTools && canRunCode && codeEnabled) {
    toolItems.push(
      toggleItem(
        !!codeInterpreter.toggleState,
        <TerminalSquareIcon className="icon-md" aria-hidden="true" />,
        localize('com_assistants_code_interpreter'),
        handleCodeToggle,
        {
          show: showCodeSettings,
          onOpen: () => setIsCodeDialogOpen(true),
          ref: codeMenuTriggerRef,
        },
      ),
    );
  }
  if (showTools && artifactsEnabled) {
    toolItems.push(
      toggleItem(
        !!artifacts.toggleState,
        <WandSparkles className="icon-md" aria-hidden="true" />,
        localize('com_ui_artifacts'),
        handleArtifactsToggle,
      ),
    );
  }

  const { availableMCPServers } = mcpServerManager;
  if (
    showTools &&
    canUseMcp &&
    mcpAllowed &&
    availableMCPServers &&
    availableMCPServers.length > 0
  ) {
    toolItems.push({
      hideOnClick: false,
      render: (props) => (
        <MCPSubMenu {...props} showPin={false} label={localize('com_ui_connectors')} />
      ),
    });
  }

  if (toolItems.length > 0) {
    if (items.length > 0) {
      items.push({ separate: true });
    }
    items.push(...toolItems);
  }

  if (items.length === 0) {
    return null;
  }

  const trigger = (
    <TooltipAnchor
      description={localize('com_ui_add')}
      disabled={isDisabled || isOpen}
      render={
        <Ariakit.MenuButton
          disabled={isDisabled}
          id="composer-plus-button"
          aria-label={localize('com_ui_add')}
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-text-secondary transition-colors',
            'hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50',
            isOpen && 'bg-surface-hover text-text-primary',
          )}
        >
          <Plus className="size-5" aria-hidden="true" />
        </Ariakit.MenuButton>
      }
      id="composer-plus-button"
    />
  );

  return (
    <FileUpload ref={upload.inputRef} handleFileChange={upload.handleFileChange}>
      <DropdownPopup
        menuId="composer-plus-menu"
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        modal={true}
        unmountOnHide={true}
        trigger={trigger}
        items={items}
        iconClassName="mr-0"
        itemClassName="flex w-full cursor-pointer rounded-lg items-center justify-between hover:bg-surface-hover gap-5"
      />
      {upload.sharePointDialog}
    </FileUpload>
  );
}

export default React.memo(PlusMenu);
