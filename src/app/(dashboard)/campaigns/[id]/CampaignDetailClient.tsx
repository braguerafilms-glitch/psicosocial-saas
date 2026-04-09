"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import {
  aggregateCampaignScores,
  buildRecommendations,
  overallAverage,
  classify,
} from "@/lib/hse-scoring";
import { HSE_DOMAIN_ORDER } from "@/lib/hse-questions";
import type { HseDomainKey } from "@/lib/hse-questions";
import { RadarChart } from "@/components/charts/RadarChart";
import type { RadarDatum } from "@/components/charts/RadarChart";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { CampaignStatus } from "@/types";
import { ExcelActions } from "@/components/campaigns/ExcelActions";

type CampaignRow = {
  id: string;
  title: string;
  slug: string;
  status: CampaignStatus;
  custom_message: string | null;
  companies: { name: string } | null;
};

type Props = { campaignId: string };

function statusBadge(status: CampaignStatus) {
  if (status === "active") return <Badge variant="success">Ativa</Badge>;
  if (status === "draft") return <Badge variant="muted">Rascunho</Badge>;
  if (status === "closed") return <Badge variant="warning">Encerrada</Badge>;
  return <Badge variant="default">Relatório</Badge>;
}

export function CampaignDetailClient({ campaignId }: Props) {
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [count, setCount] = useState(0);
  const [scores, setScores] = useState<Record<HseDomainKey, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: camp, error: cErr } = await supabase
      .from("campaigns")
      .select("id,title,slug,status,custom_message, companies(name)")
      .eq("id", campaignId)
      .maybeSingle();
    if (cErr) {
      setError(supabaseErrorMessage(cErr, "Erro ao carregar campanha"));
      setLoading(false);
      return;
    }
    if (!camp) {
      setError("Campanha não encontrada.");
      setLoading(false);
      return;
    }
    const co = camp.companies as { name: string } | { name: string }[] | null;
    const company = Array.isArray(co) ? co[0] ?? null : co;
    setCampaign({
      id: camp.id,
      title: camp.title,
      slug: camp.slug,
      status: camp.status as CampaignStatus,
      custom_message: camp.custom_message,
      companies: company,
    });

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
    setCount(list.length);
    const perParticipant = list.map((r) => {
      const qa = r.question_answers as { question_id: number; score: number }[];
      return (qa ?? []).map((a) => ({ question_id: a.question_id, raw_score: a.score }));
    });
    setScores(aggregateCampaignScores(perParticipant));
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`responses:${campaignId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "employee_responses",
        filter: `campaign_id=eq.${campaignId}`,
      }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [campaignId, load]);

  const overall = useMemo(() => (scores ? overallAverage(scores) : 0), [scores]);
  const overallClass = useMemo(() => classify(overall), [overall]);

  const radarData = useMemo((): RadarDatum[] => {
    if (!scores) return [];
    return HSE_DOMAIN_ORDER
      .map(({ key, label }) => ({ domain: key, label, score: scores[key] || 0 }))
      .filter((d) => d.score > 0);
  }, [scores]);

  const recommendations = useMemo(() => {
    if (!scores) return [];
    return buildRecommendations(scores);
  }, [scores]);

  const year = new Date().getFullYear();

  async function setStatus(next: CampaignStatus) {
    setBusy(next);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("campaigns")
      .update({ status: next })
      .eq("id", campaignId);
    setBusy(null);
    if (uErr) { setError(supabaseErrorMessage(uErr, "Erro ao atualizar status")); return; }
    await load();
  }

  async function copyLink() {
    if (!campaign) return;
    try {
      await navigator.clipboard.writeText(`${appUrl}/form/${campaign.slug}`);
    } catch {
      setError("Não foi possível copiar o link.");
    }
  }

  if (loading) return <p className="text-sm text-muted">Carregando...</p>;
  if (error && !campaign) return <p className="text-sm text-red-300">{error}</p>;
  if (!campaign) return null;

  const hasData = count > 0 && scores != null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{campaign.title}</h1>
            {statusBadge(campaign.status)}
          </div>
          <p className="mt-1 text-sm text-muted">
            {campaign.companies?.name ?? "Empresa"} · HSE-IT · {year} · {count} avaliado{count !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void copyLink()}>
            Copiar link
          </Button>
          <Button type="button" variant="secondary" loading={busy === "active"} disabled={!!busy} onClick={() => void setStatus("active")}>
            Ativar
          </Button>
          <Button type="button" variant="secondary" loading={busy === "closed"} disabled={!!busy} onClick={() => void setStatus("closed")}>
            Encerrar
          </Button>
          <Link href={`/campaigns/${campaignId}/report`}>
            <Button>Relatório PDF</Button>
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {/* Excel export / import */}
      <div className="rounded-lg border border-border bg-surface px-4 py-3">
        <ExcelActions
          campaignId={campaignId}
          campaignSlug={campaign.slug}
          onImportDone={() => void load()}
        />
      </div>

      {!hasData ? (
        <Card>
          <p className="text-sm text-muted">Sem respostas ainda. Compartilhe o link da campanha para coletar dados.</p>
        </Card>
      ) : (
        <>
          {/* Overall score */}
          <div
            className="rounded-2xl border px-6 py-5"
            style={{ background: overallClass.bg, borderColor: overallClass.color + "55" }}
          >
            <div className="flex items-center gap-5">
              <span
                className="text-5xl font-bold tabular-nums"
                style={{ color: overallClass.color }}
              >
                {overall.toFixed(2).replace(".", ",")}
              </span>
              <div className="border-l border-current pl-5" style={{ borderColor: overallClass.color + "44" }}>
                <p className="text-base font-semibold" style={{ color: overallClass.color }}>
                  {overallClass.label}
                </p>
                <p className="text-xs text-muted">
                  Média geral · {count} avaliado{count !== 1 ? "s" : ""} · 7 domínios
                </p>
              </div>
            </div>
          </div>

          {/* Score por domínio — barras */}
          <Card>
            <CardHeader>
              <CardTitle>Score por Domínio</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {HSE_DOMAIN_ORDER.map(({ key, label }) => {
                const s = scores![key];
                if (!s) return null;
                const c = classify(s);
                const pct = ((s - 1) / 4) * 100;
                return (
                  <div key={key} className="grid items-center gap-3" style={{ gridTemplateColumns: "9rem 1fr 9rem" }}>
                    <span className="truncate text-sm font-medium" style={{ color: c.color }}>
                      {label}
                    </span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: c.color }}
                      />
                    </div>
                    <div className="text-right text-xs leading-tight" style={{ color: c.color }}>
                      <span className="font-semibold">{s.toFixed(2)}</span>
                      <span className="ml-1 opacity-80">{c.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Domain score cards — 4 + 3 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {HSE_DOMAIN_ORDER.map(({ key, label }) => {
              const s = scores![key];
              if (!s) return null;
              const c = classify(s);
              return (
                <div
                  key={key}
                  className="rounded-xl border p-4"
                  style={{ background: c.bg, borderColor: c.color + "44" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: c.color + "bb" }}>
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: c.color }}>
                    {s.toFixed(2).replace(".", ",")}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: c.color }}>{c.label}</p>
                </div>
              );
            })}
          </div>

          {/* Radar */}
          <Card>
            <CardHeader>
              <CardTitle>Radar — Perfil Psicossocial</CardTitle>
            </CardHeader>
            <RadarChart data={radarData} />
          </Card>

          {/* Recomendações */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendações Automáticas</CardTitle>
            </CardHeader>
            <div className="space-y-0">
              {recommendations.map((r) => (
                <div key={r.domain} className="border-b border-border/60 py-5 first:pt-0 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold" style={{ color: r.color }}>{r.domain}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: r.color + "22", color: r.color }}
                    >
                      {r.label}
                    </span>
                    <span className="text-muted">·</span>
                    <span className="text-sm font-medium tabular-nums text-muted">
                      {r.score.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{r.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
