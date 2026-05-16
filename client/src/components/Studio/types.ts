export type AspectRatioValue =
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

export type ImageCount = 1 | 2 | 4 | 8;

export type ReferenceType = 'style' | 'character' | 'free';

export type ReferenceSlot = {
  id: string;
  slot: string;
  type: ReferenceType;
  url: string;
  name: string;
};

export type UseCaseId = 'product' | 'lookbook' | 'editorial' | 'ecommerce' | 'concept';

export type UseCaseFieldType = 'text' | 'select' | 'multiselect' | 'textarea';

export type UseCaseField = {
  key: string;
  label: string;
  type: UseCaseFieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export type UseCaseSchema = {
  id: UseCaseId;
  label: string;
  description: string;
  fields: UseCaseField[];
};

export type CreationStatus = 'pending' | 'processing' | 'done' | 'error';

export type Creation = {
  id: string;
  prompt: string;
  model: string;
  aspectRatio: AspectRatioValue;
  resolution: Resolution;
  useCase?: UseCaseId;
  imageCount: ImageCount;
  urls: string[];
  createdAt: string;
  favorited: boolean;
  collection?: string;
  status: CreationStatus;
  references: ReferenceSlot[];
};

export type LineageNode = {
  creationId: string;
  prompt: string;
  url: string;
  relation: 'created_from' | 'referenced_by';
};

export type CreationFilters = {
  useCase?: UseCaseId;
  model?: string;
  aspectRatio?: AspectRatioValue;
  status?: CreationStatus;
  collection?: string;
  search?: string;
  favoritedOnly?: boolean;
};

export type StudioMode = 'guided' | 'advanced';
