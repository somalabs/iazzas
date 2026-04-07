import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Spinner } from '@librechat/client';
import { SystemRoles } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import {
  useListRoles,
  useDeleteAdminRoleMutation,
  useListAdminRoleMembersQuery,
  useAddAdminRoleMemberMutation,
  useRemoveAdminRoleMemberMutation,
} from '~/data-provider';
import Members from '../shared/Members';
import Permissions from './Permissions';
import RoleDialog from './Dialog';
import { cn } from '~/utils';

export default function RolesView() {
  const localize = useLocalize();
  const { name: selectedName } = useParams();
  const rolesQuery = useListRoles();
  const [selected, setSelected] = useState<string | null>(selectedName ?? null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<{ name: string; description?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'permissions' | 'members'>('permissions');
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const roles = rolesQuery.data?.roles ?? [];

  const membersQuery = useListAdminRoleMembersQuery(selected ?? '', undefined, {
    enabled: !!selected && activeTab === 'members',
  });

  const deleteMutation = useDeleteAdminRoleMutation({
    onSuccess: () => {
      setSelected(null);
    },
  });

  const addMemberMutation = useAddAdminRoleMemberMutation();
  const removeMemberMutation = useRemoveAdminRoleMemberMutation({
    onSuccess: () => setRemovingMember(null),
    onError: () => setRemovingMember(null),
  });

  const handleCreate = () => {
    setEditRole(null);
    setDialogOpen(true);
  };

  const handleEdit = () => {
    if (!selected) {
      return;
    }
    const role = roles.find((r) => r.name === selected);
    setEditRole(role ? { name: role.name, description: role.description } : null);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (!selected) {
      return;
    }
    if (window.confirm(`Deletar role "${selected}"?`)) {
      deleteMutation.mutate(selected);
    }
  };

  const isSystemRole = selected
    ? Object.values(SystemRoles).some(
        (sr) => sr.toLowerCase() === selected.toLowerCase(),
      )
    : false;

  const handleAddMember = useCallback(
    (userId: string) => {
      if (!selected) {
        return;
      }
      addMemberMutation.mutate({ name: selected, userId });
    },
    [selected, addMemberMutation],
  );

  const handleRemoveMember = useCallback(
    (userId: string) => {
      if (!selected) {
        return;
      }
      setRemovingMember(userId);
      removeMemberMutation.mutate({ name: selected, userId });
    },
    [selected, removeMemberMutation],
  );

  if (rolesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {localize('com_admin_roles_title')}
        </h1>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {localize('com_admin_roles_new')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1">
          {roles.map((role) => (
            <button
              key={role.name}
              onClick={() => {
                setSelected(role.name);
                setActiveTab('permissions');
              }}
              className={cn(
                'w-full rounded-lg px-4 py-3 text-left text-sm transition-colors',
                selected === role.name
                  ? 'bg-surface-submit text-white'
                  : 'bg-surface-secondary text-text-primary hover:bg-surface-hover',
              )}
            >
              <div className="font-medium">{role.name}</div>
              {role.description && (
                <div
                  className={cn(
                    'mt-1 text-xs',
                    selected === role.name ? 'text-white/70' : 'text-text-tertiary',
                  )}
                >
                  {role.description}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="col-span-2 rounded-lg border border-border-medium bg-surface-secondary p-6">
          {selected ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">{selected}</h2>
                <div className="flex gap-2">
                  {!isSystemRole && (
                    <>
                      <button
                        onClick={handleEdit}
                        className="rounded-lg border border-border-medium px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
                      >
                        Editar
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isLoading}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-4 flex gap-2 border-b border-border-light">
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={cn(
                    'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === 'permissions'
                      ? 'border-surface-submit text-text-primary'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary',
                  )}
                >
                  {localize('com_admin_roles_permissions')}
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={cn(
                    'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === 'members'
                      ? 'border-surface-submit text-text-primary'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary',
                  )}
                >
                  {localize('com_admin_roles_members')}
                </button>
              </div>

              {activeTab === 'permissions' && <Permissions roleName={selected} />}
              {activeTab === 'members' && (
                <Members
                  members={membersQuery.data?.members ?? []}
                  total={membersQuery.data?.total ?? 0}
                  isLoading={membersQuery.isLoading}
                  onAdd={handleAddMember}
                  onRemove={handleRemoveMember}
                  isAdding={addMemberMutation.isLoading}
                  isRemoving={removingMember}
                />
              )}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-text-tertiary">
              Selecione um role para ver os detalhes
            </p>
          )}
        </div>
      </div>

      <RoleDialog open={dialogOpen} onOpenChange={setDialogOpen} editRole={editRole} />
    </div>
  );
}
