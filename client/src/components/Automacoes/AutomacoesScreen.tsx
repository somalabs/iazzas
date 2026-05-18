import { memo } from 'react';
import { CalendarClock } from 'lucide-react';
import { useLocalize } from '~/hooks';

/**
 * Placeholder screen for the Automações destination.
 *
 * The full Automações feature (scheduler, repository, RBAC) is delivered on the
 * separate `agentes/LEM-34` branch and is not part of this UX revision (LEM-52).
 * This route exists so the new sidebar destination (Área 1) navigates without a
 * 404; LEM-34 replaces this component with the real screen on merge.
 */
function AutomacoesScreen() {
  const localize = useLocalize();

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center"
      role="status"
    >
      <CalendarClock className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-text-primary">
        {localize('com_ui_ux_automacoes_titulo')}
      </h1>
      <p className="text-sm text-text-secondary">{localize('com_ui_ux_automacoes_em_breve')}</p>
    </div>
  );
}

export default memo(AutomacoesScreen);
