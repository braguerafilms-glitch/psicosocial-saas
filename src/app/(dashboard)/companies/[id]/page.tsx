import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DeleteCompanyButton } from "@/components/campaigns/DeleteCompanyButton";
import type { CampaignStatus } from "@/types";

function statusBadge(status: CampaignStatus) {
  if (status === "active") return <Badge variant="success">Ativa</Badge>;
  if (status === "draft") return <Badge variant="muted">Rascunho</Badge>;
  if (status === "closed") return <Badge variant="warning">Encerrada</Badge>;
  return <Badge variant="default">Relatório</Badge>;
}

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: company, error } = await supabase.from("companies").select("*").eq("id", params.id).maybeSingle();
  if (error || !company) notFound();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status, created_at, employee_responses(count)")
    .eq("company_id", params.id)
    .order("created_at", { ascending: false });

  const fields = [
    { label: "Razão social",     value: company.name },
    { label: "Nome fantasia",    value: company.trade_name },
    { label: "CNPJ",             value: company.cnpj },
    { label: "Filial",           value: "Matriz" },
    { label: "Endereço",         value: company.address },
    { label: "Cidade / UF",      value: [company.city, company.state].filter(Boolean).join(" / ") || null },
    { label: "Atividade",        value: company.industry },
    { label: "Contato",          value: company.contact_name },
    { label: "E-mail",           value: company.contact_email },
    { label: "Telefone",         value: company.contact_phone },
    { label: "Nº funcionários",  value: company.employee_count?.toString() },
  ].filter((f) => f.value);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Empresas
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
            {company.trade_name ? <p className="mt-0.5 text-sm text-muted">{company.trade_name}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {company.status === "active"
              ? <Badge variant="success">Ativa</Badge>
              : <Badge variant="muted">Inativa</Badge>}
            <DeleteCompanyButton companyId={company.id} />
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
        <div className="border-b border-border/60 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Dados da empresa</p>
        </div>
        <dl className="grid grid-cols-1 divide-y divide-border/40 sm:grid-cols-2 sm:divide-y-0">
          {fields.map((f, i) => (
            <div
              key={f.label}
              className={`px-5 py-3.5 ${i % 2 === 0 && i + 1 < fields.length ? "sm:border-r sm:border-border/40" : ""}`}
            >
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Campanhas */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Campanhas</p>
          <Link href="/campaigns/new">
            <Button variant="secondary" size="sm">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nova campanha
            </Button>
          </Link>
        </div>

        {!campaigns?.length ? (
          <div className="rounded-xl border border-border/60 bg-card px-6 py-10 text-center">
            <p className="text-sm text-muted">Nenhuma campanha para esta empresa.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Título</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Status</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Respostas</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Criada em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {campaigns.map((c) => {
                  const er = c.employee_responses as { count: number }[] | null;
                  const count = er?.[0]?.count ?? 0;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-surface/60">
                      <td className="px-5 py-3.5">
                        <Link href={`/campaigns/${c.id}`} className="font-medium text-foreground hover:text-accent transition-colors">
                          {c.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">{statusBadge(c.status as CampaignStatus)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface px-1.5 text-xs font-medium text-muted ring-1 ring-border">
                          {count}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
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
