import { GoogleImageAdapter } from './google';
import { AdapterRequestError } from '../types';

const fakeClient = (response: unknown) => ({
  models: { generateContent: jest.fn().mockResolvedValue(response) },
});

const input = {
  prompt: 'a dress',
  references: [{ label: '@img1', base64: 'aGk=', mimeType: 'image/png' }],
  aspectRatio: '4:5' as const,
  resolution: '2K' as const,
  count: 2,
};

describe('GoogleImageAdapter', () => {
  it('returns N images from inlineData', async () => {
    const client = fakeClient({
      candidates: [{ content: { parts: [{ inlineData: { data: 'b64', mimeType: 'image/png' } }] } }],
    });
    const adapter = new GoogleImageAdapter('nano-banana-pro', {
      apiKey: 'k',
      clientFactory: () => client,
    });
    const out = await adapter.generate(input);
    expect(out.images).toHaveLength(2);
    expect(out.images[0].base64).toBe('b64');
    expect(client.models.generateContent).toHaveBeenCalledTimes(2);
  });

  it('sends imageSize only for pro', async () => {
    const client = fakeClient({
      candidates: [{ content: { parts: [{ inlineData: { data: 'x' } }] } }],
    });
    const adapter = new GoogleImageAdapter('nano-banana-2', {
      apiKey: 'k',
      clientFactory: () => client,
    });
    await adapter.generate({ ...input, count: 1 });
    const args = client.models.generateContent.mock.calls[0][0];
    expect(args.config.imageConfig).not.toHaveProperty('imageSize');
  });

  it('throws AdapterRequestError on safety block', async () => {
    const client = fakeClient({ candidates: [{ finishReason: 'SAFETY' }] });
    const adapter = new GoogleImageAdapter('nano-banana-pro', {
      apiKey: 'k',
      clientFactory: () => client,
    });
    await expect(adapter.generate({ ...input, count: 1 })).rejects.toThrow(AdapterRequestError);
  });
});
