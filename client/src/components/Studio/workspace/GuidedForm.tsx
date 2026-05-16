import { useStudio, useStudioDispatch } from '../context';
import type { StudioFormField } from 'librechat-data-provider';
import { cn } from '~/utils';

function TextField({ field, value, onChange }: {
  field: StudioFormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const baseClass = 'rounded-lg border border-border-medium bg-surface-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-heavy focus:outline-none';
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">
        {field.label}
        {field.required && <span className="ml-1 text-text-destructive">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          rows={3}
          className={cn(baseClass, 'resize-none')}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          className={baseClass}
        />
      )}
    </div>
  );
}

function SelectField({ field, value, onChange }: {
  field: StudioFormField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">
        {field.label}
        {field.required && <span className="ml-1 text-text-destructive">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border-medium bg-surface-tertiary px-3 py-2 text-sm text-text-primary focus:border-border-heavy focus:outline-none"
      >
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ field, value, onChange }: {
  field: StudioFormField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-secondary">{field.label}</label>
      <div className="flex rounded-lg border border-border-medium bg-surface-tertiary p-0.5">
        {field.options?.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              value === opt.value
                ? 'bg-surface-primary text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BooleanField({ field, value, onChange }: {
  field: StudioFormField;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <div
        role="checkbox"
        aria-checked={value}
        tabIndex={0}
        onClick={() => onChange(!value)}
        onKeyDown={(e) => e.key === ' ' && onChange(!value)}
        className={cn(
          'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
          value
            ? 'border-ring-primary bg-ring-primary'
            : 'border-border-medium bg-surface-tertiary',
        )}
      >
        {value && (
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-text-secondary">{field.label}</span>
      {field.description && (
        <span className="text-xs text-text-tertiary">— {field.description}</span>
      )}
    </label>
  );
}

export default function GuidedForm() {
  const { activeSchema, formValues } = useStudio();
  const dispatch = useStudioDispatch();

  if (!activeSchema) return null;

  function handleChange(id: string, value: string | boolean) {
    dispatch({ type: 'SET_FORM_VALUE', payload: { id, value } });
  }

  return (
    <div className="flex flex-col gap-3">
      {activeSchema.formFields.map((field) => {
        const rawValue = formValues[field.id];

        if (field.type === 'select') {
          return (
            <SelectField
              key={field.id}
              field={field}
              value={(rawValue as string) ?? (field.default as string) ?? ''}
              onChange={(v) => handleChange(field.id, v)}
            />
          );
        }
        if (field.type === 'toggle') {
          return (
            <ToggleField
              key={field.id}
              field={field}
              value={(rawValue as string) ?? (field.default as string) ?? ''}
              onChange={(v) => handleChange(field.id, v)}
            />
          );
        }
        if (field.type === 'boolean') {
          return (
            <BooleanField
              key={field.id}
              field={field}
              value={(rawValue as boolean) ?? (field.default as boolean) ?? false}
              onChange={(v) => handleChange(field.id, v)}
            />
          );
        }
        return (
          <TextField
            key={field.id}
            field={field}
            value={(rawValue as string) ?? ''}
            onChange={(v) => handleChange(field.id, v)}
          />
        );
      })}
    </div>
  );
}
