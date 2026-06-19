import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useSearchAdminUsersQuery } from '~/data-provider';
import type { AdminMember } from 'librechat-data-provider';

interface MembersProps {
  members: AdminMember[];
  total: number;
  isLoading: boolean;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
  isAdding?: boolean;
  isRemoving?: string | null;
}

export default function Members({
  members,
  total,
  isLoading,
  onAdd,
  onRemove,
  isAdding,
  isRemoving,
}: MembersProps) {
  const localize = useLocalize();
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) {
      inputRef.current?.focus();
    }
  }, [showSearch]);

  const searchQuery = useSearchAdminUsersQuery(debouncedSearch, 10, {
    enabled: debouncedSearch.length >= 2,
  });

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value);
      if (timer) {
        clearTimeout(timer);
      }
      const t = setTimeout(() => setDebouncedSearch(value.trim()), 300);
      setTimer(t);
    },
    [timer],
  );

  const handleAdd = (userId: string) => {
    onAdd(userId);
    setShowSearch(false);
    setSearchText('');
    setDebouncedSearch('');
  };

  const existingIds = new Set(members.map((m) => m.userId));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          {localize('com_admin_member_count', { count: total })}
        </h3>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="rounded-lg bg-surface-submit px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {localize('com_admin_member_add')}
        </button>
      </div>

      {showSearch && (
        <div className="mb-4 rounded-lg border border-border-medium bg-surface-primary p-3">
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={localize('com_admin_users_search_placeholder')}
            className="w-full rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-surface-submit focus:outline-none"
            ref={inputRef}
          />
          {searchQuery.isLoading && (
            <div className="mt-2 flex justify-center">
              <Spinner className="h-4 w-4" />
            </div>
          )}
          {searchQuery.data?.users && searchQuery.data.users.length > 0 && (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {searchQuery.data.users
                .filter((u) => !existingIds.has(u.id))
                .map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAdd(user.id)}
                    disabled={isAdding}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-hover disabled:opacity-50"
                  >
                    <span className="font-medium text-text-primary">{user.name}</span>
                    <span className="text-text-tertiary">{user.email}</span>
                  </button>
                ))}
            </div>
          )}
          {debouncedSearch.length >= 2 &&
            !searchQuery.isLoading &&
            searchQuery.data?.users?.length === 0 && (
              <p className="mt-2 text-center text-xs text-text-tertiary">
                {localize('com_admin_member_no_results')}
              </p>
            )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : (
        <div className="space-y-1">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-2 rounded-lg bg-surface-primary px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-primary">
                  {member.name}
                </span>
                <span className="block truncate text-xs text-text-tertiary">{member.email}</span>
              </div>
              <button
                onClick={() => onRemove(member.userId)}
                disabled={isRemoving === member.userId}
                className="flex-shrink-0 rounded p-1 text-text-tertiary hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30"
                title={localize('com_admin_member_remove')}
              >
                {isRemoving === member.userId ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <X size={14} />
                )}
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <p className="py-4 text-center text-sm text-text-tertiary">
              {localize('com_admin_member_none')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
