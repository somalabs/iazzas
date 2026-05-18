import type {
  StudioCreation,
  StudioImageResult,
  TStudioCreationListResponse,
  TStudioEditRequest,
  TStudioGenerateRequest,
} from 'librechat-data-provider';
import type { StudioAdapter, StudioModelId, StudioReferenceImage } from './types';
import type { ProvenanceManifest } from './watermark';
import { AdapterCapabilityError, AdapterRequestError } from './types';
import { ADAPTER_CAPABILITIES } from './adapters';
import { assertRequiredInputs, renderTemplate } from './template';
import { getUseCase, orderedSlotIds } from './usecases';
import { buildProvenanceManifest } from './watermark';
import { resolveModel } from './router';

export type ResolvedReference = { base64: string; mimeType: string };
export type ReferenceResolver = (fileId: string) => Promise<ResolvedReference>;
export type ImagePersister = (input: {
  base64: string;
  mimeType: string;
  filename: string;
}) => Promise<StudioImageResult>;

export type StudioAuditEvent = {
  type: 'studio.generate' | 'studio.edit';
  userId: string;
  useCase: string;
  model: StudioModelId;
  routerReason: string;
  referenceCount: number;
  parentCreationId?: string;
  provenance: ProvenanceManifest;
};

export type AuditLogger = (event: StudioAuditEvent) => void | Promise<void>;

export type StudioCreationDraft = {
  userId: string;
  useCase: StudioCreation['useCase'];
  prompt: string;
  model: StudioModelId;
  aspectRatio: StudioCreation['aspectRatio'];
  resolution: StudioCreation['resolution'];
  imageCount: number;
  images: StudioImageResult[];
  referenceCount: number;
  status: StudioCreation['status'];
  provenance: ProvenanceManifest;
  routerReason: string;
  parentCreationId?: string;
};

export type StoredCreation = StudioCreation & {
  userId: string;
  model: StudioModelId;
  images: StudioImageResult[];
};

export interface StudioRepository {
  create(draft: StudioCreationDraft): Promise<StudioCreation>;
  findById(id: string, userId: string): Promise<StoredCreation | null>;
  list(params: {
    userId: string;
    cursor: string | null;
    limit: number;
  }): Promise<TStudioCreationListResponse>;
}

export type StudioServiceDeps = {
  adapters: Map<StudioModelId, StudioAdapter>;
  resolveReference: ReferenceResolver;
  persistImage: ImagePersister;
  repository: StudioRepository;
  audit: AuditLogger;
  now?: () => Date;
};

const assertCapabilities = (model: StudioModelId, referenceCount: number): void => {
  const caps = ADAPTER_CAPABILITIES[model];
  if (referenceCount > caps.maxReferenceImages) {
    throw new AdapterCapabilityError(
      model,
      `${model} accepts at most ${caps.maxReferenceImages} reference image(s), got ${referenceCount}`,
    );
  }
};

export class StudioGenerationService {
  constructor(private readonly deps: StudioServiceDeps) {}

  private now(): Date {
    return this.deps.now ? this.deps.now() : new Date();
  }

  private getAdapter(model: StudioModelId): StudioAdapter {
    const adapter = this.deps.adapters.get(model);
    if (!adapter) {
      throw new AdapterCapabilityError(model, `No adapter registered for model ${model}`);
    }
    return adapter;
  }

  private buildContext(
    formValues: Record<string, string | boolean>,
  ): Record<string, string | boolean> {
    return { ...formValues };
  }

  async generate(userId: string, req: TStudioGenerateRequest): Promise<StudioCreation> {
    const useCase = getUseCase(req.useCase);
    const context = this.buildContext(req.formValues);
    assertRequiredInputs(
      context,
      useCase.formFields.filter((f) => f.required).map((f) => f.id),
    );

    const slotOrder = orderedSlotIds(useCase);
    const orderedRefs = [...req.references].sort(
      (a, b) => slotOrder.indexOf(a.slotId) - slotOrder.indexOf(b.slotId),
    );

    const rendered = renderTemplate(useCase.promptTemplate, context);
    const prompt = req.prompt.trim() ? `${rendered}\n${req.prompt.trim()}` : rendered;

    const decision = resolveModel(
      {
        useCase: req.useCase,
        defaultModel: useCase.defaultModel,
        resolution: req.resolution,
        referenceCount: orderedRefs.length,
        formValues: req.formValues,
        modelOverride: req.modelOverride ?? null,
      },
      useCase,
    );

    assertCapabilities(decision.model, orderedRefs.length);

    const references: StudioReferenceImage[] = [];
    for (const ref of orderedRefs) {
      const resolved = await this.deps.resolveReference(ref.fileId);
      references.push({ label: ref.label, base64: resolved.base64, mimeType: resolved.mimeType });
    }

    const output = await this.runWithFallback(decision.model, useCase.fallbackModel, {
      prompt,
      references,
      aspectRatio: req.aspectRatio,
      resolution: req.resolution,
      count: req.imageCount,
    });

    const createdAt = this.now();
    const provenance = buildProvenanceManifest({
      model: output.model,
      useCase: req.useCase,
      createdAt,
    });

    const images = await this.persistAll(output.images, req.useCase);

    const creation = await this.deps.repository.create({
      userId,
      useCase: req.useCase,
      prompt,
      model: output.model,
      aspectRatio: req.aspectRatio,
      resolution: req.resolution,
      imageCount: req.imageCount,
      images,
      referenceCount: orderedRefs.length,
      status: 'done',
      provenance,
      routerReason: output.reason,
    });

    await this.deps.audit({
      type: 'studio.generate',
      userId,
      useCase: req.useCase,
      model: output.model,
      routerReason: output.reason,
      referenceCount: orderedRefs.length,
      provenance,
    });

    return creation;
  }

  async edit(userId: string, req: TStudioEditRequest): Promise<StudioCreation> {
    const parent = await this.deps.repository.findById(req.creationId, userId);
    if (!parent) {
      throw new AdapterCapabilityError('nano-banana-pro', 'Source creation not found');
    }
    const sourceImage = parent.images.find((img) => img.id === req.imageId);
    if (!sourceImage) {
      throw new AdapterCapabilityError('nano-banana-pro', 'Source image not found in creation');
    }

    getUseCase(parent.useCase);
    const model: StudioModelId = req.modelOverride ?? parent.model;
    const source = await this.deps.resolveReference(sourceImage.id);

    const adapter = this.getAdapter(model);
    let output;
    try {
      output = await adapter.generate({
        prompt: req.prompt,
        references: [{ label: '@img1', base64: source.base64, mimeType: source.mimeType }],
        aspectRatio: parent.aspectRatio,
        resolution: parent.resolution,
        count: 1,
      });
    } catch (err) {
      throw err instanceof AdapterRequestError
        ? err
        : new AdapterRequestError(model, (err as Error).message);
    }

    const createdAt = this.now();
    const provenance = buildProvenanceManifest({ model, useCase: parent.useCase, createdAt });
    const images = await this.persistAll(output.images, parent.useCase);

    const creation = await this.deps.repository.create({
      userId,
      useCase: parent.useCase,
      prompt: req.prompt,
      model,
      aspectRatio: parent.aspectRatio,
      resolution: parent.resolution,
      imageCount: 1,
      images,
      referenceCount: 1,
      status: 'done',
      provenance,
      routerReason: `Edit of ${parent.id}`,
      parentCreationId: parent.id,
    });

    await this.deps.audit({
      type: 'studio.edit',
      userId,
      useCase: parent.useCase,
      model,
      routerReason: `Edit of ${parent.id}`,
      referenceCount: 1,
      parentCreationId: parent.id,
      provenance,
    });

    return creation;
  }

  private async runWithFallback(
    model: StudioModelId,
    fallbackModel: StudioModelId,
    input: Parameters<StudioAdapter['generate']>[0],
  ): Promise<{ model: StudioModelId; reason: string; images: { base64: string; mimeType: string }[] }> {
    const adapter = this.getAdapter(model);
    try {
      const out = await adapter.generate(input);
      return { model, reason: 'primary', images: out.images };
    } catch (err) {
      if (err instanceof AdapterRequestError && err.retryable && fallbackModel !== model) {
        const fallback = this.getAdapter(fallbackModel);
        assertCapabilities(fallbackModel, input.references.length);
        const out = await fallback.generate(input);
        return {
          model: fallbackModel,
          reason: `Fallback from ${model}: ${err.message}`,
          images: out.images,
        };
      }
      throw err;
    }
  }

  private async persistAll(
    images: { base64: string; mimeType: string }[],
    useCase: string,
  ): Promise<StudioImageResult[]> {
    const results: StudioImageResult[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      results.push(
        await this.deps.persistImage({
          base64: img.base64,
          mimeType: img.mimeType,
          filename: `studio-${useCase}-${i + 1}`,
        }),
      );
    }
    return results;
  }
}
