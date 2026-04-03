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
  return "HSE Core";
}

export function DashboardHeader({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const label = getLabel(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-surface/80 px-4 backdrop-blur-sm md:px-6">
      {/* Brand mark on mobile, page label on desktop */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 md:hidden">
          <svg className="h-3 w-3 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      </div>

      {/* Company pill: hidden on mobile to save space */}
      <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 md:flex">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        <span className="text-xs text-muted">{companyName}</span>
      </div>
    </header>
  );
}
