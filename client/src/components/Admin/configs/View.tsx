import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Spinner, Switch } from '@librechat/client';
import { useLocalize } from '~/hooks';
import {
  useListAdminConfigsQuery,
  useDeleteAdminConfigMutation,
  useToggleAdminConfigMutation,
} from '~/data-provider';
import type { AdminConfig } from 'librechat-data-provider';
import ConfigDialog from './Dialog';

export default function ConfigsView() {
  const localize = useLocalize();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<AdminConfig | null>(null);

  const configsQuery = useListAdminConfigsQuery();
  const configs = configsQuery.data?.configs ?? [];

  const deleteMutation = useDeleteAdminConfigMutation();
  const toggleMutation = useToggleAdminConfigMutation();

  const handleCreate = () => {
    setEditConfig(null);
    setDialogOpen(true);
  };

  const handleEdit = (config: AdminConfig) => {
    setEditConfig(config);
    setDialogOpen(true);
  };

  const handleDelete = (config: AdminConfig) => {
    if (!window.confirm(`Deletar config de ${config.principalId}?`)) {
      return;
    }
    deleteMutation.mutate({
      principalType: config.principalType,
      principalId: config.principalId,
    });
  };

  const handleToggle = (config: AdminConfig) => {
    toggleMutation.mutate({
      principalType: config.principalType,
      principalId: config.principalId,
      isActive: !config.isActive,
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {localize('com_admin_configs_title')}
        </h1>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {localize('com_admin_configs_new')}
        </button>
      </div>

      {configsQuery.isLoading ? (
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
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {localize('com_admin_configs_priority')}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">
                  {localize('com_admin_configs_active')}
                </th>
                <th className="px-4 py-3 font-medium text-text-secondary">Ações</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr
                  key={config._id}
                  className="border-b border-border-light last:border-0 hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 text-text-secondary">{config.principalType}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {config.principalId}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{config.priority}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={() => handleToggle(config)}
                      aria-label={`Toggle ${config.principalId}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-xs text-text-secondary hover:text-text-primary"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(config)}
                        disabled={deleteMutation.isLoading}
                        className="text-text-tertiary hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {configs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-tertiary">
                    Nenhuma configuração encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfigDialog open={dialogOpen} onOpenChange={setDialogOpen} editConfig={editConfig} />
    </div>
  );
}
