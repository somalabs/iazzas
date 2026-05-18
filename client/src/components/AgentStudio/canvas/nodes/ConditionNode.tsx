import { GitBranch } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useLocalize } from '~/hooks';
import { BaseNode } from './shared';
import type { ConditionNodeData } from 'librechat-data-provider';

export default function ConditionNode({ id, selected, data }: NodeProps) {
  const localize = useLocalize();
  const d = data as ConditionNodeData;

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        id="default"
        aria-label="Entrada da Condição"
        className="!h-3 !w-3 !rounded-full !border-2 !border-amber-400 !bg-surface-primary"
      />
      <BaseNode
        id={id}
        selected={selected}
        accent="amber"
        icon={<GitBranch className="h-3.5 w-3.5" />}
        label={localize('com_studio_flow_node_condition')}
      >
        {d.value ? (
          <p className="truncate font-mono text-[10px] text-text-secondary">
            {d.field} {d.operator} {d.value}
          </p>
        ) : (
          <p className="italic text-text-tertiary">
            {localize('com_studio_flow_condition_value_hint')}
          </p>
        )}
      </BaseNode>
      <div className="flex justify-between px-3 text-[9px]">
        <span className="text-red-400">{localize('com_studio_flow_condition_edge_false')}</span>
        <span className="text-emerald-400">{localize('com_studio_flow_condition_edge_true')}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        aria-label="Saída Falso"
        style={{ left: '25%' }}
        className="!h-3 !w-3 !rounded-full !border-2 !border-red-400 !bg-surface-primary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        aria-label="Saída Verdadeiro"
        style={{ left: '75%' }}
        className="!h-3 !w-3 !rounded-full !border-2 !border-emerald-400 !bg-surface-primary"
      />
    </div>
  );
}
