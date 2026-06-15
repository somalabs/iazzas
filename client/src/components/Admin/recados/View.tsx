import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '@librechat/client';
import type { TBanner } from 'librechat-data-provider';
import { useGetAdminBannersQuery, useDeleteBannerMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import RecadoDialog from './Dialog';
import { cn } from '~/utils';

const typeLabelKey = (type: TBanner['type']) =>
  type === 'popup'
    ? ('com_admin_recados_type_popup' as const)
    : ('com_admin_recados_type_inbox' as const);

export default function RecadosView() {
  const localize = useLocalize();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const recadosQuery = useGetAdminBannersQuery();
  const recados = recadosQuery.data ?? [];

  const deleteMutation = useDeleteBannerMutation({
    onSuccess: () => setDeleting(null),
    onError: () => setDeleting(null),
  });

  const handleDelete = (bannerId: string) => {
    setDeleting(bannerId);
    deleteMutation.mutate(bannerId);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {localize('com_admin_recados_title')}
        </h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {localize('com_admin_recados_new')}
        </button>
      </div>

      {recadosQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-medium">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-medium bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {localize('com_admin_recados_col_message')}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {localize('com_admin_recados_col_type')}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {localize('com_admin_recados_col_date')}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {localize('com_admin_recados_col_actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {recados.map((recado) => (
                <tr
                  key={recado.bannerId}
                  className="border-b border-border-light last:border-0 hover:bg-surface-hover"
                >
                  <td className="max-w-md px-4 py-3 text-text-primary">
                    <span className="line-clamp-2 break-words">{recado.message}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        recado.type === 'popup'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-surface-tertiary text-text-secondary',
                      )}
                    >
                      {localize(typeLabelKey(recado.type))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {formatDistanceToNow(new Date(recado.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(recado.bannerId)}
                      disabled={deleting === recado.bannerId}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deleting === recado.bannerId ? '…' : localize('com_admin_recados_delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {recados.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-text-tertiary">
                    {localize('com_admin_recados_empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <RecadoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
