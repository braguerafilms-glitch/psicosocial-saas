import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...rest }: Props) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-6 shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...rest }: Props) {
  return (
    <div className={`mb-5 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...rest }: Props) {
  return (
    <h3 className={`text-sm font-semibold uppercase tracking-wider text-muted ${className}`} {...rest}>
      {children}
    </h3>
  );
}
