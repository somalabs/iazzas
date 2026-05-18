import { resolve } from 'path';
import { resolveModel, resetRouterCache } from './router';
import { getUseCase, resetUseCaseCache } from './usecases';
import type { RouterInput } from './types';

beforeAll(() => {
  process.env.STUDIO_CONFIG_DIR = resolve(__dirname, '../../../../config/studio');
  resetRouterCache();
  resetUseCaseCache();
});

const base = (over: Partial<RouterInput> = {}): RouterInput => ({
  useCase: 'pattern_application',
  defaultModel: 'nano-banana-2',
  resolution: '1K',
  referenceCount: 2,
  formValues: {},
  modelOverride: null,
  ...over,
});

describe('resolveModel', () => {
  it('manual override always wins and is flagged', () => {
    const d = resolveModel(base({ modelOverride: 'flux-kontext' }), getUseCase('pattern_application'));
    expect(d.model).toBe('flux-kontext');
    expect(d.overridden).toBe(true);
  });

  it('upgrades to Pro at resolution >= 2K', () => {
    const d = resolveModel(base({ resolution: '2K' }), getUseCase('pattern_application'));
    expect(d.model).toBe('nano-banana-pro');
    expect(d.overridden).toBe(false);
  });

  it('upgrades to Pro when reference count > 8', () => {
    const d = resolveModel(base({ referenceCount: 9 }), getUseCase('multi_reference'));
    expect(d.model).toBe('nano-banana-pro');
  });

  it('applies UC-local router override (pattern_application intensity=full)', () => {
    const d = resolveModel(
      base({ formValues: { intensity: 'full' } }),
      getUseCase('pattern_application'),
    );
    expect(d.model).toBe('nano-banana-pro');
  });

  it('applies UC-local router override (scale=extra-large)', () => {
    const d = resolveModel(
      base({ formValues: { scale: 'extra-large' } }),
      getUseCase('pattern_application'),
    );
    expect(d.model).toBe('nano-banana-pro');
  });

  it('falls back to UC default when no rule matches', () => {
    const d = resolveModel(base(), getUseCase('pattern_application'));
    expect(d.model).toBe('nano-banana-2');
  });

  it('color_variants defaults to flux-kontext', () => {
    const d = resolveModel(
      base({ useCase: 'color_variants', defaultModel: 'flux-kontext' }),
      getUseCase('color_variants'),
    );
    expect(d.model).toBe('flux-kontext');
  });
});
