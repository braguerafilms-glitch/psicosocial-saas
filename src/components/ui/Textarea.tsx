import { forwardRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className = "", label, error, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wider text-muted">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          className={`min-h-[100px] w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors duration-150 resize-y
            ${error
              ? "border-red-500/50 focus:border-red-400 focus:ring-1 focus:ring-red-400/30"
              : "border-border focus:border-accent/70 focus:ring-1 focus:ring-accent/20"
            } ${className}`}
          aria-invalid={error ? "true" : undefined}
          {...rest}
        />
        {error ? <p className="text-xs text-red-400" role="alert">{error}</p> : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
