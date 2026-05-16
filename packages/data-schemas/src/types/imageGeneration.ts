import type { Document, Types } from 'mongoose';

/**
 * Persisted record of a fashion image generation (PRD §5 — history/metadata
 * and lineage). Generated images themselves reuse the existing File storage;
 * this record holds prompt, references, model, params and lineage.
 */
export interface IImageGeneration extends Document {
  user: Types.ObjectId;
  conversationId?: string;
  /** One of the v1 use cases (`ImageUseCase`). */
  useCase: string;
  /** Resolved/used prompt text. */
  prompt: string;
  /** File ids of the reference images supplied for the request. */
  referenceFileIds: string[];
  /** Model that produced the images (`ImageModel`). */
  model: string;
  /** Whether the model was a manual override (PRD §5.4 precedence 1). */
  overridden: boolean;
  /** Router reason, logged for traceability. */
  routerReason: string;
  /** Generation parameters echoed for reproducibility. */
  params: {
    numImages: number;
    aspectRatio?: string;
    resolution?: string;
  };
  /** File ids of the produced images. */
  outputFileIds: string[];
  /** Lineage: the generation this one was edited from (F8 prompt mode). */
  parentGenerationId?: Types.ObjectId;
}
