import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useAssignAdminGrantMutation, useListRoles } from '~/data-provider';

const CAPABILITIES = [
  'access:admin',
  'read:users',
  'manage:users',
  'read:groups',
  'manage:groups',
  'read:roles',
  'manage:roles',
  'read:configs',
  'manage:configs',
  'assign:configs',
  'read:usage',
  'read:agents',
  'manage:agents',
  'manage:mcpservers',
  'read:prompts',
  'manage:prompts',
  'read:assistants',
  'manage:assistants',
];

interface GrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GrantDialog({ open, onOpenChange }: GrantDialogProps) {
  const localize = useLocalize();
  const [principalId, setPrincipalId] = useState('');
  const [capability, setCapability] = useState('');
  const [error, setError] = useState('');

  const rolesQuery = useListRoles({ enabled: open });
  const roles = rolesQuery.data?.roles ?? [];

  const mutation = useAssignAdminGrantMutation({
    onSuccess: () => onOpenChange(false),
    onError: (err) => setError(err?.message ?? 'Erro ao atribuir grant'),
  });

  useEffect(() => {
    if (open) {
      setPrincipalId('');
      setCapability('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalId || !capability) {
      setError('Selecione um role e uma capability');
      return;
    }
    mutation.mutate({ principalType: 'role', principalId, capability });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="w-full max-w-md">
        <OGDialogTitle>{localize('com_admin_grants_assign')}</OGDialogTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Role</label>
            <select
              value={principalId}
              onChange={(e) => setPrincipalId(e.target.value)}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
            >
              <option value="">Selecione...</option>
              {roles.map((role) => (
                <option key={role.name} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Capability
            </label>
            <select
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
            >
              <option value="">Selecione...</option>
              {CAPABILITIES.map((cap) => (
                <option key={cap} value={cap}>
                  {cap}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border-medium px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isLoading}
              className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isLoading ? '...' : 'Atribuir'}
            </button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
