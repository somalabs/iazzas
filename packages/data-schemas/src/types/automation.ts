import type { Types, Document } from 'mongoose';

export type AutomationRunStatus = 'running' | 'success' | 'failed' | 'skipped';

export interface IAutomation extends Document {
  tenantId?: string;
  flowId: Types.ObjectId;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  triggerInput?: string;
  /** v1: always ['conversation', 'notification']; reserved for v2 targets. */
  outputTargets: string[];
  createdBy: string;
  lastRunAt?: Date;
  lastStatus?: AutomationRunStatus;
  nextRunAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotification extends Document {
  tenantId?: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt?: Date;
}
