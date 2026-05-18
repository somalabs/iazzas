import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useHasAccess, useLocalize } from '~/hooks';
import { AutomacoesProvider, useAutomacoesContext } from './context';
import AutomationList from './AutomationList';
import AutomationEditor from './AutomationEditor';
import RunsDrawer from './RunsDrawer';
import type { Automation, AutomationRun } from './context';

function EmptyEditorState() {
  const localize = useLocalize();
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-sm text-text-tertiary">{localize('com_automacoes_empty_state')}</p>
    </div>
  );
}

function AutomacoesView() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { state, dispatch } = useAutomacoesContext();

  const canCreate = useHasAccess({
    permissionType: PermissionTypes.AUTOMATIONS,
    permission: Permissions.CREATE,
  });

  // Seam: tech stream replaces with useAutomationsQuery + useMutations
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [runs] = useState<AutomationRun[]>([]);

  const selectedAutomation = automations.find((a) => a._id === state.selectedId);
  const runsAutomation = automations.find((a) => a._id === state.runsAutomationId);

  const handleSaved = (saved: Automation) => {
    setAutomations((prev) => {
      const idx = prev.findIndex((a) => a._id === saved._id);
      return idx >= 0 ? prev.map((a, i) => (i === idx ? saved : a)) : [saved, ...prev];
    });
    dispatch({ type: 'CANCEL' });
  };

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    // Seam: tech wires PATCH /api/automacoes/:id/enabled
    setAutomations((prev) => prev.map((a) => (a._id === id ? { ...a, enabled } : a)));
  };

  const handleRunNow = (_id: string) => {
    // Seam: tech wires POST /api/automacoes/:id/run
  };

  const handleDelete = (id: string) => {
    // Seam: tech wires DELETE /api/automacoes/:id
    setAutomations((prev) => prev.filter((a) => a._id !== id));
    if (state.selectedId === id) dispatch({ type: 'CANCEL' });
  };

  const showEditor = state.isCreating || !!state.selectedId;

  return (
    <div className="flex h-full flex-col">
      <header
        role="banner"
        className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border-light bg-surface-primary px-4"
      >
        <button
          type="button"
          onClick={() => navigate('/c/new')}
          className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
          aria-label="Voltar ao chat"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <h1 className="text-sm font-semibold text-text-primary">
          {localize('com_automacoes_page_title')}
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
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
        />

        <main
          className="flex flex-1 flex-col overflow-hidden"
          aria-label="Editor de automação"
        >
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
  const navigate = useNavigate();
  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.AUTOMATIONS,
    permission: Permissions.USE,
  });

  useEffect(() => {
    if (!hasAccess) {
      const id = setTimeout(() => navigate('/c/new'), 1000);
      return () => clearTimeout(id);
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) return null;

  return (
    <AutomacoesProvider>
      <AutomacoesView />
    </AutomacoesProvider>
  );
}
