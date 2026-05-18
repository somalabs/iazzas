import type { Document } from 'mongoose';

export const FEEDBACK_CATEGORIES = [
  'dados_internos',
  'tempo_real',
  'analise_arquivo',
  'info_pessoal',
  'integracao_externa',
  'fora_escopo',
  'limitacao_tecnica',
  'outros',
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_TRIGGERS = ['model_self_report', 'user_thumbs_down'] as const;

export type FeedbackTrigger = (typeof FEEDBACK_TRIGGERS)[number];

export interface IFeedback extends Document {
  conversationId?: string;
  messageId?: string;
  userMessage?: string;
  assistantMessage?: string;
  trigger: FeedbackTrigger;
  category?: FeedbackCategory;
  reason?: string;
  modelName?: string;
  createdAt: Date;
  expiresAt: Date;
}
