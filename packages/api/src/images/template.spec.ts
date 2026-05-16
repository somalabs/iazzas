import { MissingTemplateInputError, renderTemplate, shouldUpscale } from './template';
import { ImageModel, ImageResolution } from './types';
import type { PromptTemplate } from './types';

const template = (overrides: Partial<PromptTemplate> = {}): PromptTemplate => ({
  name: 'uc1_color_variants',
  inputs: ['product', 'color'],
  promptTemplate: 'Render {{product}} in {{ color }} colorway.',
  defaultModel: ImageModel.FluxKontext,
  fallbackModel: ImageModel.NanoBanana,
  postProcessing: { upscaleIfBelow: ImageResolution.R2K },
  qualitySignals: ['sharp_edges'],
  ...overrides,
});

describe('renderTemplate', () => {
  it('interpolates {{var}} placeholders (with and without whitespace)', () => {
    const r = renderTemplate(template(), { product: 'dress', color: 'red' });
    expect(r.prompt).toBe('Render dress in red colorway.');
  });

  it('passes default/fallback model and post-processing through', () => {
    const r = renderTemplate(template(), { product: 'dress', color: 'red' });
    expect(r.defaultModel).toBe(ImageModel.FluxKontext);
    expect(r.fallbackModel).toBe(ImageModel.NanoBanana);
    expect(r.upscaleIfBelow).toBe(ImageResolution.R2K);
    expect(r.qualitySignals).toEqual(['sharp_edges']);
  });

  it('defaults qualitySignals to [] when absent', () => {
    const r = renderTemplate(template({ qualitySignals: undefined }), {
      product: 'dress',
      color: 'red',
    });
    expect(r.qualitySignals).toEqual([]);
  });

  it('throws MissingTemplateInputError listing every missing required input', () => {
    expect(() => renderTemplate(template(), { product: 'dress' })).toThrow(
      MissingTemplateInputError,
    );
    try {
      renderTemplate(template(), {});
    } catch (e) {
      expect((e as MissingTemplateInputError).missing).toEqual(['product', 'color']);
    }
  });

  it('treats empty string as a missing input', () => {
    expect(() => renderTemplate(template(), { product: 'dress', color: '' })).toThrow(
      MissingTemplateInputError,
    );
  });

  it('leaves unknown placeholders untouched (only declared inputs validated)', () => {
    const r = renderTemplate(
      template({ inputs: ['product'], promptTemplate: '{{product}} {{unknown}}' }),
      { product: 'dress' },
    );
    expect(r.prompt).toBe('dress {{unknown}}');
  });
});

describe('shouldUpscale', () => {
  it('upscales when produced resolution is below threshold', () => {
    expect(shouldUpscale(ImageResolution.R1K, ImageResolution.R2K)).toBe(true);
  });

  it('does not upscale when produced resolution meets threshold', () => {
    expect(shouldUpscale(ImageResolution.R2K, ImageResolution.R2K)).toBe(false);
  });

  it('does not upscale when produced resolution exceeds threshold', () => {
    expect(shouldUpscale(ImageResolution.R4K, ImageResolution.R2K)).toBe(false);
  });

  it('does not upscale when no threshold configured', () => {
    expect(shouldUpscale(ImageResolution.R1K, undefined)).toBe(false);
  });
});
