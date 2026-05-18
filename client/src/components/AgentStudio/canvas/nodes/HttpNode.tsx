import { Globe } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useLocalize } from '~/hooks';
import { BaseNode } from './shared';
import type { HttpNodeData } from 'librechat-data-provider';

export default function HttpNode({ id, selected, data }: NodeProps) {
  const localize = useLocalize();
  const d = (data ?? {}) as HttpNodeData;

  return (
    <div className="group">
      <Handle
        type="target"
        position={Position.Top}
        id="default"
        aria-label="Entrada do HTTP"
        className="!h-3 !w-3 !rounded-full !border-2 !border-sky-400 !bg-surface-primary"
      />
      <BaseNode
        id={id}
        selected={selected}
        accent="sky"
        icon={<Globe className="h-3.5 w-3.5" />}
        label={localize('com_studio_flow_node_http')}
      >
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-sky-500/20 px-1 py-0.5 font-mono text-[9px] font-bold text-sky-300">
            {d.method || 'GET'}
          </span>
          <p className="truncate font-mono text-[10px] text-text-secondary">
            {d.url || localize('com_studio_flow_http_url_label')}
          </p>
        </div>
      </BaseNode>
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        aria-label="Saída do HTTP"
        className="!h-3 !w-3 !rounded-full !border-2 !border-sky-400 !bg-surface-primary"
      />
    </div>
  );
}
