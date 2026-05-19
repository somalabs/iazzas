import { Save, Play, History, ArrowLeft, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '@librechat/client';
import type { TranslationKeys } from '~/hooks';
import { useLocalize } from '~/hooks';
import { useCreateFlowMutation, useUpdateFlowMutation } from '~/data-provider';
import { useFlowContext } from '../context';
import { serializeNodes, serializeEdges } from '../serialize';
import { hasBlockingErrors } from '../canvas/validation';
import { cn } from '~/utils';

export default function Toolbar() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { state, dispatch } = useFlowContext();

  const { showToast } = useToastContext();
  const createFlow = useCreateFlowMutation();
  const updateFlow = useUpdateFlowMutation();

  const validationBlocked = hasBlockingErrors(state.validationErrors);
  const canRun = !validationBlocked && !!state.flowId;
  const canSave = !state.saving && !validationBlocked;

  const handleSave = () => {
    if (!canSave) {
      return;
    }
    dispatch({ type: 'SET_SAVING', payload: true });
    const payload = {
      name: state.flowName.trim() || localize('com_studio_flow_name_placeholder'),
      nodes: serializeNodes(state.nodes),
      edges: serializeEdges(state.edges),
    };
    const onSuccess = (flowId: string, name: string) => {
      dispatch({
        type: 'SET_FLOW',
        payload: { id: flowId, name, nodes: state.nodes, edges: state.edges },
      });
      dispatch({ type: 'SET_SAVING', payload: false });
      showToast({ message: localize('com_studio_flow_save_success'), status: 'success' });
    };
    const onError = (error: unknown) => {
      dispatch({ type: 'SET_SAVING', payload: false });
      const details = (error as { response?: { data?: { details?: Array<{ code: string }> } } })
        ?.response?.data?.details;
      const firstCode = Array.isArray(details) && details.length > 0 ? details[0].code : null;
      const msgKey = firstCode ? `com_studio_flow_run_error_${firstCode}` : null;
      showToast({
        message: msgKey
          ? localize(msgKey as TranslationKeys)
          : localize('com_studio_flow_save_error'),
        status: 'error',
      });
    };
    if (state.flowId) {
      updateFlow.mutate(
        { id: state.flowId, data: payload },
        { onSuccess: (res) => onSuccess(res.flow._id, res.flow.name), onError },
      );
    } else {
      createFlow.mutate(payload, {
        onSuccess: (res) => onSuccess(res.flow._id, res.flow.name),
        onError,
      });
    }
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
          aria-label={localize('com_studio_flow_back')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="select-none text-sm font-semibold text-text-primary">
          {localize('com_studio_flow_title')}
        </span>
        <span className="text-text-tertiary" aria-hidden="true">
          /
        </span>
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
          title={validationBlocked ? localize('com_studio_flow_error_save_blocked') : undefined}
          className="flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={localize('com_studio_flow_save_button')}
          aria-disabled={!canSave}
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
              : 'bg-surface-submit/40 cursor-not-allowed text-white/60',
          )}
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {localize('com_studio_flow_run_button')}
        </button>
      </div>
    </header>
  );
}
