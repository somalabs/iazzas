export type StudioUseCase =
  | 'color_variants'
  | 'pattern_application'
  | 'virtual_tryon'
  | 'multi_reference'
  | 'sketch_to_render';

export type AspectRatio =
  | '1:1'
  | '16:9'
  | '9:16'
  | '2:3'
  | '3:4'
  | '1:2'
  | '2:1'
  | '4:5'
  | '3:2'
  | '4:3';

export type Resolution = '1K' | '2K' | '4K';

export type ReferenceSlotType = 'style' | 'character' | 'image';

export type StudioModel = 'flux-kontext' | 'nano-banana-2' | 'nano-banana-pro';

export type StudioReference = {
  id: string;
  slotType: ReferenceSlotType;
  label: string;
  previewUrl: string | null;
  fileName: string | null;
  fileId?: string | null;
  slotId?: string;
  /** Client-only: upload lifecycle of the reference image. The backend
   * never sees this — a ref only reaches generate once `fileId` is set. */
  uploadStatus?: 'uploading' | 'error';
};

export type StudioImageResult = {
  id: string;
  url: string;
  thumbnailUrl: string;
};

export type StudioCreation = {
  id: string;
  prompt: string;
  useCase: StudioUseCase;
  model: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  imageCount: number;
  createdAt: Date;
  images: StudioImageResult[];
  referenceCount: number;
  collectionName: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
};

export type StudioFieldType = 'text' | 'select' | 'toggle' | 'boolean' | 'textarea';

export type StudioFieldOption = {
  value: string;
  label: string;
};

export type StudioFormField = {
  id: string;
  type: StudioFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  default?: string | boolean;
  options?: StudioFieldOption[];
  description?: string;
  maxLength?: number;
};

export type StudioImageSlot = {
  id: string;
  label: string;
  description: string;
  required: boolean;
  multiple?: boolean;
  maxCount?: number;
  accepts: string[];
};

export type StudioUseCaseSchema = {
  id: StudioUseCase;
  displayName: string;
  description: string;
  defaultModel: string;
  imageSlots: StudioImageSlot[];
  formFields: StudioFormField[];
  uiDefaults: {
    aspectRatio: AspectRatio;
    imageCount: number;
    resolution: Resolution;
  };
  compliance?: {
    requiresHumanReview: boolean;
    reviewReason: string;
  };
};

export type StudioReferenceInput = {
  slotId: string;
  slotType: ReferenceSlotType;
  label: string;
  fileId: string;
};

export type TStudioGenerateRequest = {
  useCase: StudioUseCase;
  prompt: string;
  formValues: Record<string, string | boolean>;
  references: StudioReferenceInput[];
  imageCount: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  modelOverride?: StudioModel | null;
};

export type TStudioEditRequest = {
  creationId: string;
  imageId: string;
  prompt: string;
  modelOverride?: StudioModel | null;
};

export type TStudioCreationListResponse = {
  items: StudioCreation[];
  nextCursor: string | null;
};
