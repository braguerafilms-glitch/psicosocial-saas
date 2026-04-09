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
import { validateCPF, normalizeCPF, hashCPF } from "@/lib/cpf";
import * as XLSX from "xlsx";
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
  const [cpfs, setCpfs] = useState<string[]>([]);
  const [cpfInput, setCpfInput] = useState("");
  const [cpfError, setCpfError] = useState<string | null>(null);
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

  function addCpf(raw: string) {
    const n = normalizeCPF(raw);
    if (!validateCPF(n)) { setCpfError("CPF inválido"); return; }
    if (cpfs.includes(n)) { setCpfError("CPF já adicionado"); return; }
    setCpfs((p) => [...p, n]);
    setCpfInput("");
    setCpfError(null);
  }

  async function handleCpfFile(file: File) {
    setCpfError(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    const found: string[] = [];
    const invalid: string[] = [];
    for (const row of rows) {
      for (const cell of row) {
        const val = String(cell ?? "").trim();
        const n = normalizeCPF(val);
        if (n.length === 11) {
          if (validateCPF(n) && !found.includes(n) && !cpfs.includes(n)) found.push(n);
          else if (!validateCPF(n)) invalid.push(val);
        }
      }
    }
    if (found.length) setCpfs((p) => [...p, ...found]);
    if (invalid.length) setCpfError(`${invalid.length} CPF(s) inválido(s) ignorado(s)`);
  }

  async function onSubmit(values: Form) {
    setError(null);
    if (cpfs.length === 0) {
      setError("Adicione ao menos um CPF autorizado antes de criar a campanha.");
      return;
    }
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
    // Inserir participantes (CPF hasheado)
    const hashes = await Promise.all(cpfs.map((c) => hashCPF(c)));
    const participants = hashes.map((h) => ({ campaign_id: inserted.id, cpf_hash: h }));
    const { error: pErr } = await supabase.from("campaign_participants").insert(participants);
    if (pErr) {
      setError(supabaseErrorMessage(pErr, "Erro ao salvar participantes"));
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

          {/* CPFs autorizados */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              CPFs autorizados <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-muted">
              Apenas os CPFs cadastrados poderão responder. Cada CPF pode responder uma única vez.
            </p>
            {/* Input manual */}
            <div className="flex gap-2">
              <input
                type="text"
                value={cpfInput}
                onChange={(e) => setCpfInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addCpf(cpfInput); }
                }}
                placeholder="000.000.000-00"
                maxLength={14}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={() => addCpf(cpfInput)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-card"
              >
                Adicionar
              </button>
            </div>
            {/* Upload planilha */}
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-dashed border-border bg-surface px-3 py-2 text-xs text-muted hover:border-accent/50 hover:text-foreground">
                Importar planilha (Excel / CSV)
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleCpfFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {cpfs.length > 0 && (
                <span className="text-xs font-semibold text-accent">{cpfs.length} CPF(s) adicionado(s)</span>
              )}
            </div>
            {cpfError && (
              <p className="text-xs text-red-400">{cpfError}</p>
            )}
            {cpfs.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-surface p-2">
                <div className="flex flex-wrap gap-1.5">
                  {cpfs.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs text-foreground font-mono">
                      {c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                      <button type="button" onClick={() => setCpfs((p) => p.filter((x) => x !== c))} className="text-muted hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
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
