import { atom } from 'jotai';
import { SettingsTabValues } from 'librechat-data-provider';

/**
 * When set to a tab value, the account Settings dialog opens on that tab.
 * Consumed and reset to null by AccountSettings. Lets sibling widgets
 * (e.g. BalanceWidget) request the Settings dialog without prop drilling.
 */
export const openSettingsTabAtom = atom<SettingsTabValues | null>(null);
