import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { Badge } from "@/components/ui/Badge";
import type { CampaignStatus } from "@/types";

function statusBadge(status: CampaignStatus) {
  if (status === "active") return <Badge variant="success">Ativa</Badge>;
  if (status === "draft") return <Badge variant="muted">Rascunho</Badge>;
  if (status === "closed") return <Badge variant="warning">Encerrada</Badge>;
  return <Badge variant="default">Relatório</Badge>;
}

const STAT_META = [
  {
    key: "companies",
    label: "Empresas",
    href: "/companies",
    color: "#5b7fff",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    key: "active",
    label: "Campanhas ativas",
    href: "/campaigns",
    color: "#34d399",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: "responses",
    label: "Respostas coletadas",
    href: "/campaigns",
    color: "#a78bfa",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: "reports",
    label: "Relatórios gerados",
    href: "/campaigns",
    color: "#fb923c",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: engineer, error: engError } = await supabase
    .from("sst_engineers").select("id").eq("user_id", user.id).maybeSingle();

  if (engError) return <p className="text-sm text-red-400">{supabaseErrorMessage(engError, "Erro ao carregar perfil")}</p>;
  if (!engineer) return <p className="text-sm text-muted">Complete seu cadastro em Configurações para começar.</p>;

  const engineerId = engineer.id;

  const { count: companiesCount } = await supabase.from("companies").select("*", { count: "exact", head: true }).eq("engineer_id", engineerId);
  const { count: activeCampaigns } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("engineer_id", engineerId).eq("status", "active");
  const { data: campaignIds } = await supabase.from("campaigns").select("id").eq("engineer_id", engineerId);
  const ids = campaignIds?.map((c) => c.id) ?? [];
  let responsesCount = 0;
  if (ids.length > 0) {
    const { count: rCount } = await supabase.from("employee_responses").select("*", { count: "exact", head: true }).in("campaign_id", ids);
    responsesCount = rCount ?? 0;
  }
  const { count: reportsCount } = await supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("engineer_id", engineerId).eq("status", "reported");
  const { data: latestCampaigns, error: lErr } = await supabase.from("campaigns").select("id,title,status,created_at,closes_at,companies(name)").eq("engineer_id", engineerId).order("created_at", { ascending: false }).limit(6);

  const statValues = [
    String(companiesCount ?? 0),
    String(activeCampaigns ?? 0),
    String(responsesCount),
    String(reportsCount ?? 0),
  ];

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_META.map((s, i) => (
          <Link key={s.key} href={s.href} className="group block">
            <div
              className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-card transition-all duration-200 hover:shadow-card-lg hover:-translate-y-0.5"
              style={{ borderColor: s.color + "22" }}
            >
              {/* Glow corner */}
              <div
                className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20 blur-2xl"
                style={{ background: s.color }}
                aria-hidden="true"
              />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted">{s.label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: s.color }}>
                    {statValues[i]}
                  </p>
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: s.color + "18", color: s.color }}
                >
                  {s.icon}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent campaigns */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Últimas campanhas</h2>
          <Link href="/campaigns" className="text-xs text-accent hover:underline">Ver todas →</Link>
        </div>

        {lErr ? (
          <p className="text-sm text-red-400">{supabaseErrorMessage(lErr, "Erro ao listar campanhas")}</p>
        ) : !latestCampaigns?.length ? (
          <div className="rounded-xl border border-border/60 bg-card px-6 py-10 text-center">
            <p className="text-sm text-muted">Nenhuma campanha criada ainda.</p>
            <Link href="/campaigns/new" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
              Criar primeira campanha →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Título</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Empresa</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Status</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Encerramento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {latestCampaigns.map((c) => {
                  const co = c.companies as { name: string } | { name: string }[] | null;
                  const company = Array.isArray(co) ? co[0] : co;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-surface/60">
                      <td className="px-5 py-3.5">
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-foreground hover:text-accent transition-colors">
                          {c.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{company?.name ?? "—"}</td>
                      <td className="px-5 py-3.5">{statusBadge(c.status as CampaignStatus)}</td>
                      <td className="px-5 py-3.5 text-muted">
                        {c.closes_at ? new Date(c.closes_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
