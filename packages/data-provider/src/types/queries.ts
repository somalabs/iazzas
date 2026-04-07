import type { InfiniteData } from '@tanstack/react-query';
import type * as p from '../accessPermissions';
import type * as a from '../types/agents';
import type * as s from '../schemas';
import type * as t from '../types';

export type Conversation = {
  id: string;
  createdAt: number;
  participants: string[];
  lastMessage: string;
  conversations: s.TConversation[];
};

export type ConversationListParams = {
  cursor?: string;
  isArchived?: boolean;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  tags?: string[];
  search?: string;
};

export type MinimalConversation = Pick<
  s.TConversation,
  'conversationId' | 'endpoint' | 'title' | 'createdAt' | 'updatedAt' | 'user'
>;

export type ConversationListResponse = {
  conversations: MinimalConversation[];
  nextCursor: string | null;
};

export type ConversationData = InfiniteData<ConversationListResponse>;
export type ConversationUpdater = (
  data: ConversationData,
  conversation: s.TConversation,
) => ConversationData;

/* Messages */
export type MessagesListParams = {
  cursor?: string | null;
  sortBy?: 'endpoint' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
  conversationId?: string;
  messageId?: string;
  search?: string;
};

export type MessagesListResponse = {
  messages: s.TMessage[];
  nextCursor: string | null;
};

/* Shared Links */
export type SharedMessagesResponse = Omit<s.TSharedLink, 'messages'> & {
  messages: s.TMessage[];
};

export interface SharedLinksListParams {
  pageSize: number;
  isPublic: boolean;
  sortBy: 'title' | 'createdAt';
  sortDirection: 'asc' | 'desc';
  search?: string;
  cursor?: string;
}

export type SharedLinkItem = {
  shareId: string;
  title: string;
  isPublic: boolean;
  createdAt: Date;
  conversationId: string;
};

export interface SharedLinksResponse {
  links: SharedLinkItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface SharedLinkQueryData {
  pages: SharedLinksResponse[];
  pageParams: (string | null)[];
}

export type AllPromptGroupsFilterRequest = {
  category: string;
  pageNumber: string;
  pageSize: string | number;
  before?: string | null;
  after?: string | null;
  order?: 'asc' | 'desc';
  name?: string;
  author?: string;
};

export type AllPromptGroupsResponse = t.TPromptGroup[];

export type ConversationTagsResponse = s.TConversationTag[];

/* MCP Types */
export type MCPTool = {
  name: string;
  pluginKey: string;
  description: string;
};

export type MCPServer = {
  name: string;
  icon: string;
  authenticated: boolean;
  authConfig: s.TPluginAuthConfig[];
  tools: MCPTool[];
};

export type MCPServersResponse = {
  servers: Record<string, MCPServer>;
};

export type VerifyToolAuthParams = { toolId: string };
export type VerifyToolAuthResponse = {
  authenticated: boolean;
  message?: string | s.AuthType;
  authTypes?: [string, s.AuthType][];
};

export type GetToolCallParams = { conversationId: string };
export type ToolCallResults = a.ToolCallResult[];

/* Memories */
export type TUserMemory = {
  key: string;
  value: string;
  updated_at: string;
  tokenCount?: number;
};

export type MemoriesResponse = {
  memories: TUserMemory[];
  totalTokens: number;
  tokenLimit: number | null;
  usagePercentage: number | null;
};

export type PrincipalSearchParams = {
  q: string;
  limit?: number;
  types?: Array<p.PrincipalType.USER | p.PrincipalType.GROUP | p.PrincipalType.ROLE>;
};

export type PrincipalSearchResponse = {
  query: string;
  limit: number;
  types?: Array<p.PrincipalType.USER | p.PrincipalType.GROUP | p.PrincipalType.ROLE>;
  results: p.TPrincipalSearchResult[];
  count: number;
  sources: {
    local: number;
    entra: number;
  };
};

export type AccessRole = {
  accessRoleId: p.AccessRoleIds;
  name: string;
  description: string;
  permBits: number;
};

export type AccessRolesResponse = AccessRole[];

export type ListRolesResponse = {
  roles: Array<{ _id?: string; name: string; description?: string }>;
  total: number;
  limit: number;
  offset?: number;
};

/* Admin Types */

export type AdminUserListItem = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  role: string;
  provider: string;
  createdAt?: string;
  updatedAt?: string;
  balance?: number;
  recentSpend?: number;
};

export type AdminUserSearchResult = {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
};

export type AdminMember = {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedAt?: string;
};

export type AdminGroup = {
  _id: string;
  name: string;
  description?: string;
  email?: string;
  avatar?: string;
  source: string;
  memberIds: string[];
  idOnTheSource?: string;
};

export type AdminSystemGrant = {
  id: string;
  principalType: string;
  principalId: string;
  capability: string;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
};

export type AdminConfig = {
  _id: string;
  principalType: string;
  principalId: string;
  principalModel: string;
  priority: number;
  overrides: Record<string, unknown>;
  isActive: boolean;
  configVersion: number;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminRole = {
  _id?: string;
  name: string;
  description?: string;
  permissions: Record<string, Record<string, boolean>>;
};

export type AdminUsersListResponse = {
  users: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminUsersSearchResponse = {
  users: AdminUserSearchResult[];
  total: number;
  capped: boolean;
};

export type AdminRoleResponse = {
  role: AdminRole;
};

export type AdminMembersListResponse = {
  members: AdminMember[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminGroupsListResponse = {
  groups: AdminGroup[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminGroupResponse = {
  group: AdminGroup;
};

export type AdminGrantsListResponse = {
  grants: AdminSystemGrant[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminPrincipalGrantsResponse = {
  grants: AdminSystemGrant[];
};

export type AdminGrantResponse = {
  grant: AdminSystemGrant;
};

export type AdminConfigsListResponse = {
  configs: AdminConfig[];
};

export type AdminBaseConfigResponse = {
  config: Record<string, unknown>;
};

export type AdminConfigResponse = {
  config: AdminConfig;
};

export type AdminUserBalance = {
  tokenCredits: number;
  autoRefillEnabled?: boolean;
  refillAmount?: number;
  refillIntervalValue?: number;
  refillIntervalUnit?: string;
  lastRefill?: string;
};

export type AdminUserUsageSummary = {
  totalTokens: number;
  totalCreditsSpent: number;
  transactionCount: number;
};

export type AdminUserModelUsage = {
  model: string;
  tokens: number;
  credits: number;
};

export type AdminTransactionItem = {
  _id: string;
  createdAt: string;
  model?: string;
  tokenType: string;
  rawAmount?: number;
  tokenValue?: number;
  context?: string;
  note?: string;
};

export type AdminUserUsageResponse = {
  userId: string;
  balance: AdminUserBalance | null;
  summary: AdminUserUsageSummary;
  byModel: AdminUserModelUsage[];
  transactions: {
    items: AdminTransactionItem[];
    total: number;
    limit: number;
    offset: number;
  };
};

export type AdminAdjustBalanceResponse = {
  newBalance: number;
  transaction: AdminTransactionItem;
};

export interface MCPServerStatus {
  requiresOAuth: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface MCPConnectionStatusResponse {
  success: boolean;
  connectionStatus: Record<string, MCPServerStatus>;
}

export interface MCPServerConnectionStatusResponse {
  success: boolean;
  serverName: string;
  requiresOAuth: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface MCPAuthValuesResponse {
  success: boolean;
  serverName: string;
  authValueFlags: Record<string, boolean>;
}

export type AdminEffectiveBalanceSource =
  | {
      principalType: string;
      principalId: string;
      priority: number;
    }
  | {
      source: string;
    };

export type AdminEffectiveBalanceResponse = {
  effective: {
    enabled?: boolean;
    startBalance?: number;
    autoRefillEnabled?: boolean;
    refillAmount?: number;
    refillIntervalValue?: number;
    refillIntervalUnit?: string;
  };
  sources: Record<string, AdminEffectiveBalanceSource>;
};

/* SharePoint Graph API Token */
export type GraphTokenParams = {
  scopes: string;
};

export type GraphTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};
