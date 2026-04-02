import { forwardRef, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className = "", label, error, id, children, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full space-y-1">
        {label ? (
          <label htmlFor={inputId} className="text-sm text-muted">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    );
  },
);

Select.displayName = "Select";
