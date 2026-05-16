import { GoogleGenAI } from '@google/genai';
import { ProxyAgent } from 'undici';
import { ImageModel, ImageResolution, AdapterRequestError } from '../types';
import type {
  ImageBytes,
  AdapterResult,
  ImageAdapter,
  AdapterEditInput,
  AdapterGenerateInput,
  AdapterCapabilities,
} from '../types';

/**
 * Google Gemini image adapter (PRD §5.1 Model Adapters).
 *
 * Backs both **Nano Banana Pro** (`gemini-3-pro-image-preview`: native
 * 1K/2K/4K, up to 14 references, multi-turn editing) and **Nano Banana 2**
 * (`gemini-2.5-flash-image`: no native resolution control). The provider
 * surface is identical (`@google/genai`), so a single class parameterised by
 * model id + capabilities serves both — DRY per the repo guidelines.
 *
 * References are resolved to bytes by the orchestrator, so this adapter never
 * touches file storage.
 */

const GEMINI_MODEL_ID: Record<string, string> = {
  [ImageModel.NanoBananaPro]: process.env.GEMINI_PRO_IMAGE_MODEL || 'gemini-3-pro-image-preview',
  [ImageModel.NanoBanana]: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
};

/** Models that honour `imageConfig.imageSize` (1K/2K/4K). */
const SUPPORTS_IMAGE_SIZE: Record<string, boolean> = {
  [ImageModel.NanoBananaPro]: true,
  [ImageModel.NanoBanana]: false,
};

interface GeminiTextPart {
  text: string;
}

interface GeminiInlinePart {
  inlineData: { mimeType: string; data: string };
}

type GeminiContentPart = GeminiTextPart | GeminiInlinePart;

interface GeminiImageConfig {
  aspectRatio?: string;
  imageSize?: string;
}

interface GeminiGenerateParams {
  model: string;
  contents: GeminiContentPart[];
  config: {
    responseModalities: string[];
    imageConfig?: GeminiImageConfig;
  };
}

interface GeminiResponsePart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiResponsePart[] };
    finishReason?: string;
  }>;
}

/** Narrow surface of `@google/genai` used here — keeps the adapter testable. */
export interface GeminiClient {
  models: {
    generateContent(params: GeminiGenerateParams): Promise<GeminiResponse>;
  };
}

export interface GoogleAdapterConfig {
  /** Resolved API key (Gemini API). Falls back to env when omitted. */
  apiKey?: string;
  /** Pre-built client (e.g. Vertex AI from `/api`). Wins over `apiKey`. */
  client?: GeminiClient;
}

let proxyPatched = false;

/**
 * `@google/genai` exposes no fetch/dispatcher hook, so proxy support is a
 * one-time `globalThis.fetch` wrap scoped to googleapis.com — mirrors the
 * existing `GeminiImageGen.js` tool.
 */
function ensureProxy(): void {
  if (proxyPatched || !process.env.PROXY) {
    return;
  }
  proxyPatched = true;
  const originalFetch = globalThis.fetch;
  const proxyAgent = new ProxyAgent(process.env.PROXY);
  const patchedFetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('googleapis.com')) {
      return originalFetch(input, { ...init, dispatcher: proxyAgent } as RequestInit);
    }
    return originalFetch(input, init);
  };
  globalThis.fetch = patchedFetch as typeof globalThis.fetch;
}

function extractImages(response: GeminiResponse, model: ImageModel): ImageBytes[] {
  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (
    finishReason === 'SAFETY' ||
    finishReason === 'PROHIBITED_CONTENT' ||
    finishReason === 'RECITATION'
  ) {
    throw new AdapterRequestError(
      `Gemini blocked the request (${finishReason}).`,
      model,
    );
  }
  const images: ImageBytes[] = [];
  for (const part of candidate?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      images.push({
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      });
    }
  }
  return images;
}

export class GoogleImageAdapter implements ImageAdapter {
  readonly model: ImageModel;
  readonly capabilities: AdapterCapabilities;

  private readonly modelId: string;
  private readonly supportsImageSize: boolean;
  private readonly config: GoogleAdapterConfig;
  private cachedClient?: GeminiClient;

  constructor(
    model: ImageModel.NanoBananaPro | ImageModel.NanoBanana,
    capabilities: AdapterCapabilities,
    config: GoogleAdapterConfig = {},
  ) {
    this.model = model;
    this.capabilities = capabilities;
    this.modelId = GEMINI_MODEL_ID[model];
    this.supportsImageSize = SUPPORTS_IMAGE_SIZE[model];
    this.config = config;
  }

  private getClient(): GeminiClient {
    if (this.config.client) {
      return this.config.client;
    }
    if (this.cachedClient) {
      return this.cachedClient;
    }
    const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_KEY;
    if (!apiKey) {
      throw new AdapterRequestError(
        'Gemini adapter requires a client or one of: config.apiKey, GEMINI_API_KEY, GOOGLE_KEY.',
        this.model,
      );
    }
    ensureProxy();
    /* Single contained cast at the external-SDK seam: `@google/genai`'s
     * response type is a structural superset of {@link GeminiResponse}. */
    this.cachedClient = new GoogleGenAI({ apiKey }) as unknown as GeminiClient;
    return this.cachedClient;
  }

  private buildConfig(
    aspectRatio?: string,
    resolution?: ImageResolution,
  ): GeminiGenerateParams['config'] {
    const config: GeminiGenerateParams['config'] = {
      responseModalities: ['TEXT', 'IMAGE'],
    };
    const imageConfig: GeminiImageConfig = {};
    if (aspectRatio) {
      imageConfig.aspectRatio = aspectRatio;
    }
    if (resolution && this.supportsImageSize) {
      imageConfig.imageSize = resolution;
    }
    if (imageConfig.aspectRatio || imageConfig.imageSize) {
      config.imageConfig = imageConfig;
    }
    return config;
  }

  private async run(
    prompt: string,
    images: ImageBytes[],
    numImages: number,
    aspectRatio?: string,
    resolution?: ImageResolution,
  ): Promise<AdapterResult> {
    const client = this.getClient();
    const config = this.buildConfig(aspectRatio, resolution);
    const contents: GeminiContentPart[] = [{ text: prompt }];
    for (const image of images) {
      contents.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
    }

    const calls = Array.from({ length: Math.max(1, numImages) }, () =>
      client.models.generateContent({ model: this.modelId, contents, config }),
    );

    let responses: GeminiResponse[];
    try {
      responses = await Promise.all(calls);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AdapterRequestError(`Gemini request failed: ${message}`, this.model);
    }

    const produced = responses.flatMap((response) => extractImages(response, this.model));
    if (produced.length === 0) {
      throw new AdapterRequestError('Gemini returned no image data.', this.model);
    }
    return { images: produced, model: this.model };
  }

  generate(input: AdapterGenerateInput): Promise<AdapterResult> {
    return this.run(
      input.prompt,
      input.references,
      input.numImages,
      input.aspectRatio,
      input.resolution,
    );
  }

  edit(input: AdapterEditInput): Promise<AdapterResult> {
    return this.run(
      input.prompt,
      [input.source],
      input.numImages,
      input.aspectRatio,
      input.resolution,
    );
  }
}
