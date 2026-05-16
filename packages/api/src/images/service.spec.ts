import { ImageModel, ImageUseCase, ImageResolution, AdapterRequestError } from './types';
import { ImageGenerationService } from './service';
import type {
  ImageBytes,
  ImageAdapter,
  PromptTemplate,
  AdapterEditInput,
  AdapterGenerateInput,
} from './types';
import type {
  ImageGenerationRepository,
  ImageGenerationRecordInput,
} from './service';
import type { TImageGenerationRecord } from 'librechat-data-provider';

class FakeAdapter implements ImageAdapter {
  generateCalls: AdapterGenerateInput[] = [];
  editCalls: AdapterEditInput[] = [];

  constructor(
    readonly model: ImageModel,
    readonly capabilities = { maxReferenceImages: 14, supportedResolutions: [], supportsEdit: true },
    private readonly fail = false,
  ) {}

  async generate(input: AdapterGenerateInput) {
    this.generateCalls.push(input);
    if (this.fail) {
      throw new AdapterRequestError('boom', this.model);
    }
    return { images: [{ base64: 'b64', mimeType: 'image/png' }], model: this.model };
  }

  async edit(input: AdapterEditInput) {
    this.editCalls.push(input);
    return { images: [{ base64: 'edited', mimeType: 'image/png' }], model: this.model };
  }
}

class InMemoryRepo implements ImageGenerationRepository {
  records: (ImageGenerationRecordInput & { _id: string; createdAt: string })[] = [];
  private seq = 0;

  async create(input: ImageGenerationRecordInput): Promise<TImageGenerationRecord> {
    const record = { ...input, _id: `gen_${++this.seq}`, createdAt: new Date().toISOString() };
    this.records.push(record);
    return record as unknown as TImageGenerationRecord;
  }
  async findById(userId: string, id: string) {
    const r = this.records.find((x) => x._id === id && x.user === userId);
    return (r as unknown as TImageGenerationRecord) ?? null;
  }
  async findByOutputFileId(userId: string, fileId: string) {
    const r = this.records.find((x) => x.user === userId && x.outputFileIds.includes(fileId));
    return (r as unknown as TImageGenerationRecord) ?? null;
  }
  async list(userId: string, limit: number) {
    const records = this.records.filter((x) => x.user === userId).slice(0, limit);
    return { records: records as unknown as TImageGenerationRecord[], nextCursor: null };
  }
}

function setup(adapters: FakeAdapter[]) {
  const repo = new InMemoryRepo();
  const persisted: ImageBytes[] = [];
  const service = new ImageGenerationService({
    adapters: new Map(adapters.map((a) => [a.model, a])),
    resolveReference: async (_u, fileId) => ({ base64: `ref:${fileId}`, mimeType: 'image/png' }),
    persistImage: async ({ image, index }) => {
      persisted.push(image);
      return `out_${index}`;
    },
    repository: repo,
  });
  return { service, repo, persisted };
}

const baseReq = {
  userId: 'u1',
  references: [],
  numImages: 1,
};

describe('ImageGenerationService.generate', () => {
  it('routes apply_to_model → Nano Banana Pro and persists a record', async () => {
    const pro = new FakeAdapter(ImageModel.NanoBananaPro);
    const { service, repo } = setup([pro]);

    const record = await service.generate({
      ...baseReq,
      useCase: ImageUseCase.ApplyToModel,
      prompt: 'model wearing dress',
    });

    expect(pro.generateCalls).toHaveLength(1);
    expect(record.model).toBe(ImageModel.NanoBananaPro);
    expect(record.outputFileIds).toEqual(['out_0']);
    expect(record.routerReason).toMatch(/Base map/);
    expect(repo.records).toHaveLength(1);
  });

  it('routes color_variants → Flux Kontext with resolved references', async () => {
    const flux = new FakeAdapter(ImageModel.FluxKontext);
    const { service } = setup([flux]);

    await service.generate({
      ...baseReq,
      useCase: ImageUseCase.ColorVariants,
      prompt: 'teal colorway',
      references: [{ fileId: 'f1' }],
    });

    expect(flux.generateCalls[0].references).toEqual([
      { base64: 'ref:f1', mimeType: 'image/png' },
    ]);
  });

  it('honors a manual override and flags it', async () => {
    const pro = new FakeAdapter(ImageModel.NanoBananaPro);
    const flux = new FakeAdapter(ImageModel.FluxKontext);
    const { service } = setup([pro, flux]);

    const record = await service.generate({
      ...baseReq,
      useCase: ImageUseCase.ColorVariants,
      prompt: 'x',
      modelOverride: ImageModel.NanoBananaPro,
    });

    expect(record.model).toBe(ImageModel.NanoBananaPro);
    expect(record.overridden).toBe(true);
    expect(pro.generateCalls).toHaveLength(1);
  });

  it('forces Nano Banana Pro at ≥2K resolution', async () => {
    const pro = new FakeAdapter(ImageModel.NanoBananaPro);
    const flux = new FakeAdapter(ImageModel.FluxKontext);
    const { service } = setup([pro, flux]);

    const record = await service.generate({
      ...baseReq,
      useCase: ImageUseCase.ColorVariants,
      prompt: 'x',
      references: [{ fileId: 'f1' }],
      resolution: ImageResolution.R4K,
    });

    expect(record.model).toBe(ImageModel.NanoBananaPro);
    expect(record.routerReason).toMatch(/2K/);
  });

  it('rejects when references exceed adapter capability', async () => {
    const flux = new FakeAdapter(ImageModel.FluxKontext, {
      maxReferenceImages: 1,
      supportedResolutions: [],
      supportsEdit: true,
    });
    const { service } = setup([flux]);

    await expect(
      service.generate({
        ...baseReq,
        useCase: ImageUseCase.ColorVariants,
        prompt: 'x',
        references: [{ fileId: 'a' }, { fileId: 'b' }],
      }),
    ).rejects.toThrow(/up to 1 reference/);
  });

  it('renders an injected template instead of a raw prompt', async () => {
    const pro = new FakeAdapter(ImageModel.NanoBananaPro);
    const { service } = setup([pro]);
    const template: PromptTemplate = {
      name: 'try_on',
      inputs: ['garment'],
      promptTemplate: 'A model wearing {{garment}}',
      defaultModel: ImageModel.NanoBananaPro,
    };

    const record = await service.generate(
      { ...baseReq, useCase: ImageUseCase.ApplyToModel },
      { template, templateInputs: { garment: 'a silk dress' } },
    );

    expect(record.prompt).toBe('A model wearing a silk dress');
    expect(pro.generateCalls[0].prompt).toBe('A model wearing a silk dress');
  });

  it('propagates a missing required template input', async () => {
    const pro = new FakeAdapter(ImageModel.NanoBananaPro);
    const { service } = setup([pro]);
    const template: PromptTemplate = {
      name: 't',
      inputs: ['garment'],
      promptTemplate: '{{garment}}',
      defaultModel: ImageModel.NanoBananaPro,
    };
    await expect(
      service.generate({ ...baseReq, useCase: ImageUseCase.ApplyToModel }, { template }),
    ).rejects.toThrow(/garment/);
  });

  it('falls back to the template fallback model on adapter failure', async () => {
    const flux = new FakeAdapter(ImageModel.FluxKontext, undefined, true);
    const pro = new FakeAdapter(ImageModel.NanoBananaPro);
    const { service } = setup([flux, pro]);
    const template: PromptTemplate = {
      name: 'cv',
      inputs: [],
      promptTemplate: 'x',
      defaultModel: ImageModel.FluxKontext,
      fallbackModel: ImageModel.NanoBananaPro,
    };

    const record = await service.generate(
      {
        ...baseReq,
        useCase: ImageUseCase.ColorVariants,
        references: [{ fileId: 'f1' }],
      },
      { template },
    );

    expect(record.model).toBe(ImageModel.NanoBananaPro);
    expect(record.routerReason).toMatch(/fell back/);
    expect(pro.generateCalls).toHaveLength(1);
  });
});

describe('ImageGenerationService.edit', () => {
  it('inherits the parent generation model and records lineage', async () => {
    const pro = new FakeAdapter(ImageModel.NanoBananaPro);
    const { service, repo } = setup([pro]);

    const parent = await service.generate({
      ...baseReq,
      useCase: ImageUseCase.ApplyToModel,
      prompt: 'base',
    });

    const edited = await service.edit({
      userId: 'u1',
      sourceFileId: parent.outputFileIds[0],
      prompt: 'make it longer',
      numImages: 1,
    });

    expect(edited.parentGenerationId).toBe(parent._id);
    expect(edited.model).toBe(ImageModel.NanoBananaPro);
    expect(edited.useCase).toBe(ImageUseCase.ApplyToModel);
    expect(pro.editCalls[0].source).toEqual({
      base64: `ref:${parent.outputFileIds[0]}`,
      mimeType: 'image/png',
    });
    expect(repo.records).toHaveLength(2);
  });
});
