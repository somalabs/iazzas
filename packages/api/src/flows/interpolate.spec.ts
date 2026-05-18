import { interpolate } from './interpolate';

const mkLogger = () => {
  const warnings: string[] = [];
  return { warnings, logger: { warn: (m: string) => warnings.push(m), error: () => {} } };
};

describe('interpolate', () => {
  it('substitutes known placeholders from the RunContext', () => {
    const { logger } = mkLogger();
    const out = interpolate('Olá {{trigger.input}} / {{n1.output}}', {
      'trigger.input': 'mundo',
      'n1.output': 'X',
    }, { nodeId: 'n2', logger });
    expect(out).toBe('Olá mundo / X');
  });

  it('replaces missing placeholders with empty string and warns once', () => {
    const { warnings, logger } = mkLogger();
    const out = interpolate('a={{missing}}b', {}, { nodeId: 'n1', logger });
    expect(out).toBe('a=b');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('missing');
  });

  it('never resolves prototype-pollution paths', () => {
    const { logger } = mkLogger();
    expect(interpolate('{{__proto__}}', {}, { nodeId: 'n', logger })).toBe('');
    expect(interpolate('{{constructor}}', {}, { nodeId: 'n', logger })).toBe('');
    expect(interpolate('{{a.prototype.b}}', {}, { nodeId: 'n', logger })).toBe('');
  });

  it('does not resolve inherited (non-own) properties', () => {
    const { logger } = mkLogger();
    const ctx = Object.create({ inherited: 'leak' }) as Record<string, string>;
    ctx['own'] = 'ok';
    expect(interpolate('{{inherited}}', ctx, { nodeId: 'n', logger })).toBe('');
    expect(interpolate('{{own}}', ctx, { nodeId: 'n', logger })).toBe('ok');
  });

  it('is shallow: resolved value is not re-expanded', () => {
    const { logger } = mkLogger();
    const out = interpolate('{{a}}', { a: '{{b}}', b: 'deep' }, { nodeId: 'n', logger });
    expect(out).toBe('{{b}}');
  });

  it('returns the template untouched when there are no placeholders', () => {
    const { logger } = mkLogger();
    expect(interpolate('plain text', {}, { nodeId: 'n', logger })).toBe('plain text');
  });
});
