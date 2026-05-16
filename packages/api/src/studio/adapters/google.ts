import { ProxyAgent } from 'undici';
import { GoogleGenAI } from '@google/genai';
import type { Resolution } from 'librechat-data-provider';
import type {
  AdapterGenerateInput,
  AdapterGenerateOutput,
  StudioAdapter,
  StudioModelId,
} from '../types';
import { AdapterRequestError } from '../types';

const PROXY_HOSTS = ['googleapis.com'];
let proxyPatched = false;

/**
 * The @google/genai SDK exposes no fetch/dispatcher hook, so we patch
 * globalThis.fetch once, scoped to googleapis.com, mirroring GeminiImageGen.js.
 */
const ensureProxyPatch = (): void => {
  if (proxyPatched || !process.env.PROXY) {
    return;
  }
  proxyPatched = true;
  const originalFetch = globalThis.fetch;
  const agent = new ProxyAgent(process.env.PROXY);
  globalThis.fetch = ((url: string | URL | Request, options: RequestInit = {}) => {
    const href = typeof url === 'string' ? url : url.toString();
    if (PROXY_HOSTS.some((host) => href.includes(host))) {
      return originalFetch(url, { ...options, dispatcher: agent } as RequestInit);
    }
    return originalFetch(url, options);
  }) as typeof globalThis.fetch;
};

type GeminiPart = { inlineData?: { mimeType?: string; data?: string }; text?: string };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
};
type GeminiClient = {
  models: {
    generateContent(args: {
      model: string;
      contents: unknown[];
      config: Record<string, unknown>;
    }): Promise<GeminiResponse>;
  };
};

const MODEL_ENV: Record<string, { envKey: string; fallback: string }> = {
  'nano-banana-2': { envKey: 'GEMINI_IMAGE_MODEL', fallback: 'gemini-2.5-flash-image' },
  'nano-banana-pro': { envKey: 'GEMINI_PRO_IMAGE_MODEL', fallback: 'gemini-3-pro-image-preview' },
};

const BLOCKING_FINISH = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'RECITATION']);

export type GoogleAdapterOptions = {
  apiKey: string;
  clientFactory?: (apiKey: string) => GeminiClient;
};

export class GoogleImageAdapter implements StudioAdapter {
  readonly model: StudioModelId;
  private readonly modelName: string;
  private readonly supportsImageSize: boolean;
  private readonly clientFactory: (apiKey: string) => GeminiClient;
  private readonly apiKey: string;

  constructor(model: 'nano-banana-2' | 'nano-banana-pro', options: GoogleAdapterOptions) {
    this.model = model;
    const def = MODEL_ENV[model];
    this.modelName = process.env[def.envKey] || def.fallback;
    this.supportsImageSize = model === 'nano-banana-pro';
    this.apiKey = options.apiKey;
    this.clientFactory =
      options.clientFactory ??
      ((apiKey: string) => new GoogleGenAI({ apiKey }) as unknown as GeminiClient);
  }

  private buildConfig(input: AdapterGenerateInput): Record<string, unknown> {
    const imageConfig: Record<string, unknown> = { aspectRatio: input.aspectRatio };
    if (this.supportsImageSize) {
      const size: Resolution = input.resolution;
      imageConfig.imageSize = size;
    }
    return { responseModalities: ['TEXT', 'IMAGE'], imageConfig };
  }

  async generate(input: AdapterGenerateInput): Promise<AdapterGenerateOutput> {
    ensureProxyPatch();
    const client = this.clientFactory(this.apiKey);
    const contents: unknown[] = [
      { text: input.prompt },
      ...input.references.map((ref) => ({
        inlineData: { mimeType: ref.mimeType, data: ref.base64 },
      })),
    ];
    const config = this.buildConfig(input);

    const images: { base64: string; mimeType: string }[] = [];
    for (let i = 0; i < input.count; i++) {
      let response: GeminiResponse;
      try {
        response = await client.models.generateContent({
          model: this.modelName,
          contents,
          config,
        });
      } catch (err) {
        throw new AdapterRequestError(this.model, `Gemini request failed: ${(err as Error).message}`);
      }
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason && BLOCKING_FINISH.has(candidate.finishReason)) {
        throw new AdapterRequestError(
          this.model,
          `Gemini blocked generation: ${candidate.finishReason}`,
        );
      }
      const part = candidate?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) {
        throw new AdapterRequestError(this.model, 'Gemini returned no image data');
      }
      images.push({
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType ?? 'image/png',
      });
    }
    return { images };
  }
}

export const __resetGoogleProxyPatch = (): void => {
  proxyPatched = false;
};
