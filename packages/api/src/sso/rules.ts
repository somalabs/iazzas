import type { TSSORule } from 'librechat-data-provider';

function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function matchesRule(claimValue: unknown, rule: TSSORule): boolean {
  const { match } = rule;

  if (match.value !== undefined) {
    return typeof claimValue === 'string' && claimValue.toLowerCase() === match.value.toLowerCase();
  }

  if (match.pattern !== undefined) {
    if (typeof claimValue !== 'string') return false;
    return globToRegex(match.pattern).test(claimValue);
  }

  if (match.contains !== undefined) {
    return Array.isArray(claimValue) && claimValue.includes(match.contains);
  }

  return false;
}

export function evaluateSSORules(
  claims: Record<string, unknown>,
  rules: TSSORule[],
): string[] {
  const groups = new Set<string>();

  for (const rule of rules) {
    const claimValue = claims[rule.match.claim];
    if (claimValue === undefined) continue;

    if (matchesRule(claimValue, rule)) {
      for (const group of rule.addToGroups) {
        groups.add(group);
      }
    }
  }

  return [...groups];
}
