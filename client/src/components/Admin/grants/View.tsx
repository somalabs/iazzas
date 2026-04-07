import { useState } from 'react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useListAdminGrantsQuery, useRevokeAdminGrantMutation } from '~/data-provider';
import GrantDialog from './Dialog';
import { cn } from '~/utils';

const capabilityColor = (cap: string): string => {
  if (cap.startsWith('access:')) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
  if (cap.startsWith('read:')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
  if (cap.startsWith('manage:')) {
    return 'bg-surface-submit text-white';
  }
  if (cap.startsWith('assign:')) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }
  return 'bg-surface-tertiary text-text-secondary';
};

export default function GrantsView() {
  const localize = useLocalize();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const grantsQuery = useListAdminGrantsQuery();
  const grants = grantsQuery.data?.grants ?? [];

  const revokeMutation = useRevokeAdminGrantMutation({
    onSuccess: () => setRevoking(null),
    onError: () => setRevoking(null),
  });

  const handleRevoke = (principalType: string, principalId: string, capability: string) => {
    const key = `${principalType}-${principalId}-${capability}`;
    if (!window.confirm(`Revogar "${capability}" de ${principalId}?`)) {
      return;
    }
    setRevoking(key);
    revokeMutation.mutate({ principalType, principalId, capability });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {localize('com_admin_grants_title')}
        </h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {localize('com_admin_grants_assign')}
        </button>
      </div>

      {grantsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-medium">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-medium bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 font-medium text-text-secondary">Tipo</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Principal</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Capability</th>
                <th className="px-4 py-3 font-medium text-text-secondary">Ações</th>
              </tr>
            </thead>
            <tbody>
              {grants.map((grant) => {
                const key = `${grant.principalType}-${grant.principalId}-${grant.capability}`;
                return (
                  <tr
                    key={key}
                    className="border-b border-border-light last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3 text-text-secondary">{grant.principalType}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {grant.principalId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          capabilityColor(grant.capability),
                        )}
                      >
                        {grant.capability}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          handleRevoke(grant.principalType, grant.principalId, grant.capability)
                        }
                        disabled={revoking === key}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {revoking === key ? '...' : localize('com_admin_grants_revoke')}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {grants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-tertiary">
                    Nenhuma grant encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <GrantDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
