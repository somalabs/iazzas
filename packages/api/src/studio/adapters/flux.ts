import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { AxiosInstance } from 'axios';
import type {
  AdapterGenerateInput,
  AdapterGenerateOutput,
  StudioAdapter,
  StudioModelId,
} from '../types';
import { AdapterRequestError } from '../types';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;

/**
 * SSRF guard for the result image URL returned by the Flux API.
 * `result.result.sample` is a presigned URL the BFL API serves from its own
 * delivery domain (`delivery-*.bfl.ai`, a subdomain of `bfl.ai`) — see the BFL
 * vendor doc captured in the tech wiki. Without a live API key we cannot observe
 * the exact CDN host here, so the default allowlist covers `bfl.ai` and any
 * subdomain; `FLUX_DELIVERY_HOSTS` (comma-separated) lets ops add a host without
 * a code change should BFL switch to external object storage.
 */
const DEFAULT_FLUX_HOSTS = ['bfl.ai'];

const isAllowedFluxHost = (hostname: string): boolean => {
  const extra = (process.env.FLUX_DELIVERY_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const allowed = [...DEFAULT_FLUX_HOSTS, ...extra];
  return allowed.some((h) => hostname === h || hostname.endsWith(`.${h}`));
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type FluxSubmit = { id?: string };
type FluxResult = { status?: string; result?: { sample?: string } };

export type FluxAdapterOptions = {
  apiKey: string;
  http?: AxiosInstance;
};

export class FluxKontextAdapter implements StudioAdapter {
  readonly model: StudioModelId = 'flux-kontext';
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly http: AxiosInstance;

  constructor(options: FluxAdapterOptions) {
    this.baseUrl = process.env.FLUX_API_BASE_URL || 'https://api.us1.bfl.ai';
    this.apiKey = options.apiKey;
    this.http = options.http ?? axios.create();
  }

  private requestConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {
      headers: { 'x-key': this.apiKey, 'Content-Type': 'application/json' },
    };
    if (process.env.PROXY) {
      config.httpsAgent = new HttpsProxyAgent(process.env.PROXY);
    }
    return config;
  }

  private async generateOne(input: AdapterGenerateInput): Promise<{ base64: string; mimeType: string }> {
    const reference = input.references[0];
    if (!reference) {
      throw new AdapterRequestError(this.model, 'Flux Kontext requires a source image', false);
    }
    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      input_image: reference.base64,
      output_format: 'png',
      safety_tolerance: 2,
      aspect_ratio: input.aspectRatio,
    };

    let submit: FluxSubmit;
    try {
      const res = await this.http.post(
        `${this.baseUrl}/v1/flux-kontext-pro`,
        payload,
        this.requestConfig(),
      );
      submit = res.data as FluxSubmit;
    } catch (err) {
      throw new AdapterRequestError(this.model, `Flux submit failed: ${(err as Error).message}`);
    }
    if (!submit.id) {
      throw new AdapterRequestError(this.model, 'Flux returned no task id');
    }

    for (let poll = 0; poll < MAX_POLLS; poll++) {
      await sleep(POLL_INTERVAL_MS);
      let result: FluxResult;
      try {
        const res = await this.http.get(`${this.baseUrl}/v1/get_result`, {
          ...this.requestConfig(),
          params: { id: submit.id },
        });
        result = res.data as FluxResult;
      } catch (err) {
        throw new AdapterRequestError(this.model, `Flux poll failed: ${(err as Error).message}`);
      }
      if (result.status === 'Ready' && result.result?.sample) {
        return this.download(result.result.sample);
      }
      if (result.status === 'Error' || result.status === 'Content Moderated') {
        throw new AdapterRequestError(this.model, `Flux generation failed: ${result.status}`);
      }
    }
    throw new AdapterRequestError(this.model, 'Flux generation timed out');
  }

  private async download(url: string): Promise<{ base64: string; mimeType: string }> {
    let hostname: string;
    try {
      hostname = new URL(url).hostname.toLowerCase();
    } catch {
      throw new AdapterRequestError(this.model, `Flux returned an invalid image URL`, false);
    }
    if (!isAllowedFluxHost(hostname)) {
      throw new AdapterRequestError(
        this.model,
        `Flux: disallowed image host: ${hostname}`,
        false,
      );
    }
    try {
      const res = await this.http.get(url, {
        responseType: 'arraybuffer',
        ...(process.env.PROXY ? { httpsAgent: new HttpsProxyAgent(process.env.PROXY) } : {}),
      });
      const mimeType = (res.headers?.['content-type'] as string) || 'image/png';
      return { base64: Buffer.from(res.data).toString('base64'), mimeType };
    } catch (err) {
      throw new AdapterRequestError(this.model, `Flux download failed: ${(err as Error).message}`);
    }
  }

  async generate(input: AdapterGenerateInput): Promise<AdapterGenerateOutput> {
    const images: { base64: string; mimeType: string }[] = [];
    for (let i = 0; i < input.count; i++) {
      images.push(await this.generateOne(input));
    }
    return { images };
  }
}
