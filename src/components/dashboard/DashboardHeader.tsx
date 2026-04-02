"use client";

import { usePathname } from "next/navigation";

const PAGE_LABELS: Record<string, string> = {
  "/":           "Dashboard",
  "/companies":  "Empresas",
  "/campaigns":  "Campanhas",
  "/settings":   "Configurações",
};

function getLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  if (pathname.startsWith("/companies/new")) return "Nova empresa";
  if (pathname.startsWith("/campaigns/new")) return "Nova campanha";
  if (pathname.includes("/report")) return "Relatório";
  if (pathname.startsWith("/campaigns/")) return "Detalhes da campanha";
  if (pathname.startsWith("/companies/")) return "Detalhes da empresa";
  return "";
}

export function DashboardHeader({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const label = getLabel(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-surface/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {label ? (
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        ) : null}
      </div>
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        <span className="text-xs text-muted">{companyName}</span>
      </div>
    </header>
  );
}
