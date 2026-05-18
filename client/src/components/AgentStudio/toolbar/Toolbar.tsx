import { Save, Play, History, ArrowLeft, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import { hasBlockingErrors } from '../canvas/validation';
import { cn } from '~/utils';

export default function Toolbar() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { state, dispatch } = useFlowContext();

  const canRun = !hasBlockingErrors(state.validationErrors);
  const canSave = !state.saving;

  const handleSave = () => {
    if (!canSave) return;
    dispatch({ type: 'SET_SAVING', payload: true });
    // TODO(tech-stream): PUT /flows/:flowId with nodes/edges, then dispatch SET_SAVING false
  };

  return (
    <header
      role="banner"
      className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border-light bg-surface-primary px-4"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/c/new')}
          className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
          aria-label="Voltar ao chat"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          type="text"
          value={state.flowName}
          onChange={(e) => dispatch({ type: 'SET_FLOW_NAME', payload: e.target.value })}
          placeholder={localize('com_studio_flow_name_placeholder')}
          aria-label={localize('com_studio_flow_name_placeholder')}
          className="w-48 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none focus:ring-1 focus:ring-ring-primary"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_RUNS' })}
          aria-pressed={state.runsOpen}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover',
            state.runsOpen && 'border-border-medium bg-surface-hover text-text-primary',
          )}
        >
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          {localize('com_studio_flow_history_button')}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={localize('com_studio_flow_save_button')}
        >
          {state.saving ? (
            <Loader className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {localize('com_studio_flow_save_button')}
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_RUN_MODAL' })}
          disabled={!canRun}
          aria-label={localize('com_studio_flow_run_button')}
          aria-disabled={!canRun}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            canRun
              ? 'bg-surface-submit text-white hover:bg-surface-submit-hover'
              : 'cursor-not-allowed bg-surface-submit/40 text-white/60',
          )}
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {localize('com_studio_flow_run_button')}
        </button>
      </div>
    </header>
  );
}
