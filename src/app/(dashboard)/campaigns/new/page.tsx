"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { uniqueSlug } from "@/lib/slug";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

const schema = z.object({
  company_id: z.string().uuid("Selecione uma empresa"),
  title: z.string().min(3, "Informe o título"),
  custom_message: z.string().optional(),
  opens_at: z.string().optional(),
  closes_at: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [sectorInput, setSectorInput] = useState("");
  const [jobLevels, setJobLevels] = useState<string[]>([]);
  const [jobLevelInput, setJobLevelInput] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: engineer } = await supabase
        .from("sst_engineers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!engineer) return;
      const { data, error: lErr } = await supabase
        .from("companies")
        .select("id,name")
        .eq("status", "active")
        .eq("engineer_id", engineer.id)
        .order("name", { ascending: true });
      if (!lErr && data) setCompanies(data);
    })();
  }, []);

  async function onSubmit(values: Form) {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada.");
      return;
    }
    const { data: engineer, error: eErr } = await supabase
      .from("sst_engineers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (eErr || !engineer) {
      setError("Perfil não encontrado.");
      return;
    }
    const slug = uniqueSlug(values.title);
    const { data: inserted, error: insErr } = await supabase
      .from("campaigns")
      .insert({
        company_id: values.company_id,
        engineer_id: engineer.id,
        title: values.title,
        slug,
        status: "draft",
        opens_at: values.opens_at ? new Date(values.opens_at).toISOString() : null,
        closes_at: values.closes_at
          ? new Date(values.closes_at).toISOString()
          : null,
        custom_message: values.custom_message || null,
        anonymous,
        sectors,
        job_levels: jobLevels,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      setError(supabaseErrorMessage(insErr, "Erro ao criar campanha"));
      return;
    }
    router.push(`/campaigns/${inserted.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/campaigns" className="text-sm text-accent hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Nova campanha
        </h1>
        <p className="text-sm text-muted">Configure a coleta HSE-IT</p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Empresa"
            error={errors.company_id?.message}
            {...register("company_id")}
          >
            <option value="">Selecione</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Título da campanha"
            error={errors.title?.message}
            {...register("title")}
          />
          <Textarea
            label="Mensagem de boas-vindas (opcional)"
            error={errors.custom_message?.message}
            {...register("custom_message")}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="datetime-local"
              label="Abertura"
              error={errors.opens_at?.message}
              {...register("opens_at")}
            />
            <Input
              type="datetime-local"
              label="Encerramento"
              error={errors.closes_at?.message}
              {...register("closes_at")}
            />
          </div>
          {/* Setores */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Setores da empresa <span className="text-muted font-normal">(opcional)</span>
            </label>
            <p className="text-xs text-muted">Se cadastrar, o funcionário vai selecionar o setor no formulário.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={sectorInput}
                onChange={(e) => setSectorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = sectorInput.trim();
                    if (v && !sectors.includes(v)) setSectors((p) => [...p, v]);
                    setSectorInput("");
                  }
                }}
                placeholder="Ex: Produção, Administrativo..."
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={() => {
                  const v = sectorInput.trim();
                  if (v && !sectors.includes(v)) setSectors((p) => [...p, v]);
                  setSectorInput("");
                }}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-card"
              >
                Adicionar
              </button>
            </div>
            {sectors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sectors.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground">
                    {s}
                    <button type="button" onClick={() => setSectors((p) => p.filter((x) => x !== s))} className="text-muted hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cargos */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Cargos / níveis hierárquicos <span className="text-muted font-normal">(opcional)</span>
            </label>
            <p className="text-xs text-muted">Se cadastrar, o funcionário vai selecionar o cargo no formulário.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={jobLevelInput}
                onChange={(e) => setJobLevelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = jobLevelInput.trim();
                    if (v && !jobLevels.includes(v)) setJobLevels((p) => [...p, v]);
                    setJobLevelInput("");
                  }
                }}
                placeholder="Ex: Operador, Supervisor, Gerente..."
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={() => {
                  const v = jobLevelInput.trim();
                  if (v && !jobLevels.includes(v)) setJobLevels((p) => [...p, v]);
                  setJobLevelInput("");
                }}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-card"
              >
                Adicionar
              </button>
            </div>
            {jobLevels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {jobLevels.map((j) => (
                  <span key={j} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground">
                    {j}
                    <button type="button" onClick={() => setJobLevels((p) => p.filter((x) => x !== j))} className="text-muted hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3">
            <input
              id="anon"
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            <label htmlFor="anon" className="text-sm text-foreground">
              Coleta anônima (recomendado)
            </label>
          </div>
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={isSubmitting}>
            Criar campanha
          </Button>
        </form>
      </Card>
    </div>
  );
}
