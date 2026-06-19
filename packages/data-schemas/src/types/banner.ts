import type { Document } from 'mongoose';

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
}
