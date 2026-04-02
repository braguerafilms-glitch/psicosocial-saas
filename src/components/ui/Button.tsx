import { forwardRef, type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className = "", variant = "primary", size = "md", loading, disabled, children, ...rest }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40 select-none";

    const sizes = size === "sm"
      ? "rounded-md px-3 py-1.5 text-xs gap-1.5"
      : "rounded-lg px-4 py-2 text-sm gap-2";

    const styles =
      variant === "primary"
        ? "bg-accent text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:brightness-110 active:brightness-95"
        : variant === "secondary"
          ? "border border-border bg-card text-foreground shadow-card hover:bg-surface hover:border-border/80 active:scale-[0.98]"
          : variant === "danger"
            ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 active:scale-[0.98]"
            : "text-muted hover:text-foreground hover:bg-card active:scale-[0.98]";

    return (
      <button
        ref={ref}
        className={`${base} ${sizes} ${styles} ${className}`}
        disabled={disabled || loading}
        aria-busy={loading}
        {...rest}
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            <span>Carregando</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
