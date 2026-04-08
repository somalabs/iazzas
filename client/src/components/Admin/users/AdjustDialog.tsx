import { useState, useEffect } from 'react';
import { OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useAdjustAdminUserBalanceMutation } from '~/data-provider';
import { toRawCredits } from '~/utils/credits';

interface AdjustDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdjustDialog({ userId, open, onOpenChange }: AdjustDialogProps) {
  const localize = useLocalize();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useAdjustAdminUserBalanceMutation({
    onSuccess: () => onOpenChange(false),
    onError: (err) => setError(err?.message ?? 'Erro ao ajustar créditos'),
  });

  useEffect(() => {
    if (open) {
      setAmount('');
      setReason('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed === 0) {
      setError(localize('com_admin_users_adjust_invalid_amount'));
      return;
    }
    if (!reason.trim()) {
      setError(localize('com_admin_users_adjust_reason_required'));
      return;
    }
    mutation.mutate({ userId, amount: toRawCredits(parsed), reason: reason.trim() });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="w-full max-w-md">
        <OGDialogTitle>{localize('com_admin_users_adjust_credits')}</OGDialogTitle>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {localize('com_admin_users_adjust_amount')}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
              placeholder="Ex: 100 ou -50 (em créditos)"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              {localize('com_admin_users_adjust_reason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-surface-submit focus:outline-none"
              placeholder="Motivo do ajuste..."
            />
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
              {mutation.isLoading ? '...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </OGDialogContent>
    </OGDialog>
  );
}
