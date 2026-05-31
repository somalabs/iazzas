import { atom } from 'jotai';

/**
 * Whether the Atelier drawer is open on the Chat surface. The trigger lives in
 * the chat Header while the drawer renders in ChatView, so the open state is
 * shared via this atom rather than prop-drilled. Per-surface, not global app
 * state (other surfaces keep their own local state).
 */
export const atelierChatOpenAtom = atom<boolean>(false);
