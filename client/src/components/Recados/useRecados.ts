import { useCallback, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import type { TBanner } from 'librechat-data-provider';
import { useGetBannersQuery } from '~/data-provider';
import store from '~/store';

/**
 * @param popupSince Timestamp (ms) marking the start of the current visit. A recado only
 * becomes a pop-up if it was created before this moment — recados launched while the user
 * is already in the app go to the mural silently and only pop up on the next visit (login or
 * reload) if still unread. Omit to opt out of pop-up evaluation (mural/badge consumers).
 */
export default function useRecados(popupSince?: number) {
  const { data: recados } = useGetBannersQuery();
  const [seen, setSeen] = useRecoilState<string[]>(store.recadosSeen);

  const seenSet = useMemo(() => new Set(seen), [seen]);

  const list = useMemo<TBanner[]>(() => recados ?? [], [recados]);

  const unreadCount = useMemo(
    () => list.reduce((count, recado) => (seenSet.has(recado.bannerId) ? count : count + 1), 0),
    [list, seenSet],
  );

  const pendingPopup = useMemo<TBanner | undefined>(() => {
    if (popupSince == null) {
      return undefined;
    }
    return list.find(
      (recado) =>
        recado.type === 'popup' &&
        !seenSet.has(recado.bannerId) &&
        new Date(recado.createdAt).getTime() < popupSince,
    );
  }, [list, seenSet, popupSince]);

  const markSeen = useCallback(
    (bannerId: string) => {
      setSeen((prev) => (prev.includes(bannerId) ? prev : [...prev, bannerId]));
    },
    [setSeen],
  );

  return { list, unreadCount, pendingPopup, isSeen: (id: string) => seenSet.has(id), markSeen };
}
