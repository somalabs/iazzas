import { cn } from '~/utils';

export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary"
    >
      {children}
    </label>
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[10px] text-text-tertiary">{children}</p>;
}

export function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col', className)}>{children}</div>;
}

export function InspectorInput({
  id,
  value,
  onChange,
  placeholder,
  readOnly,
  className,
}: {
  id?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <input
      id={id}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-ring-primary focus:outline-none focus:ring-1 focus:ring-ring-primary',
        readOnly && 'cursor-default opacity-60',
        className,
      )}
    />
  );
}

export function InspectorTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-lg border border-border-medium bg-surface-primary px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-tertiary focus:border-ring-primary focus:outline-none focus:ring-1 focus:ring-ring-primary"
    />
  );
}

export function InspectorSelect<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-1.5 text-xs text-text-primary focus:border-ring-primary focus:outline-none focus:ring-1 focus:ring-ring-primary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
