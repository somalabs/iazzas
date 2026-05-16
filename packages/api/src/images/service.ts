import { resolveModel } from './router';
import { renderTemplate } from './template';
import {
  ImageModel,
  ImageUseCase,
  AdapterRequestError,
  AdapterCapabilityError,
} from './types';
import type {
  ImageBytes,
  EditRequest,
  ImageAdapter,
  RouterDecision,
  PromptTemplate,
  ImageResolution,
  GenerationRequest,
} from './types';
import type {
  TImageGenerationRecord,
  TImageGenerationListResponse,
} from 'librechat-data-provider';

/**
 * Image generation orchestrator (PRD §5.1).
 *
 * Wires the pure Model Router (§5.4) and template engine (§5.3) to concrete
 * provider adapters, file storage and the persistence layer. All side-effecting
 * collaborators are injected, so the orchestration logic is unit-testable with
 * fakes and `/api` only supplies thin concrete wiring.
 */

/** Resolves a reference file id to raw image bytes (file storage in `/api`). */
export type ReferenceResolver = (userId: string, fileId: string) => Promise<ImageBytes>;

/** Persists one produced image and returns its file id. */
export type ImagePersister = (params: {
  userId: string;
  conversationId?: string;
  image: ImageBytes;
  index: number;
}) => Promise<string>;

export interface ImageGenerationRecordInput {
  user: string;
  conversationId?: string;
  useCase: ImageUseCase;
  prompt: string;
  referenceFileIds: string[];
  model: ImageModel;
  overridden: boolean;
  routerReason: string;
  params: { numImages: number; aspectRatio?: string; resolution?: string };
  outputFileIds: string[];
  parentGenerationId?: string;
}

export interface ImageGenerationRepository {
  create(input: ImageGenerationRecordInput): Promise<TImageGenerationRecord>;
  findById(userId: string, id: string): Promise<TImageGenerationRecord | null>;
  findByOutputFileId(userId: string, fileId: string): Promise<TImageGenerationRecord | null>;
  list(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<TImageGenerationListResponse>;
}

export interface ImageServiceDeps {
  adapters: Map<ImageModel, ImageAdapter>;
  resolveReference: ReferenceResolver;
  persistImage: ImagePersister;
  repository: ImageGenerationRepository;
}

/** Optional template injected per request (content owned by `produto`). */
export interface GenerateOptions {
  template?: PromptTemplate;
  templateInputs?: Record<string, string>;
}

const DEFAULT_EDIT_MODEL = ImageModel.NanoBananaPro;

export class ImageGenerationService {
  constructor(private readonly deps: ImageServiceDeps) {}

  private getAdapter(model: ImageModel): ImageAdapter {
    const adapter = this.deps.adapters.get(model);
    if (!adapter) {
      throw new AdapterCapabilityError(`No adapter registered for model ${model}.`);
    }
    return adapter;
  }

  private assertCapabilities(
    adapter: ImageAdapter,
    referenceCount: number,
    resolution: ImageResolution | undefined,
    needsEdit: boolean,
  ): void {
    const caps = adapter.capabilities;
    if (referenceCount > caps.maxReferenceImages) {
      throw new AdapterCapabilityError(
        `${adapter.model} accepts up to ${caps.maxReferenceImages} reference image(s); got ${referenceCount}.`,
      );
    }
    if (needsEdit && !caps.supportsEdit) {
      throw new AdapterCapabilityError(`${adapter.model} does not support editing.`);
    }
    if (
      resolution &&
      caps.supportedResolutions.length > 0 &&
      !caps.supportedResolutions.includes(resolution)
    ) {
      throw new AdapterCapabilityError(
        `${adapter.model} does not support resolution ${resolution}.`,
      );
    }
  }

  private resolvePrompt(request: GenerationRequest, options?: GenerateOptions): string {
    if (options?.template) {
      return renderTemplate(options.template, options.templateInputs ?? {}).prompt;
    }
    if (!request.prompt) {
      throw new AdapterCapabilityError('A prompt or a template is required.');
    }
    return request.prompt;
  }

  async generate(
    request: GenerationRequest,
    options?: GenerateOptions,
  ): Promise<TImageGenerationRecord> {
    const prompt = this.resolvePrompt(request, options);
    const decision = resolveModel(request);

    const references = await Promise.all(
      request.references.map((ref) => this.deps.resolveReference(request.userId, ref.fileId)),
    );

    const adapterInput = {
      prompt,
      references,
      numImages: request.numImages,
      aspectRatio: request.aspectRatio,
      resolution: request.resolution,
    };

    const { result, model, reason } = await this.runWithFallback(
      decision,
      options?.template?.fallbackModel,
      references.length,
      request.resolution,
      false,
      (adapter) => adapter.generate(adapterInput),
    );

    const outputFileIds = await this.persistAll(
      request.userId,
      request.conversationId,
      result.images,
    );

    return this.deps.repository.create({
      user: request.userId,
      conversationId: request.conversationId,
      useCase: request.useCase,
      prompt,
      referenceFileIds: request.references.map((ref) => ref.fileId),
      model,
      overridden: decision.overridden,
      routerReason: reason,
      params: {
        numImages: request.numImages,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
      },
      outputFileIds,
    });
  }

  async edit(request: EditRequest): Promise<TImageGenerationRecord> {
    const source = await this.deps.resolveReference(request.userId, request.sourceFileId);
    const parent = await this.deps.repository.findByOutputFileId(
      request.userId,
      request.sourceFileId,
    );

    const model = request.modelOverride ?? (parent?.model as ImageModel) ?? DEFAULT_EDIT_MODEL;
    const overridden = request.modelOverride !== undefined;
    const reason = overridden
      ? `Manual override to ${model} for edit (PRD §5.4 precedence 1).`
      : parent
        ? `Edit inherits parent generation model ${model}.`
        : `Edit defaults to ${model} (no lineage found).`;

    const adapter = this.getAdapter(model);
    this.assertCapabilities(adapter, 1, request.resolution, true);

    let result;
    try {
      result = await adapter.edit({
        prompt: request.prompt,
        source,
        numImages: request.numImages,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
      });
    } catch (error) {
      if (error instanceof AdapterRequestError) {
        throw error;
      }
      throw new AdapterRequestError(
        error instanceof Error ? error.message : String(error),
        model,
      );
    }

    const outputFileIds = await this.persistAll(
      request.userId,
      request.conversationId,
      result.images,
    );

    return this.deps.repository.create({
      user: request.userId,
      conversationId: request.conversationId,
      useCase: (parent?.useCase as ImageUseCase) ?? ImageUseCase.ApplyToModel,
      prompt: request.prompt,
      referenceFileIds: [request.sourceFileId],
      model: result.model,
      overridden,
      routerReason: reason,
      params: {
        numImages: request.numImages,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
      },
      outputFileIds,
      parentGenerationId: parent?._id,
    });
  }

  getGeneration(userId: string, id: string): Promise<TImageGenerationRecord | null> {
    return this.deps.repository.findById(userId, id);
  }

  listGenerations(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<TImageGenerationListResponse> {
    return this.deps.repository.list(userId, limit, cursor);
  }

  private async runWithFallback(
    decision: RouterDecision,
    fallbackModel: ImageModel | undefined,
    referenceCount: number,
    resolution: ImageResolution | undefined,
    needsEdit: boolean,
    call: (adapter: ImageAdapter) => Promise<{ images: ImageBytes[]; model: ImageModel }>,
  ): Promise<{
    result: { images: ImageBytes[]; model: ImageModel };
    model: ImageModel;
    reason: string;
  }> {
    const primary = this.getAdapter(decision.model);
    this.assertCapabilities(primary, referenceCount, resolution, needsEdit);
    try {
      return { result: await call(primary), model: decision.model, reason: decision.reason };
    } catch (error) {
      if (!(error instanceof AdapterRequestError) || fallbackModel === undefined) {
        throw error;
      }
      const fallback = this.getAdapter(fallbackModel);
      this.assertCapabilities(fallback, referenceCount, resolution, needsEdit);
      return {
        result: await call(fallback),
        model: fallbackModel,
        reason: `${decision.reason} Primary ${decision.model} failed (${error.message}); fell back to ${fallbackModel} (PRD §5.3).`,
      };
    }
  }

  private persistAll(
    userId: string,
    conversationId: string | undefined,
    images: ImageBytes[],
  ): Promise<string[]> {
    return Promise.all(
      images.map((image, index) =>
        this.deps.persistImage({ userId, conversationId, image, index }),
      ),
    );
  }
}
