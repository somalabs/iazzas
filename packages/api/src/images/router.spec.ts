import { resolveModel } from './router';
import { ImageModel, ImageResolution, ImageUseCase } from './types';
import type { GenerationRequest, ReferenceImage } from './types';

const refs = (n: number): ReferenceImage[] =>
  Array.from({ length: n }, (_, i) => ({ fileId: `file_${i}` }));

const req = (overrides: Partial<GenerationRequest> = {}): GenerationRequest => ({
  userId: 'u1',
  useCase: ImageUseCase.ApplyPrintToProduct,
  references: [],
  numImages: 1,
  ...overrides,
});

describe('resolveModel — base map by use case (PRD §5.4)', () => {
  it('UC1 color variants → Flux Kontext', () => {
    const d = resolveModel(req({ useCase: ImageUseCase.ColorVariants }));
    expect(d.model).toBe(ImageModel.FluxKontext);
    expect(d.overridden).toBe(false);
  });

  it('UC2 apply print to product → Nano Banana', () => {
    const d = resolveModel(req({ useCase: ImageUseCase.ApplyPrintToProduct }));
    expect(d.model).toBe(ImageModel.NanoBanana);
  });

  it('UC3 apply to model → Nano Banana Pro', () => {
    expect(resolveModel(req({ useCase: ImageUseCase.ApplyToModel })).model).toBe(
      ImageModel.NanoBananaPro,
    );
  });

  it('UC4 multi-reference creation → Nano Banana Pro', () => {
    expect(resolveModel(req({ useCase: ImageUseCase.MultiReferenceCreation })).model).toBe(
      ImageModel.NanoBananaPro,
    );
  });

  it('UC5 sketch to render → Nano Banana Pro', () => {
    expect(resolveModel(req({ useCase: ImageUseCase.SketchToRender })).model).toBe(
      ImageModel.NanoBananaPro,
    );
  });
});

describe('resolveModel — transversal rules', () => {
  it('resolution = 2K forces Nano Banana Pro even when base map says otherwise', () => {
    const d = resolveModel(
      req({ useCase: ImageUseCase.ColorVariants, resolution: ImageResolution.R2K }),
    );
    expect(d.model).toBe(ImageModel.NanoBananaPro);
    expect(d.overridden).toBe(false);
    expect(d.reason).toMatch(/2K/);
  });

  it('resolution = 4K forces Nano Banana Pro', () => {
    expect(
      resolveModel(req({ useCase: ImageUseCase.ColorVariants, resolution: ImageResolution.R4K }))
        .model,
    ).toBe(ImageModel.NanoBananaPro);
  });

  it('resolution = 1K does not escalate', () => {
    expect(
      resolveModel(req({ useCase: ImageUseCase.ColorVariants, resolution: ImageResolution.R1K }))
        .model,
    ).toBe(ImageModel.FluxKontext);
  });

  it('more than 8 references forces Nano Banana Pro', () => {
    const d = resolveModel(req({ useCase: ImageUseCase.ApplyPrintToProduct, references: refs(9) }));
    expect(d.model).toBe(ImageModel.NanoBananaPro);
    expect(d.reason).toMatch(/references/);
  });

  it('exactly 8 references does not escalate', () => {
    expect(
      resolveModel(req({ useCase: ImageUseCase.ApplyPrintToProduct, references: refs(8) })).model,
    ).toBe(ImageModel.NanoBanana);
  });
});

describe('resolveModel — manual override (precedence 1)', () => {
  it('override wins over base map and is flagged + logged', () => {
    const d = resolveModel(
      req({ useCase: ImageUseCase.ColorVariants, modelOverride: ImageModel.NanoBanana }),
    );
    expect(d.model).toBe(ImageModel.NanoBanana);
    expect(d.overridden).toBe(true);
    expect(d.reason).toMatch(/override/i);
  });

  it('override wins even against transversal escalation rules', () => {
    const d = resolveModel(
      req({
        useCase: ImageUseCase.ColorVariants,
        resolution: ImageResolution.R4K,
        references: refs(20),
        modelOverride: ImageModel.FluxKontext,
      }),
    );
    expect(d.model).toBe(ImageModel.FluxKontext);
    expect(d.overridden).toBe(true);
  });
});
