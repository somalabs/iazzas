import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import { useCreateAdminGroupMutation, useUpdateAdminGroupMutation } from '~/data-provider';
import type { AdminGroup } from 'librechat-data-provider';

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGroup?: AdminGroup | null;
}

export default function GroupDialog({ open, onOpenChange, editGroup }: GroupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateAdminGroupMutation({
    onSuccess: () => onOpenChange(false),
    onError: (err) => setError(err?.message ?? 'Erro ao criar grupo'),
  });

  const updateMutation = useUpdateAdminGroupMutation({
    onSuccess: () => onOpenChange(false),
    onError: (err) => setError(err?.message ?? 'Erro ao atualizar grupo'),
  });

  useEffect(() => {
    if (open) {
      setName(editGroup?.name ?? '');
      setDescription(editGroup?.description ?? '');
      setEmail(editGroup?.email ?? '');
      setError('');
    }
  }, [open, editGroup]);

  const isEditing = !!editGroup;
  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Nome é obrigatório');
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        id: editGroup._id,
        body: {
          name: trimmedName,
          description: description.trim() || undefined,
          email: email.trim() || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: trimmedName,
        description: description.trim() || undefined,
        email: email.trim() || undefined,
      });
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="w-full max-w-md">
        <OGDialogTitle>{isEditing ? 'Editar Grupo' : 'Novo Grupo'}</OGDialogTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={2}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
            />
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
              disabled={isLoading}
              className="rounded-lg bg-surface-submit px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? '...' : isEditing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
