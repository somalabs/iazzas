import type {
  AspectRatio,
  Resolution,
  StudioModel,
  StudioUseCase,
} from 'librechat-data-provider';

export type StudioModelId = StudioModel;

export type StudioReferenceImage = {
  label: string;
  base64: string;
  mimeType: string;
};

export type AdapterGenerateInput = {
  prompt: string;
  references: StudioReferenceImage[];
  aspectRatio: AspectRatio;
  resolution: Resolution;
  count: number;
};

export type AdapterImage = {
  base64: string;
  mimeType: string;
};

export type AdapterGenerateOutput = {
  images: AdapterImage[];
};

export interface StudioAdapter {
  readonly model: StudioModelId;
  generate(input: AdapterGenerateInput): Promise<AdapterGenerateOutput>;
}

export type AdapterCapabilities = {
  maxReferenceImages: number;
  supportsImageSize: boolean;
  supportedResolutions: Resolution[];
};

export class AdapterCapabilityError extends Error {
  readonly model: StudioModelId;
  constructor(model: StudioModelId, message: string) {
    super(message);
    this.name = 'AdapterCapabilityError';
    this.model = model;
  }
}

export class AdapterRequestError extends Error {
  readonly model: StudioModelId;
  readonly retryable: boolean;
  constructor(model: StudioModelId, message: string, retryable = true) {
    super(message);
    this.name = 'AdapterRequestError';
    this.model = model;
    this.retryable = retryable;
  }
}

export class TemplateInputError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`Missing required template input: ${missing.join(', ')}`);
    this.name = 'TemplateInputError';
    this.missing = missing;
  }
}

export type RouterDecision = {
  model: StudioModelId;
  reason: string;
  overridden: boolean;
};

export type RouterInput = {
  useCase: StudioUseCase;
  defaultModel: StudioModelId;
  resolution: Resolution;
  referenceCount: number;
  formValues: Record<string, string | boolean>;
  modelOverride?: StudioModelId | null;
};
