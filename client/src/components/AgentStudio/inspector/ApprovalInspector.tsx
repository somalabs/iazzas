import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import { FieldGroup, FieldLabel, FieldHint, InspectorInput, InspectorTextarea } from './shared';
import type { HumanApprovalNodeData } from 'librechat-data-provider';

export default function ApprovalInspector({
  nodeId,
  data,
}: {
  nodeId: string;
  data: HumanApprovalNodeData;
}) {
  const localize = useLocalize();
  const { dispatch } = useFlowContext();

  const update = (patch: Partial<HumanApprovalNodeData>) =>
    dispatch({ type: 'UPDATE_NODE_DATA', payload: { id: nodeId, data: patch } });

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        <FieldLabel htmlFor={`approval-prompt-${nodeId}`}>
          {localize('com_studio_flow_approval_prompt_label')}
        </FieldLabel>
        <InspectorTextarea
          id={`approval-prompt-${nodeId}`}
          value={data.prompt}
          onChange={(v) => update({ prompt: v })}
          placeholder="Aprovar execução para {{trigger.input}}?"
          rows={3}
        />
        <FieldHint>{localize('com_studio_flow_approval_prompt_hint')}</FieldHint>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`approval-role-${nodeId}`}>
          {localize('com_studio_flow_approval_role_label')}
        </FieldLabel>
        {/* TODO(tech-stream): replace with role dropdown listing tenant roles */}
        <InspectorInput
          id={`approval-role-${nodeId}`}
          value={data.assigneeRole ?? ''}
          onChange={(v) => update({ assigneeRole: v || undefined })}
          placeholder="admin"
        />
        <FieldHint>{localize('com_studio_flow_approval_role_hint')}</FieldHint>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`approval-timeout-${nodeId}`}>
          {localize('com_studio_flow_approval_timeout_label')}
        </FieldLabel>
        <InspectorInput
          id={`approval-timeout-${nodeId}`}
          value={data.timeoutHours != null ? String(data.timeoutHours) : ''}
          onChange={(v) => {
            if (v === '') { update({ timeoutHours: undefined }); return; }
            const n = parseInt(v, 10);
            if (!Number.isNaN(n) && n > 0) update({ timeoutHours: n });
          }}
          placeholder="24"
        />
      </FieldGroup>

      <div className="rounded-lg border border-border-light bg-surface-secondary p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          Saídas
        </p>
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            Aprovado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
            Rejeitado
          </span>
        </div>
      </div>
    </div>
  );
}
