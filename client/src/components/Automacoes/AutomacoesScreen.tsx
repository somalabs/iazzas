import { ArrowLeft } from 'lucide-react';
import { useToastContext, useMediaQuery } from '@librechat/client';
import {
  useAutomationsQuery,
  useAutomationRunsQuery,
  useToggleAutomationMutation,
  useRunAutomationMutation,
  useDeleteAutomationMutation,
} from '~/data-provider';
import { useGoToNewChat, useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { AutomacoesProvider, useAutomacoesContext } from './context';
import AutomationList from './AutomationList';
import AutomationEditor from './AutomationEditor';
import RunsDrawer from './RunsDrawer';
import { toAutomationRun } from './runMapper';
import type { Automation, AutomationRun } from './context';

function EmptyEditorState() {
  const localize = useLocalize();
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-sm text-text-tertiary">{localize('com_automacoes_select_or_create')}</p>
    </div>
  );
}

function AutomacoesView() {
  const localize = useLocalize();
  const goToNewChat = useGoToNewChat();
  const { showToast } = useToastContext();
  const { state, dispatch } = useAutomacoesContext();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const canCreate = true;

  const { data: automationsData } = useAutomationsQuery();
  const automations: Automation[] = automationsData?.automations ?? [];

  const { data: runsData } = useAutomationRunsQuery(state.runsAutomationId ?? '');
  const runs: AutomationRun[] = (runsData?.runs ?? []).map((r) =>
    toAutomationRun(r, state.runsAutomationId ?? ''),
  );

  const toggleMutation = useToggleAutomationMutation();
  const runMutation = useRunAutomationMutation();
  const deleteMutation = useDeleteAutomationMutation();

  const selectedAutomation = automations.find((a) => a._id === state.selectedId);
  const runsAutomation = automations.find((a) => a._id === state.runsAutomationId);

  const handleSaved = () => {
    dispatch({ type: 'CANCEL' });
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    toggleMutation.mutate(
      { id, enabled },
      {
        onError: () =>
          showToast({ message: localize('com_automacoes_save_error'), status: 'error' }),
      },
    );
  };

  const handleRunNow = (id: string) => {
    runMutation.mutate(
      { id },
      {
        onSuccess: () =>
          showToast({ message: localize('com_automacoes_run_triggered'), status: 'success' }),
        onError: () =>
          showToast({ message: localize('com_automacoes_run_trigger_error'), status: 'error' }),
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        showToast({ message: localize('com_automacoes_delete_success'), status: 'success' });
        if (state.selectedId === id) {
          dispatch({ type: 'CANCEL' });
        }
      },
      onError: () => showToast({ message: localize('com_automacoes_save_error'), status: 'error' }),
    });
  };

  const showEditor = state.isCreating || !!state.selectedId;

  const backToList = isMobile && showEditor;

  return (
    <div className="flex h-full flex-col">
      <header
        role="banner"
        className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border-light bg-surface-primary px-4"
      >
        <button
          type="button"
          onClick={() => (backToList ? dispatch({ type: 'CANCEL' }) : goToNewChat())}
          className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
          aria-label={backToList ? localize('com_automacoes_back_to_list') : 'Voltar ao chat'}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <h1 className="text-sm font-semibold text-text-primary">
          {localize('com_automacoes_page_title')}
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {(!isMobile || !showEditor) && (
          <AutomationList
            automations={automations}
            selectedId={state.selectedId}
            canCreate={canCreate}
            onSelect={(id) => dispatch({ type: 'SELECT', payload: id })}
            onCreate={() => dispatch({ type: 'CREATE' })}
            onToggleEnabled={handleToggleEnabled}
            onRunNow={handleRunNow}
            onDelete={handleDelete}
            onOpenRuns={(id) => dispatch({ type: 'OPEN_RUNS', payload: id })}
            className={cn(isMobile && 'w-full flex-1 border-r-0')}
          />
        )}

        {(!isMobile || showEditor) && (
          <main className="flex flex-1 flex-col overflow-hidden" aria-label="Editor de automação">
            {showEditor ? (
              <AutomationEditor
                automation={selectedAutomation}
                onSaved={handleSaved}
                onCancel={() => dispatch({ type: 'CANCEL' })}
              />
            ) : (
              <EmptyEditorState />
            )}
          </main>
        )}

        {state.runsAutomationId && (
          <RunsDrawer
            automationName={runsAutomation?.name}
            runs={runs}
            onClose={() => dispatch({ type: 'CLOSE_RUNS' })}
          />
        )}
      </div>
    </div>
  );
}

export default function AutomacoesScreen() {
  return (
    <AutomacoesProvider>
      <AutomacoesView />
    </AutomacoesProvider>
  );
}
