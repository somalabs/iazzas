/* Agent Studio flows */
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  TFlowResponse,
  TRunFlowResponse,
  TFlowListResponse,
  TFlowRunsResponse,
  TResumeRunRequest,
  TFlowMutationRequest,
} from 'librechat-data-provider';

export const useFlowsQuery = (
  config?: UseQueryOptions<TFlowListResponse>,
): QueryObserverResult<TFlowListResponse> => {
  return useQuery<TFlowListResponse>(
    [QueryKeys.flows],
    () => dataService.getFlows(),
    { refetchOnWindowFocus: false, refetchOnReconnect: false, ...config },
  );
};

export const useFlowQuery = (
  id: string,
  config?: UseQueryOptions<TFlowResponse>,
): QueryObserverResult<TFlowResponse> => {
  return useQuery<TFlowResponse>(
    [QueryKeys.flow, id],
    () => dataService.getFlow(id),
    { enabled: !!id, refetchOnWindowFocus: false, ...config },
  );
};

export const useFlowRunsQuery = (
  flowId: string,
  config?: UseQueryOptions<TFlowRunsResponse>,
): QueryObserverResult<TFlowRunsResponse> => {
  return useQuery<TFlowRunsResponse>(
    [QueryKeys.flowRuns, flowId],
    () => dataService.getFlowRuns(flowId),
    { enabled: !!flowId, refetchOnWindowFocus: false, ...config },
  );
};

export const useCreateFlowMutation = (
  options?: UseMutationOptions<TFlowResponse, Error, TFlowMutationRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TFlowResponse, Error, TFlowMutationRequest>(
    [MutationKeys.createFlow],
    (data) => dataService.createFlow(data),
    {
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries([QueryKeys.flows]);
        options?.onSuccess?.(...args);
      },
    },
  );
};

export const useUpdateFlowMutation = (
  options?: UseMutationOptions<TFlowResponse, Error, { id: string; data: TFlowMutationRequest }>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TFlowResponse, Error, { id: string; data: TFlowMutationRequest }>(
    [MutationKeys.updateFlow],
    ({ id, data }) => dataService.updateFlow(id, data),
    {
      ...options,
      onSuccess: (res, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.flows]);
        queryClient.invalidateQueries([QueryKeys.flow, vars.id]);
        options?.onSuccess?.(res, vars, ctx);
      },
    },
  );
};

export const useDeleteFlowMutation = (
  options?: UseMutationOptions<{ deleted: boolean }, Error, { id: string }>,
) => {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, { id: string }>(
    [MutationKeys.deleteFlow],
    ({ id }) => dataService.deleteFlow(id),
    {
      ...options,
      onSuccess: (res, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.flows]);
        queryClient.removeQueries([QueryKeys.flow, vars.id]);
        options?.onSuccess?.(res, vars, ctx);
      },
    },
  );
};

export const useRunFlowMutation = (
  options?: UseMutationOptions<TRunFlowResponse, Error, { id: string; input: string }>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TRunFlowResponse, Error, { id: string; input: string }>(
    [MutationKeys.runFlow],
    ({ id, input }) => dataService.runFlow(id, { input }),
    {
      ...options,
      onSuccess: (res, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.flowRuns, vars.id]);
        options?.onSuccess?.(res, vars, ctx);
      },
    },
  );
};

export const useResumeFlowRunMutation = (
  flowId: string,
  options?: UseMutationOptions<TRunFlowResponse, Error, { runId: string } & TResumeRunRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TRunFlowResponse, Error, { runId: string } & TResumeRunRequest>(
    [MutationKeys.resumeFlowRun],
    ({ runId, approved }) => dataService.resumeFlowRun(runId, { approved }),
    {
      ...options,
      onSuccess: (res, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.flowRuns, flowId]);
        options?.onSuccess?.(res, vars, ctx);
      },
    },
  );
};
