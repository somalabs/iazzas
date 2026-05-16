import mongoose, { Schema } from 'mongoose';
import type { IImageGeneration } from '~/types';

const imageGeneration: Schema<IImageGeneration> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    conversationId: {
      type: String,
      ref: 'Conversation',
      index: true,
    },
    useCase: {
      type: String,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    referenceFileIds: {
      type: [String],
      default: [],
    },
    model: {
      type: String,
      required: true,
    },
    overridden: {
      type: Boolean,
      default: false,
    },
    routerReason: {
      type: String,
      default: '',
    },
    params: {
      numImages: { type: Number, required: true },
      aspectRatio: { type: String },
      resolution: { type: String },
    },
    outputFileIds: {
      type: [String],
      default: [],
    },
    parentGenerationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImageGeneration',
      index: true,
    },
  },
  { timestamps: true },
);

imageGeneration.index({ user: 1, createdAt: -1 });

export default imageGeneration;
