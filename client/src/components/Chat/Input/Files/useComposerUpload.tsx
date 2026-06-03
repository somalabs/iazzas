import React, { useRef, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import {
  FileSearch,
  ImageUpIcon,
  FileType2Icon,
  FileImageIcon,
  TerminalSquareIcon,
} from 'lucide-react';
import { FileUpload, SharePointIcon } from '@librechat/client';
import {
  Constants,
  Providers,
  supportsFiles,
  mergeFileConfig,
  EToolResources,
  EModelEndpoint,
  isAgentsEndpoint,
  resolveEndpointType,
  isAssistantsEndpoint,
  getEndpointFileConfig,
  defaultAgentCapabilities,
  bedrockDocumentExtensions,
  isDocumentSupportedProvider,
} from 'librechat-data-provider';
import type { TConversation } from 'librechat-data-provider';
import type { MenuItemProps, ExtendedFile, FileSetter } from '~/common';
import {
  useLocalize,
  useAgentCapabilities,
  useGetAgentsConfig,
  useAgentToolPermissions,
  useFileHandlingNoChatContext,
} from '~/hooks';
import {
  useGetFileConfig,
  useGetStartupConfig,
  useGetEndpointsQuery,
  useGetAgentByIdQuery,
} from '~/data-provider';
import { useSharePointFileHandlingNoChatContext } from '~/hooks/Files/useSharePointFileHandling';
import { SharePointPickerDialog } from '~/components/SharePoint';
import { useAgentsMapContext } from '~/Providers';
import { ephemeralAgentByConvoId } from '~/store';

type FileUploadType =
  | 'image'
  | 'document'
  | 'image_document'
  | 'image_document_extended'
  | 'image_document_video_audio';

interface ComposerUploadParams {
  conversation: TConversation | null;
  disabled: boolean;
  files: Map<string, ExtendedFile>;
  setFiles: FileSetter;
  setFilesLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ComposerUpload {
  available: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadItems: MenuItemProps[];
  sharePointDialog: React.ReactNode;
}

/**
 * Consolidates the file-upload affordance of the composer (previously split
 * across AttachFileChat + AttachFileMenu) into a single reusable unit so the
 * PlusMenu can host "Adicionar fotos e arquivos" alongside the tools and
 * connectors, Claude-style. Returns the hidden input ref, the change handler,
 * the dropdown items, and the SharePoint dialog node.
 */
export default function useComposerUpload({
  conversation,
  disabled,
  files,
  setFiles,
  setFilesLoading,
}: ComposerUploadParams): ComposerUpload {
  const localize = useLocalize();
  const { endpoint } = conversation ?? { endpoint: null };
  const conversationId = conversation?.conversationId ?? Constants.NEW_CONVO;
  const isAgents = useMemo(() => isAgentsEndpoint(endpoint), [endpoint]);
  const isAssistants = useMemo(() => isAssistantsEndpoint(endpoint), [endpoint]);

  const agentsMap = useAgentsMapContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [toolResource, setToolResource] = useState<EToolResources | undefined>();
  const [ephemeralAgent, setEphemeralAgent] = useRecoilState(
    ephemeralAgentByConvoId(conversationId),
  );
  const [isSharePointDialogOpen, setIsSharePointDialogOpen] = useState(false);

  const needsAgentFetch = useMemo(() => {
    if (!isAgents || !conversation?.agent_id) {
      return false;
    }
    const agent = agentsMap?.[conversation.agent_id];
    return !agent?.model_parameters;
  }, [isAgents, conversation?.agent_id, agentsMap]);

  const { data: agentData } = useGetAgentByIdQuery(conversation?.agent_id, {
    enabled: needsAgentFetch,
  });

  const useResponsesApi = useMemo(() => {
    if (!isAgents || !conversation?.agent_id || conversation?.useResponsesApi) {
      return conversation?.useResponsesApi;
    }
    const agent = agentData || agentsMap?.[conversation.agent_id];
    return agent?.model_parameters?.useResponsesApi;
  }, [isAgents, conversation?.agent_id, conversation?.useResponsesApi, agentData, agentsMap]);

  const { data: fileConfig = null } = useGetFileConfig({ select: (data) => mergeFileConfig(data) });
  const { data: endpointsConfig } = useGetEndpointsQuery();
  const { agentsConfig } = useGetAgentsConfig();
  const { data: startupConfig } = useGetStartupConfig();
  const sharePointEnabled = startupConfig?.sharePointFilePickerEnabled;

  const agentProvider = useMemo(() => {
    if (!isAgents || !conversation?.agent_id) {
      return undefined;
    }
    const agent = agentData || agentsMap?.[conversation.agent_id];
    return agent?.provider;
  }, [isAgents, conversation?.agent_id, agentData, agentsMap]);

  const endpointType = useMemo(
    () => resolveEndpointType(endpointsConfig, endpoint, agentProvider),
    [endpointsConfig, endpoint, agentProvider],
  );
  const fileConfigEndpoint = useMemo(
    () => (isAgents && agentProvider ? agentProvider : endpoint),
    [isAgents, agentProvider, endpoint],
  );
  const endpointFileConfig = useMemo(
    () => getEndpointFileConfig({ fileConfig, endpointType, endpoint: fileConfigEndpoint }),
    [fileConfigEndpoint, fileConfig, endpointType],
  );
  const endpointSupportsFiles: boolean = useMemo(
    () => supportsFiles[endpointType ?? endpoint ?? ''] ?? false,
    [endpointType, endpoint],
  );
  const isUploadDisabled = useMemo(
    () => (disabled || endpointFileConfig?.disabled) ?? false,
    [disabled, endpointFileConfig?.disabled],
  );

  const capabilities = useAgentCapabilities(agentsConfig?.capabilities ?? defaultAgentCapabilities);
  const { fileSearchAllowedByAgent, codeAllowedByAgent, provider } = useAgentToolPermissions(
    conversation?.agent_id,
    ephemeralAgent,
  );

  const { handleFileChange: rawHandleFileChange } = useFileHandlingNoChatContext(undefined, {
    files,
    setFiles,
    setFilesLoading,
    conversation,
  });
  const { handleSharePointFiles, isProcessing, downloadProgress } =
    useSharePointFileHandlingNoChatContext(
      { toolResource },
      { files, setFiles, setFilesLoading, conversation },
    );

  const handleUploadClick = (fileType?: FileUploadType) => {
    if (!inputRef.current) {
      return;
    }
    inputRef.current.value = '';
    if (fileType === 'image') {
      inputRef.current.accept = 'image/*,.heif,.heic';
    } else if (fileType === 'document') {
      inputRef.current.accept = '.pdf,application/pdf';
    } else if (fileType === 'image_document') {
      inputRef.current.accept = 'image/*,.heif,.heic,.pdf,application/pdf';
    } else if (fileType === 'image_document_extended') {
      inputRef.current.accept = `image/*,.heif,.heic,${bedrockDocumentExtensions}`;
    } else if (fileType === 'image_document_video_audio') {
      inputRef.current.accept = `image/*,.heif,.heic,.pdf,application/pdf,video/*,audio/*,${bedrockDocumentExtensions}`;
    } else {
      inputRef.current.accept = '';
    }
    inputRef.current.click();
    inputRef.current.accept = '';
  };

  const uploadItems = useMemo(() => {
    const createMenuItems = (onAction: (fileType?: FileUploadType) => void) => {
      const items: MenuItemProps[] = [];
      let currentProvider = provider || endpoint;
      if (currentProvider?.toLowerCase() === Providers.OPENROUTER) {
        currentProvider = Providers.OPENROUTER;
      }
      const isAzureWithResponsesApi =
        currentProvider === EModelEndpoint.azureOpenAI && useResponsesApi;

      if (
        isDocumentSupportedProvider(endpointType) ||
        isDocumentSupportedProvider(currentProvider) ||
        isAzureWithResponsesApi
      ) {
        items.push({
          label: localize('com_ui_upload_provider'),
          onClick: () => {
            setToolResource(undefined);
            let fileType: Exclude<FileUploadType, 'image' | 'document'> = 'image_document';
            if (currentProvider === Providers.GOOGLE || currentProvider === Providers.OPENROUTER) {
              fileType = 'image_document_video_audio';
            } else if (
              currentProvider === Providers.BEDROCK ||
              endpointType === EModelEndpoint.bedrock
            ) {
              fileType = 'image_document_extended';
            }
            onAction(fileType);
          },
          icon: <FileImageIcon className="icon-md" />,
        });
      } else {
        items.push({
          label: localize('com_ui_upload_image_input'),
          onClick: () => {
            setToolResource(undefined);
            onAction('image');
          },
          icon: <ImageUpIcon className="icon-md" />,
        });
      }

      if (capabilities.contextEnabled) {
        items.push({
          label: localize('com_ui_upload_ocr_text'),
          onClick: () => {
            setToolResource(EToolResources.context);
            onAction();
          },
          icon: <FileType2Icon className="icon-md" />,
        });
      }

      if (capabilities.fileSearchEnabled && fileSearchAllowedByAgent) {
        items.push({
          label: localize('com_ui_upload_file_search'),
          onClick: () => {
            setToolResource(EToolResources.file_search);
            setEphemeralAgent((prev) => ({ ...prev, [EToolResources.file_search]: true }));
            onAction();
          },
          icon: <FileSearch className="icon-md" />,
        });
      }

      if (capabilities.codeEnabled && codeAllowedByAgent) {
        items.push({
          label: localize('com_ui_upload_code_files'),
          onClick: () => {
            setToolResource(EToolResources.execute_code);
            setEphemeralAgent((prev) => ({ ...prev, [EToolResources.execute_code]: true }));
            onAction();
          },
          icon: <TerminalSquareIcon className="icon-md" />,
        });
      }

      return items;
    };

    const localItems = createMenuItems(handleUploadClick);
    if (sharePointEnabled) {
      const sharePointItems = createMenuItems(() => setIsSharePointDialogOpen(true));
      localItems.push({
        label: localize('com_files_upload_sharepoint'),
        onClick: () => {},
        icon: <SharePointIcon className="icon-md" />,
        subItems: sharePointItems,
      });
    }
    return localItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    localize,
    endpoint,
    provider,
    endpointType,
    capabilities,
    useResponsesApi,
    sharePointEnabled,
    codeAllowedByAgent,
    fileSearchAllowedByAgent,
  ]);

  const handleSharePointFilesSelected = async (sharePointFiles: unknown[]) => {
    try {
      await handleSharePointFiles(sharePointFiles);
      setIsSharePointDialogOpen(false);
    } catch (error) {
      console.error('SharePoint file processing error:', error);
    }
  };

  const available =
    !isUploadDisabled && (isAssistants ? endpointSupportsFiles : isAgents || endpointSupportsFiles);

  const sharePointDialog = sharePointEnabled ? (
    <SharePointPickerDialog
      isOpen={isSharePointDialogOpen}
      onOpenChange={setIsSharePointDialogOpen}
      onFilesSelected={handleSharePointFilesSelected}
      isDownloading={isProcessing}
      downloadProgress={downloadProgress}
      maxSelectionCount={endpointFileConfig?.fileLimit}
    />
  ) : null;

  return {
    available,
    inputRef,
    handleFileChange: (event) => rawHandleFileChange(event, toolResource),
    uploadItems,
    sharePointDialog,
  };
}

export { FileUpload };
