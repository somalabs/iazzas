import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { Creation } from '~/components/Studio/types';

const STUDIO_QUERY_KEY = 'studio_creations';

export const useStudioCreationsQuery = (
  config?: UseQueryOptions<Creation[]>,
) => {
  return useQuery<Creation[]>(
    [STUDIO_QUERY_KEY],
    async (): Promise<Creation[]> => [],
    {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      ...config,
    },
  );
};
