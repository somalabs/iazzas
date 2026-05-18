import { UserCheck } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useLocalize } from '~/hooks';
import { BaseNode } from './shared';
import type { HumanApprovalNodeData } from 'librechat-data-provider';

export default function ApprovalNode({ id, selected, data }: NodeProps) {
  const localize = useLocalize();
  const d = data as HumanApprovalNodeData;

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        id="default"
        aria-label="Entrada da Aprovação"
        className="!h-3 !w-3 !rounded-full !border-2 !border-orange-400 !bg-surface-primary"
      />
      <BaseNode
        id={id}
        selected={selected}
        accent="orange"
        icon={<UserCheck className="h-3.5 w-3.5" />}
        label={localize('com_studio_flow_node_human_approval')}
      >
        <p className="line-clamp-2 text-text-secondary">
          {d.prompt || localize('com_studio_flow_approval_prompt_hint')}
        </p>
      </BaseNode>
      <div className="flex justify-between px-3 text-[9px]">
        <span className="text-red-400">Rejeitado</span>
        <span className="text-emerald-400">Aprovado</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="rejected"
        aria-label="Saída Rejeitado"
        style={{ left: '25%' }}
        className="!h-3 !w-3 !rounded-full !border-2 !border-red-400 !bg-surface-primary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="approved"
        aria-label="Saída Aprovado"
        style={{ left: '75%' }}
        className="!h-3 !w-3 !rounded-full !border-2 !border-emerald-400 !bg-surface-primary"
      />
    </div>
  );
}
