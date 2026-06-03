import { memo } from 'react';
import FontSizeSelector from './FontSizeSelector';
import ToggleSwitch from '../ToggleSwitch';
import store from '~/store';

// Reduzido (LEM-88): só os controles de chat que importam pro usuário de moda.
// Os toggles de dev (LaTeX, direção ltr, "novas versões produção", fork, etc.)
// foram removidos da UI — o estado segue no store com seu default.
const toggleSwitchConfigs = [
  {
    stateAtom: store.enterToSend,
    localizationKey: 'com_nav_enter_to_send' as const,
    switchId: 'enterToSend',
    hoverCardText: 'com_nav_info_enter_to_send' as const,
    key: 'enterToSend',
  },
  {
    stateAtom: store.maximizeChatSpace,
    localizationKey: 'com_nav_maximize_chat_space' as const,
    switchId: 'maximizeChatSpace',
    hoverCardText: undefined,
    key: 'maximizeChatSpace',
  },
];

function Chat() {
  return (
    <div className="flex flex-col gap-3 p-1 text-sm text-text-primary">
      <div className="pb-3">
        <FontSizeSelector />
      </div>
      {toggleSwitchConfigs.map((config) => (
        <div key={config.key} className="pb-3">
          <ToggleSwitch
            stateAtom={config.stateAtom}
            localizationKey={config.localizationKey}
            hoverCardText={config.hoverCardText}
            switchId={config.switchId}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(Chat);
