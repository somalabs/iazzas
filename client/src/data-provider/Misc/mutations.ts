import { QueryKeys, dataService } from 'librechat-data-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type t from 'librechat-data-provider';

export const useCreateBannerMutation = (
  options?: t.MutationOptions<t.TBanner, t.TCreateBannerRequest>,
): UseMutationResult<t.TBanner, unknown, t.TCreateBannerRequest> => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, onMutate } = options || {};

  return useMutation<t.TBanner, unknown, t.TCreateBannerRequest>({
    mutationFn: (payload: t.TCreateBannerRequest) => dataService.createBanner(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries([QueryKeys.banners]);
      queryClient.invalidateQueries([QueryKeys.banner]);
      onSuccess?.(data, variables, context);
    },
    onError: (err, variables, context) => {
      onError?.(err, variables, context);
    },
    onMutate,
  });
};

export const useMarkBannerSeenMutation = (): UseMutationResult<
  { success: boolean },
  unknown,
  string,
  { previous?: t.TBannersResponse }
> => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, unknown, string, { previous?: t.TBannersResponse }>({
    mutationFn: (bannerId: string) => dataService.markBannerSeen(bannerId),
    onMutate: async (bannerId) => {
      await queryClient.cancelQueries([QueryKeys.banners]);
      const previous = queryClient.getQueryData<t.TBannersResponse>([QueryKeys.banners]);
      queryClient.setQueryData<t.TBannersResponse>([QueryKeys.banners], (old) =>
        (old ?? []).map((banner) =>
          banner.bannerId === bannerId ? { ...banner, seen: true } : banner,
        ),
      );
      return { previous };
    },
    onError: (_err, _bannerId, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QueryKeys.banners], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries([QueryKeys.banners]);
    },
  });
};

export const useUploadBannerImageMutation = (
  options?: t.UploadAvatarOptions,
): UseMutationResult<t.AvatarUploadResponse, unknown, FormData> => {
  const { onSuccess, onError, onMutate } = options || {};
  return useMutation<t.AvatarUploadResponse, unknown, FormData>({
    mutationFn: (data: FormData) => dataService.uploadBannerImage(data),
    onSuccess,
    onError,
    onMutate,
  });
};

export const useDeleteBannerMutation = (
  options?: t.MutationOptions<t.TDeleteBannerResponse, string>,
): UseMutationResult<t.TDeleteBannerResponse, unknown, string> => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, onMutate } = options || {};

  return useMutation<t.TDeleteBannerResponse, unknown, string>({
    mutationFn: (bannerId: string) => dataService.deleteBanner(bannerId),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries([QueryKeys.banners]);
      queryClient.invalidateQueries([QueryKeys.banner]);
      onSuccess?.(data, variables, context);
    },
    onError: (err, variables, context) => {
      onError?.(err, variables, context);
    },
    onMutate,
  });
};
