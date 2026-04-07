import { useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import {
  useListAdminGroupsQuery,
  useDeleteAdminGroupMutation,
  useListAdminGroupMembersQuery,
  useAddAdminGroupMemberMutation,
  useRemoveAdminGroupMemberMutation,
} from '~/data-provider';
import type { AdminGroup } from 'librechat-data-provider';
import Members from '../shared/Members';
import GroupDialog from './Dialog';
import { cn } from '~/utils';

export default function GroupsView() {
  const localize = useLocalize();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<AdminGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const groupsQuery = useListAdminGroupsQuery({ search: search || undefined });
  const groups = groupsQuery.data?.groups ?? [];

  const membersQuery = useListAdminGroupMembersQuery(selectedGroup?._id ?? '', undefined, {
    enabled: !!selectedGroup,
  });

  const deleteMutation = useDeleteAdminGroupMutation({
    onSuccess: () => setSelectedGroup(null),
  });

  const addMemberMutation = useAddAdminGroupMemberMutation();
  const removeMemberMutation = useRemoveAdminGroupMemberMutation({
    onSuccess: () => setRemovingMember(null),
    onError: () => setRemovingMember(null),
  });

  const handleCreate = () => {
    setEditGroup(null);
    setDialogOpen(true);
  };

  const handleEdit = (group: AdminGroup) => {
    setEditGroup(group);
    setDialogOpen(true);
  };

  const handleDelete = (group: AdminGroup) => {
    if (window.confirm(`Deletar grupo "${group.name}"?`)) {
      deleteMutation.mutate(group._id);
    }
  };

  const handleAddMember = useCallback(
    (userId: string) => {
      if (!selectedGroup) {
        return;
      }
      addMemberMutation.mutate({ id: selectedGroup._id, userId });
    },
    [selectedGroup, addMemberMutation],
  );

  const handleRemoveMember = useCallback(
    (userId: string) => {
      if (!selectedGroup) {
        return;
      }
      setRemovingMember(userId);
      removeMemberMutation.mutate({ id: selectedGroup._id, userId });
    },
    [selectedGroup, removeMemberMutation],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {localize('com_admin_groups_title')}
        </h1>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {localize('com_admin_groups_new')}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar grupos..."
          className="w-full max-w-sm rounded-lg border border-border-medium bg-surface-secondary px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-surface-submit focus:outline-none"
        />
      </div>

      {groupsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {groups.map((group) => (
                <div
                  key={group._id}
                  onClick={() => setSelectedGroup(group)}
                  className={cn(
                    'cursor-pointer rounded-lg border p-4 transition-colors',
                    selectedGroup?._id === group._id
                      ? 'border-surface-submit bg-surface-secondary'
                      : 'border-border-medium bg-surface-secondary hover:border-surface-submit',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-text-primary">{group.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(group);
                        }}
                        className="rounded p-1 text-xs text-text-tertiary hover:text-text-primary"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(group);
                        }}
                        className="rounded p-1 text-text-tertiary hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {group.description && (
                    <p className="mt-1 text-sm text-text-secondary">{group.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
                    <span>{group.memberIds?.length ?? 0} membros</span>
                    <span>·</span>
                    <span>{group.source}</span>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-text-tertiary">
                  Nenhum grupo encontrado
                </p>
              )}
            </div>
          </div>

          {selectedGroup && (
            <div className="rounded-lg border border-border-medium bg-surface-secondary p-4">
              <h3 className="mb-3 font-medium text-text-primary">{selectedGroup.name}</h3>
              <Members
                members={membersQuery.data?.members ?? []}
                total={membersQuery.data?.total ?? 0}
                isLoading={membersQuery.isLoading}
                onAdd={handleAddMember}
                onRemove={handleRemoveMember}
                isAdding={addMemberMutation.isLoading}
                isRemoving={removingMember}
              />
            </div>
          )}
        </div>
      )}

      <GroupDialog open={dialogOpen} onOpenChange={setDialogOpen} editGroup={editGroup} />
    </div>
  );
}
