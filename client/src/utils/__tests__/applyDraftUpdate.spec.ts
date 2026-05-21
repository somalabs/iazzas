import type React from 'react';
import { AgentCapabilities } from 'librechat-data-provider';
import type { AgentDraftParams } from '~/Providers/AgentDraftContext';
import { applyDraftUpdate, DRAFT_FORM_FIELD_MAP } from '../applyDraftUpdate';

describe('applyDraftUpdate', () => {
  const baseParams: AgentDraftParams = {
    name: 'Old Name',
    category: '',
    provider: 'openAI',
    model: 'gpt-4o',
    instructions: 'Old instructions',
    webSearch: false,
    fileSearch: false,
    executeCode: false,
    mcpServers: [],
  };

  it('merges partial args onto draftParams', () => {
    let captured: AgentDraftParams | null = null;
    const setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>> = jest.fn(
      (value) => {
        captured = typeof value === 'function' ? value(baseParams) : value;
      },
    );
    const setFormValue = jest.fn();

    applyDraftUpdate({ name: 'New Name', webSearch: true }, setDraftParams, setFormValue);

    expect(captured).toMatchObject({ name: 'New Name', webSearch: true });
    expect(captured).toMatchObject({ model: 'gpt-4o' }); // unchanged
  });

  it('calls setFormValue for each known form field', () => {
    const setDraftParams = jest.fn((fn: any) => fn(baseParams));
    const setFormValue = jest.fn();

    applyDraftUpdate(
      { name: 'X', instructions: 'Y', model: 'gpt-4', webSearch: true, fileSearch: false },
      setDraftParams,
      setFormValue,
    );

    expect(setFormValue).toHaveBeenCalledWith('name', 'X', { shouldDirty: true });
    expect(setFormValue).toHaveBeenCalledWith('instructions', 'Y', { shouldDirty: true });
    expect(setFormValue).toHaveBeenCalledWith('model', 'gpt-4', { shouldDirty: true });
    expect(setFormValue).toHaveBeenCalledWith(AgentCapabilities.web_search, true, {
      shouldDirty: true,
    });
    expect(setFormValue).toHaveBeenCalledWith(AgentCapabilities.file_search, false, {
      shouldDirty: true,
    });
  });

  it('does not call setFormValue for unmapped fields (mcpServers, temperature, top_p)', () => {
    const setDraftParams = jest.fn((fn: any) => fn(baseParams));
    const setFormValue = jest.fn();

    applyDraftUpdate({ mcpServers: ['server1'], temperature: 0.7 }, setDraftParams, setFormValue);

    expect(setFormValue).not.toHaveBeenCalled();
  });

  it('is a no-op for form updates when setFormValue is null', () => {
    const setDraftParams = jest.fn((fn: any) => fn(baseParams));

    expect(() => applyDraftUpdate({ name: 'X' }, setDraftParams, null)).not.toThrow();
    expect(setDraftParams).toHaveBeenCalled();
  });

  it('ignores undefined values — does not override existing params', () => {
    const captured: { value: AgentDraftParams | null } = { value: null };
    const setDraftParams: React.Dispatch<React.SetStateAction<AgentDraftParams>> = jest.fn(
      (value) => {
        captured.value = typeof value === 'function' ? value(baseParams) : value;
      },
    );

    applyDraftUpdate({ name: 'New', instructions: undefined }, setDraftParams, null);

    expect(captured.value?.instructions).toBe('Old instructions');
  });

  it('exports DRAFT_FORM_FIELD_MAP with expected keys', () => {
    expect(Object.keys(DRAFT_FORM_FIELD_MAP)).toEqual(
      expect.arrayContaining([
        'name',
        'instructions',
        'category',
        'model',
        'webSearch',
        'fileSearch',
        'executeCode',
      ]),
    );
  });
});
