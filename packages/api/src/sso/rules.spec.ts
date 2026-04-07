import { evaluateSSORules } from './rules';
import type { TSSORule } from 'librechat-data-provider';

describe('evaluateSSORules', () => {
  it('returns empty array when no rules match', () => {
    const claims = { email: 'user@example.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', value: 'other@example.com' }, addToGroups: ['group-a'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual([]);
  });

  it('matches exact value (case-insensitive)', () => {
    const claims = { department: 'Engineering' };
    const rules: TSSORule[] = [
      { match: { claim: 'department', value: 'engineering' }, addToGroups: ['eng-team'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['eng-team']);
  });

  it('matches glob pattern', () => {
    const claims = { email: 'maria@marketing.azzas.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@marketing.azzas.com' }, addToGroups: ['marketing'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['marketing']);
  });

  it('does not match glob pattern when different domain', () => {
    const claims = { email: 'maria@engineering.azzas.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@marketing.azzas.com' }, addToGroups: ['marketing'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual([]);
  });

  it('matches array contains', () => {
    const claims = { groups: ['group-id-1', 'group-id-2', 'group-id-3'] };
    const rules: TSSORule[] = [
      { match: { claim: 'groups', contains: 'group-id-2' }, addToGroups: ['power-users'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['power-users']);
  });

  it('does not match contains when claim is not an array', () => {
    const claims = { groups: 'group-id-2' };
    const rules: TSSORule[] = [
      { match: { claim: 'groups', contains: 'group-id-2' }, addToGroups: ['power-users'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual([]);
  });

  it('accumulates groups from multiple matching rules', () => {
    const claims = { email: 'ana@marketing.azzas.com', department: 'Marketing' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@marketing.azzas.com' }, addToGroups: ['mkt-email'] },
      { match: { claim: 'department', value: 'Marketing' }, addToGroups: ['mkt-dept'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['mkt-email', 'mkt-dept']);
  });

  it('deduplicates groups when multiple rules assign the same group', () => {
    const claims = { email: 'ana@azzas.com', department: 'Marketing' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@azzas.com' }, addToGroups: ['all-users'] },
      { match: { claim: 'department', value: 'Marketing' }, addToGroups: ['all-users', 'mkt'] },
    ];
    const result = evaluateSSORules(claims, rules);
    expect(result).toEqual(['all-users', 'mkt']);
  });

  it('skips rules when claim is missing from token', () => {
    const claims = { email: 'user@azzas.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'department', value: 'Engineering' }, addToGroups: ['eng'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual([]);
  });

  it('returns empty array when rules array is empty', () => {
    const claims = { email: 'user@azzas.com' };
    expect(evaluateSSORules(claims, [])).toEqual([]);
  });

  it('handles glob pattern with special regex characters in email', () => {
    const claims = { email: 'user+test@azzas.com' };
    const rules: TSSORule[] = [
      { match: { claim: 'email', pattern: '*@azzas.com' }, addToGroups: ['all'] },
    ];
    expect(evaluateSSORules(claims, rules)).toEqual(['all']);
  });
});
