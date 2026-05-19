import { FluxKontextAdapter } from './flux';
import { AdapterRequestError } from '../types';

jest.useFakeTimers();

const input = {
  prompt: 'recolor',
  references: [{ label: '@img1', base64: 'aGk=', mimeType: 'image/png' }],
  aspectRatio: '4:5' as const,
  resolution: '1K' as const,
  count: 1,
};

const makeHttp = (overrides: Partial<{ post: jest.Mock; get: jest.Mock }> = {}) =>
  ({
    post: jest.fn().mockResolvedValue({ data: { id: 'task-1' } }),
    get: jest.fn(),
    ...overrides,
  }) as unknown as import('axios').AxiosInstance;

describe('FluxKontextAdapter', () => {
  it('submits, polls until Ready, downloads base64', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({ data: { status: 'Pending' } })
      .mockResolvedValueOnce({
        data: { status: 'Ready', result: { sample: 'https://delivery-us1.bfl.ai/x.png' } },
      })
      .mockResolvedValueOnce({
        data: Buffer.from('binary'),
        headers: { 'content-type': 'image/png' },
      });
    const http = makeHttp({ get });
    const adapter = new FluxKontextAdapter({ apiKey: 'k', http });
    const promise = adapter.generate(input);
    await jest.runAllTimersAsync();
    const out = await promise;
    expect(out.images[0].base64).toBe(Buffer.from('binary').toString('base64'));
  });

  it('errors when no source image', async () => {
    const adapter = new FluxKontextAdapter({ apiKey: 'k', http: makeHttp() });
    await expect(
      adapter.generate({ ...input, references: [] }),
    ).rejects.toThrow(AdapterRequestError);
  });

  it('throws on Flux Error status', async () => {
    const get = jest.fn().mockResolvedValue({ data: { status: 'Error' } });
    const adapter = new FluxKontextAdapter({ apiKey: 'k', http: makeHttp({ get }) });
    const promise = adapter.generate(input);
    const assertion = expect(promise).rejects.toThrow(/Flux generation failed/);
    await jest.runAllTimersAsync();
    await assertion;
  });
});
