import type { TranslationKeys } from '~/hooks';
import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import { FieldGroup, FieldLabel, FieldHint, InspectorInput, InspectorSelect } from './shared';
import type { ConditionNodeData, ConditionOperator } from 'librechat-data-provider';

const OPERATORS: { value: ConditionOperator; labelKey: TranslationKeys }[] = [
  { value: 'equals', labelKey: 'com_studio_flow_condition_op_equals' },
  { value: 'contains', labelKey: 'com_studio_flow_condition_op_contains' },
  { value: 'regex', labelKey: 'com_studio_flow_condition_op_regex' },
  { value: 'jsonpath_exists', labelKey: 'com_studio_flow_condition_op_jsonpath' },
];

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
        <FieldLabel htmlFor={`cond-field-${nodeId}`}>Campo</FieldLabel>
        <InspectorInput
          id={`cond-field-${nodeId}`}
          value={data.field}
          onChange={(v) => update({ field: v })}
          placeholder="{{trigger.input}}"
        />
        <FieldHint>{localize('com_studio_flow_condition_value_hint')}</FieldHint>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`cond-op-${nodeId}`}>
          {localize('com_studio_flow_condition_operator_label')}
        </FieldLabel>
        <InspectorSelect
          id={`cond-op-${nodeId}`}
          value={data.operator}
          onChange={(v) => update({ operator: v })}
          options={OPERATORS.map((o) => ({ value: o.value, label: localize(o.labelKey) }))}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`cond-value-${nodeId}`}>
          {localize('com_studio_flow_condition_value_label')}
        </FieldLabel>
        <InspectorInput
          id={`cond-value-${nodeId}`}
          value={data.value}
          onChange={(v) => update({ value: v })}
          placeholder="{{nodeId.output}}"
        />
        <FieldHint>{localize('com_studio_flow_condition_value_hint')}</FieldHint>
      </FieldGroup>

      <div className="rounded-lg border border-border-light bg-surface-secondary p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          Saídas
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
