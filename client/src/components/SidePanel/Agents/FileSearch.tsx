import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Folder, X } from 'lucide-react';
import * as Ariakit from '@ariakit/react';
import { useFormContext } from 'react-hook-form';
import { SharePointIcon, AttachmentIcon, DropdownPopup } from '@librechat/client';
import { EModelEndpoint, EToolResources, AgentCapabilities } from 'librechat-data-provider';
import type { ExtendedFile, AgentForm } from '~/common';
import { useSharePointFileHandlingNoChatContext } from '~/hooks/Files/useSharePointFileHandling';
import { useFileHandlingNoChatContext } from '~/hooks/Files/useFileHandling';
import { useAgentFileConfig, useLocalize, useLazyEffect } from '~/hooks';
import { SharePointPickerDialog } from '~/components/SharePoint';
import FileRow from '~/components/Chat/Input/Files/FileRow';
import { useGetStartupConfig } from '~/data-provider';
import { isEphemeralAgent } from '~/common';

function FileSearch({
  agent_id,
  files: _files,
}: {
  agent_id: string;
  files?: [string, ExtendedFile][];
}) {
  const localize = useLocalize();
  const { setValue } = useFormContext<AgentForm>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Map<string, ExtendedFile>>(new Map());
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const fileHandlingState = useMemo(() => ({ files, setFiles, conversation: null }), [files]);
  const [isPopoverActive, setIsPopoverActive] = useState(false);
  const [isSharePointDialogOpen, setIsSharePointDialogOpen] = useState(false);

  const { data: startupConfig } = useGetStartupConfig();
  const { endpointFileConfig, providerValue, endpointType } = useAgentFileConfig();
  const endpointOverride = providerValue || EModelEndpoint.agents;
  const isEphemeral = isEphemeralAgent(agent_id);

  const { handleFileChange } = useFileHandlingNoChatContext(
    {
      additionalMetadata: { agent_id, tool_resource: EToolResources.file_search },
      endpointOverride,
      endpointTypeOverride: endpointType,
      fileSetter: setFiles,
    },
    fileHandlingState,
  );

  const { handleSharePointFiles, isProcessing, downloadProgress } =
    useSharePointFileHandlingNoChatContext(
      {
        additionalMetadata: { agent_id, tool_resource: EToolResources.file_search },
        endpointOverride,
        endpointTypeOverride: endpointType,
        fileSetter: setFiles,
      },
      fileHandlingState,
    );

  useLazyEffect(
    () => {
      if (_files) {
        setFiles(new Map(_files));
      }
    },
    [_files],
    750,
  );

  useEffect(() => {
    if (files.size > 0 || queuedFiles.length > 0) {
      setValue(AgentCapabilities.file_search as keyof AgentForm, true, { shouldDirty: true });
    }
  }, [files.size, queuedFiles.length, setValue]);

  // When agent transitions from ephemeral → real, flush any queued files.
  useEffect(() => {
    if (isEphemeral || queuedFiles.length === 0) {
      return;
    }
    const dt = new DataTransfer();
    queuedFiles.forEach((f) => dt.items.add(f));
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
      handleFileChange({
        target: fileInputRef.current,
        currentTarget: fileInputRef.current,
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
    setQueuedFiles([]);
    // handleFileChange identity changes per render; only flush on agent_id transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEphemeral]);

  const isUploadDisabled = endpointFileConfig?.disabled ?? false;
  const sharePointEnabled = startupConfig?.sharePointFilePickerEnabled;

  const handleSharePointFilesSelected = async (sharePointFiles: any[]) => {
    try {
      await handleSharePointFiles(sharePointFiles);
      setIsSharePointDialogOpen(false);
    } catch (error) {
      console.error('SharePoint file processing error:', error);
    }
  };
  if (isUploadDisabled) {
    return null;
  }

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  const handleLocalFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEphemeral) {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length > 0) {
        setQueuedFiles((prev) => [...prev, ...selected]);
      }
      return;
    }
    handleFileChange(e);
  };

  const removeQueuedFile = (index: number) => {
    setQueuedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const dropdownItems = [
    {
      label: localize('com_files_upload_local_machine'),
      onClick: handleLocalFileClick,
      icon: <Folder className="icon-md" />,
    },
    {
      label: localize('com_files_upload_sharepoint'),
      onClick: () => setIsSharePointDialogOpen(true),
      icon: <SharePointIcon className="icon-md" />,
    },
  ];

  const menuTrigger = (
    <Ariakit.MenuButton className="btn btn-neutral border-token-border-light relative h-9 w-full rounded-lg text-sm font-medium">
      <div className="flex w-full items-center justify-center gap-1">
        <AttachmentIcon className="text-token-text-primary h-4 w-4" />
        {localize('com_ui_upload_file_search')}
      </div>
    </Ariakit.MenuButton>
  );

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center gap-2">
        <span>
          <label className="text-token-text-primary block text-sm font-medium">
            {localize('com_agents_file_search_label')}
          </label>
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <FileRow
          files={files}
          setFiles={setFiles}
          agent_id={agent_id}
          tool_resource={EToolResources.file_search}
          Wrapper={({ children }) => <div className="flex flex-wrap gap-2">{children}</div>}
        />
        {queuedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {queuedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-1 rounded-md border border-border-medium bg-surface-tertiary px-2 py-1 text-xs"
              >
                <span className="max-w-[12rem] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeQueuedFile(idx)}
                  className="rounded p-0.5 hover:bg-surface-hover"
                  aria-label={localize('com_ui_delete')}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div>
          {sharePointEnabled ? (
            <DropdownPopup
              gutter={2}
              menuId="file-search-upload-menu"
              isOpen={isPopoverActive}
              setIsOpen={setIsPopoverActive}
              trigger={menuTrigger}
              items={dropdownItems}
              modal={true}
              unmountOnHide={true}
            />
          ) : (
            <button
              type="button"
              className="btn btn-neutral border-token-border-light relative h-9 w-full rounded-lg text-sm font-medium"
              onClick={handleButtonClick}
            >
              <div className="flex w-full items-center justify-center gap-1">
                <AttachmentIcon className="text-token-text-primary h-4 w-4" />
                {localize('com_ui_upload_file_search')}
              </div>
            </button>
          )}
          <input
            multiple={true}
            type="file"
            style={{ display: 'none' }}
            tabIndex={-1}
            ref={fileInputRef}
            onChange={handleInputChange}
          />
        </div>
        {isEphemeral && queuedFiles.length > 0 && (
          <div className="text-xs text-text-secondary">
            {localize('com_ui_ux_files_queued_until_save')}
          </div>
        )}
      </div>

      <SharePointPickerDialog
        isOpen={isSharePointDialogOpen}
        onOpenChange={setIsSharePointDialogOpen}
        onFilesSelected={handleSharePointFilesSelected}
        disabled={false}
        isDownloading={isProcessing}
        downloadProgress={downloadProgress}
        maxSelectionCount={endpointFileConfig?.fileLimit}
      />
    </div>
  );
}

const MemoizedFileSearch = memo(FileSearch);
MemoizedFileSearch.displayName = 'FileSearch';

export default MemoizedFileSearch;
