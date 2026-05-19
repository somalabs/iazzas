import type { Types, Document } from 'mongoose';

export interface IStudioImage {
  id: string;
  url: string;
  thumbnailUrl: string;
}

export interface IStudioCreation extends Omit<Document, 'model'> {
  userId: Types.ObjectId;
  useCase: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  imageCount: number;
  images: IStudioImage[];
  referenceCount: number;
  collectionName?: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
  routerReason?: string;
  provenance?: unknown;
  parentCreationId?: Types.ObjectId | null;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
