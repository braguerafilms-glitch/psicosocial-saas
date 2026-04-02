import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className = "", label, error, hint, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wider text-muted">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors duration-150
            ${error
              ? "border-red-500/50 focus:border-red-400 focus:ring-1 focus:ring-red-400/30"
              : "border-border focus:border-accent/70 focus:ring-1 focus:ring-accent/20"
            } ${className}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {hint && !error ? <p id={`${inputId}-hint`} className="text-xs text-muted">{hint}</p> : null}
        {error ? <p id={`${inputId}-error`} className="text-xs text-red-400" role="alert">{error}</p> : null}
      </div>
    );
  },
);

Input.displayName = "Input";
