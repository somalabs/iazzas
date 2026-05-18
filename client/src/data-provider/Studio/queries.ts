/* Studio */
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationResult } from '@tanstack/react-query';
import type {
  StudioCreation,
  TStudioEditRequest,
  TStudioGenerateRequest,
  TStudioCreationListResponse,
  TStudioModelsResponse,
} from 'librechat-data-provider';

export const useStudioCreationsQuery = (
  params: { limit?: number } = {},
  config?: UseQueryOptions<TStudioCreationListResponse>,
) => {
  return useQuery<TStudioCreationListResponse>(
    [QueryKeys.studioCreations, params],
    () => dataService.getStudioCreations({ limit: params.limit ?? 20 }),
    {
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useStudioModelsQuery = (
  config?: UseQueryOptions<TStudioModelsResponse>,
) => {
  return useQuery<TStudioModelsResponse>(
    [QueryKeys.studioModels],
    () => dataService.getStudioModels(),
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      ...config,
    },
  );
};

export const useStudioCreationQuery = (
  id: string,
  config?: UseQueryOptions<StudioCreation>,
) => {
  return useQuery<StudioCreation>(
    [QueryKeys.studioCreation, id],
    () => dataService.getStudioCreation(id),
    { enabled: !!id, ...config },
  );
};

export const useStudioGenerateMutation = (): UseMutationResult<
  StudioCreation,
  Error,
  TStudioGenerateRequest
> => {
  const queryClient = useQueryClient();
  return useMutation(
    [MutationKeys.studioGenerate],
    (payload: TStudioGenerateRequest) => dataService.studioGenerate(payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.studioCreations]);
      },
    },
  );
};

export const useStudioEditMutation = (): UseMutationResult<
  StudioCreation,
  Error,
  TStudioEditRequest
> => {
  const queryClient = useQueryClient();
  return useMutation(
    [MutationKeys.studioEdit],
    (payload: TStudioEditRequest) => dataService.studioEdit(payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.studioCreations]);
      },
    },
  );
};
