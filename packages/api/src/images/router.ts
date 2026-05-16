import { ImageModel, ImageResolution, ImageUseCase } from './types';
import type { GenerationRequest, RouterDecision } from './types';

/**
 * Model Router (PRD §5.4).
 *
 * Pure and deterministic: maps a {@link GenerationRequest} to a model with a
 * logged reason. Capability validation is the adapter's responsibility — the
 * router only decides intent.
 */

/** Base use-case → model map (PRD §5.4). */
const BASE_MODEL_BY_USE_CASE: Record<ImageUseCase, ImageModel> = {
  [ImageUseCase.ColorVariants]: ImageModel.FluxKontext,
  [ImageUseCase.ApplyPrintToProduct]: ImageModel.NanoBanana,
  [ImageUseCase.ApplyToModel]: ImageModel.NanoBananaPro,
  [ImageUseCase.MultiReferenceCreation]: ImageModel.NanoBananaPro,
  [ImageUseCase.SketchToRender]: ImageModel.NanoBananaPro,
};

/** Resolution rank for the "≥2K forces Pro" transversal rule. */
const RESOLUTION_RANK: Record<ImageResolution, number> = {
  [ImageResolution.R1K]: 1,
  [ImageResolution.R2K]: 2,
  [ImageResolution.R4K]: 3,
};

/** References beyond this count force Nano Banana Pro (`> 8`; 8 does not). */
const REFERENCE_ESCALATION_THRESHOLD = 8;

const isAtLeast2K = (resolution?: ImageResolution): boolean =>
  resolution !== undefined && RESOLUTION_RANK[resolution] >= RESOLUTION_RANK[ImageResolution.R2K];

/**
 * Resolve which model handles a request, following PRD §5.4 precedence:
 *
 * 1. manual override — always wins, flagged + logged;
 * 2. resolution ≥ 2K — forces Nano Banana Pro;
 * 3. more than 8 references — forces Nano Banana Pro;
 * 4. otherwise — base map by use case.
 */
export function resolveModel(request: GenerationRequest): RouterDecision {
  if (request.modelOverride !== undefined) {
    return {
      model: request.modelOverride,
      overridden: true,
      reason: `Manual override to ${request.modelOverride} (PRD §5.4 precedence 1).`,
    };
  }

  if (isAtLeast2K(request.resolution)) {
    return {
      model: ImageModel.NanoBananaPro,
      overridden: false,
      reason: `Resolution ${request.resolution} ≥ 2K forces Nano Banana Pro (PRD §5.4).`,
    };
  }

  if (request.references.length > REFERENCE_ESCALATION_THRESHOLD) {
    return {
      model: ImageModel.NanoBananaPro,
      overridden: false,
      reason: `${request.references.length} references (> ${REFERENCE_ESCALATION_THRESHOLD}) forces Nano Banana Pro (PRD §5.4).`,
    };
  }

  const model = BASE_MODEL_BY_USE_CASE[request.useCase];
  return {
    model,
    overridden: false,
    reason: `Base map: use case ${request.useCase} → ${model} (PRD §5.4).`,
  };
}
