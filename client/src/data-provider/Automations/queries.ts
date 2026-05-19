/* Automations */
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  TAutomationResponse,
  TAutomationRunResponse,
  TAutomationListResponse,
  TAutomationRunsResponse,
  TAutomationToggleRequest,
  TAutomationCreateRequest,
  TAutomationUpdateRequest,
} from 'librechat-data-provider';

export const useAutomationsQuery = (
  config?: UseQueryOptions<TAutomationListResponse>,
): QueryObserverResult<TAutomationListResponse> => {
  return useQuery<TAutomationListResponse>(
    [QueryKeys.automations],
    () => dataService.getAutomations(),
    { refetchOnWindowFocus: false, refetchOnReconnect: false, ...config },
  );
};

export const useAutomationRunsQuery = (
  automationId: string,
  config?: UseQueryOptions<TAutomationRunsResponse>,
): QueryObserverResult<TAutomationRunsResponse> => {
  return useQuery<TAutomationRunsResponse>(
    [QueryKeys.automationRuns, automationId],
    () => dataService.getAutomationRuns(automationId),
    { enabled: !!automationId, refetchOnWindowFocus: false, ...config },
  );
};

export const useCreateAutomationMutation = (
  options?: UseMutationOptions<TAutomationResponse, Error, TAutomationCreateRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TAutomationResponse, Error, TAutomationCreateRequest>(
    [MutationKeys.createAutomation],
    (data) => dataService.createAutomation(data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.automations]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useUpdateAutomationMutation = (
  options?: UseMutationOptions<
    TAutomationResponse,
    Error,
    { id: string; data: TAutomationUpdateRequest }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation<TAutomationResponse, Error, { id: string; data: TAutomationUpdateRequest }>(
    [MutationKeys.updateAutomation],
    ({ id, data }) => dataService.updateAutomation(id, data),
    {
      ...options,
      onSuccess: (res, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.automations]);
        options?.onSuccess?.(res, vars, ctx);
      },
    },
  );
};

export const useDeleteAutomationMutation = (
  options?: UseMutationOptions<{ deleted: boolean }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, string>(
    [MutationKeys.deleteAutomation],
    (id) => dataService.deleteAutomation(id),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.automations]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useToggleAutomationMutation = (
  options?: UseMutationOptions<
    TAutomationResponse,
    Error,
    { id: string } & TAutomationToggleRequest
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation<TAutomationResponse, Error, { id: string } & TAutomationToggleRequest>(
    [MutationKeys.toggleAutomation],
    ({ id, enabled }) => dataService.toggleAutomation(id, { enabled }),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.automations]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useRunAutomationMutation = (
  options?: UseMutationOptions<
    TAutomationRunResponse,
    Error,
    { id: string; triggerInput?: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation<TAutomationRunResponse, Error, { id: string; triggerInput?: string }>(
    [MutationKeys.runAutomation],
    ({ id, triggerInput }) => dataService.runAutomation(id, { triggerInput }),
    {
      ...options,
      onSuccess: (res, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.automations]);
        queryClient.invalidateQueries([QueryKeys.automationRuns, vars.id]);
        options?.onSuccess?.(res, vars, ctx);
      },
    },
  );
};
