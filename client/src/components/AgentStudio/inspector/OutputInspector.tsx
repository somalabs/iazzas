import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import { FieldGroup, FieldLabel, FieldHint, InspectorInput, InspectorTextarea } from './shared';
import type { OutputNodeData } from 'librechat-data-provider';

export default function OutputInspector({ nodeId, data }: { nodeId: string; data: OutputNodeData }) {
  const localize = useLocalize();
  const { dispatch } = useFlowContext();

  const update = (patch: Partial<OutputNodeData>) =>
    dispatch({ type: 'UPDATE_NODE_DATA', payload: { id: nodeId, data: patch } });

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        <FieldLabel htmlFor={`output-label-${nodeId}`}>
          {localize('com_studio_flow_output_label_label')}
        </FieldLabel>
        <InspectorInput
          id={`output-label-${nodeId}`}
          value={data.label ?? ''}
          onChange={(v) => update({ label: v || undefined })}
          placeholder="Saída"
        />
        <FieldHint>{localize('com_studio_flow_output_label_hint')}</FieldHint>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`output-template-${nodeId}`}>
          {localize('com_studio_flow_output_template_label')}
        </FieldLabel>
        <InspectorTextarea
          id={`output-template-${nodeId}`}
          value={data.template ?? ''}
          onChange={(v) => update({ template: v || undefined })}
          placeholder="Resultado: {{nodeId.output}}"
          rows={4}
        />
        <FieldHint>{localize('com_studio_flow_output_template_hint')}</FieldHint>
      </FieldGroup>
    </div>
  );
}
