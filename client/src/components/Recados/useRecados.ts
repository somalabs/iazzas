import { useCallback, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import type { TBanner } from 'librechat-data-provider';
import { useGetBannersQuery } from '~/data-provider';
import store from '~/store';

export default function useRecados() {
  const { data: recados } = useGetBannersQuery();
  const [seen, setSeen] = useRecoilState<string[]>(store.recadosSeen);

  const seenSet = useMemo(() => new Set(seen), [seen]);

  const list = useMemo<TBanner[]>(() => recados ?? [], [recados]);

  const unreadCount = useMemo(
    () => list.reduce((count, recado) => (seenSet.has(recado.bannerId) ? count : count + 1), 0),
    [list, seenSet],
  );

  const pendingPopup = useMemo<TBanner | undefined>(
    () => list.find((recado) => recado.type === 'popup' && !seenSet.has(recado.bannerId)),
    [list, seenSet],
  );

  const markSeen = useCallback(
    (bannerId: string) => {
      setSeen((prev) => (prev.includes(bannerId) ? prev : [...prev, bannerId]));
    },
    [setSeen],
  );

  return { list, unreadCount, pendingPopup, isSeen: (id: string) => seenSet.has(id), markSeen };
}
