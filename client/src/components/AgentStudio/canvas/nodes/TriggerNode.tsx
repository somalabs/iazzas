import { Zap } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useLocalize } from '~/hooks';
import { BaseNode } from './shared';
import type { TriggerNodeData } from 'librechat-data-provider';

export default function TriggerNode({ id, selected, data }: NodeProps) {
  const localize = useLocalize();
  const d = (data ?? {}) as TriggerNodeData;

  return (
    <div className="group">
      <BaseNode
        id={id}
        selected={selected}
        icon={<Zap className="h-3.5 w-3.5" />}
        label={localize('com_studio_flow_node_trigger')}
      >
        <p className="line-clamp-2 font-mono text-[10px] text-text-tertiary">
          {d.label || localize('com_studio_flow_trigger_input_hint')}
        </p>
      </BaseNode>
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        aria-label="Saída do Trigger"
        className="!h-3 !w-3 !rounded-full !border-2 !border-border-medium !bg-surface-primary"
      />
    </div>
  );
}
