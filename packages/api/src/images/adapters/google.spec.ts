import { ImageModel, ImageResolution, AdapterRequestError } from '../types';
import { GoogleImageAdapter } from './google';
import { ADAPTER_CAPABILITIES } from './index';
import type { GeminiClient } from './google';

const okResponse = (data = 'aGk=') => ({
  candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data } }] } }],
});

function fakeClient(
  impl: GeminiClient['models']['generateContent'],
): { client: GeminiClient; calls: Parameters<GeminiClient['models']['generateContent']>[0][] } {
  const calls: Parameters<GeminiClient['models']['generateContent']>[0][] = [];
  const client: GeminiClient = {
    models: {
      generateContent: (params) => {
        calls.push(params);
        return impl(params);
      },
    },
  };
  return { client, calls };
}

describe('GoogleImageAdapter — Nano Banana Pro', () => {
  it('sends imageConfig with imageSize for Pro and returns produced images', async () => {
    const { client, calls } = fakeClient(async () => okResponse('cHJv'));
    const adapter = new GoogleImageAdapter(
      ImageModel.NanoBananaPro,
      ADAPTER_CAPABILITIES[ImageModel.NanoBananaPro],
      { client },
    );

    const result = await adapter.generate({
      prompt: 'a red dress on a model',
      references: [{ base64: 'cmVm', mimeType: 'image/png' }],
      numImages: 1,
      aspectRatio: '3:4',
      resolution: ImageResolution.R4K,
    });

    expect(result.model).toBe(ImageModel.NanoBananaPro);
    expect(result.images).toEqual([{ base64: 'cHJv', mimeType: 'image/png' }]);
    expect(calls[0].model).toBe('gemini-3-pro-image-preview');
    expect(calls[0].config.imageConfig).toEqual({ aspectRatio: '3:4', imageSize: '4K' });
    expect(calls[0].contents).toEqual([
      { text: 'a red dress on a model' },
      { inlineData: { mimeType: 'image/png', data: 'cmVm' } },
    ]);
  });

  it('makes one call per requested image and aggregates results', async () => {
    const { client, calls } = fakeClient(async () => okResponse());
    const adapter = new GoogleImageAdapter(
      ImageModel.NanoBananaPro,
      ADAPTER_CAPABILITIES[ImageModel.NanoBananaPro],
      { client },
    );
    const result = await adapter.generate({
      prompt: 'x',
      references: [],
      numImages: 3,
    });
    expect(calls).toHaveLength(3);
    expect(result.images).toHaveLength(3);
  });

  it('routes the source image through edit()', async () => {
    const { client, calls } = fakeClient(async () => okResponse());
    const adapter = new GoogleImageAdapter(
      ImageModel.NanoBananaPro,
      ADAPTER_CAPABILITIES[ImageModel.NanoBananaPro],
      { client },
    );
    await adapter.edit({
      prompt: 'make the dress blue',
      source: { base64: 'c3Jj', mimeType: 'image/jpeg' },
      numImages: 1,
    });
    expect(calls[0].contents).toContainEqual({
      inlineData: { mimeType: 'image/jpeg', data: 'c3Jj' },
    });
  });

  it('throws AdapterRequestError on a safety finishReason', async () => {
    const { client } = fakeClient(async () => ({ candidates: [{ finishReason: 'SAFETY' }] }));
    const adapter = new GoogleImageAdapter(
      ImageModel.NanoBananaPro,
      ADAPTER_CAPABILITIES[ImageModel.NanoBananaPro],
      { client },
    );
    await expect(adapter.generate({ prompt: 'x', references: [], numImages: 1 })).rejects.toThrow(
      AdapterRequestError,
    );
  });

  it('throws when the response carries no image data', async () => {
    const { client } = fakeClient(async () => ({ candidates: [{ content: { parts: [] } }] }));
    const adapter = new GoogleImageAdapter(
      ImageModel.NanoBananaPro,
      ADAPTER_CAPABILITIES[ImageModel.NanoBananaPro],
      { client },
    );
    await expect(adapter.generate({ prompt: 'x', references: [], numImages: 1 })).rejects.toThrow(
      /no image data/i,
    );
  });
});

describe('GoogleImageAdapter — Nano Banana 2', () => {
  it('omits imageSize (model lacks native resolution control)', async () => {
    const { client, calls } = fakeClient(async () => okResponse());
    const adapter = new GoogleImageAdapter(
      ImageModel.NanoBanana,
      ADAPTER_CAPABILITIES[ImageModel.NanoBanana],
      { client },
    );
    await adapter.generate({
      prompt: 'apply print to product',
      references: [],
      numImages: 1,
      aspectRatio: '1:1',
      resolution: ImageResolution.R2K,
    });
    expect(calls[0].model).toBe('gemini-2.5-flash-image');
    expect(calls[0].config.imageConfig).toEqual({ aspectRatio: '1:1' });
  });
});
