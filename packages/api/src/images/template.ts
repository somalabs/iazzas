import { ImageResolution } from './types';
import type { PromptTemplate, RenderedTemplate } from './types';

/**
 * Template engine (PRD §5.3).
 *
 * Pure and deterministic. The *content* of templates is injectable data from
 * the `produto` stream; this engine only validates inputs, interpolates
 * `{{var}}` placeholders, and passes model/post-processing through.
 */

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

const RESOLUTION_RANK: Record<ImageResolution, number> = {
  [ImageResolution.R1K]: 1,
  [ImageResolution.R2K]: 2,
  [ImageResolution.R4K]: 3,
};

export class MissingTemplateInputError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing required template input(s): ${missing.join(', ')}`);
    this.name = 'MissingTemplateInputError';
  }
}

/**
 * Render a template against concrete inputs.
 *
 * @throws {MissingTemplateInputError} when a declared required input is absent.
 */
export function renderTemplate(
  template: PromptTemplate,
  inputs: Record<string, string>,
): RenderedTemplate {
  const missing = template.inputs.filter(
    (name) => inputs[name] === undefined || inputs[name] === '',
  );
  if (missing.length > 0) {
    throw new MissingTemplateInputError(missing);
  }

  const prompt = template.promptTemplate.replace(PLACEHOLDER, (match, name: string) =>
    inputs[name] !== undefined ? inputs[name] : match,
  );

  return {
    prompt,
    defaultModel: template.defaultModel,
    fallbackModel: template.fallbackModel,
    upscaleIfBelow: template.postProcessing?.upscaleIfBelow,
    qualitySignals: template.qualitySignals ?? [],
  };
}

/**
 * Whether the produced resolution should be upscaled, per the template's
 * `post_processing.upscale_if_below` threshold (PRD §5.3).
 */
export function shouldUpscale(
  produced: ImageResolution,
  upscaleIfBelow?: ImageResolution,
): boolean {
  if (upscaleIfBelow === undefined) {
    return false;
  }
  return RESOLUTION_RANK[produced] < RESOLUTION_RANK[upscaleIfBelow];
}
