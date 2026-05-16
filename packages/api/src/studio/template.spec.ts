import { renderTemplate, assertRequiredInputs } from './template';
import { TemplateInputError } from './types';

describe('renderTemplate', () => {
  it('substitutes simple placeholders', () => {
    expect(renderTemplate('A {{color}} dress', { color: 'cobalt' })).toBe('A cobalt dress');
  });

  it('leaves unknown placeholders intact', () => {
    expect(renderTemplate('keep {{unknown}}', {})).toBe('keep {{unknown}}');
  });

  it('uses fallback when value absent or empty', () => {
    expect(renderTemplate('{{setting | "studio"}}', {})).toBe('studio');
    expect(renderTemplate('{{setting | "studio"}}', { setting: '' })).toBe('studio');
    expect(renderTemplate('{{setting | "studio"}}', { setting: 'loja' })).toBe('loja');
  });

  it('renders truthy if-blocks for present strings and boolean true', () => {
    expect(renderTemplate('{{#if notes}}has notes{{/if}}', { notes: 'x' })).toBe('has notes');
    expect(renderTemplate('{{#if notes}}has notes{{/if}}', { notes: '' })).toBe('');
    expect(renderTemplate('{{#if keep}}kept{{/if}}', { keep: true })).toBe('kept');
    expect(renderTemplate('{{#if keep}}kept{{/if}}', { keep: false })).toBe('');
  });

  it('evaluates equality conditions', () => {
    const tpl = '{{#if intensity == "full"}}DOMINANT{{/if}}{{#if intensity == "subtle"}}SOFT{{/if}}';
    expect(renderTemplate(tpl, { intensity: 'full' })).toBe('DOMINANT');
    expect(renderTemplate(tpl, { intensity: 'subtle' })).toBe('SOFT');
  });

  it('renders the real pattern_application template coherently', () => {
    const tpl = [
      'Apply the {{application_type}} print.',
      '{{#if intensity == "full"}}The print should dominate.{{/if}}',
      '{{#if preserve_structure}}Preserve seams.{{/if}}',
    ].join('\n');
    const out = renderTemplate(tpl, {
      application_type: 'all-over',
      intensity: 'full',
      preserve_structure: true,
    });
    expect(out).toContain('Apply the all-over print.');
    expect(out).toContain('The print should dominate.');
    expect(out).toContain('Preserve seams.');
  });
});

describe('assertRequiredInputs', () => {
  it('throws TemplateInputError listing missing fields', () => {
    expect(() => assertRequiredInputs({ a: 'x' }, ['a', 'b', 'c'])).toThrow(TemplateInputError);
    try {
      assertRequiredInputs({ a: '', b: 'y' }, ['a', 'b']);
    } catch (err) {
      expect((err as TemplateInputError).missing).toEqual(['a']);
    }
  });

  it('passes when all required present', () => {
    expect(() => assertRequiredInputs({ a: 'x', b: true }, ['a', 'b'])).not.toThrow();
  });
});
