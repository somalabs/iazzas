import { resolve } from 'path';
import { StudioGenerationService } from './service';
import { resetRouterCache } from './router';
import { resetUseCaseCache } from './usecases';
import { AdapterRequestError } from './types';
import type {
  AdapterGenerateInput,
  AdapterGenerateOutput,
  StudioAdapter,
  StudioModelId,
} from './types';
import type {
  StudioCreation,
  StudioImageResult,
  TStudioCreationListResponse,
} from 'librechat-data-provider';
import type {
  StoredCreation,
  StudioCreationDraft,
  StudioCreationPatch,
  StudioRepository,
  StudioServiceDeps,
} from './service';

class FakeAdapter implements StudioAdapter {
  calls = 0;
  constructor(
    readonly model: StudioModelId,
    private readonly fail = false,
  ) {}
  async generate(input: AdapterGenerateInput): Promise<AdapterGenerateOutput> {
    this.calls++;
    if (this.fail) {
      throw new AdapterRequestError(this.model, 'boom', true);
    }
    return {
      images: Array.from({ length: input.count }, () => ({
        base64: `img-${this.model}`,
        mimeType: 'image/png',
      })),
    };
  }
}

class InMemoryRepo implements StudioRepository {
  rows: StoredCreation[] = [];
  last?: StudioCreationDraft;
  async create(draft: StudioCreationDraft): Promise<StudioCreation> {
    this.last = draft;
    const creation: StoredCreation = {
      id: `c${this.rows.length + 1}`,
      prompt: draft.prompt,
      useCase: draft.useCase,
      model: draft.model,
      aspectRatio: draft.aspectRatio,
      resolution: draft.resolution,
      imageCount: draft.imageCount,
      createdAt: new Date('2026-05-16T00:00:00Z'),
      images: draft.images,
      referenceCount: draft.referenceCount,
      collectionName: null,
      status: draft.status,
      userId: draft.userId,
    };
    this.rows.push(creation);
    return creation;
  }
  async update(id: string, patch: StudioCreationPatch): Promise<StudioCreation> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`InMemoryRepo: creation ${id} not found`);
    }
    const updated: StoredCreation = {
      ...this.rows[idx],
      ...(patch.model !== undefined ? { model: patch.model } : {}),
      ...(patch.resolution !== undefined ? { resolution: patch.resolution } : {}),
      ...(patch.images !== undefined ? { images: patch.images } : {}),
      ...(patch.referenceCount !== undefined ? { referenceCount: patch.referenceCount } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.routerReason !== undefined ? { routerReason: patch.routerReason } : {}),
      ...(patch.provenance !== undefined ? { provenance: patch.provenance } : {}),
    };
    this.rows[idx] = updated;
    return updated;
  }
  async findById(id: string, userId: string): Promise<StoredCreation | null> {
    return this.rows.find((r) => r.id === id && r.userId === userId) ?? null;
  }
  async list(): Promise<TStudioCreationListResponse> {
    return { items: this.rows, nextCursor: null };
  }
}

const persistImage = async (input: {
  base64: string;
  mimeType: string;
  filename: string;
}): Promise<StudioImageResult> => ({
  id: `file-${input.filename}`,
  url: `https://cdn/${input.filename}.png`,
  thumbnailUrl: `https://cdn/${input.filename}-thumb.png`,
});

const buildDeps = (over: Partial<StudioServiceDeps> = {}): StudioServiceDeps => ({
  adapters: new Map<StudioModelId, StudioAdapter>([
    ['flux-kontext', new FakeAdapter('flux-kontext')],
    ['nano-banana-2', new FakeAdapter('nano-banana-2')],
    ['nano-banana-pro', new FakeAdapter('nano-banana-pro')],
  ]),
  resolveReference: async () => ({ base64: 'ref64', mimeType: 'image/png' }),
  persistImage,
  repository: new InMemoryRepo(),
  audit: jest.fn(),
  now: () => new Date('2026-05-16T00:00:00Z'),
  ...over,
});

beforeAll(() => {
  process.env.STUDIO_CONFIG_DIR = resolve(__dirname, '../../../../config/studio');
  resetRouterCache();
  resetUseCaseCache();
});

describe('StudioGenerationService.generate', () => {
  it('routes color_variants to flux-kontext and persists N images', async () => {
    const deps = buildDeps();
    const svc = new StudioGenerationService(deps);
    const creation = await svc.generate('u1', {
      useCase: 'color_variants',
      prompt: '',
      formValues: { target_colorway: 'cobalt' },
      references: [
        { slotId: 'product_image', slotType: 'image', label: '@img1', fileId: 'f1' },
      ],
      imageCount: 3,
      aspectRatio: '4:5',
      resolution: '1K',
      modelOverride: null,
    });
    expect(creation.model).toBe('flux-kontext');
    expect(creation.images).toHaveLength(3);
    expect(deps.audit).toHaveBeenCalledTimes(1);
  });

  it('upgrades to nano-banana-pro at 2K', async () => {
    const deps = buildDeps();
    const svc = new StudioGenerationService(deps);
    const creation = await svc.generate('u1', {
      useCase: 'pattern_application',
      prompt: '',
      formValues: { application_type: 'all-over', scale: 'medium', intensity: 'subtle' },
      references: [
        { slotId: 'product_image', slotType: 'image', label: '@img1', fileId: 'f1' },
        { slotId: 'pattern_image', slotType: 'image', label: '@img2', fileId: 'f2' },
      ],
      imageCount: 1,
      aspectRatio: '4:5',
      resolution: '2K',
      modelOverride: null,
    });
    expect(creation.model).toBe('nano-banana-pro');
  });

  it('throws on missing required form input', async () => {
    const svc = new StudioGenerationService(buildDeps());
    await expect(
      svc.generate('u1', {
        useCase: 'color_variants',
        prompt: '',
        formValues: {},
        references: [],
        imageCount: 1,
        aspectRatio: '4:5',
        resolution: '1K',
        modelOverride: null,
      }),
    ).rejects.toThrow(/Missing required template input/);
  });

  it('falls back to UC fallback_model on retryable adapter error', async () => {
    const deps = buildDeps({
      adapters: new Map<StudioModelId, StudioAdapter>([
        ['flux-kontext', new FakeAdapter('flux-kontext', true)],
        ['nano-banana-2', new FakeAdapter('nano-banana-2')],
        ['nano-banana-pro', new FakeAdapter('nano-banana-pro')],
      ]),
    });
    const svc = new StudioGenerationService(deps);
    const creation = await svc.generate('u1', {
      useCase: 'color_variants',
      prompt: '',
      formValues: { target_colorway: 'red' },
      references: [
        { slotId: 'product_image', slotType: 'image', label: '@img1', fileId: 'f1' },
      ],
      imageCount: 1,
      aspectRatio: '4:5',
      resolution: '1K',
      modelOverride: null,
    });
    expect(creation.model).toBe('nano-banana-2');
  });
});

describe('StudioGenerationService.edit', () => {
  it('creates a child creation with parent lineage', async () => {
    const repo = new InMemoryRepo();
    const deps = buildDeps({ repository: repo });
    const svc = new StudioGenerationService(deps);
    await svc.generate('u1', {
      useCase: 'sketch_to_render',
      prompt: '',
      formValues: { render_style: 'photorealistic', setting: 'studio-white' },
      references: [{ slotId: 'sketch_image', slotType: 'image', label: '@img1', fileId: 'f1' }],
      imageCount: 1,
      aspectRatio: '4:5',
      resolution: '1K',
      modelOverride: null,
    });
    const parent = repo.rows[0];
    const child = await svc.edit('u1', {
      creationId: parent.id,
      imageId: parent.images[0].id,
      prompt: 'make it editorial',
      modelOverride: null,
    });
    expect(child.id).not.toBe(parent.id);
    expect(repo.last?.parentCreationId).toBe(parent.id);
  });
});
