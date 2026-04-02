import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DeleteCompanyButton } from "@/components/campaigns/DeleteCompanyButton";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: engineer } = await supabase.from("sst_engineers").select("id").eq("user_id", user.id).maybeSingle();
  if (!engineer) return <p className="text-sm text-muted">Perfil não encontrado.</p>;

  let query = supabase.from("companies").select("id,name,city,status, campaigns(count)").eq("engineer_id", engineer.id).order("name", { ascending: true });
  if (q) query = query.ilike("name", `%${q}%`);
  const { data: rows, error } = await query;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Empresas</h1>
          <p className="mt-0.5 text-sm text-muted">Clientes cadastrados</p>
        </div>
        <Link href="/companies/new">
          <Button>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova empresa
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form className="flex gap-2" method="get">
        <div className="max-w-sm flex-1">
          <Input name="q" defaultValue={q} placeholder="Buscar por nome…" aria-label="Buscar empresa" />
        </div>
        <Button type="submit" variant="secondary">Buscar</Button>
        {q ? (
          <Link href="/companies">
            <Button type="button" variant="ghost">Limpar</Button>
          </Link>
        ) : null}
      </form>

      {/* Table */}
      {error ? (
        <p className="text-sm text-red-400">{supabaseErrorMessage(error, "Erro ao carregar empresas")}</p>
      ) : !rows?.length ? (
        <div className="rounded-xl border border-border/60 bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted">{q ? `Nenhuma empresa encontrada para "${q}".` : "Nenhuma empresa cadastrada ainda."}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Nome</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Cidade</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Status</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">Campanhas</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((c) => {
                const count = Array.isArray(c.campaigns) && c.campaigns[0]
                  ? (c.campaigns[0] as { count: number }).count
                  : 0;
                return (
                  <tr key={c.id} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-3.5">
                      <Link href={`/companies/${c.id}`} className="font-medium text-foreground hover:text-accent transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{c.city ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      {c.status === "active" ? <Badge variant="success">Ativa</Badge> : <Badge variant="muted">Inativa</Badge>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface px-1.5 text-xs font-medium text-muted ring-1 ring-border">
                        {count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <DeleteCompanyButton companyId={c.id} />
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
