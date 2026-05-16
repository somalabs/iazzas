import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ImageModel, AdapterRequestError } from '../types';
import type {
  ImageBytes,
  AdapterResult,
  ImageAdapter,
  AdapterEditInput,
  AdapterGenerateInput,
  AdapterCapabilities,
} from '../types';

/**
 * Flux Kontext adapter — Black Forest Labs (PRD §5.1 Model Adapters).
 *
 * Kontext is an image-conditioned editor: every call needs an `input_image`
 * (base64). It backs the **color variants** use case and prompt-mode edits.
 * The existing `FluxAPI.js` tool only wires generation endpoints, so the edit
 * endpoint (`/v1/flux-kontext-pro`) is added here.
 *
 * Conventions mirror `FluxAPI.js`: `FLUX_API_BASE_URL` env (default
 * `https://api.us1.bfl.ai`), `x-key` auth, async submit + `/v1/get_result`
 * polling, optional `PROXY`.
 */

const DEFAULT_BASE_URL = 'https://api.us1.bfl.ai';
const EDIT_ENDPOINT = '/v1/flux-kontext-pro';
const RESULT_ENDPOINT = '/v1/get_result';
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 90;

interface FluxSubmitResponse {
  id: string;
}

interface FluxResultResponse {
  status: string;
  result?: { sample?: string };
}

export interface FluxAdapterConfig {
  /** Resolved BFL API key. Falls back to `FLUX_API_KEY` when omitted. */
  apiKey?: string;
  baseUrl?: string;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class FluxKontextAdapter implements ImageAdapter {
  readonly model = ImageModel.FluxKontext;
  readonly capabilities: AdapterCapabilities;

  private readonly config: FluxAdapterConfig;

  constructor(capabilities: AdapterCapabilities, config: FluxAdapterConfig = {}) {
    this.capabilities = capabilities;
    this.config = config;
  }

  private get baseUrl(): string {
    return this.config.baseUrl || process.env.FLUX_API_BASE_URL || DEFAULT_BASE_URL;
  }

  private get apiKey(): string {
    const key = this.config.apiKey || process.env.FLUX_API_KEY;
    if (!key) {
      throw new AdapterRequestError(
        'Flux Kontext adapter requires config.apiKey or FLUX_API_KEY.',
        this.model,
      );
    }
    return key;
  }

  private get axiosConfig() {
    if (process.env.PROXY) {
      return { httpsAgent: new HttpsProxyAgent(process.env.PROXY) };
    }
    return {};
  }

  private async submit(prompt: string, source: ImageBytes, aspectRatio?: string): Promise<string> {
    const payload: Record<string, string> = {
      prompt,
      input_image: source.base64,
      output_format: 'png',
      safety_tolerance: '6',
    };
    if (aspectRatio) {
      payload.aspect_ratio = aspectRatio;
    }
    try {
      const { data } = await axios.post<FluxSubmitResponse>(
        `${this.baseUrl}${EDIT_ENDPOINT}`,
        payload,
        {
          headers: {
            'x-key': this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          ...this.axiosConfig,
        },
      );
      if (!data?.id) {
        throw new Error('no task id returned');
      }
      return data.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AdapterRequestError(`Flux Kontext submit failed: ${message}`, this.model);
    }
  }

  private async poll(taskId: string): Promise<string> {
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      await delay(POLL_INTERVAL_MS);
      let data: FluxResultResponse;
      try {
        ({ data } = await axios.get<FluxResultResponse>(`${this.baseUrl}${RESULT_ENDPOINT}`, {
          headers: { 'x-key': this.apiKey, Accept: 'application/json' },
          params: { id: taskId },
          ...this.axiosConfig,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new AdapterRequestError(`Flux Kontext polling failed: ${message}`, this.model);
      }
      if (data.status === 'Ready' && data.result?.sample) {
        return data.result.sample;
      }
      if (data.status === 'Error') {
        throw new AdapterRequestError('Flux Kontext reported an error.', this.model);
      }
    }
    throw new AdapterRequestError('Flux Kontext timed out.', this.model);
  }

  private async fetchImage(url: string): Promise<ImageBytes> {
    try {
      const { data } = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        ...this.axiosConfig,
      });
      return { base64: Buffer.from(data).toString('base64'), mimeType: 'image/png' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AdapterRequestError(`Flux Kontext image fetch failed: ${message}`, this.model);
    }
  }

  private async run(
    prompt: string,
    source: ImageBytes,
    numImages: number,
    aspectRatio?: string,
  ): Promise<AdapterResult> {
    const runs = Array.from({ length: Math.max(1, numImages) }, async () => {
      const taskId = await this.submit(prompt, source, aspectRatio);
      const sampleUrl = await this.poll(taskId);
      return this.fetchImage(sampleUrl);
    });
    const images = await Promise.all(runs);
    return { images, model: this.model };
  }

  generate(input: AdapterGenerateInput): Promise<AdapterResult> {
    const source = input.references[0];
    if (!source) {
      throw new AdapterRequestError(
        'Flux Kontext is image-conditioned: a reference image is required.',
        this.model,
      );
    }
    return this.run(input.prompt, source, input.numImages, input.aspectRatio);
  }

  edit(input: AdapterEditInput): Promise<AdapterResult> {
    return this.run(input.prompt, input.source, input.numImages, input.aspectRatio);
  }
}
