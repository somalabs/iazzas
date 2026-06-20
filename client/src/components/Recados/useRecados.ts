import { useCallback, useMemo } from 'react';
import type { TBanner } from 'librechat-data-provider';
import { useGetBannersQuery, useMarkBannerSeenMutation } from '~/data-provider';

/**
 * @param popupSince Timestamp (ms) marking the start of the current visit. A recado only
 * becomes a pop-up if it was created before this moment — recados launched while the user
 * is already in the app go to the mural silently and only pop up on the next visit (login or
 * reload) if still unread. Omit to opt out of pop-up evaluation (mural/badge consumers).
 *
 * The "seen" state is tracked server-side per user (`recado.seen`), so a pop-up appears at
 * most once per user regardless of device, browser, or cleared local storage.
 */
export default function useRecados(popupSince?: number) {
  const { data: recados } = useGetBannersQuery();
  const { mutate: markSeenMutate } = useMarkBannerSeenMutation();

  const list = useMemo<TBanner[]>(() => recados ?? [], [recados]);

  const unreadCount = useMemo(
    () => list.reduce((count, recado) => (recado.seen === true ? count : count + 1), 0),
    [list],
  );

  const pendingPopup = useMemo<TBanner | undefined>(() => {
    if (popupSince == null) {
      return undefined;
    }
    return list.find(
      (recado) =>
        recado.type === 'popup' &&
        recado.seen !== true &&
        new Date(recado.createdAt).getTime() < popupSince,
    );
  }, [list, popupSince]);

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
