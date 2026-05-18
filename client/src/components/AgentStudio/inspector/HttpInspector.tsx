import { Plus, Trash2 } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useFlowContext } from '../context';
import { FieldGroup, FieldLabel, FieldHint, InspectorInput, InspectorSelect, InspectorTextarea } from './shared';
import type { HttpNodeData, HttpMethod, HttpHeader } from 'librechat-data-provider';

const METHODS: { value: HttpMethod; label: string }[] = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

export default function HttpInspector({ nodeId, data }: { nodeId: string; data: HttpNodeData }) {
  const localize = useLocalize();
  const { dispatch } = useFlowContext();

  const update = (patch: Partial<HttpNodeData>) =>
    dispatch({ type: 'UPDATE_NODE_DATA', payload: { id: nodeId, data: patch } });

  const addHeader = () =>
    update({ headers: [...data.headers, { key: '', value: '' }] });

  const updateHeader = (i: number, patch: Partial<HttpHeader>) => {
    const headers = data.headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h));
    update({ headers });
  };

  const removeHeader = (i: number) =>
    update({ headers: data.headers.filter((_, idx) => idx !== i) });

  const showBody = ['POST', 'PUT', 'PATCH'].includes(data.method);

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup>
        <FieldLabel htmlFor={`http-method-${nodeId}`}>
          {localize('com_studio_flow_http_method_label')}
        </FieldLabel>
        <InspectorSelect
          id={`http-method-${nodeId}`}
          value={data.method}
          onChange={(v) => update({ method: v })}
          options={METHODS}
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor={`http-url-${nodeId}`}>
          {localize('com_studio_flow_http_url_label')}
        </FieldLabel>
        <InspectorInput
          id={`http-url-${nodeId}`}
          value={data.url}
          onChange={(v) => update({ url: v })}
          placeholder="https://api.example.com/endpoint"
        />
        <FieldHint>{localize('com_studio_flow_http_url_hint')}</FieldHint>
      </FieldGroup>

      <FieldGroup>
        <div className="mb-2 flex items-center justify-between">
          <FieldLabel>{localize('com_studio_flow_http_headers_label')}</FieldLabel>
          <button
            type="button"
            onClick={addHeader}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            aria-label={localize('com_studio_flow_http_headers_add')}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {localize('com_studio_flow_http_headers_add')}
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {data.headers.map((h, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={h.key}
                onChange={(e) => updateHeader(i, { key: e.target.value })}
                placeholder="Header"
                aria-label={`Header ${i + 1} nome`}
                className="w-2/5 rounded border border-border-medium bg-surface-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ring-primary"
              />
              <input
                value={h.value}
                onChange={(e) => updateHeader(i, { value: e.target.value })}
                placeholder="Valor"
                aria-label={`Header ${i + 1} valor`}
                className="flex-1 rounded border border-border-medium bg-surface-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-ring-primary"
              />
              <button
                type="button"
                onClick={() => removeHeader(i)}
                aria-label={`Remover header ${i + 1}`}
                className="rounded p-1 text-text-tertiary hover:text-text-destructive"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </FieldGroup>

      {showBody && (
        <FieldGroup>
          <FieldLabel htmlFor={`http-body-${nodeId}`}>
            {localize('com_studio_flow_http_body_label')}
          </FieldLabel>
          <InspectorTextarea
            id={`http-body-${nodeId}`}
            value={data.body ?? ''}
            onChange={(v) => update({ body: v || undefined })}
            placeholder='{"key": "{{trigger.input}}"}'
            rows={4}
          />
          <FieldHint>{localize('com_studio_flow_http_body_hint')}</FieldHint>
        </FieldGroup>
      )}

      <FieldGroup>
        <FieldLabel htmlFor={`http-timeout-${nodeId}`}>
          {localize('com_studio_flow_http_timeout_label')}
        </FieldLabel>
        <InspectorInput
          id={`http-timeout-${nodeId}`}
          value={String(data.timeout)}
          onChange={(v) => {
            const n = parseInt(v, 10);
            if (!Number.isNaN(n) && n > 0) update({ timeout: Math.min(n, 60000) });
          }}
          placeholder="10000"
        />
      </FieldGroup>
    </div>
  );
}
