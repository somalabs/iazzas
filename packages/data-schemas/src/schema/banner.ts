import { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  bannerId: string;
  message: string;
  displayFrom: Date;
  displayTo?: Date;
  type: 'banner' | 'popup' | 'inbox';
  isPublic: boolean;
  persistable: boolean;
  tenantId?: string;
  createdBy?: string;
  createdByName?: string;
  seenBy?: string[];
}

const bannerSchema = new Schema<IBanner>(
  {
    bannerId: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    displayFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    displayTo: {
      type: Date,
    },
    type: {
      type: String,
      enum: ['banner', 'popup', 'inbox'],
      default: 'banner',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    persistable: {
      type: Boolean,
      default: false,
    },
    tenantId: {
      type: String,
      index: true,
    },
    createdBy: {
      type: String,
    },
    createdByName: {
      type: String,
    },
    seenBy: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

export default bannerSchema;
