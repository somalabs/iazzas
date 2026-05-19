import { resolveDefaultProviderModel } from '../forms';

describe('resolveDefaultProviderModel', () => {
  it('retorna o primeiro provider com ao menos um modelo', () => {
    expect(
      resolveDefaultProviderModel([{ value: 'empty' }, { value: 'openai' }], {
        empty: [],
        openai: ['gpt-4o', 'gpt-4o-mini'],
      }),
    ).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  it('ignora chaves não-array do models config (ex.: initial)', () => {
    expect(
      resolveDefaultProviderModel([{ value: 'openai' }], {
        initial: true,
        openai: ['gpt-4o'],
      }),
    ).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  it('retorna null quando nenhum provider tem modelos', () => {
    expect(resolveDefaultProviderModel([{ value: 'a' }], { a: [] })).toBeNull();
  });

  it('retorna null quando não há providers', () => {
    expect(resolveDefaultProviderModel([], { a: ['x'] })).toBeNull();
  });
});
