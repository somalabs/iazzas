import { Schema } from 'mongoose';
import type { IStudioCreation } from '~/types/studio';

const StudioImageSchema = new Schema(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
  },
  { _id: false },
);

const StudioCreationSchema: Schema<IStudioCreation> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    useCase: { type: String, required: true },
    prompt: { type: String, default: '' },
    model: { type: String, required: true },
    aspectRatio: { type: String, required: true },
    resolution: { type: String, required: true },
    imageCount: { type: Number, default: 1 },
    images: { type: [StudioImageSchema], default: [] },
    referenceCount: { type: Number, default: 0 },
    collectionName: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'generating', 'done', 'error'],
      default: 'done',
    },
    routerReason: { type: String },
    provenance: { type: Schema.Types.Mixed },
    parentCreationId: {
      type: Schema.Types.ObjectId,
      ref: 'StudioCreation',
      default: null,
      index: true,
    },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

StudioCreationSchema.index({ userId: 1, _id: -1 });

export default StudioCreationSchema;
