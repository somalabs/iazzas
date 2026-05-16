import { ImageModel, ImageResolution } from '../types';
import { GoogleImageAdapter } from './google';
import { FluxKontextAdapter } from './flux';
import type { ImageAdapter, AdapterCapabilities } from '../types';
import type { GoogleAdapterConfig } from './google';
import type { FluxAdapterConfig } from './flux';

export { GoogleImageAdapter } from './google';
export { FluxKontextAdapter } from './flux';
export type { GoogleAdapterConfig, GeminiClient } from './google';
export type { FluxAdapterConfig } from './flux';

/**
 * Per-model capabilities (PRD §5 + vendor docs, Nov 2025):
 * - Nano Banana Pro (`gemini-3-pro-image-preview`): up to 14 references,
 *   native 1K/2K/4K, multi-turn editing.
 * - Nano Banana 2 (`gemini-2.5-flash-image`): ≤8 references (router escalates
 *   >8 to Pro), no native resolution control (best-effort), editing.
 * - Flux Kontext (BFL): single image-conditioned input, dimension follows the
 *   input image, editing only.
 */
export const ADAPTER_CAPABILITIES: Record<ImageModel, AdapterCapabilities> = {
  [ImageModel.NanoBananaPro]: {
    maxReferenceImages: 14,
    supportedResolutions: [ImageResolution.R1K, ImageResolution.R2K, ImageResolution.R4K],
    supportsEdit: true,
  },
  [ImageModel.NanoBanana]: {
    maxReferenceImages: 8,
    supportedResolutions: [],
    supportsEdit: true,
  },
  [ImageModel.FluxKontext]: {
    maxReferenceImages: 1,
    supportedResolutions: [],
    supportsEdit: true,
  },
};

export interface AdapterRegistryConfig {
  google?: GoogleAdapterConfig;
  flux?: FluxAdapterConfig;
}

/**
 * Build the model → adapter registry consumed by the orchestrator. Concrete
 * vendor credentials/clients are injected by the caller (`/api` controller).
 */
export function createImageAdapters(
  config: AdapterRegistryConfig = {},
): Map<ImageModel, ImageAdapter> {
  return new Map<ImageModel, ImageAdapter>([
    [
      ImageModel.NanoBananaPro,
      new GoogleImageAdapter(
        ImageModel.NanoBananaPro,
        ADAPTER_CAPABILITIES[ImageModel.NanoBananaPro],
        config.google,
      ),
    ],
    [
      ImageModel.NanoBanana,
      new GoogleImageAdapter(
        ImageModel.NanoBanana,
        ADAPTER_CAPABILITIES[ImageModel.NanoBanana],
        config.google,
      ),
    ],
    [
      ImageModel.FluxKontext,
      new FluxKontextAdapter(ADAPTER_CAPABILITIES[ImageModel.FluxKontext], config.flux),
    ],
  ]);
}
