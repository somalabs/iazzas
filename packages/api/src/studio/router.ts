import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import yaml from 'js-yaml';
import type { Resolution, StudioModel } from 'librechat-data-provider';
import type { RouterDecision, RouterInput } from './types';
import type { UseCaseConfig } from './usecases';

const RESOLUTION_PIXELS: Record<Resolution, number> = {
  '1K': 1024,
  '2K': 2048,
  '4K': 4096,
};

type RawRule = {
  id: string;
  priority: number;
  override_model: StudioModel;
  reason: string;
};

type RawRouter = {
  rules: RawRule[];
};

const configDir = (): string =>
  process.env.STUDIO_CONFIG_DIR
    ? resolve(process.env.STUDIO_CONFIG_DIR)
    : resolve(process.cwd(), 'config/studio');

let rulesCache: RawRule[] | null = null;

const loadRules = (): RawRule[] => {
  if (rulesCache) {
    return rulesCache;
  }
  const raw = yaml.load(
    readFileSync(join(configDir(), 'router.yaml'), 'utf8'),
  ) as RawRouter;
  rulesCache = [...raw.rules].sort((a, b) => a.priority - b.priority);
  return rulesCache;
};

const ruleById = (id: string): RawRule | undefined =>
  loadRules().find((rule) => rule.id === id);

const matchClause = (
  clause: string,
  formValues: Record<string, string | boolean>,
): boolean => {
  const equality = clause.trim().match(/^([\w.]+)\s*(==|!=)\s*"?([\w-]+)"?$/);
  if (!equality) {
    return false;
  }
  const [, field, op, target] = equality;
  const actual = String(formValues[field] ?? '');
  return op === '==' ? actual === target : actual !== target;
};

/** Evaluates UC-local `router_overrides` conditions of the form `a == "x" OR b == "y"`. */
const matchOverrideCondition = (
  condition: string,
  formValues: Record<string, string | boolean>,
): boolean => {
  const orParts = condition.split(/\s+OR\s+/i);
  return orParts.some((orPart) =>
    orPart
      .split(/\s+AND\s+/i)
      .every((clause) => matchClause(clause, formValues)),
  );
};

/**
 * Resolves the model for a generation per config/studio/router.yaml precedence:
 * (1) manual override wins; (2) resolution ≥2K → Pro; (3) refs >8 → Pro;
 * (4) UC-local router_overrides; (5) UC default_model.
 */
export const resolveModel = (
  input: RouterInput,
  useCase: UseCaseConfig,
): RouterDecision => {
  if (input.modelOverride) {
    return {
      model: input.modelOverride,
      reason: 'Manual model override',
      overridden: true,
    };
  }

  const model: StudioModel = input.defaultModel;

  const resPixels = RESOLUTION_PIXELS[input.resolution];
  const resRule = ruleById('resolution_pro_upgrade');
  if (resRule && resPixels >= 2048 && model !== 'nano-banana-pro') {
    return { model: resRule.override_model, reason: resRule.reason, overridden: false };
  }

  const refRule = ruleById('high_ref_count_upgrade');
  if (refRule && input.referenceCount > 8) {
    return { model: refRule.override_model, reason: refRule.reason, overridden: false };
  }

  for (const override of useCase.routerOverrides) {
    if (matchOverrideCondition(override.condition, input.formValues)) {
      return { model: override.model, reason: override.reason, overridden: false };
    }
  }

  return { model, reason: `Use case default (${useCase.id})`, overridden: false };
};

export const resetRouterCache = (): void => {
  rulesCache = null;
};
