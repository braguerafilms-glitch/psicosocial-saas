import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DeleteCampaignButton } from "@/components/campaigns/DeleteCampaignButton";
import type { CampaignStatus } from "@/types";

function statusBadge(status: CampaignStatus) {
  if (status === "active") return <Badge variant="success">Ativa</Badge>;
  if (status === "draft") return <Badge variant="muted">Rascunho</Badge>;
  if (status === "closed") return <Badge variant="warning">Encerrada</Badge>;
  return <Badge variant="default">Relatório</Badge>;
}

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: engineer } = await supabase.from("sst_engineers").select("id").eq("user_id", user.id).maybeSingle();
  if (!engineer) return <p className="text-sm text-muted">Perfil não encontrado.</p>;

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id,title,status,created_at,closes_at, companies(name), employee_responses(count)")
    .eq("engineer_id", engineer.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Campanhas</h1>
          <p className="mt-0.5 text-sm text-muted">Avaliações HSE-IT</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova campanha
          </Button>
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-400">{supabaseErrorMessage(error, "Erro ao carregar campanhas")}</p>
      ) : !campaigns?.length ? (
        <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted">Nenhuma campanha criada ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Empresa</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Título</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Respostas</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Criada em</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {campaigns.map((c) => {
                const co = c.companies as { name: string } | { name: string }[] | null;
                const company = Array.isArray(co) ? co[0] : co;
                const er = c.employee_responses as { count: number }[] | null;
                const respCount = er?.[0]?.count ?? 0;
                return (
                  <tr key={c.id} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-3.5 text-muted">{company?.name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Link href={`/campaigns/${c.id}`} className="font-medium text-foreground hover:text-accent transition-colors">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(c.status as CampaignStatus)}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface px-1.5 text-xs font-medium text-muted ring-1 ring-border">
                        {respCount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <DeleteCampaignButton campaignId={c.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
