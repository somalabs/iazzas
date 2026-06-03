import { Flag } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useLocalize } from '~/hooks';
import { BaseNode } from './shared';
import type { OutputNodeData } from 'librechat-data-provider';

export default function OutputNode({ id, selected, data }: NodeProps) {
  const localize = useLocalize();
  const d = (data ?? {}) as OutputNodeData;

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        id="default"
        aria-label="Entrada da Saída"
        className="!h-3 !w-3 !rounded-full !border-2 !border-border-medium !bg-surface-primary"
      />
      <BaseNode
        id={id}
        selected={selected}
        icon={<Flag className="h-3.5 w-3.5" />}
        label={localize('com_studio_flow_node_output')}
      >
        <p className="truncate text-text-secondary">
          {d.label || localize('com_studio_flow_node_output_desc')}
        </p>
      </BaseNode>
    </div>
  );
}
