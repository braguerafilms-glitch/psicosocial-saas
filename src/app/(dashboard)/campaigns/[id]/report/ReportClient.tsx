"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import {
  aggregateCampaignScores,
  buildRecommendations,
  buildConclusionText,
  overallAverage,
  classify,
  answerToHseScore,
} from "@/lib/hse-scoring";
import type { HseDomainKey } from "@/lib/hse-questions";
import { HSE_DOMAIN_ORDER } from "@/lib/hse-questions";
import { generateAepPdf } from "@/lib/pdf-report";
import { RadarChart } from "@/components/charts/RadarChart";
import type { RadarDatum } from "@/components/charts/RadarChart";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Campaign, Company, Engineer } from "@/types";

const metaSchema = z.object({
  legalName: z.string().min(2, "Informe a razão social"),
  cnpj: z.string().min(8, "Informe o CNPJ"),
  address: z.string().min(4, "Informe endereço/atuação"),
  activity: z.string().min(2, "Informe o ramo"),
  sampleNotes: z.string().optional(),
  conclusions: z.string().optional(),
  limitations: z.string().optional(),
});

type MetaForm = z.infer<typeof metaSchema>;
type Props = { campaignId: string };

export function ReportClient({ campaignId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [respondentCount, setRespondentCount] = useState(0);
  const [scores, setScores] = useState<Record<HseDomainKey, number> | null>(null);
  const [perQuestionAvg, setPerQuestionAvg] = useState<Record<number, number>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MetaForm>({ resolver: zodResolver(metaSchema) });

  const conclusionsWatch = watch("conclusions");

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: camp, error: cErr } = await supabase
        .from("campaigns")
        .select("*, companies(*)")
        .eq("id", campaignId)
        .maybeSingle();
      if (cErr || !camp) {
        setError(supabaseErrorMessage(cErr, "Campanha não encontrada"));
        setLoading(false);
        return;
      }
      setCampaign(camp as Campaign);

      const rawCo = camp.companies as Company | Company[] | null;
      const comp = Array.isArray(rawCo) ? rawCo[0] ?? null : rawCo;
      setCompany(comp);

      const { data: eng, error: eErr } = await supabase
        .from("sst_engineers")
        .select("*")
        .eq("id", camp.engineer_id)
        .maybeSingle();
      if (eErr || !eng) {
        setError(supabaseErrorMessage(eErr, "Engenheiro não encontrado"));
        setLoading(false);
        return;
      }
      setEngineer(eng as Engineer);

      const { data: responses, error: rErr } = await supabase
        .from("employee_responses")
        .select("id, question_answers(question_id, score)")
        .eq("campaign_id", campaignId);
      if (rErr) {
        setError(supabaseErrorMessage(rErr, "Erro ao carregar respostas"));
        setLoading(false);
        return;
      }
      const list = responses ?? [];
      setRespondentCount(list.length);
      const perParticipant = list.map((r) => {
        const qa = r.question_answers as { question_id: number; score: number }[];
        return (qa ?? []).map((a) => ({
          question_id: a.question_id,
          raw_score: a.score,
        }));
      });
      setScores(aggregateCampaignScores(perParticipant));

      // Compute per-question averages across all respondents (with same inversion as domain scores)
      const qSums: Record<number, number> = {};
      const qCounts: Record<number, number> = {};
      for (const participant of perParticipant) {
        for (const { question_id, raw_score } of participant) {
          const hseScore = answerToHseScore(question_id, raw_score);
          qSums[question_id] = (qSums[question_id] ?? 0) + hseScore;
          qCounts[question_id] = (qCounts[question_id] ?? 0) + 1;
        }
      }
      const qAvg: Record<number, number> = {};
      for (const qid of Object.keys(qSums)) {
        qAvg[Number(qid)] = qSums[Number(qid)]! / qCounts[Number(qid)]!;
      }
      setPerQuestionAvg(qAvg);

      const domainScores = aggregateCampaignScores(perParticipant);
      const avg = overallAverage(domainScores);
      const autoConc = buildConclusionText(domainScores, avg);

      const suggestedSampleNotes =
        `A amostra foi composta por ${list.length} colaborador${list.length !== 1 ? "es" : ""} que responderam voluntariamente ao questionário HSE-IT durante a campanha "${camp.title}". ` +
        `A participação foi anônima e não permitiu identificação individual. Os dados foram coletados por meio de formulário eletrônico disponibilizado pela organização.`;

      const suggestedLimitations =
        `Os resultados apresentados neste relatório baseiam-se nas respostas fornecidas pelos colaboradores participantes e refletem a percepção individual no momento da coleta de dados. Não é possível garantir a representatividade estatística da amostra em relação ao universo total de trabalhadores da organização. ` +
        `O instrumento HSE-IT avalia fatores de risco psicossocial relacionados ao trabalho, não constituindo diagnóstico clínico ou psicológico individual. ` +
        `Os achados devem ser interpretados em conjunto com outras informações organizacionais e validados com os próprios trabalhadores em grupos focais ou reuniões de devolutiva, conforme preconiza a metodologia original do Health and Safety Executive (HSE/UK).`;

      reset({
        legalName: comp?.name ?? "",
        cnpj: comp?.cnpj ?? "",
        address: [comp?.city, comp?.state].filter(Boolean).join(" / "),
        activity: comp?.industry ?? "",
        sampleNotes: suggestedSampleNotes,
        conclusions: autoConc,
        limitations: suggestedLimitations,
      });

      setLoading(false);
    })();
  }, [campaignId, reset]);

  const overall = useMemo(() => {
    if (!scores) return 0;
    return overallAverage(scores);
  }, [scores]);

  const overallClass = useMemo(() => classify(overall), [overall]);

  const autoConclusion = useMemo(() => {
    if (!scores) return "";
    return buildConclusionText(scores, overall);
  }, [scores, overall]);

  const recommendations = useMemo(() => {
    if (!scores) return [];
    return buildRecommendations(scores);
  }, [scores]);

  const radarData = useMemo((): RadarDatum[] => {
    if (!scores) return [];
    return HSE_DOMAIN_ORDER.map(({ key, label }) => ({
      domain: key,
      label,
      score: scores[key],
    }));
  }, [scores]);

  const year = new Date().getFullYear();

  function buildPdfDoc(values: MetaForm) {
    if (!campaign || !company || !engineer || !scores) return null;
    return generateAepPdf({
      campaign,
      company,
      engineer,
      companyReport: {
        legalName: values.legalName,
        cnpj: values.cnpj,
        address: values.address,
        activity: values.activity,
        sampleNotes: values.sampleNotes ?? "",
      },
      domainScores: scores,
      perQuestionAvg,
      respondentCount,
      conclusionsOverride: values.conclusions || undefined,
      limitationsText: values.limitations || undefined,
    });
  }

  async function downloadPdf(values: MetaForm) {
    setError(null);
    try {
      const doc = buildPdfDoc(values);
      if (!doc) return;
      doc.save(`AEP-HSE-${campaign!.slug}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar PDF");
    }
  }

  async function openPreview(values: MetaForm) {
    setError(null);
    try {
      const doc = buildPdfDoc(values);
      if (!doc) return;
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar prévia");
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando...</p>;
  }

  if (error && !campaign) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  if (!campaign || !company || !engineer || !scores) {
    return <p className="text-sm text-muted">Dados incompletos.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href={`/campaigns/${campaignId}`} className="text-sm text-accent hover:underline">
            ← Voltar à campanha
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Resultados</h1>
          <p className="text-sm text-muted">
            HSE-IT · {year} · {respondentCount} avaliado{respondentCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {/* Overall score card */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: overallClass.bg, borderColor: overallClass.color + "55" }}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-6">
          <span
            className="text-7xl font-bold leading-none tabular-nums"
            style={{ color: overallClass.color }}
          >
            {overall.toFixed(2).replace(".", ",")}
          </span>
          <div>
            <p className="text-xl font-semibold" style={{ color: overallClass.color }}>
              {overallClass.label}
            </p>
            <p className="text-sm text-muted">
              Média geral · {respondentCount} avaliado{respondentCount !== 1 ? "s" : ""} · 7 domínios
            </p>
          </div>
        </div>
      </div>

      {/* Score por domínio + domain cards */}
      <Card>
        <CardHeader>
          <CardTitle>Score por Domínio</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {HSE_DOMAIN_ORDER.map(({ key, label }) => {
            const s = scores[key];
            if (!s) return null;
            const c = classify(s);
            const pct = ((s - 1) / 4) * 100;
            return (
              <div key={key} className="flex items-center gap-3">
                <span
                  className="w-40 shrink-0 text-sm font-medium"
                  style={{ color: c.color }}
                >
                  {label}
                </span>
                <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: c.color }}
                  />
                </div>
                <span className="w-36 shrink-0 text-right text-sm" style={{ color: c.color }}>
                  {s.toFixed(2)} · {c.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Domain score cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {HSE_DOMAIN_ORDER.map(({ key, label }) => {
          const s = scores[key];
          if (!s) return null;
          const c = classify(s);
          return (
            <div
              key={key}
              className="rounded-xl border p-4"
              style={{ background: c.bg, borderColor: c.color + "44" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {label}
              </p>
              <p
                className="mt-2 text-3xl font-bold tabular-nums"
                style={{ color: c.color }}
              >
                {s.toFixed(2).replace(".", ",")}
              </p>
              <p className="mt-1 text-xs font-medium" style={{ color: c.color }}>
                {c.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Radar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Radar — Perfil Psicossocial</CardTitle>
        </CardHeader>
        <RadarChart data={radarData} />
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações Automáticas</CardTitle>
        </CardHeader>
        <div className="space-y-5">
          {recommendations.map((r) => (
            <div key={r.domain} className="border-b border-border pb-5 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold" style={{ color: r.color }}>
                  {r.domain}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: r.color + "22", color: r.color }}
                >
                  {r.label}
                </span>
                <span className="text-sm text-muted">·</span>
                <span className="text-sm font-medium text-muted">
                  {r.score.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Conclusion */}
      <Card>
        <CardHeader>
          <CardTitle>Conclusão</CardTitle>
        </CardHeader>
        <p className="text-sm leading-relaxed text-muted">
          {conclusionsWatch?.trim() ? conclusionsWatch : autoConclusion}
        </p>
      </Card>

      {/* PDF form */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar Relatório PDF (AEP)</CardTitle>
        </CardHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (v) => { await downloadPdf(v); })}
        >
          <Input label="Razão social" error={errors.legalName?.message} {...register("legalName")} />
          <Input label="CNPJ" error={errors.cnpj?.message} {...register("cnpj")} />
          <Textarea label="Endereço / atuação" error={errors.address?.message} {...register("address")} />
          <Input label="Ramo de atividade" error={errors.activity?.message} {...register("activity")} />
          <Textarea label="Seleção de amostra (notas)" error={errors.sampleNotes?.message} {...register("sampleNotes")} />
          <Textarea
            label="Conclusões (opcional — sobrescreve o texto automático no PDF)"
            error={errors.conclusions?.message}
            {...register("conclusions")}
          />
          <Textarea label="Limitações (opcional)" error={errors.limitations?.message} {...register("limitations")} />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit(async (v) => { await openPreview(v); })}
            >
              Visualizar PDF
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Baixar PDF
            </Button>
          </div>
        </form>
      </Card>

      {/* PDF Preview Modal — split: edit left, preview right */}
      {previewUrl ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Top bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
            <h2 className="text-sm font-semibold text-foreground">Prévia do Relatório AEP</h2>
            <div className="flex items-center gap-3">
              <a
                href={previewUrl}
                download={`AEP-HSE-${campaign.slug}.pdf`}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
              >
                Baixar PDF
              </a>
              <button
                type="button"
                onClick={closePreview}
                className="rounded p-1.5 text-muted hover:text-foreground"
                title="Fechar prévia"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body: edit panel + iframe */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left — editable fields */}
            <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Editar campos</p>
              <form
                className="flex flex-col gap-3"
                onSubmit={handleSubmit(async (v) => { await openPreview(v); })}
              >
                <Input label="Razão social" error={errors.legalName?.message} {...register("legalName")} />
                <Input label="CNPJ" error={errors.cnpj?.message} {...register("cnpj")} />
                <Textarea label="Endereço / atuação" error={errors.address?.message} {...register("address")} />
                <Input label="Ramo de atividade" error={errors.activity?.message} {...register("activity")} />
                <Textarea label="Seleção de amostra" error={errors.sampleNotes?.message} {...register("sampleNotes")} />
                <Textarea label="Conclusões" error={errors.conclusions?.message} {...register("conclusions")} />
                <Textarea label="Limitações" error={errors.limitations?.message} {...register("limitations")} />
                <Button type="submit" variant="secondary" className="w-full">
                  Atualizar prévia
                </Button>
              </form>
            </div>

            {/* Right — PDF iframe */}
            <iframe
              src={previewUrl}
              className="flex-1 border-0"
              title="Prévia do PDF"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
