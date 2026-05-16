/**
 * Common contract for the fashion image-generation service (PRD §5.1–§5.4).
 *
 * This module is provider-agnostic: the Model Router (`router.ts`) and the
 * template engine (`template.ts`) depend only on these types. Concrete
 * provider adapters implement {@link ImageAdapter}.
 */

import { ImageModel, ImageResolution, ImageUseCase } from 'librechat-data-provider';

export { ImageModel, ImageResolution, ImageUseCase };

/** Reference image carried by file id (reuses existing file storage). */
export interface ReferenceImage {
  fileId: string;
}

/** A request to generate one or more images. */
export interface GenerationRequest {
  userId: string;
  useCase: ImageUseCase;
  prompt?: string;
  references: ReferenceImage[];
  numImages: number;
  aspectRatio?: string;
  resolution?: ImageResolution;
  /** Manual model override; honored and logged (PRD §5.4 precedence 1). */
  modelOverride?: ImageModel;
  conversationId?: string;
}

/** A request to edit a previously generated image (F8 prompt mode). */
export interface EditRequest {
  userId: string;
  /** File id of the source image being edited. */
  sourceFileId: string;
  prompt: string;
  numImages: number;
  aspectRatio?: string;
  resolution?: ImageResolution;
  modelOverride?: ImageModel;
  conversationId?: string;
}

/** Output of the Model Router for a given request. */
export interface RouterDecision {
  model: ImageModel;
  /** True when a manual override was applied (PRD §5.4 precedence 1). */
  overridden: boolean;
  /** Human-readable explanation, logged for traceability. */
  reason: string;
}

/**
 * Injectable prompt template (PRD §5.3 YAML structure). The *content* of
 * templates is data supplied by the `produto` stream — never embedded here.
 */
export interface PromptTemplate {
  name: string;
  /** Names of inputs that must be present to render. */
  inputs: string[];
  /** Template body with `{{var}}` placeholders. */
  promptTemplate: string;
  defaultModel: ImageModel;
  fallbackModel?: ImageModel;
  postProcessing?: {
    /** Upscale when the chosen resolution is below this threshold. */
    upscaleIfBelow?: ImageResolution;
  };
  /** Free-form quality heuristics passed through to the caller. */
  qualitySignals?: string[];
}

/** Result of rendering a {@link PromptTemplate} against concrete inputs. */
export interface RenderedTemplate {
  prompt: string;
  defaultModel: ImageModel;
  fallbackModel?: ImageModel;
  upscaleIfBelow?: ImageResolution;
  qualitySignals: string[];
}

/** What a provider adapter can do — used by the orchestrator/router boundary. */
export interface AdapterCapabilities {
  maxReferenceImages: number;
  supportedResolutions: ImageResolution[];
  supportsEdit: boolean;
}

/**
 * Raw image bytes flowing in (a resolved reference) or out (a generated
 * image). Same shape both directions, so a single type serves both.
 */
export interface ImageBytes {
  /** Base64-encoded image bytes. */
  base64: string;
  mimeType: string;
}

/** Input an adapter needs to generate images (references already resolved). */
export interface AdapterGenerateInput {
  prompt: string;
  references: ImageBytes[];
  numImages: number;
  aspectRatio?: string;
  resolution?: ImageResolution;
}

/** Input an adapter needs to edit a single source image (F8 prompt mode). */
export interface AdapterEditInput {
  prompt: string;
  source: ImageBytes;
  numImages: number;
  aspectRatio?: string;
  resolution?: ImageResolution;
}

export interface AdapterResult {
  images: ImageBytes[];
  model: ImageModel;
}

export class AdapterCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdapterCapabilityError';
  }
}

export class AdapterRequestError extends Error {
  constructor(
    message: string,
    public readonly model: ImageModel,
  ) {
    super(message);
    this.name = 'AdapterRequestError';
  }
}

/**
 * Common interface every provider adapter implements. Concrete adapters
 * (Nano Banana Pro, Flux Kontext, Nano Banana) live under `adapters/`.
 * References are resolved to bytes by the orchestrator before the call, so
 * adapters stay decoupled from file storage.
 */
export interface ImageAdapter {
  readonly model: ImageModel;
  readonly capabilities: AdapterCapabilities;
  generate(input: AdapterGenerateInput): Promise<AdapterResult>;
  edit(input: AdapterEditInput): Promise<AdapterResult>;
}
