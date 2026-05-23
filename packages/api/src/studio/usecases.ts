import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import type { StudioModel, StudioUseCase } from 'librechat-data-provider';
import { getStudioConfigDir } from './paths';

export type UseCaseImageSlot = {
  id: string;
  required: boolean;
  multiple: boolean;
  maxCount: number;
};

export type UseCaseFormField = {
  id: string;
  required: boolean;
};

export type UseCaseRouterOverride = {
  condition: string;
  model: StudioModel;
  reason: string;
};

export type UseCaseConfig = {
  id: StudioUseCase;
  defaultModel: StudioModel;
  fallbackModel: StudioModel;
  promptTemplate: string;
  imageSlots: UseCaseImageSlot[];
  formFields: UseCaseFormField[];
  routerOverrides: UseCaseRouterOverride[];
  requiresHumanReview: boolean;
  upscaleIfBelow: number | null;
  applyWatermark: string | null;
};

type RawSlot = {
  id: string;
  required?: boolean;
  multiple?: boolean;
  max_count?: number;
};

type RawField = { id: string; required?: boolean };

type RawUseCase = {
  use_case: StudioUseCase;
  default_model: StudioModel;
  fallback_model: StudioModel;
  prompt_template: string;
  image_slots?: RawSlot[];
  form_fields?: RawField[];
  router_overrides?: { condition: string; model: StudioModel; reason: string }[];
  compliance?: { requires_human_review?: boolean };
  post_processing?: { upscale_if_below?: number; apply_watermark?: string };
};

let cache: Map<StudioUseCase, UseCaseConfig> | null = null;

const parseUseCase = (raw: RawUseCase): UseCaseConfig => ({
  id: raw.use_case,
  defaultModel: raw.default_model,
  fallbackModel: raw.fallback_model,
  promptTemplate: raw.prompt_template,
  imageSlots: (raw.image_slots ?? []).map((slot) => ({
    id: slot.id,
    required: slot.required === true,
    multiple: slot.multiple === true,
    maxCount: slot.max_count ?? 1,
  })),
  formFields: (raw.form_fields ?? []).map((field) => ({
    id: field.id,
    required: field.required === true,
  })),
  routerOverrides: (raw.router_overrides ?? []).map((override) => ({
    condition: override.condition,
    model: override.model,
    reason: override.reason,
  })),
  requiresHumanReview: raw.compliance?.requires_human_review === true,
  upscaleIfBelow: raw.post_processing?.upscale_if_below ?? null,
  applyWatermark: raw.post_processing?.apply_watermark ?? null,
});

export const loadUseCases = (): Map<StudioUseCase, UseCaseConfig> => {
  if (cache) {
    return cache;
  }
  const dir = join(getStudioConfigDir(), 'usecases');
  const files = readdirSync(dir).filter((name) => name.endsWith('.yaml'));
  const map = new Map<StudioUseCase, UseCaseConfig>();
  for (const file of files) {
    const raw = yaml.load(readFileSync(join(dir, file), 'utf8')) as RawUseCase;
    const config = parseUseCase(raw);
    map.set(config.id, config);
  }
  cache = map;
  return map;
};

export const getUseCase = (id: StudioUseCase): UseCaseConfig => {
  const config = loadUseCases().get(id);
  if (!config) {
    throw new Error(`Unknown studio use case: ${id}`);
  }
  return config;
};

/** Ordered slot ids per CONTRACT rule 1: required slots first, then optional, declaration order. */
export const orderedSlotIds = (config: UseCaseConfig): string[] => {
  const required = config.imageSlots.filter((slot) => slot.required).map((slot) => slot.id);
  const optional = config.imageSlots.filter((slot) => !slot.required).map((slot) => slot.id);
  return [...required, ...optional];
};

export const resetUseCaseCache = (): void => {
  cache = null;
};
