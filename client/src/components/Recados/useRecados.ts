import { useCallback, useMemo } from 'react';
import type { TBanner } from 'librechat-data-provider';
import { useGetBannersQuery, useMarkBannerSeenMutation } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';

/**
 * @param popupSince Timestamp (ms) marking the start of the current visit. A recado only
 * becomes a pop-up if it was created before this moment — recados launched while the user
 * is already in the app go to the mural silently and only pop up on the next visit (login or
 * reload) if still unread. Omit to opt out of pop-up evaluation (mural/badge consumers).
 *
 * The "seen" state is tracked server-side per user (`recado.seen`), so a pop-up appears at
 * most once per user regardless of device, browser, or cleared local storage.
 *
 * Pop-up rules (avoid spamming a new user with history):
 * - Only the single most recent eligible recado pops — never a cascade of all unread ones.
 * - A recado only pops if it was created AFTER the user joined IAzzas, so a brand-new user
 *   never sees historical pop-ups (they remain available, unread, in the mural).
 */
export default function useRecados(popupSince?: number) {
  const { data: recados } = useGetBannersQuery();
  const { user } = useAuthContext();
  const { mutate: markSeenMutate } = useMarkBannerSeenMutation();

  const list = useMemo<TBanner[]>(() => recados ?? [], [recados]);

  const joinedAt = useMemo(
    () => (user?.createdAt != null ? new Date(user.createdAt).getTime() : null),
    [user?.createdAt],
  );

  const unreadCount = useMemo(
    () => list.reduce((count, recado) => (recado.seen === true ? count : count + 1), 0),
    [list],
  );

  const pendingPopup = useMemo<TBanner | undefined>(() => {
    if (popupSince == null) {
      return undefined;
    }
    /** `list` is newest-first, so this is the most recent pop-up created after the user joined
     *  and before this visit. Only that one is eligible — older unread pop-ups never cascade. */
    const candidate = list.find((recado) => {
      if (recado.type !== 'popup') {
        return false;
      }
      const createdAt = new Date(recado.createdAt).getTime();
      return createdAt < popupSince && (joinedAt == null || createdAt >= joinedAt);
    });
    if (candidate == null || candidate.seen === true) {
      return undefined;
    }
    return candidate;
  }, [list, popupSince, joinedAt]);

  const markSeen = useCallback(
    (bannerId: string) => {
      const recado = list.find((item) => item.bannerId === bannerId);
      if (recado != null && recado.seen !== true) {
        markSeenMutate(bannerId);
      }
    },
    [list, markSeenMutate],
  );

  return {
    list,
    unreadCount,
    pendingPopup,
    isSeen: (id: string) => list.find((item) => item.bannerId === id)?.seen === true,
    markSeen,
  };
}
