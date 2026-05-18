import { useQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type {
  AdminUsersListResponse,
  AdminUsersSearchResponse,
  AdminMembersListResponse,
  AdminGroupsListResponse,
  AdminGrantsListResponse,
  AdminPrincipalGrantsResponse,
  AdminConfigsListResponse,
  AdminBaseConfigResponse,
  AdminGroupResponse,
  AdminRoleResponse,
  AdminUserUsageResponse,
  AdminEffectiveBalanceResponse,
  AdminAnalyticsResponse,
  AdminAnalyticsModelsResponse,
  AdminAnalyticsParams,
  TListFeedbackEntriesParams,
  TListFeedbackEntriesResponse,
} from 'librechat-data-provider';

const queryDefaults = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
  retry: false,
} as const;

export const useListAdminUsersQuery = (
  params?: { limit?: number; offset?: number },
  config?: UseQueryOptions<AdminUsersListResponse>,
): QueryObserverResult<AdminUsersListResponse> => {
  return useQuery<AdminUsersListResponse>(
    [QueryKeys.adminUsers, params?.limit, params?.offset],
    () => dataService.listAdminUsers(params),
    { ...queryDefaults, ...config },
  );
};

export const useSearchAdminUsersQuery = (
  query: string,
  limit?: number,
  config?: UseQueryOptions<AdminUsersSearchResponse>,
): QueryObserverResult<AdminUsersSearchResponse> => {
  return useQuery<AdminUsersSearchResponse>(
    [QueryKeys.adminUsers, 'search', query, limit],
    () => dataService.searchAdminUsers(query, limit),
    { ...queryDefaults, enabled: query.length >= 2, ...config },
  );
};

export const useGetAdminRoleQuery = (
  name: string,
  config?: UseQueryOptions<AdminRoleResponse>,
): QueryObserverResult<AdminRoleResponse> => {
  return useQuery<AdminRoleResponse>(
    [QueryKeys.roles, name, 'admin'],
    () =>
      dataService.updateAdminRole(name, {}).catch(() => {
        // Fallback: use the regular getRole for read
        return dataService.getRole(name).then((role) => ({ role }));
      }),
    { ...queryDefaults, enabled: !!name, ...config },
  );
};

export const useListAdminRoleMembersQuery = (
  name: string,
  params?: { limit?: number; offset?: number },
  config?: UseQueryOptions<AdminMembersListResponse>,
): QueryObserverResult<AdminMembersListResponse> => {
  return useQuery<AdminMembersListResponse>(
    [QueryKeys.adminRoleMembers, name, params?.limit, params?.offset],
    () => dataService.listAdminRoleMembers(name, params),
    { ...queryDefaults, enabled: !!name, ...config },
  );
};

export const useListAdminGroupsQuery = (
  params?: { source?: string; search?: string; limit?: number; offset?: number },
  config?: UseQueryOptions<AdminGroupsListResponse>,
): QueryObserverResult<AdminGroupsListResponse> => {
  return useQuery<AdminGroupsListResponse>(
    [QueryKeys.adminGroups, params?.source, params?.search, params?.limit, params?.offset],
    () => dataService.listAdminGroups(params),
    { ...queryDefaults, ...config },
  );
};

export const useGetAdminGroupQuery = (
  id: string,
  config?: UseQueryOptions<AdminGroupResponse>,
): QueryObserverResult<AdminGroupResponse> => {
  return useQuery<AdminGroupResponse>(
    [QueryKeys.adminGroups, id],
    () => dataService.getAdminGroup(id),
    { ...queryDefaults, enabled: !!id, ...config },
  );
};

export const useListAdminGroupMembersQuery = (
  id: string,
  params?: { limit?: number; offset?: number },
  config?: UseQueryOptions<AdminMembersListResponse>,
): QueryObserverResult<AdminMembersListResponse> => {
  return useQuery<AdminMembersListResponse>(
    [QueryKeys.adminGroupMembers, id, params?.limit, params?.offset],
    () => dataService.listAdminGroupMembers(id, params),
    { ...queryDefaults, enabled: !!id, ...config },
  );
};

export const useListAdminGrantsQuery = (
  params?: { limit?: number; offset?: number },
  config?: UseQueryOptions<AdminGrantsListResponse>,
): QueryObserverResult<AdminGrantsListResponse> => {
  return useQuery<AdminGrantsListResponse>(
    [QueryKeys.adminGrants, params?.limit, params?.offset],
    () => dataService.listAdminGrants(params),
    { ...queryDefaults, ...config },
  );
};

export const useGetAdminPrincipalGrantsQuery = (
  principalType: string,
  principalId: string,
  config?: UseQueryOptions<AdminPrincipalGrantsResponse>,
): QueryObserverResult<AdminPrincipalGrantsResponse> => {
  return useQuery<AdminPrincipalGrantsResponse>(
    [QueryKeys.adminGrants, principalType, principalId],
    () => dataService.getAdminPrincipalGrants(principalType, principalId),
    { ...queryDefaults, enabled: !!principalType && !!principalId, ...config },
  );
};

export const useListAdminConfigsQuery = (
  config?: UseQueryOptions<AdminConfigsListResponse>,
): QueryObserverResult<AdminConfigsListResponse> => {
  return useQuery<AdminConfigsListResponse>(
    [QueryKeys.adminConfigs],
    () => dataService.listAdminConfigs(),
    { ...queryDefaults, ...config },
  );
};

export const useGetAdminBaseConfigQuery = (
  config?: UseQueryOptions<AdminBaseConfigResponse>,
): QueryObserverResult<AdminBaseConfigResponse> => {
  return useQuery<AdminBaseConfigResponse>(
    [QueryKeys.adminBaseConfig],
    () => dataService.getAdminBaseConfig(),
    { ...queryDefaults, ...config },
  );
};

export const useGetAdminUserUsageQuery = (
  userId: string,
  params: { startDate: string; endDate: string; limit?: number; offset?: number },
  config?: UseQueryOptions<AdminUserUsageResponse>,
): QueryObserverResult<AdminUserUsageResponse> => {
  return useQuery<AdminUserUsageResponse>(
    [QueryKeys.adminUserUsage, userId, params.startDate, params.endDate, params.limit, params.offset],
    () => dataService.getAdminUserUsage(userId, params),
    { ...queryDefaults, enabled: !!userId, ...config },
  );
};

export const useGetEffectiveBalanceConfigQuery = (
  userId: string,
  config?: UseQueryOptions<AdminEffectiveBalanceResponse>,
): QueryObserverResult<AdminEffectiveBalanceResponse> => {
  return useQuery<AdminEffectiveBalanceResponse>(
    [QueryKeys.adminEffectiveBalance, userId],
    () => dataService.getAdminEffectiveBalance(userId),
    { ...queryDefaults, enabled: !!userId, ...config },
  );
};

export const useGetAdminAnalyticsQuery = (
  params: AdminAnalyticsParams,
  config?: UseQueryOptions<AdminAnalyticsResponse>,
): QueryObserverResult<AdminAnalyticsResponse> => {
  return useQuery<AdminAnalyticsResponse>(
    [QueryKeys.adminAnalytics, params.startDate, params.endDate, params.userId, params.model, params.groupBy],
    () => dataService.getAdminAnalytics(params),
    {
      ...queryDefaults,
      staleTime: 5 * 60 * 1000,
      enabled: !!params.startDate && !!params.endDate,
      ...config,
    },
  );
};

export const useGetAdminAnalyticsModelsQuery = (
  config?: UseQueryOptions<AdminAnalyticsModelsResponse>,
): QueryObserverResult<AdminAnalyticsModelsResponse> => {
  return useQuery<AdminAnalyticsModelsResponse>(
    [QueryKeys.adminAnalyticsModels],
    () => dataService.getAdminAnalyticsModels(),
    { ...queryDefaults, staleTime: 5 * 60 * 1000, ...config },
  );
};

export const useListAdminFeedbacksQuery = (
  params: TListFeedbackEntriesParams,
  config?: UseQueryOptions<TListFeedbackEntriesResponse>,
): QueryObserverResult<TListFeedbackEntriesResponse> => {
  return useQuery<TListFeedbackEntriesResponse>(
    [
      QueryKeys.adminFeedbacks,
      params.limit,
      params.offset,
      params.category,
      params.trigger,
      params.modelName,
      params.userEmail,
      params.from,
      params.to,
    ],
    () => dataService.listAdminFeedbacks(params),
    { ...queryDefaults, ...config },
  );
};
