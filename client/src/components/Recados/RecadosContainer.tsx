import { useRecoilState } from 'recoil';
import RecadosInbox from './RecadosInbox';
import RecadosPopup from './RecadosPopup';
import store from '~/store';

export default function RecadosContainer() {
  const [inboxOpen, setInboxOpen] = useRecoilState<boolean>(store.recadosInboxOpen);

  return (
    <>
      <RecadosPopup />
      <RecadosInbox open={inboxOpen} onOpenChange={setInboxOpen} />
    </>
  );
}
