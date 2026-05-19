import { AdapterRequestError } from '../types';
import type { StudioModelId } from '../types';

type GeneratedImage = { base64: string; mimeType: string };

/**
 * Generate `count` images concurrently, each with one retry on a transient
 * (retryable) failure. Returns every image that succeeded so a single flaky
 * call no longer discards the whole batch (the "Falha na geração" with N>1).
 * Throws only when every attempt failed.
 */
export async function generateConcurrently(
  model: StudioModelId,
  count: number,
  one: () => Promise<GeneratedImage>,
): Promise<GeneratedImage[]> {
  const attempt = async (): Promise<GeneratedImage> => {
    try {
      return await one();
    } catch (err) {
      // A content block (retryable === false) won't change on retry.
      if (err instanceof AdapterRequestError && !err.retryable) {
        throw err;
      }
      return await one();
    }
  };

  const settled = await Promise.allSettled(
    Array.from({ length: count }, () => attempt()),
  );

  const images = settled
    .filter(
      (s): s is PromiseFulfilledResult<GeneratedImage> => s.status === 'fulfilled',
    )
    .map((s) => s.value);

  if (images.length === 0) {
    const rejected = settled.find(
      (s): s is PromiseRejectedResult => s.status === 'rejected',
    );
    const reason = rejected?.reason;
    throw reason instanceof AdapterRequestError
      ? reason
      : new AdapterRequestError(
          model,
          `Generation failed: ${(reason as Error)?.message ?? 'unknown error'}`,
        );
  }

  return images;
}
