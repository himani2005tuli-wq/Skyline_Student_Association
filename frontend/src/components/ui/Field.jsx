import { forwardRef } from 'react';

const base =
  'w-full rounded-xl border bg-white px-4 text-sm text-ink placeholder:text-ink/35 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60';

export const Label = ({ children, htmlFor, hint }) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 flex items-baseline justify-between text-[13px] font-semibold text-ink"
  >
    <span>{children}</span>
    {hint && (
      <span className="font-mono text-[10px] font-normal uppercase tracking-wider text-ink/40">
        {hint}
      </span>
    )}
  </label>
);

export const Input = forwardRef(function Input({ error, className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`h-11 ${error ? 'border-danger' : 'border-ink/15'} ${base} ${className}`}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ error, className = '', ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={`min-h-24 py-2.5 ${error ? 'border-danger' : 'border-ink/15'} ${base} ${className}`}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select(
  { error, className = '', children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`h-11 appearance-none ${error ? 'border-danger' : 'border-ink/15'} ${base} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div data-testid={rest_testid(htmlFor)}>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {error && (
        <p
          role="alert"
          className="mt-1.5 text-xs font-medium text-danger"
          data-testid={`${htmlFor}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
const rest_testid = (htmlFor) => (htmlFor ? `${htmlFor}-field` : undefined);
