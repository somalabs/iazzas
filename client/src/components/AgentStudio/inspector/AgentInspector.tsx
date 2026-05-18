import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import { FieldGroup, FieldLabel, FieldHint, InspectorTextarea, InspectorInput } from './shared';
import type { AgentNodeData } from 'librechat-data-provider';

export default function AgentInspector({ nodeId, data }: { nodeId: string; data: AgentNodeData }) {
  const localize = useLocalize();
  const { dispatch } = useFlowContext();

  const update = (patch: Partial<AgentNodeData>) =>
    dispatch({ type: 'UPDATE_NODE_DATA', payload: { id: nodeId, data: patch } });

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        <FieldLabel htmlFor={`agent-id-${nodeId}`}>
          {localize('com_studio_flow_agent_id_label')}
        </FieldLabel>
        {/* TODO(tech-stream): replace with agent dropdown listing tenant agents */}
        <InspectorInput
          id={`agent-id-${nodeId}`}
          value={data.agentId}
          onChange={(v) => update({ agentId: v })}
          placeholder={localize('com_studio_flow_agent_id_placeholder')}
        />
        {data.agentName && (
          <p className="mt-1 text-xs font-medium text-text-primary">{data.agentName}</p>
        )}
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`agent-instructions-${nodeId}`}>
          {localize('com_studio_flow_agent_instructions_label')}
        </FieldLabel>
        <InspectorTextarea
          id={`agent-instructions-${nodeId}`}
          value={data.instructionsOverride ?? ''}
          onChange={(v) => update({ instructionsOverride: v || undefined })}
          placeholder="{{trigger.input}}"
        />
        <FieldHint>{localize('com_studio_flow_agent_instructions_hint')}</FieldHint>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`agent-model-${nodeId}`}>
          {localize('com_studio_flow_agent_model_label')}
        </FieldLabel>
        <InspectorInput
          id={`agent-model-${nodeId}`}
          value={data.modelOverride ?? ''}
          onChange={(v) => update({ modelOverride: v || undefined })}
          placeholder="gpt-4o"
        />
        <FieldHint>{localize('com_studio_flow_agent_model_hint')}</FieldHint>
      </FieldGroup>
    </div>
  );
}
