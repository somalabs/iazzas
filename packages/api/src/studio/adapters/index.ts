import { GoogleImageAdapter } from './google';
import { FluxKontextAdapter } from './flux';
import type { AdapterCapabilities, StudioAdapter, StudioModelId } from '../types';

export { GoogleImageAdapter } from './google';
export { FluxKontextAdapter } from './flux';

export const ADAPTER_CAPABILITIES: Record<StudioModelId, AdapterCapabilities> = {
  'flux-kontext': {
    maxReferenceImages: 1,
    supportsImageSize: false,
    supportedResolutions: [],
  },
  'nano-banana-2': {
    maxReferenceImages: 14,
    supportsImageSize: false,
    supportedResolutions: [],
  },
  'nano-banana-pro': {
    maxReferenceImages: 14,
    supportsImageSize: true,
    supportedResolutions: ['1K', '2K', '4K'],
  },
};

export type StudioAdaptersConfig = {
  googleApiKey?: string;
  fluxApiKey?: string;
};

const resolveKey = (explicit: string | undefined, ...envKeys: string[]): string => {
  if (explicit) {
    return explicit;
  }
  for (const key of envKeys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return '';
};

export const createStudioAdapters = (
  config: StudioAdaptersConfig = {},
): Map<StudioModelId, StudioAdapter> => {
  const googleKey = resolveKey(config.googleApiKey, 'GEMINI_KEY', 'GOOGLE_KEY', 'GOOGLE_API_KEY');
  const fluxKey = resolveKey(config.fluxApiKey, 'FLUX_API_KEY', 'BFL_API_KEY');

  const map = new Map<StudioModelId, StudioAdapter>();
  map.set('flux-kontext', new FluxKontextAdapter({ apiKey: fluxKey }));
  map.set('nano-banana-2', new GoogleImageAdapter('nano-banana-2', { apiKey: googleKey }));
  map.set('nano-banana-pro', new GoogleImageAdapter('nano-banana-pro', { apiKey: googleKey }));
  return map;
};
