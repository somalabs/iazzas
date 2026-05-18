import type { FlowRunContext, FlowLogger } from './types';

const PLACEHOLDER = /\{\{([^}]+)\}\}/g;
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Resolves `{{path}}` placeholders against the RunContext ONLY.
 *
 * Hard guarantees (security-critical — see CONTRACT §3.2 / §8):
 * - never evaluates code (`eval`/`Function` are not used);
 * - never reads `process.env`, globals, or any object other than `context`;
 * - prototype-pollution paths (`__proto__`/`constructor`/`prototype`) are inert;
 * - lookup uses own-property check only, so inherited keys never resolve;
 * - missing placeholder → empty string + a single `logger.warn` (run continues).
 *
 * Interpolation is shallow (1 level): the regex pass is non-recursive, so a
 * resolved value containing `{{...}}` is not re-expanded.
 */
export function interpolate(
  template: string,
  context: FlowRunContext,
  opts: { nodeId: string; logger: FlowLogger },
): string {
  if (template.indexOf('{{') === -1) {
    return template;
  }
  return template.replace(PLACEHOLDER, (_full, rawPath: string) => {
    const path = rawPath.trim();
    const tainted = path.split('.').some((seg) => FORBIDDEN_SEGMENTS.has(seg));
    if (
      !tainted &&
      Object.prototype.hasOwnProperty.call(context, path) &&
      typeof context[path] === 'string'
    ) {
      return context[path];
    }
    opts.logger.warn(
      `[flow] node ${opts.nodeId}: placeholder "${path}" not found in run context — treated as empty`,
    );
    return '';
  });
}
