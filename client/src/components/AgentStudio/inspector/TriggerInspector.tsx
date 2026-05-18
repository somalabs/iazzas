import { useLocalize } from '~/hooks';
import { FieldGroup, FieldLabel, FieldHint, InspectorInput } from './shared';
import type { TriggerNodeData } from 'librechat-data-provider';

export default function TriggerInspector({ data }: { data: TriggerNodeData }) {
  const localize = useLocalize();

  return (
    <FieldGroup>
      <FieldLabel>{localize('com_studio_flow_trigger_input_label')}</FieldLabel>
      <InspectorInput
        value={localize('com_studio_flow_trigger_input_hint')}
        readOnly
      />
      <FieldHint>{localize('com_studio_flow_trigger_input_hint')}</FieldHint>
      {data.label && (
        <p className="mt-2 font-mono text-xs text-text-secondary">{data.label}</p>
      )}
    </FieldGroup>
  );
}
