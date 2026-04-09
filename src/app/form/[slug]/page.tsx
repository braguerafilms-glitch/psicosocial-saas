import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicForm } from "./PublicForm";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({
  params,
}: {
  params: { slug: string };
}) {
  // Use admin client so RLS doesn't hide closed/draft campaigns
  const supabase = createAdminClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,title,status,custom_message,sectors,job_levels,companies(name)")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!campaign) notFound();

  if (campaign.status === "closed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-semibold text-foreground">Avaliação encerrada</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Esta avaliação foi encerrada e não está mais aceitando respostas.
            <br />
            Em caso de dúvidas, entre em contato com seu supervisor.
          </p>
        </div>
      </div>
    );
  }

  if (campaign.status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-3xl">
            ⏸️
          </div>
          <h1 className="text-xl font-semibold text-foreground">Avaliação em pausa</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Esta avaliação ainda não foi aberta para respostas.
            <br />
            Em caso de dúvidas, entre em contato com seu supervisor.
          </p>
        </div>
      </div>
    );
  }

  const co = campaign.companies as { name: string } | { name: string }[] | null;
  const company = Array.isArray(co) ? co[0] ?? null : co;

  return (
    <div className="min-h-screen bg-background px-4">
      <PublicForm
        campaign={{
          id: campaign.id,
          title: campaign.title,
          custom_message: campaign.custom_message,
          sectors: (campaign.sectors as string[]) ?? [],
          job_levels: (campaign.job_levels as string[]) ?? [],
          companies: company,
        }}
      />
    </div>
  );
}
