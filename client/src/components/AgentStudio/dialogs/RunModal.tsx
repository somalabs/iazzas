import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Play } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';

export default function RunModal() {
  const localize = useLocalize();
  const { state, dispatch } = useFlowContext();
  const [input, setInput] = useState('');

  const handleRun = () => {
    if (!input.trim()) return;
    // TODO(tech-stream): POST /flows/:flowId/run { input }
    dispatch({ type: 'TOGGLE_RUN_MODAL' });
    setInput('');
  };

  return (
    <Dialog.Root
      open={state.runModalOpen}
      onOpenChange={() => dispatch({ type: 'TOGGLE_RUN_MODAL' })}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[480px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-medium bg-surface-dialog p-6 shadow-xl"
          aria-describedby="run-modal-desc"
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-text-primary">
              {localize('com_studio_flow_run_button')}
            </Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <p id="run-modal-desc" className="mb-3 text-xs text-text-secondary">
            {localize('com_studio_flow_run_input_label')}
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={localize('com_studio_flow_run_input_placeholder')}
            rows={4}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRun();
            }}
            className="mb-4 w-full resize-none rounded-xl border border-border-medium bg-surface-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ring-primary focus:outline-none focus:ring-2 focus:ring-ring-primary"
            aria-label={localize('com_studio_flow_run_input_label')}
          />

          <div className="flex justify-end gap-2">
            <Dialog.Close className="rounded-xl border border-border-medium px-4 py-2 text-xs text-text-secondary hover:bg-surface-hover">
              Cancelar
            </Dialog.Close>
            <button
              type="button"
              onClick={handleRun}
              disabled={!input.trim()}
              className="flex items-center gap-2 rounded-xl bg-surface-submit px-4 py-2 text-xs font-medium text-white hover:bg-surface-submit-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {localize('com_studio_flow_run_button')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
