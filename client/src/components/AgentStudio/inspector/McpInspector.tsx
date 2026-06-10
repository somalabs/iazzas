import { useMemo } from 'react';
import { useLocalize } from '~/hooks';
import { useMCPToolsQuery } from '~/data-provider';
import { useFlowContext } from '../context';
import { FieldGroup, FieldLabel, FieldHint, InspectorSelect, InspectorTextarea } from './shared';
import type { McpNodeData } from 'librechat-data-provider';

export default function McpInspector({ nodeId, data }: { nodeId: string; data: McpNodeData }) {
  const localize = useLocalize();
  const { dispatch } = useFlowContext();
  const { data: mcpData, isLoading } = useMCPToolsQuery();

  const update = (patch: Partial<McpNodeData>) =>
    dispatch({ type: 'UPDATE_NODE_DATA', payload: { id: nodeId, data: patch } });

  const serverOptions = useMemo(() => {
    const servers = mcpData?.servers ?? {};
    const options = Object.keys(servers)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
    return [{ value: '', label: localize('com_ui_select') }, ...options];
  }, [mcpData, localize]);

  const serverTools = useMemo(
    () => mcpData?.servers?.[data.serverName]?.tools ?? [],
    [mcpData, data.serverName],
  );

  const toolOptions = useMemo(() => {
    const options = serverTools.map((t) => ({ value: t.name, label: t.name }));
    return [{ value: '', label: localize('com_ui_select') }, ...options];
  }, [serverTools, localize]);

  const noToolsForServer = Boolean(data.serverName) && !isLoading && serverTools.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        <FieldLabel htmlFor={`mcp-server-${nodeId}`}>
          {localize('com_studio_flow_mcp_server_label')}
        </FieldLabel>
        <InspectorSelect
          id={`mcp-server-${nodeId}`}
          value={data.serverName}
          onChange={(v) => update({ serverName: v, toolName: '' })}
          options={serverOptions}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`mcp-tool-${nodeId}`}>
          {localize('com_studio_flow_mcp_tool_label')}
        </FieldLabel>
        <InspectorSelect
          id={`mcp-tool-${nodeId}`}
          value={data.toolName}
          onChange={(v) => update({ toolName: v })}
          options={toolOptions}
        />
        {noToolsForServer && <FieldHint>{localize('com_studio_flow_mcp_no_tools_hint')}</FieldHint>}
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`mcp-args-${nodeId}`}>
          {localize('com_studio_flow_mcp_args_label')}
        </FieldLabel>
        <InspectorTextarea
          id={`mcp-args-${nodeId}`}
          value={data.args ?? ''}
          onChange={(v) => update({ args: v || undefined })}
          placeholder='{"query": "{{trigger.input}}"}'
          rows={5}
        />
        <FieldHint>{localize('com_studio_flow_mcp_args_hint')}</FieldHint>
      </FieldGroup>
    </div>
  );
}
