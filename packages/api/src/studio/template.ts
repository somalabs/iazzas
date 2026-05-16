import { TemplateInputError } from './types';

export type TemplateContext = Record<string, string | boolean>;

const IF_BLOCK = /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g;
const FALLBACK_VAR = /\{\{\s*([\w.]+)\s*\|\s*"([^"]*)"\s*\}\}/g;
const SIMPLE_VAR = /\{\{\s*([\w.]+)\s*\}\}/g;
const EQUALITY = /^([\w.]+)\s*(==|!=)\s*"([^"]*)"$/;

const isPresent = (value: string | boolean | undefined): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value.trim() !== '';
};

const asString = (value: string | boolean | undefined): string => {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'boolean' ? String(value) : value;
};

const evaluateCondition = (expr: string, context: TemplateContext): boolean => {
  const equality = expr.match(EQUALITY);
  if (equality) {
    const [, name, op, target] = equality;
    const actual = asString(context[name]).trim();
    return op === '==' ? actual === target : actual !== target;
  }
  return isPresent(context[expr.trim()]);
};

const collapseBlankLines = (text: string): string =>
  text
    .split('\n')
    .filter((line, index, lines) => !(line.trim() === '' && lines[index - 1]?.trim() === ''))
    .join('\n')
    .replace(/[ \t]+$/gm, '');

/**
 * Renders a Handlebars-subset prompt template per config/studio/CONTRACT.md:
 * `{{field}}`, `{{field | "default"}}`, `{{#if field}}…{{/if}}`,
 * `{{#if field == "x"}}…{{/if}}`. Unknown simple placeholders are left intact;
 * empty/absent inputs are treated as not provided.
 */
export const renderTemplate = (template: string, context: TemplateContext): string => {
  const withBlocks = template.replace(IF_BLOCK, (_match, expr: string, body: string) =>
    evaluateCondition(expr, context) ? body : '',
  );

  const withFallbacks = withBlocks.replace(
    FALLBACK_VAR,
    (_match, name: string, fallback: string) => {
      const value = context[name];
      return isPresent(value) ? asString(value) : fallback;
    },
  );

  const rendered = withFallbacks.replace(SIMPLE_VAR, (match, name: string) => {
    if (!(name in context)) {
      return match;
    }
    return asString(context[name]);
  });

  return collapseBlankLines(rendered).trim();
};

/**
 * Validates that every required form field has a present value before render.
 * Throws {@link TemplateInputError} listing the missing field ids.
 */
export const assertRequiredInputs = (
  context: TemplateContext,
  requiredFieldIds: string[],
): void => {
  const missing = requiredFieldIds.filter((id) => !isPresent(context[id]));
  if (missing.length > 0) {
    throw new TemplateInputError(missing);
  }
};
