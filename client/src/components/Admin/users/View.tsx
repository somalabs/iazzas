import { useState, useCallback } from 'react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useListAdminUsersQuery, useSearchAdminUsersQuery } from '~/data-provider';
import { cn } from '~/utils';
import Detail from './Detail';
import type { AdminUserListItem, AdminUserSearchResult } from 'librechat-data-provider';

const PAGE_SIZE = 20;

const formatCredits = (value: number | null | undefined): string => {
  if (value == null) {
    return '—';
  }
  return value.toLocaleString();
};

export default function UsersView() {
  const localize = useLocalize();
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  const isSearching = debouncedSearch.length >= 2;

  const listQuery = useListAdminUsersQuery(
    { limit: PAGE_SIZE, offset },
    { enabled: !isSearching },
  );
  const searchQueryResult = useSearchAdminUsersQuery(debouncedSearch, PAGE_SIZE, {
    enabled: isSearching,
  });

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const timer = setTimeout(() => setDebouncedSearch(value.trim()), 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const listUsers: AdminUserListItem[] = listQuery.data?.users ?? [];
  const searchUsers: AdminUserSearchResult[] = searchQueryResult.data?.users ?? [];
  const total = isSearching
    ? searchQueryResult.data?.total ?? 0
    : listQuery.data?.total ?? 0;
  const isLoading = isSearching ? searchQueryResult.isLoading : listQuery.isLoading;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {localize('com_admin_users_title')}
        </h1>
        <span className="text-sm text-text-secondary">
          {total} {total === 1 ? 'user' : 'users'}
        </span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={localize('com_admin_users_search_placeholder')}
          className="w-full max-w-sm rounded-lg border border-border-medium bg-surface-secondary px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-surface-submit focus:outline-none"
        />
      </div>

      <div className="flex gap-4">
        <div className={cn('min-w-0 flex-1', selectedUser != null && 'max-w-[60%]')}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-border-medium">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border-medium bg-surface-secondary">
                    <tr>
                      <th className="px-4 py-3 font-medium text-text-secondary">Nome</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Email</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Role</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">
                        {localize('com_admin_users_balance')}
                      </th>
                      <th className="px-4 py-3 font-medium text-text-secondary">
                        {localize('com_admin_users_spend_30d')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isSearching
                      ? searchUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-border-light last:border-0"
                          >
                            <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
                            <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary">
                                —
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-secondary">—</td>
                            <td className="px-4 py-3 text-text-secondary">—</td>
                          </tr>
                        ))
                      : listUsers.map((user) => {
                          const isSelected = selectedUser?.id === user.id;
                          return (
                            <tr
                              key={user.id}
                              onClick={() => setSelectedUser(isSelected ? null : user)}
                              className={cn(
                                'cursor-pointer border-b border-border-light last:border-0',
                                isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                              )}
                            >
                              <td className="px-4 py-3 font-medium text-text-primary">
                                {user.name}
                              </td>
                              <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                    user.role === 'ADMIN'
                                      ? 'bg-surface-submit text-white'
                                      : 'bg-surface-tertiary text-text-secondary',
                                  )}
                                >
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-text-secondary">
                                {formatCredits(user.balance)}
                              </td>
                              <td className="px-4 py-3 text-text-secondary">
                                {formatCredits(user.recentSpend)}
                              </td>
                            </tr>
                          );
                        })}
                    {(isSearching ? searchUsers : listUsers).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-text-tertiary">
                          {isSearching
                            ? localize('com_ui_nothing_found')
                            : 'Nenhum usuário encontrado'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!isSearching && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                    className="rounded-lg border border-border-medium px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-text-secondary">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-border-medium px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {selectedUser != null && (
          <div className="w-[40%] min-w-[320px]">
            <Detail user={selectedUser} onClose={() => setSelectedUser(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
