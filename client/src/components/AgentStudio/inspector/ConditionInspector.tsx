import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import { FieldGroup, FieldLabel, FieldHint, InspectorTextarea } from './shared';
import type { ConditionNodeData } from 'librechat-data-provider';

export default function ConditionInspector({
  nodeId,
  data,
}: {
  nodeId: string;
  data: ConditionNodeData;
}) {
  const localize = useLocalize();
  const { dispatch } = useFlowContext();

  const update = (patch: Partial<ConditionNodeData>) =>
    dispatch({ type: 'UPDATE_NODE_DATA', payload: { id: nodeId, data: patch } });

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        <FieldLabel htmlFor={`cond-criterio-${nodeId}`}>
          {localize('com_studio_flow_condition_criterio_label')}
        </FieldLabel>
        <InspectorTextarea
          id={`cond-criterio-${nodeId}`}
          value={data.criterio ?? ''}
          onChange={(v) => update({ criterio: v })}
          placeholder={localize('com_studio_flow_condition_criterio_placeholder')}
        />
        <FieldHint>{localize('com_studio_flow_condition_criterio_hint')}</FieldHint>
      </FieldGroup>

      <div className="rounded-lg border border-border-light bg-surface-secondary p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          {localize('com_studio_flow_condition_outputs_title')}
        </p>
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            {localize('com_studio_flow_condition_edge_true')}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
            {localize('com_studio_flow_condition_edge_false')}
          </span>
        </div>
      </div>
    </div>
  );
}
