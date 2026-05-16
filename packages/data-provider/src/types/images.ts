/**
 * Shared contract for the fashion image-generation feature (PRD §5).
 * Single source of truth for both backend (`packages/api`) and frontend.
 */

/** The five ratified v1 use cases (PRD §5.4). */
export enum ImageUseCase {
  ColorVariants = 'color_variants',
  ApplyPrintToProduct = 'apply_print_to_product',
  ApplyToModel = 'apply_to_model',
  MultiReferenceCreation = 'multi_reference_creation',
  SketchToRender = 'sketch_to_render',
}

/** Models in the prescribed v1 stack. */
export enum ImageModel {
  FluxKontext = 'flux_kontext',
  NanoBanana = 'nano_banana',
  NanoBananaPro = 'nano_banana_pro',
}

/** Native output resolutions. Ordered: 1K < 2K < 4K. */
export enum ImageResolution {
  R1K = '1K',
  R2K = '2K',
  R4K = '4K',
}

/** Body of a generation request (client → server). */
export interface TGenerateImageRequest {
  useCase: ImageUseCase;
  prompt?: string;
  referenceFileIds: string[];
  numImages: number;
  aspectRatio?: string;
  resolution?: ImageResolution;
  /** Manual model override; honored and logged (PRD §5.4 precedence 1). */
  modelOverride?: ImageModel;
  conversationId?: string;
}

/** Body of an edit request — F8 prompt mode (client → server). */
export interface TEditImageRequest {
  sourceFileId: string;
  prompt: string;
  numImages: number;
  aspectRatio?: string;
  resolution?: ImageResolution;
  modelOverride?: ImageModel;
  conversationId?: string;
}

/** A persisted generation record with metadata and lineage (server → client). */
export interface TImageGenerationRecord {
  _id: string;
  useCase: ImageUseCase;
  prompt: string;
  referenceFileIds: string[];
  model: ImageModel;
  overridden: boolean;
  routerReason: string;
  params: {
    numImages: number;
    aspectRatio?: string;
    resolution?: ImageResolution;
  };
  outputFileIds: string[];
  parentGenerationId?: string;
  createdAt: string;
}

/** Paginated history response (cursor pagination, per frontend rules). */
export interface TImageGenerationListResponse {
  records: TImageGenerationRecord[];
  nextCursor: string | null;
}
