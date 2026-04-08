import { useState, useEffect, useMemo } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useUpsertAdminConfigMutation } from '~/data-provider';
import { toDisplayCredits, toRawCredits } from '~/utils/credits';
import BalanceForm from './BalanceForm';
import type { BalanceOverride } from './BalanceForm';
import type { AdminConfig } from 'librechat-data-provider';

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editConfig?: AdminConfig | null;
}

export default function ConfigDialog({ open, onOpenChange, editConfig }: ConfigDialogProps) {
  const localize = useLocalize();
  const [principalType, setPrincipalType] = useState('role');
  const [principalId, setPrincipalId] = useState('');
  const [priority, setPriority] = useState(10);
  const [overridesJson, setOverridesJson] = useState('{}');
  const [jsonError, setJsonError] = useState('');
  const [error, setError] = useState('');
  const [showBalanceForm, setShowBalanceForm] = useState(false);

  const mutation = useUpsertAdminConfigMutation({
    onSuccess: () => onOpenChange(false),
    onError: (err) => setError(err?.message ?? 'Erro ao salvar configuração'),
  });

  useEffect(() => {
    if (open) {
      if (editConfig) {
        setPrincipalType(editConfig.principalType);
        setPrincipalId(editConfig.principalId);
        setPriority(editConfig.priority);
        setOverridesJson(JSON.stringify(editConfig.overrides, null, 2));
        const hasBalance =
          editConfig.overrides != null &&
          'balance' in (editConfig.overrides as Record<string, unknown>);
        setShowBalanceForm(hasBalance);
      } else {
        setPrincipalType('role');
        setPrincipalId('');
        setPriority(10);
        setOverridesJson('{}');
        setShowBalanceForm(false);
      }
      setJsonError('');
      setError('');
    }
  }, [open, editConfig]);

  const isEditing = !!editConfig;
  const isLoading = mutation.isLoading;

  const balanceValue = useMemo(() => {
    try {
      const parsed = JSON.parse(overridesJson) as Record<string, unknown>;
      const raw = (parsed?.balance as BalanceOverride) ?? {};
      return {
        ...raw,
        startBalance: raw.startBalance != null ? toDisplayCredits(raw.startBalance) : undefined,
        refillAmount: raw.refillAmount != null ? toDisplayCredits(raw.refillAmount) : undefined,
      };
    } catch {
      return {};
    }
  }, [overridesJson]);

  const handleBalanceChange = (display: BalanceOverride) => {
    const balance: BalanceOverride = {
      ...display,
      startBalance: display.startBalance != null ? toRawCredits(display.startBalance) : undefined,
      refillAmount: display.refillAmount != null ? toRawCredits(display.refillAmount) : undefined,
    };
    try {
      const parsed = JSON.parse(overridesJson) as Record<string, unknown>;
      parsed.balance = balance;
      setOverridesJson(JSON.stringify(parsed, null, 2));
      setJsonError('');
    } catch {
      setOverridesJson(JSON.stringify({ balance }, null, 2));
      setJsonError('');
    }
  };

  const toggleBalanceForm = () => {
    if (showBalanceForm) {
      try {
        const parsed = JSON.parse(overridesJson) as Record<string, unknown>;
        delete parsed.balance;
        setOverridesJson(JSON.stringify(parsed, null, 2));
      } catch {
        // ignore invalid JSON
      }
    }
    setShowBalanceForm(!showBalanceForm);
  };

  const validateJson = (value: string): boolean => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('Deve ser um objeto JSON');
        return false;
      }
      setJsonError('');
      return true;
    } catch {
      setJsonError('JSON inválido');
      return false;
    }
  };

  const handleJsonChange = (value: string) => {
    setOverridesJson(value);
    if (value.trim()) {
      validateJson(value);
    } else {
      setJsonError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalId.trim()) {
      setError('Principal ID é obrigatório');
      return;
    }
    if (!validateJson(overridesJson)) {
      return;
    }

    const overrides = JSON.parse(overridesJson) as Record<string, unknown>;
    mutation.mutate({
      principalType,
      principalId: principalId.trim(),
      body: { overrides, priority },
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="w-full max-w-lg">
        <OGDialogTitle>
          {isEditing ? 'Editar Configuração' : localize('com_admin_configs_new')}
        </OGDialogTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Tipo</label>
              <select
                value={principalType}
                onChange={(e) => setPrincipalType(e.target.value)}
                disabled={isEditing || isLoading}
                className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
              >
                <option value="role">Role</option>
                <option value="group">Group</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                {localize('com_admin_configs_priority')}
              </label>
              <input
                type="number"
                min={0}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                disabled={isLoading}
                className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Principal ID
            </label>
            <input
              type="text"
              value={principalId}
              onChange={(e) => setPrincipalId(e.target.value)}
              disabled={isEditing || isLoading}
              placeholder="Nome do role, ID do grupo, ou ID do usuário"
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-surface-submit focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">
              {localize('com_admin_configs_balance')}
            </span>
            <button
              type="button"
              onClick={toggleBalanceForm}
              disabled={isLoading}
              className="text-xs text-surface-submit hover:underline"
            >
              {showBalanceForm ? 'Remover' : localize('com_admin_configs_balance_add')}
            </button>
          </div>
          {showBalanceForm && (
            <BalanceForm
              value={balanceValue}
              onChange={handleBalanceChange}
              disabled={isLoading}
            />
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Overrides (JSON)
            </label>
            <textarea
              value={overridesJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              disabled={isLoading}
              rows={10}
              spellCheck={false}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 font-mono text-xs text-text-primary focus:border-surface-submit focus:outline-none"
            />
            {jsonError && <p className="mt-1 text-xs text-red-500">{jsonError}</p>}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="rounded-lg border border-border-medium px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !!jsonError}
              className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? '...' : 'Salvar'}
            </button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
