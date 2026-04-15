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

export type TFeedbackEntryCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<TFeedbackEntryCategory, string> = {
  dados_internos: 'Dados internos',
  tempo_real: 'Tempo real',
  analise_arquivo: 'Análise de arquivo',
  info_pessoal: 'Informação pessoal',
  integracao_externa: 'Integração externa',
  fora_escopo: 'Fora do escopo',
  limitacao_tecnica: 'Limitação técnica',
  outros: 'Outros',
};

export const FEEDBACK_TRIGGERS = ['model_self_report', 'user_thumbs_down'] as const;

export type TFeedbackEntryTrigger = (typeof FEEDBACK_TRIGGERS)[number];

export const FEEDBACK_TRIGGER_LABELS: Record<TFeedbackEntryTrigger, string> = {
  model_self_report: 'Auto-reportado',
  user_thumbs_down: 'Thumbs down',
};

export interface TFeedbackEntry {
  _id: string;
  conversationId?: string;
  messageId?: string;
  userMessage?: string;
  assistantMessage?: string;
  trigger: TFeedbackEntryTrigger;
  category?: TFeedbackEntryCategory;
  reason?: string;
  modelName?: string;
  createdAt: string;
  expiresAt: string;
}

export interface TCreateFeedbackEntry {
  conversationId?: string;
  messageId?: string;
  userMessage?: string;
  assistantMessage?: string;
  trigger: TFeedbackEntryTrigger;
  category?: TFeedbackEntryCategory;
  reason?: string;
  modelName?: string;
}

export interface TListFeedbackEntriesParams {
  limit?: number;
  offset?: number;
  category?: TFeedbackEntryCategory;
  trigger?: TFeedbackEntryTrigger;
  modelName?: string;
  from?: string;
  to?: string;
}

export interface TListFeedbackEntriesResponse {
  items: TFeedbackEntry[];
  total: number;
  limit: number;
  offset: number;
}

export type TExportFormat = 'csv' | 'json';
