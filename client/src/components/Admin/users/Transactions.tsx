import type { AdminTransactionItem } from 'librechat-data-provider';

interface TransactionsProps {
  items: AdminTransactionItem[];
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
}

export default function Transactions({
  items,
  total,
  limit,
  offset,
  onOffsetChange,
}: TransactionsProps) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-text-secondary">Histórico de Transações</h3>
      <div className="overflow-hidden rounded-lg border border-border-medium">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border-medium bg-surface-secondary">
            <tr>
              <th className="px-3 py-2 font-medium text-text-secondary">Data</th>
              <th className="px-3 py-2 font-medium text-text-secondary">Modelo</th>
              <th className="px-3 py-2 font-medium text-text-secondary">Tipo</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Tokens</th>
              <th className="px-3 py-2 text-right font-medium text-text-secondary">Valor</th>
              <th className="px-3 py-2 font-medium text-text-secondary">Contexto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tx) => (
              <tr key={tx._id} className="border-b border-border-light last:border-0">
                <td className="px-3 py-2 text-text-secondary">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-text-secondary">{tx.model ?? '—'}</td>
                <td className="px-3 py-2 text-text-secondary">{tx.tokenType}</td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {tx.rawAmount?.toLocaleString() ?? '—'}
                </td>
                <td className="px-3 py-2 text-right text-text-secondary">
                  {tx.tokenValue?.toLocaleString() ?? '—'}
                </td>
                <td className="max-w-[100px] truncate px-3 py-2 text-text-tertiary">
                  {tx.note ?? tx.context ?? '—'}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-tertiary">
                  Nenhuma transação encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => onOffsetChange(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="rounded border border-border-medium px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs text-text-secondary">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onOffsetChange(offset + limit)}
            disabled={currentPage >= totalPages}
            className="rounded border border-border-medium px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
