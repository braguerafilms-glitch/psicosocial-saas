import type { HTMLAttributes } from "react";

type Variant = "default" | "success" | "warning" | "danger" | "muted";

type Props = HTMLAttributes<HTMLSpanElement> & { variant?: Variant };

const map: Record<Variant, string> = {
  default:  "bg-accent/15 text-accent ring-1 ring-accent/20",
  success:  "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/20",
  warning:  "bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/20",
  danger:   "bg-red-500/12 text-red-300 ring-1 ring-red-500/20",
  muted:    "bg-surface text-muted ring-1 ring-border",
};

export function Badge({ className = "", variant = "default", children, ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ${map[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
