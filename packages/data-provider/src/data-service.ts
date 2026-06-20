import type { AxiosResponse } from 'axios';
import type * as t from './types';
import * as endpoints from './api-endpoints';
import * as a from './types/assistants';
import * as ag from './types/agents';
import * as m from './types/mutations';
import * as q from './types/queries';
import * as f from './types/files';
import * as mcp from './types/mcpServers';
import * as fl from './types/flow';
import * as au from './types/automations';
import * as config from './config';
import request from './request';
import * as s from './schemas';
import * as r from './roles';
import * as permissions from './accessPermissions';

export function revokeUserKey(name: string): Promise<unknown> {
  return request.delete(endpoints.revokeUserKey(name));
}

export function revokeAllUserKeys(): Promise<unknown> {
  return request.delete(endpoints.revokeAllUserKeys());
}

export function deleteUser(payload?: t.TDeleteUserRequest): Promise<unknown> {
  return request.deleteWithOptions(endpoints.deleteUser(), { data: payload });
}

export type FavoriteItem = {
  agentId?: string;
  model?: string;
  endpoint?: string;
};

export function getFavorites(): Promise<FavoriteItem[]> {
  return request.get(`${endpoints.apiBaseUrl()}/api/user/settings/favorites`);
}

export function updateFavorites(favorites: FavoriteItem[]): Promise<FavoriteItem[]> {
  return request.post(`${endpoints.apiBaseUrl()}/api/user/settings/favorites`, { favorites });
}

export function getSharedMessages(shareId: string): Promise<t.TSharedMessagesResponse> {
  return request.get(endpoints.shareMessages(shareId));
}

export const listSharedLinks = async (
  params: q.SharedLinksListParams,
): Promise<q.SharedLinksResponse> => {
  const { pageSize, isPublic, sortBy, sortDirection, search, cursor } = params;

  return request.get(
    endpoints.getSharedLinks(pageSize, isPublic, sortBy, sortDirection, search, cursor),
  );
};

export function getSharedLink(conversationId: string): Promise<t.TSharedLinkGetResponse> {
  return request.get(endpoints.getSharedLink(conversationId));
}

export function createSharedLink(
  conversationId: string,
  targetMessageId?: string,
): Promise<t.TSharedLinkResponse> {
  return request.post(endpoints.createSharedLink(conversationId), { targetMessageId });
}

export function updateSharedLink(shareId: string): Promise<t.TSharedLinkResponse> {
  return request.patch(endpoints.updateSharedLink(shareId));
}

export function deleteSharedLink(shareId: string): Promise<m.TDeleteSharedLinkResponse> {
  return request.delete(endpoints.shareMessages(shareId));
}

export function updateUserKey(payload: t.TUpdateUserKeyRequest) {
  const { value } = payload;
  if (!value) {
    throw new Error('value is required');
  }

  return request.put(endpoints.keys(), payload);
}

export function getAgentApiKeys(): Promise<t.TAgentApiKeyListResponse> {
  return request.get(endpoints.apiKeys());
}

export function createAgentApiKey(
  payload: t.TAgentApiKeyCreateRequest,
): Promise<t.TAgentApiKeyCreateResponse> {
  return request.post(endpoints.apiKeys(), payload);
}

export function deleteAgentApiKey(id: string): Promise<void> {
  return request.delete(endpoints.apiKeyById(id));
}

export function getPresets(): Promise<s.TPreset[]> {
  return request.get(endpoints.presets());
}

export function createPreset(payload: s.TPreset): Promise<s.TPreset> {
  return request.post(endpoints.presets(), payload);
}

export function updatePreset(payload: s.TPreset): Promise<s.TPreset> {
  return request.post(endpoints.presets(), payload);
}

export function deletePreset(arg: s.TPreset | undefined): Promise<m.PresetDeleteResponse> {
  return request.post(endpoints.deletePreset(), arg);
}

export function getSearchEnabled(): Promise<boolean> {
  return request.get(endpoints.searchEnabled());
}

export function getUser(): Promise<t.TUser> {
  return request.get(endpoints.user());
}

export function getUserBalance(): Promise<t.TBalanceResponse> {
  return request.get(endpoints.balance());
}

export const updateTokenCount = (text: string) => {
  return request.post(endpoints.tokenizer(), { arg: text });
};

export const login = (payload: t.TLoginUser): Promise<t.TLoginResponse> => {
  return request.post(endpoints.login(), payload);
};

export const logout = (): Promise<m.TLogoutResponse> => {
  return request.post(endpoints.logout());
};

export const register = (payload: t.TRegisterUser) => {
  return request.post(endpoints.register(), payload);
};

export const userKeyQuery = (name: string): Promise<t.TCheckUserKeyResponse> =>
  request.get(endpoints.userKeyQuery(name));

export const getLoginGoogle = () => {
  return request.get(endpoints.loginGoogle());
};

export const requestPasswordReset = (
  payload: t.TRequestPasswordReset,
): Promise<t.TRequestPasswordResetResponse> => {
  return request.post(endpoints.requestPasswordReset(), payload);
};

export const resetPassword = (payload: t.TResetPassword) => {
  return request.post(endpoints.resetPassword(), payload);
};

export const verifyEmail = (payload: t.TVerifyEmail): Promise<t.VerifyEmailResponse> => {
  return request.post(endpoints.verifyEmail(), payload);
};

export const resendVerificationEmail = (
  payload: t.TResendVerificationEmail,
): Promise<t.VerifyEmailResponse> => {
  return request.post(endpoints.resendVerificationEmail(), payload);
};

export const getAvailablePlugins = (): Promise<s.TPlugin[]> => {
  return request.get(endpoints.plugins());
};

export const updateUserPlugins = (payload: t.TUpdateUserPlugins) => {
  return request.post(endpoints.userPlugins(), payload);
};

export const reinitializeMCPServer = (serverName: string) => {
  return request.post(endpoints.mcpReinitialize(serverName));
};

export const bindMCPOAuth = (serverName: string): Promise<{ success: boolean }> => {
  return request.post(endpoints.mcpOAuthBind(serverName));
};

export const bindActionOAuth = (actionId: string): Promise<{ success: boolean }> => {
  return request.post(endpoints.actionOAuthBind(actionId));
};

export const getMCPConnectionStatus = (): Promise<q.MCPConnectionStatusResponse> => {
  return request.get(endpoints.mcpConnectionStatus());
};

export const getMCPServerConnectionStatus = (
  serverName: string,
): Promise<q.MCPServerConnectionStatusResponse> => {
  return request.get(endpoints.mcpServerConnectionStatus(serverName));
};

export const getMCPAuthValues = (serverName: string): Promise<q.MCPAuthValuesResponse> => {
  return request.get(endpoints.mcpAuthValues(serverName));
};

export function cancelMCPOAuth(serverName: string): Promise<m.CancelMCPOAuthResponse> {
  return request.post(endpoints.cancelMCPOAuth(serverName), {});
}

/* Config */

export const getStartupConfig = (): Promise<
  config.TStartupConfig & {
    mcpCustomUserVars?: Record<string, { title: string; description: string }>;
  }
> => {
  return request.get(endpoints.config());
};

export const getAIEndpoints = (): Promise<t.TEndpointsConfig> => {
  return request.get(endpoints.aiEndpoints());
};

export const getModels = async (): Promise<t.TModelsConfig> => {
  return request.get(endpoints.models());
};

/* Assistants */

export const createAssistant = ({
  version,
  ...data
}: a.AssistantCreateParams): Promise<a.Assistant> => {
  return request.post(endpoints.assistants({ version }), data);
};

export const getAssistantById = ({
  endpoint,
  assistant_id,
  version,
}: {
  endpoint: s.AssistantsEndpoint;
  assistant_id: string;
  version: number | string | number;
}): Promise<a.Assistant> => {
  return request.get(
    endpoints.assistants({
      path: assistant_id,
      endpoint,
      version,
    }),
  );
};

export const updateAssistant = ({
  assistant_id,
  data,
  version,
}: {
  assistant_id: string;
  data: a.AssistantUpdateParams;
  version: number | string;
}): Promise<a.Assistant> => {
  return request.patch(
    endpoints.assistants({
      path: assistant_id,
      version,
    }),
    data,
  );
};

export const deleteAssistant = ({
  assistant_id,
  model,
  endpoint,
  version,
}: m.DeleteAssistantBody & { version: number | string }): Promise<void> => {
  return request.delete(
    endpoints.assistants({
      path: assistant_id,
      options: { model, endpoint },
      version,
    }),
  );
};

export const listAssistants = (
  params: a.AssistantListParams,
  version: number | string,
): Promise<a.AssistantListResponse> => {
  return request.get(
    endpoints.assistants({
      version,
      options: params,
    }),
  );
};

export function getAssistantDocs({
  endpoint,
  version,
}: {
  endpoint: s.AssistantsEndpoint | string;
  version: number | string;
}): Promise<a.AssistantDocument[]> {
  if (!s.isAssistantsEndpoint(endpoint)) {
    return Promise.resolve([]);
  }
  return request.get(
    endpoints.assistants({
      path: 'documents',
      version,
      options: { endpoint },
      endpoint: endpoint as s.AssistantsEndpoint,
    }),
  );
}

/* Tools */

export const getAvailableTools = (
  _endpoint: s.AssistantsEndpoint | s.EModelEndpoint.agents,
  version?: number | string,
): Promise<s.TPlugin[]> => {
  let path = '';
  if (s.isAssistantsEndpoint(_endpoint)) {
    const endpoint = _endpoint as s.AssistantsEndpoint;
    path = endpoints.assistants({
      path: 'tools',
      endpoint: endpoint,
      version: version ?? config.defaultAssistantsVersion[endpoint],
    });
  } else {
    path = endpoints.agents({
      path: 'tools',
    });
  }

  return request.get(path);
};

/* MCP Tools - Decoupled from regular tools */

export const getMCPTools = (): Promise<q.MCPServersResponse> => {
  return request.get(endpoints.mcp.tools);
};

export const getVerifyAgentToolAuth = (
  params: q.VerifyToolAuthParams,
): Promise<q.VerifyToolAuthResponse> => {
  return request.get(
    endpoints.agents({
      path: `tools/${params.toolId}/auth`,
    }),
  );
};

export const callTool = <T extends m.ToolId>({
  toolId,
  toolParams,
}: {
  toolId: T;
  toolParams: m.ToolParams<T>;
}): Promise<m.ToolCallResponse> => {
  return request.post(
    endpoints.agents({
      path: `tools/${toolId}/call`,
    }),
    toolParams,
  );
};

export const getToolCalls = (params: q.GetToolCallParams): Promise<q.ToolCallResults> => {
  return request.get(
    endpoints.agents({
      path: 'tools/calls',
      options: params,
    }),
  );
};

/* Files */

export const getFiles = (): Promise<f.TFile[]> => {
  return request.get(endpoints.files());
};

export const getAgentFiles = (agentId: string): Promise<f.TFile[]> => {
  return request.get(endpoints.agentFiles(agentId));
};

export const getFileConfig = (): Promise<f.FileConfig> => {
  return request.get(`${endpoints.files()}/config`);
};

export const uploadImage = (
  data: FormData,
  signal?: AbortSignal | null,
): Promise<f.TFileUpload> => {
  const requestConfig = signal ? { signal } : undefined;
  return request.postMultiPart(endpoints.images(), data, requestConfig);
};

export const uploadFile = (data: FormData, signal?: AbortSignal | null): Promise<f.TFileUpload> => {
  const requestConfig = signal ? { signal } : undefined;
  return request.postMultiPart(endpoints.files(), data, requestConfig);
};

/* actions */

export const updateAction = (data: m.UpdateActionVariables): Promise<m.UpdateActionResponse> => {
  const { assistant_id, version, ...body } = data;
  return request.post(
    endpoints.assistants({
      path: `actions/${assistant_id}`,
      version,
    }),
    body,
  );
};

export function getActions(): Promise<ag.Action[]> {
  return request.get(
    endpoints.agents({
      path: 'actions',
    }),
  );
}

export const deleteAction = async ({
  assistant_id,
  action_id,
  model,
  version,
  endpoint,
}: m.DeleteActionVariables & { version: number | string }): Promise<void> =>
  request.delete(
    endpoints.assistants({
      path: `actions/${assistant_id}/${action_id}/${model}`,
      version,
      endpoint,
    }),
  );

/**
 * Agents
 */

export const createAgent = ({ ...data }: a.AgentCreateParams): Promise<a.Agent> => {
  return request.post(endpoints.agents({}), data);
};

export const getAgentById = ({ agent_id }: { agent_id: string }): Promise<a.Agent> => {
  return request.get(
    endpoints.agents({
      path: agent_id,
    }),
  );
};

export const getExpandedAgentById = ({ agent_id }: { agent_id: string }): Promise<a.Agent> => {
  return request.get(
    endpoints.agents({
      path: `${agent_id}/expanded`,
    }),
  );
};

export const updateAgent = ({
  agent_id,
  data,
}: {
  agent_id: string;
  data: a.AgentUpdateParams;
}): Promise<a.Agent> => {
  return request.patch(
    endpoints.agents({
      path: agent_id,
    }),
    data,
  );
};

export const duplicateAgent = ({
  agent_id,
}: m.DuplicateAgentBody): Promise<{ agent: a.Agent; actions: ag.Action[] }> => {
  return request.post(
    endpoints.agents({
      path: `${agent_id}/duplicate`,
    }),
  );
};

export const deleteAgent = ({ agent_id }: m.DeleteAgentBody): Promise<void> => {
  return request.delete(
    endpoints.agents({
      path: agent_id,
    }),
  );
};

export const listAgents = (params: a.AgentListParams): Promise<a.AgentListResponse> => {
  return request.get(
    endpoints.agents({
      options: params,
    }),
  );
};

export const revertAgentVersion = ({
  agent_id,
  version_index,
}: {
  agent_id: string;
  version_index: number;
}): Promise<a.Agent> => request.post(endpoints.revertAgentVersion(agent_id), { version_index });

export const verifyAgent = ({
  agent_id,
  is_verified,
}: {
  agent_id: string;
  is_verified: boolean;
}): Promise<a.Agent> => request.patch(endpoints.verifyAgent(agent_id), { is_verified });

/* Marketplace */

/**
 * Get agent categories with counts for marketplace tabs
 */
export const getAgentCategories = (): Promise<t.TMarketplaceCategory[]> => {
  return request.get(endpoints.agents({ path: 'categories' }));
};

/**
 * Unified marketplace agents endpoint with query string controls
 */
export const getMarketplaceAgents = (params: {
  requiredPermission: number;
  category?: string;
  search?: string;
  limit?: number;
  cursor?: string;
  promoted?: 0 | 1;
}): Promise<a.AgentListResponse> => {
  return request.get(
    endpoints.agents({
      // path: 'marketplace',
      options: params,
    }),
  );
};

/* Tools */

export const getAvailableAgentTools = (): Promise<s.TPlugin[]> => {
  return request.get(
    endpoints.agents({
      path: 'tools',
    }),
  );
};

/* Actions */

export const updateAgentAction = (
  data: m.UpdateAgentActionVariables,
): Promise<m.UpdateAgentActionResponse> => {
  const { agent_id, ...body } = data;
  return request.post(
    endpoints.agents({
      path: `actions/${agent_id}`,
    }),
    body,
  );
};

export const deleteAgentAction = async ({
  agent_id,
  action_id,
}: m.DeleteAgentActionVariables): Promise<void> =>
  request.delete(
    endpoints.agents({
      path: `actions/${agent_id}/${action_id}`,
    }),
  );

/**
 * MCP Servers
 */

/**
 *
 * Ensure and List loaded mcp server configs from the cache Enriched with effective permissions.
 */
export const getMCPServers = async (): Promise<mcp.MCPServersListResponse> => {
  return request.get(endpoints.mcp.servers);
};

/**
 * Get a single MCP server by ID
 */
export const getMCPServer = async (serverName: string): Promise<mcp.MCPServerDBObjectResponse> => {
  return request.get(endpoints.mcpServer(serverName));
};

/**
 * Create a new MCP server
 */
export const createMCPServer = async (
  data: mcp.MCPServerCreateParams,
): Promise<mcp.MCPServerDBObjectResponse> => {
  return request.post(endpoints.mcp.servers, data);
};

/**
 * Update an existing MCP server
 */
export const updateMCPServer = async (
  serverName: string,
  data: mcp.MCPServerUpdateParams,
): Promise<mcp.MCPServerDBObjectResponse> => {
  return request.patch(endpoints.mcpServer(serverName), data);
};

/**
 * Delete an MCP server
 */
export const deleteMCPServer = async (serverName: string): Promise<{ success: boolean }> => {
  return request.delete(endpoints.mcpServer(serverName));
};

/**
 * Imports a conversations file.
 *
 * @param data - The FormData containing the file to import.
 * @returns A Promise that resolves to the import start response.
 */
export const importConversationsFile = (data: FormData): Promise<t.TImportResponse> => {
  return request.postMultiPart(endpoints.importConversation(), data);
};

export const uploadAvatar = (data: FormData): Promise<f.AvatarUploadResponse> => {
  return request.postMultiPart(endpoints.avatar(), data);
};

export const uploadAssistantAvatar = (data: m.AssistantAvatarVariables): Promise<a.Assistant> => {
  return request.postMultiPart(
    endpoints.assistants({
      isAvatar: true,
      path: `${data.assistant_id}/avatar`,
      options: { model: data.model, endpoint: data.endpoint },
      version: data.version,
    }),
    data.formData,
  );
};

export const uploadAgentAvatar = (data: m.AgentAvatarVariables): Promise<a.Agent> => {
  return request.postMultiPart(
    `${endpoints.images()}/agents/${data.agent_id}/avatar`,
    data.formData,
  );
};

export const getFileDownload = async (userId: string, file_id: string): Promise<AxiosResponse> => {
  return request.getResponse(`${endpoints.files()}/download/${userId}/${file_id}`, {
    responseType: 'blob',
    headers: {
      Accept: 'application/octet-stream',
    },
  });
};

export const getCodeOutputDownload = async (url: string): Promise<AxiosResponse> => {
  return request.getResponse(url, {
    responseType: 'blob',
    headers: {
      Accept: 'application/octet-stream',
    },
  });
};

export const deleteFiles = async (payload: {
  files: f.BatchFile[];
  agent_id?: string;
  assistant_id?: string;
  tool_resource?: a.EToolResources;
}): Promise<f.DeleteFilesResponse> =>
  request.deleteWithOptions(endpoints.files(), {
    data: payload,
  });

/* Speech */

export const speechToText = (data: FormData): Promise<f.SpeechToTextResponse> => {
  return request.postMultiPart(endpoints.speechToText(), data);
};

export const textToSpeech = (data: FormData): Promise<ArrayBuffer> => {
  return request.postTTS(endpoints.textToSpeechManual(), data);
};

export const getVoices = (): Promise<f.VoiceResponse> => {
  return request.get(endpoints.textToSpeechVoices());
};

export const getCustomConfigSpeech = (): Promise<t.TCustomConfigSpeechResponse> => {
  return request.get(endpoints.getCustomConfigSpeech());
};

/* conversations */

export function duplicateConversation(
  payload: t.TDuplicateConvoRequest,
): Promise<t.TDuplicateConvoResponse> {
  return request.post(endpoints.duplicateConversation(), payload);
}

export function forkConversation(payload: t.TForkConvoRequest): Promise<t.TForkConvoResponse> {
  return request.post(endpoints.forkConversation(), payload);
}

export function deleteConversation(payload: t.TDeleteConversationRequest) {
  return request.deleteWithOptions(endpoints.deleteConversation(), { data: { arg: payload } });
}

export function clearAllConversations(): Promise<unknown> {
  return request.delete(endpoints.deleteAllConversation());
}

export const listConversations = (
  params?: q.ConversationListParams,
): Promise<q.ConversationListResponse> => {
  return request.get(endpoints.conversations(params ?? {}));
};

export function getConversations(cursor: string): Promise<t.TGetConversationsResponse> {
  return request.get(endpoints.conversations({ cursor }));
}

export function getConversationById(id: string): Promise<s.TConversation> {
  return request.get(endpoints.conversationById(id));
}

export function updateConversation(
  payload: t.TUpdateConversationRequest,
): Promise<t.TUpdateConversationResponse> {
  return request.post(endpoints.updateConversation(), { arg: payload });
}

export function archiveConversation(
  payload: t.TArchiveConversationRequest,
): Promise<t.TArchiveConversationResponse> {
  return request.post(endpoints.archiveConversation(), { arg: payload });
}

export function genTitle(payload: m.TGenTitleRequest): Promise<m.TGenTitleResponse> {
  return request.get(endpoints.genTitle(payload.conversationId));
}

export const listMessages = (params?: q.MessagesListParams): Promise<q.MessagesListResponse> => {
  return request.get(endpoints.messages(params ?? {}));
};

export function updateMessage(payload: t.TUpdateMessageRequest): Promise<unknown> {
  const { conversationId, messageId, text } = payload;
  if (!conversationId) {
    throw new Error('conversationId is required');
  }

  return request.put(endpoints.messages({ conversationId, messageId }), { text });
}

export function updateMessageContent(payload: t.TUpdateMessageContent): Promise<unknown> {
  const { conversationId, messageId, index, text } = payload;
  if (!conversationId) {
    throw new Error('conversationId is required');
  }

  return request.put(endpoints.messages({ conversationId, messageId }), { text, index });
}

export const editArtifact = async ({
  messageId,
  ...params
}: m.TEditArtifactRequest): Promise<m.TEditArtifactResponse> => {
  return request.post(endpoints.messagesArtifacts(messageId), params);
};

export const branchMessage = async (
  payload: m.TBranchMessageRequest,
): Promise<m.TBranchMessageResponse> => {
  return request.post(endpoints.messagesBranch(), payload);
};

export function getMessagesByConvoId(conversationId: string): Promise<s.TMessage[]> {
  if (
    conversationId === config.Constants.NEW_CONVO ||
    conversationId === config.Constants.PENDING_CONVO
  ) {
    return Promise.resolve([]);
  }
  return request.get(endpoints.messages({ conversationId }));
}

export function getPrompt(id: string): Promise<{ prompt: t.TPrompt }> {
  return request.get(endpoints.getPrompt(id));
}

export function getPrompts(filter: t.TPromptsWithFilterRequest): Promise<t.TPrompt[]> {
  return request.get(endpoints.getPromptsWithFilters(filter));
}

export function getAllPromptGroups(): Promise<q.AllPromptGroupsResponse> {
  return request.get(endpoints.getAllPromptGroups());
}

export function getPromptGroups(
  filter: t.TPromptGroupsWithFilterRequest,
): Promise<t.PromptGroupListResponse> {
  return request.get(endpoints.getPromptGroupsWithFilters(filter));
}

export function getPromptGroup(id: string): Promise<t.TPromptGroup> {
  return request.get(endpoints.getPromptGroup(id));
}

export function createPrompt(payload: t.TCreatePrompt): Promise<t.TCreatePromptResponse> {
  return request.post(endpoints.postPrompt(), payload);
}

export function addPromptToGroup(
  groupId: string,
  payload: t.TCreatePrompt,
): Promise<t.TCreatePromptResponse> {
  return request.post(endpoints.addPromptToGroup(groupId), payload);
}

export function updatePromptGroup(
  variables: t.TUpdatePromptGroupVariables,
): Promise<t.TUpdatePromptGroupResponse> {
  return request.patch(endpoints.updatePromptGroup(variables.id), variables.payload);
}

export function recordPromptGroupUsage(groupId: string): Promise<{ numberOfGenerations: number }> {
  return request.post(endpoints.recordPromptGroupUsage(groupId));
}

export function deletePrompt(payload: t.TDeletePromptVariables): Promise<t.TDeletePromptResponse> {
  return request.delete(endpoints.deletePrompt(payload));
}

export function makePromptProduction(id: string): Promise<t.TMakePromptProductionResponse> {
  return request.patch(endpoints.updatePromptTag(id));
}

export function updatePromptLabels(
  variables: t.TUpdatePromptLabelsRequest,
): Promise<t.TUpdatePromptLabelsResponse> {
  return request.patch(endpoints.updatePromptLabels(variables.id), variables.payload);
}

export function deletePromptGroup(id: string): Promise<t.TDeletePromptGroupResponse> {
  return request.delete(endpoints.deletePromptGroup(id));
}

export function getCategories(): Promise<t.TGetCategoriesResponse> {
  return request.get(endpoints.getCategories());
}

export function getRandomPrompts(
  variables: t.TGetRandomPromptsRequest,
): Promise<t.TGetRandomPromptsResponse> {
  return request.get(endpoints.getRandomPrompts(variables.limit, variables.skip));
}

/* Admin – Users */
export function listAdminUsers(params?: {
  limit?: number;
  offset?: number;
}): Promise<q.AdminUsersListResponse> {
  const query = params
    ? `?${Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`
    : '';
  return request.get(`${endpoints.adminUsers()}${query}`);
}

export function searchAdminUsers(
  query: string,
  limit?: number,
): Promise<q.AdminUsersSearchResponse> {
  const params = `?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`;
  return request.get(`${endpoints.adminUsersSearch()}${params}`);
}

export function getAdminUserUsage(
  id: string,
  params: { startDate: string; endDate: string; limit?: number; offset?: number },
): Promise<q.AdminUserUsageResponse> {
  const queryStr = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    ...(params.limit != null ? { limit: String(params.limit) } : {}),
    ...(params.offset != null ? { offset: String(params.offset) } : {}),
  }).toString();
  return request.get(`${endpoints.adminUserUsage(id)}?${queryStr}`);
}

export function adjustAdminUserBalance(
  id: string,
  body: { amount: number; reason: string },
): Promise<q.AdminAdjustBalanceResponse> {
  return request.post(endpoints.adminUserBalance(id), body);
}

export function getAdminEffectiveBalance(userId: string): Promise<q.AdminEffectiveBalanceResponse> {
  return request.get(endpoints.adminEffectiveBalanceConfig(userId));
}

export function getAdminAnalytics(
  params: q.AdminAnalyticsParams,
): Promise<q.AdminAnalyticsResponse> {
  const queryStr = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null) as [string, string][],
  ).toString();
  return request.get(`${endpoints.adminAnalytics()}?${queryStr}`);
}

export function getAdminAnalyticsModels(): Promise<q.AdminAnalyticsModelsResponse> {
  return request.get(endpoints.adminAnalyticsModels());
}

/* Admin – Roles (extended) */
export function createAdminRole(body: {
  name: string;
  description?: string;
}): Promise<q.AdminRoleResponse> {
  return request.post(endpoints.adminRoles(), body);
}

export function updateAdminRole(
  name: string,
  body: { name?: string; description?: string },
): Promise<q.AdminRoleResponse> {
  return request.patch(`${endpoints.adminRoles()}/${encodeURIComponent(name)}`, body);
}

export function deleteAdminRole(name: string): Promise<{ success: boolean }> {
  return request.delete(`${endpoints.adminRoles()}/${encodeURIComponent(name)}`);
}

export function updateAdminRolePermissions(
  name: string,
  permissions: Record<string, Record<string, boolean>>,
): Promise<q.AdminRoleResponse> {
  return request.put(endpoints.adminRolePermissions(name), { permissions });
}

export function listAdminRoleMembers(
  name: string,
  params?: { limit?: number; offset?: number },
): Promise<q.AdminMembersListResponse> {
  const query = params
    ? `?${Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`
    : '';
  return request.get(`${endpoints.adminRoleMembers(name)}${query}`);
}

export function addAdminRoleMember(name: string, userId: string): Promise<{ success: boolean }> {
  return request.post(endpoints.adminRoleMembers(name), { userId });
}

export function removeAdminRoleMember(name: string, userId: string): Promise<{ success: boolean }> {
  return request.delete(`${endpoints.adminRoleMembers(name)}/${encodeURIComponent(userId)}`);
}

/* Admin – Groups */
export function listAdminGroups(params?: {
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<q.AdminGroupsListResponse> {
  const query = params
    ? `?${Object.entries(params)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&')}`
    : '';
  return request.get(`${endpoints.adminGroups()}${query}`);
}

export function createAdminGroup(body: {
  name: string;
  description?: string;
  email?: string;
  avatar?: string;
  memberIds?: string[];
}): Promise<q.AdminGroupResponse> {
  return request.post(endpoints.adminGroups(), body);
}

export function getAdminGroup(id: string): Promise<q.AdminGroupResponse> {
  return request.get(endpoints.adminGroupById(id));
}

export function updateAdminGroup(
  id: string,
  body: { name?: string; description?: string; email?: string; avatar?: string },
): Promise<q.AdminGroupResponse> {
  return request.patch(endpoints.adminGroupById(id), body);
}

export function deleteAdminGroup(id: string): Promise<{ success: boolean; id: string }> {
  return request.delete(endpoints.adminGroupById(id));
}

export function listAdminGroupMembers(
  id: string,
  params?: { limit?: number; offset?: number },
): Promise<q.AdminMembersListResponse> {
  const query = params
    ? `?${Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`
    : '';
  return request.get(`${endpoints.adminGroupMembers(id)}${query}`);
}

export function addAdminGroupMember(id: string, userId: string): Promise<q.AdminGroupResponse> {
  return request.post(endpoints.adminGroupMembers(id), { userId });
}

export function removeAdminGroupMember(id: string, userId: string): Promise<{ success: boolean }> {
  return request.delete(`${endpoints.adminGroupMembers(id)}/${encodeURIComponent(userId)}`);
}

/* Admin – Grants */
export function listAdminGrants(params?: {
  limit?: number;
  offset?: number;
}): Promise<q.AdminGrantsListResponse> {
  const query = params
    ? `?${Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`
    : '';
  return request.get(`${endpoints.adminGrants()}${query}`);
}

export function getAdminEffectiveGrants(): Promise<{ capabilities: string[] }> {
  return request.get(`${endpoints.adminGrants()}/effective`);
}

export function getAdminPrincipalGrants(
  principalType: string,
  principalId: string,
): Promise<q.AdminPrincipalGrantsResponse> {
  return request.get(endpoints.adminGrantsByPrincipal(principalType, principalId));
}

export function assignAdminGrant(body: {
  principalType: string;
  principalId: string;
  capability: string;
}): Promise<q.AdminGrantResponse> {
  return request.post(endpoints.adminGrants(), body);
}

export function revokeAdminGrant(
  principalType: string,
  principalId: string,
  capability: string,
): Promise<{ success: boolean }> {
  return request.delete(
    `${endpoints.adminGrantsByPrincipal(principalType, principalId)}/${encodeURIComponent(capability)}`,
  );
}

/* Admin – Config */
export function listAdminConfigs(): Promise<q.AdminConfigsListResponse> {
  return request.get(endpoints.adminConfigs());
}

export function getAdminBaseConfig(): Promise<q.AdminBaseConfigResponse> {
  return request.get(`${endpoints.adminConfigs()}/base`);
}

export function getAdminPrincipalConfig(
  principalType: string,
  principalId: string,
): Promise<q.AdminConfigResponse> {
  return request.get(endpoints.adminConfigByPrincipal(principalType, principalId));
}

export function upsertAdminPrincipalConfig(
  principalType: string,
  principalId: string,
  body: { overrides: Record<string, unknown>; priority?: number },
): Promise<q.AdminConfigResponse> {
  return request.put(endpoints.adminConfigByPrincipal(principalType, principalId), body);
}

export function patchAdminPrincipalConfigFields(
  principalType: string,
  principalId: string,
  body: { entries: Array<{ fieldPath: string; value: unknown }>; priority?: number },
): Promise<q.AdminConfigResponse> {
  return request.patch(
    `${endpoints.adminConfigByPrincipal(principalType, principalId)}/fields`,
    body,
  );
}

export function deleteAdminPrincipalConfig(
  principalType: string,
  principalId: string,
): Promise<{ success: boolean }> {
  return request.delete(endpoints.adminConfigByPrincipal(principalType, principalId));
}

export function toggleAdminPrincipalConfig(
  principalType: string,
  principalId: string,
  isActive: boolean,
): Promise<q.AdminConfigResponse> {
  return request.patch(`${endpoints.adminConfigByPrincipal(principalType, principalId)}/active`, {
    isActive,
  });
}

/* Roles */
export function listRoles(): Promise<q.ListRolesResponse> {
  return request.get(`${endpoints.adminRoles()}?limit=200`);
}

export function getRole(roleName: string): Promise<r.TRole> {
  return request.get(endpoints.getRole(roleName));
}

export function updatePromptPermissions(
  variables: m.UpdatePromptPermVars,
): Promise<m.UpdatePermResponse> {
  return request.put(endpoints.updatePromptPermissions(variables.roleName), variables.updates);
}

export function updateAgentPermissions(
  variables: m.UpdateAgentPermVars,
): Promise<m.UpdatePermResponse> {
  return request.put(endpoints.updateAgentPermissions(variables.roleName), variables.updates);
}

export function updateMemoryPermissions(
  variables: m.UpdateMemoryPermVars,
): Promise<m.UpdatePermResponse> {
  return request.put(endpoints.updateMemoryPermissions(variables.roleName), variables.updates);
}

export function updatePeoplePickerPermissions(
  variables: m.UpdatePeoplePickerPermVars,
): Promise<m.UpdatePermResponse> {
  return request.put(
    endpoints.updatePeoplePickerPermissions(variables.roleName),
    variables.updates,
  );
}

export function updateMCPServersPermissions(
  variables: m.UpdateMCPServersPermVars,
): Promise<m.UpdatePermResponse> {
  return request.put(endpoints.updateMCPServersPermissions(variables.roleName), variables.updates);
}

export function updateRemoteAgentsPermissions(
  variables: m.UpdateRemoteAgentsPermVars,
): Promise<m.UpdatePermResponse> {
  return request.put(
    endpoints.updateRemoteAgentsPermissions(variables.roleName),
    variables.updates,
  );
}

export function updateMarketplacePermissions(
  variables: m.UpdateMarketplacePermVars,
): Promise<m.UpdatePermResponse> {
  return request.put(endpoints.updateMarketplacePermissions(variables.roleName), variables.updates);
}

/* Tags */
export function getConversationTags(): Promise<t.TConversationTagsResponse> {
  return request.get(endpoints.conversationTags());
}

export function createConversationTag(
  payload: t.TConversationTagRequest,
): Promise<t.TConversationTagResponse> {
  return request.post(endpoints.conversationTags(), payload);
}

export function updateConversationTag(
  tag: string,
  payload: t.TConversationTagRequest,
): Promise<t.TConversationTagResponse> {
  return request.put(endpoints.conversationTags(tag), payload);
}
export function deleteConversationTag(tag: string): Promise<t.TConversationTagResponse> {
  return request.delete(endpoints.conversationTags(tag));
}

export function addTagToConversation(
  conversationId: string,
  payload: t.TTagConversationRequest,
): Promise<t.TTagConversationResponse> {
  return request.put(endpoints.addTagToConversation(conversationId), payload);
}
export function rebuildConversationTags(): Promise<t.TConversationTagsResponse> {
  return request.post(endpoints.conversationTags('rebuild'));
}

export function healthCheck(): Promise<string> {
  return request.get(endpoints.health());
}

export function getUserTerms(): Promise<t.TUserTermsResponse> {
  return request.get(endpoints.userTerms());
}

export function acceptTerms(): Promise<t.TAcceptTermsResponse> {
  return request.post(endpoints.acceptUserTerms());
}

export function getBanner(): Promise<t.TBannerResponse> {
  return request.get(endpoints.banner());
}

export function getBanners(): Promise<t.TBannersResponse> {
  return request.get(endpoints.banners());
}

export function markBannerSeen(bannerId: string): Promise<{ success: boolean }> {
  return request.post(endpoints.bannerSeen(bannerId), {});
}

export function getAdminBanners(): Promise<t.TBannersResponse> {
  return request.get(endpoints.adminBanner());
}

export function createBanner(payload: t.TCreateBannerRequest): Promise<t.TBanner> {
  return request.post(endpoints.adminBanner(), payload);
}

export function deleteBanner(bannerId: string): Promise<t.TDeleteBannerResponse> {
  return request.delete(endpoints.adminBannerById(bannerId));
}

export function uploadBannerImage(data: FormData): Promise<f.AvatarUploadResponse> {
  return request.postMultiPart(endpoints.adminBannerImage(), data);
}

export function updateFeedback(
  conversationId: string,
  messageId: string,
  payload: t.TUpdateFeedbackRequest,
): Promise<t.TUpdateFeedbackResponse> {
  return request.put(endpoints.feedback(conversationId, messageId), payload);
}

// 2FA
export function enableTwoFactor(payload?: t.TEnable2FARequest): Promise<t.TEnable2FAResponse> {
  return request.post(endpoints.enableTwoFactor(), payload);
}

export function verifyTwoFactor(payload: t.TVerify2FARequest): Promise<t.TVerify2FAResponse> {
  return request.post(endpoints.verifyTwoFactor(), payload);
}

export function confirmTwoFactor(payload: t.TVerify2FARequest): Promise<t.TVerify2FAResponse> {
  return request.post(endpoints.confirmTwoFactor(), payload);
}

export function disableTwoFactor(payload?: t.TDisable2FARequest): Promise<t.TDisable2FAResponse> {
  return request.post(endpoints.disableTwoFactor(), payload);
}

export function regenerateBackupCodes(
  payload?: t.TRegenerateBackupCodesRequest,
): Promise<t.TRegenerateBackupCodesResponse> {
  return request.post(endpoints.regenerateBackupCodes(), payload);
}

export function verifyTwoFactorTemp(
  payload: t.TVerify2FATempRequest,
): Promise<t.TVerify2FATempResponse> {
  return request.post(endpoints.verifyTwoFactorTemp(), payload);
}

/* Memories */
export const getMemories = (): Promise<q.MemoriesResponse> => {
  return request.get(endpoints.memories());
};

export const deleteMemory = (key: string): Promise<void> => {
  return request.delete(endpoints.memory(key));
};

export const updateMemory = (
  key: string,
  value: string,
  originalKey?: string,
): Promise<q.TUserMemory> => {
  return request.patch(endpoints.memory(originalKey || key), { key, value });
};

export const updateMemoryPreferences = (preferences: {
  memories: boolean;
}): Promise<{ updated: boolean; preferences: { memories: boolean } }> => {
  return request.patch(endpoints.memoryPreferences(), preferences);
};

export const createMemory = (data: {
  key: string;
  value: string;
}): Promise<{ created: boolean; memory: q.TUserMemory }> => {
  return request.post(endpoints.memories(), data);
};

export function searchPrincipals(
  params: q.PrincipalSearchParams,
): Promise<q.PrincipalSearchResponse> {
  return request.get(endpoints.searchPrincipals(params));
}

export function getAccessRoles(
  resourceType: permissions.ResourceType,
): Promise<q.AccessRolesResponse> {
  return request.get(endpoints.getAccessRoles(resourceType));
}

export function getResourcePermissions(
  resourceType: permissions.ResourceType,
  resourceId: string,
): Promise<permissions.TGetResourcePermissionsResponse> {
  return request.get(endpoints.getResourcePermissions(resourceType, resourceId));
}

export function updateResourcePermissions(
  resourceType: permissions.ResourceType,
  resourceId: string,
  data: permissions.TUpdateResourcePermissionsRequest,
): Promise<permissions.TUpdateResourcePermissionsResponse> {
  return request.put(endpoints.updateResourcePermissions(resourceType, resourceId), data);
}

export function getEffectivePermissions(
  resourceType: permissions.ResourceType,
  resourceId: string,
): Promise<permissions.TEffectivePermissionsResponse> {
  return request.get(endpoints.getEffectivePermissions(resourceType, resourceId));
}

export function getAllEffectivePermissions(
  resourceType: permissions.ResourceType,
): Promise<permissions.TAllEffectivePermissionsResponse> {
  return request.get(endpoints.getAllEffectivePermissions(resourceType));
}

// SharePoint Graph API Token
export function getGraphApiToken(params: q.GraphTokenParams): Promise<q.GraphTokenResponse> {
  return request.get(endpoints.graphToken(params.scopes));
}

export function getDomainServerBaseUrl(): string {
  return `${endpoints.apiBaseUrl()}/api`;
}

/* Active Jobs */
export interface ActiveJobsResponse {
  activeJobIds: string[];
}

export const getActiveJobs = (): Promise<ActiveJobsResponse> => {
  return request.get(endpoints.activeJobs());
};

/* Studio (fashion image generation) */
export const studioGenerate = (payload: t.TStudioGenerateRequest): Promise<t.StudioCreation> => {
  return request.post(endpoints.studioGenerate(), payload);
};

export const studioEdit = (payload: t.TStudioEditRequest): Promise<t.StudioCreation> => {
  return request.post(endpoints.studioEdit(), payload);
};

export const getStudioModels = (): Promise<t.TStudioModelsResponse> => {
  return request.get(endpoints.studioModels());
};

export const getStudioCreation = (id: string): Promise<t.StudioCreation> => {
  return request.get(endpoints.studioCreation(id));
};

export const getStudioCreations = (params: {
  cursor?: string | null;
  limit?: number;
}): Promise<t.TStudioCreationListResponse> => {
  return request.get(endpoints.studioCreations(params));
};

export const deleteStudioCreation = (id: string): Promise<void> => {
  return request.delete(endpoints.studioCreation(id));
};

/* Feedback Entries (cannot_answer + thumbs down) */
import type {
  TCreateFeedbackEntry,
  TFeedbackEntry,
  TListFeedbackEntriesParams,
  TListFeedbackEntriesResponse,
} from './feedbacks';

const buildFeedbackQuery = (params: TListFeedbackEntriesParams = {}): string => {
  const parts: string[] = [];
  if (params.limit != null) parts.push(`limit=${params.limit}`);
  if (params.offset != null) parts.push(`offset=${params.offset}`);
  if (params.category) parts.push(`category=${encodeURIComponent(params.category)}`);
  if (params.trigger) parts.push(`trigger=${encodeURIComponent(params.trigger)}`);
  if (params.modelName) parts.push(`modelName=${encodeURIComponent(params.modelName)}`);
  if (params.userEmail) parts.push(`userEmail=${encodeURIComponent(params.userEmail)}`);
  if (params.from) parts.push(`from=${encodeURIComponent(params.from)}`);
  if (params.to) parts.push(`to=${encodeURIComponent(params.to)}`);
  return parts.join('&');
};

export function createFeedbackEntry(payload: TCreateFeedbackEntry): Promise<TFeedbackEntry> {
  return request.post(endpoints.feedbackEntries(), payload);
}

export function listAdminFeedbacks(
  params: TListFeedbackEntriesParams = {},
): Promise<TListFeedbackEntriesResponse> {
  const query = buildFeedbackQuery(params);
  return request.get(endpoints.adminFeedbackEntries(query));
}

export function exportAdminFeedbacksUrl(
  format: 'csv' | 'json',
  params: TListFeedbackEntriesParams = {},
): string {
  const query = buildFeedbackQuery(params);
  return endpoints.adminFeedbackExport(format, query);
}

export function downloadAdminFeedbacksExport(
  format: 'csv' | 'json',
  params: TListFeedbackEntriesParams = {},
): Promise<AxiosResponse> {
  const query = buildFeedbackQuery(params);
  return request.getResponse(endpoints.adminFeedbackExport(format, query), {
    responseType: 'blob',
  });
}

/* Agent Studio flows */
export const getFlows = (cursor?: string): Promise<fl.TFlowListResponse> => {
  const url = cursor
    ? `${endpoints.flows()}?cursor=${encodeURIComponent(cursor)}`
    : endpoints.flows();
  return request.get(url);
};

export const getFlow = (id: string): Promise<fl.TFlowResponse> => {
  return request.get(endpoints.flow(id));
};

export const createFlow = (data: fl.TFlowMutationRequest): Promise<fl.TFlowResponse> => {
  return request.post(endpoints.flows(), data);
};

export const updateFlow = (
  id: string,
  data: fl.TFlowMutationRequest,
): Promise<fl.TFlowResponse> => {
  return request.put(endpoints.flow(id), data);
};

export const deleteFlow = (id: string): Promise<{ deleted: boolean }> => {
  return request.delete(endpoints.flow(id));
};

export const runFlow = (id: string, data: fl.TRunFlowRequest): Promise<fl.TRunFlowResponse> => {
  return request.post(endpoints.runFlow(id), data);
};

export const getFlowRuns = (id: string, cursor?: string): Promise<fl.TFlowRunsResponse> => {
  const url = cursor
    ? `${endpoints.flowRuns(id)}?cursor=${encodeURIComponent(cursor)}`
    : endpoints.flowRuns(id);
  return request.get(url);
};

export const resumeFlowRun = (
  runId: string,
  data: fl.TResumeRunRequest,
): Promise<fl.TRunFlowResponse> => {
  return request.post(endpoints.resumeFlowRun(runId), data);
};

/* Automations */
export const getAutomations = (cursor?: string): Promise<au.TAutomationListResponse> => {
  const url = cursor
    ? `${endpoints.automations()}?cursor=${encodeURIComponent(cursor)}`
    : endpoints.automations();
  return request.get(url);
};

export const getAutomation = (id: string): Promise<au.TAutomationResponse> => {
  return request.get(endpoints.automation(id));
};

export const createAutomation = (
  data: au.TAutomationCreateRequest,
): Promise<au.TAutomationResponse> => {
  return request.post(endpoints.automations(), data);
};

export const updateAutomation = (
  id: string,
  data: au.TAutomationUpdateRequest,
): Promise<au.TAutomationResponse> => {
  return request.put(endpoints.automation(id), data);
};

export const deleteAutomation = (id: string): Promise<au.TAutomationDeleteResponse> => {
  return request.delete(endpoints.automation(id));
};

export const toggleAutomation = (
  id: string,
  data: au.TAutomationToggleRequest,
): Promise<au.TAutomationResponse> => {
  return request.patch(endpoints.automationEnabled(id), data);
};

export const runAutomation = (
  id: string,
  data: au.TAutomationRunRequest,
): Promise<au.TAutomationRunResponse> => {
  return request.post(endpoints.automationRun(id), data);
};

export const getAutomationRuns = (
  id: string,
  cursor?: string,
): Promise<au.TAutomationRunsResponse> => {
  const url = cursor
    ? `${endpoints.automationRuns(id)}?cursor=${encodeURIComponent(cursor)}`
    : endpoints.automationRuns(id);
  return request.get(url);
};
