import axios from 'axios';
import { ImageModel, AdapterRequestError } from '../types';
import { FluxKontextAdapter } from './flux';
import { ADAPTER_CAPABILITIES } from './index';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const SOURCE = { base64: 'c3Jj', mimeType: 'image/png' };

function makeAdapter() {
  return new FluxKontextAdapter(ADAPTER_CAPABILITIES[ImageModel.FluxKontext], {
    apiKey: 'test-key',
    baseUrl: 'https://api.test.bfl',
  });
}

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('FluxKontextAdapter', () => {
  it('submits the edit, polls until Ready, and returns fetched bytes', async () => {
    jest.useFakeTimers();
    mockedAxios.post.mockResolvedValue({ data: { id: 'task-1' } });
    mockedAxios.get
      .mockResolvedValueOnce({ data: { status: 'Pending' } })
      .mockResolvedValueOnce({
        data: { status: 'Ready', result: { sample: 'https://cdn.test/img.png' } },
      })
      .mockResolvedValueOnce({ data: Buffer.from('hello').buffer });

    const adapter = makeAdapter();
    const promise = adapter.edit({ prompt: 'make it teal', source: SOURCE, numImages: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.model).toBe(ImageModel.FluxKontext);
    expect(result.images[0].mimeType).toBe('image/png');
    expect(typeof result.images[0].base64).toBe('string');

    const [url, payload, cfg] = mockedAxios.post.mock.calls[0];
    expect(url).toBe('https://api.test.bfl/v1/flux-kontext-pro');
    expect(payload).toMatchObject({ prompt: 'make it teal', input_image: 'c3Jj' });
    expect(cfg?.headers?.['x-key']).toBe('test-key');
  });

  it('generate() requires a reference image (image-conditioned model)', async () => {
    const adapter = makeAdapter();
    await expect(
      adapter.generate({ prompt: 'colorway', references: [], numImages: 1 }),
    ).rejects.toThrow(AdapterRequestError);
  });

  it('surfaces an Error status from polling as AdapterRequestError', async () => {
    jest.useFakeTimers();
    mockedAxios.post.mockResolvedValue({ data: { id: 'task-err' } });
    mockedAxios.get.mockResolvedValue({ data: { status: 'Error' } });

    const adapter = makeAdapter();
    const promise = adapter.edit({ prompt: 'x', source: SOURCE, numImages: 1 });
    const assertion = expect(promise).rejects.toThrow(/error/i);
    await jest.runAllTimersAsync();
    await assertion;
  });
});
