import { useState, useEffect } from 'react';
import { useLocalize } from '~/hooks';
import { useStudioContext } from '../context';
import { USE_CASE_SCHEMAS } from './schemas';
import type { UseCaseField } from '../types';

function Field({ field, value, onChange }: {
  field: UseCaseField;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `studio-field-${field.key}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-text-secondary">
        {field.label}
        {field.required && <span className="ml-0.5 text-text-destructive" aria-hidden="true">*</span>}
      </label>

      {field.type === 'textarea' && (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full resize-none rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none focus:ring-1 focus:ring-ring-primary"
        />
      )}

      {field.type === 'select' && (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-border-medium focus:outline-none focus:ring-1 focus:ring-ring-primary"
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {(field.type === 'text' || field.type === 'multiselect') && (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none focus:ring-1 focus:ring-ring-primary"
        />
      )}
    </div>
  );
}

export default function GuidedForm() {
  const { selectedUseCase, setPrompt } = useStudioContext();
  const [values, setValues] = useState<Record<string, string>>({});

  const schema = USE_CASE_SCHEMAS.find((s) => s.id === selectedUseCase);

  useEffect(() => {
    setValues({});
  }, [selectedUseCase]);

  useEffect(() => {
    if (!schema) return;
    const parts = schema.fields
      .filter((f) => values[f.key])
      .map((f) => `${f.label}: ${values[f.key]}`);
    if (parts.length > 0) {
      setPrompt(parts.join('. '));
    }
  }, [values, schema, setPrompt]);

  if (!schema) return null;

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col gap-3" aria-label={`${schema.label} form`}>
      {schema.fields.map((field) => (
        <Field
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          onChange={(v) => handleChange(field.key, v)}
        />
      ))}
    </div>
  );
}
