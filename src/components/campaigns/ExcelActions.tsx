"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { HSE_QUESTIONS } from "@/lib/hse-questions";

type Props = {
  campaignId: string;
  campaignSlug: string;
  onImportDone: () => void;
};

const AV_HEADERS = HSE_QUESTIONS.slice()
  .sort((a, b) => a.id - b.id)
  .map((q) => `Av${q.id}`);

export function ExcelActions({ campaignId, campaignSlug, onImportDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── EXPORTAR ─────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { data: responses, error } = await supabase
        .from("employee_responses")
        .select("id, question_answers(question_id, score)")
        .eq("campaign_id", campaignId);

      if (error) throw new Error(error.message);
      if (!responses?.length) {
        setMsg({ type: "err", text: "Nenhuma resposta para exportar." });
        return;
      }

      const rows: Record<string, number>[] = responses.map((r) => {
        const qa = r.question_answers as { question_id: number; score: number }[];
        const row: Record<string, number> = {};
        for (const a of qa ?? []) row[`Av${a.question_id}`] = a.score;
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: AV_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "GERAL");
      XLSX.writeFile(wb, `Dados-Psicossocial-${campaignSlug}.xlsx`);
      setMsg({ type: "ok", text: `${responses.length} linha(s) exportadas.` });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Erro ao exportar." });
    } finally {
      setExporting(false);
    }
  }

  // ── IMPORTAR ─────────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Lê como array de arrays
      // Formato: linha 1 = cabeçalho ["Questão", "Av1", "Av2", ..., "AvN"]
      //          linhas 2-36 = uma linha por questão, colunas B+ = respostas por funcionário
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
      if (raw.length < 2) throw new Error("Planilha vazia ou sem dados.");

      const headerRow = raw[0] as unknown[];

      // Detecta colunas de funcionários: qualquer coluna a partir do índice 1
      // que tenha cabeçalho não-vazio (Av1, Av2, etc.) OU dados numéricos nas linhas
      const employeeCols: number[] = [];
      for (let col = 1; col < headerRow.length; col++) {
        // Verifica se essa coluna tem pelo menos um valor 1-5 nas linhas de questão
        const hasData = raw.slice(1).some((r) => {
          const v = Number((r as unknown[])[col]);
          return v >= 1 && v <= 5;
        });
        if (hasData) employeeCols.push(col);
      }

      if (employeeCols.length === 0) {
        throw new Error("Nenhum funcionário encontrado. Verifique se os valores são 1–5.");
      }

      // Linhas de questões: pula linha 1 (cabeçalho), pega até 35 linhas com dados
      const questionRows = raw.slice(1).filter((r) =>
        (r as unknown[]).some((v) => { const n = Number(v); return n >= 1 && n <= 5; })
      ).slice(0, 35);

      if (questionRows.length < 10) {
        throw new Error(`Apenas ${questionRows.length} questões detectadas. Esperado ao menos 10.`);
      }

      const supabase = createClient();
      let imported = 0;
      let skipped = 0;

      // Cada coluna de funcionário = um participante
      for (const col of employeeCols) {
        const scores: { question_id: number; score: number }[] = [];

        for (let qi = 0; qi < questionRows.length; qi++) {
          const val = Number((questionRows[qi] as unknown[])[col]);
          if (val >= 1 && val <= 5) {
            scores.push({ question_id: qi + 1, score: val });
          }
        }

        // Exige pelo menos 50% das questões respondidas
        if (scores.length < Math.floor(questionRows.length * 0.5)) {
          skipped++;
          continue;
        }

        const responseId = crypto.randomUUID();
        const { error: rErr } = await supabase.from("employee_responses").insert({
          id: responseId,
          campaign_id: campaignId,
          department: "Importado via Excel",
          job_level: "—",
          gender: "—",
          age_range: "—",
          tenure_range: "—",
          work_type: "—",
        });

        if (rErr) { skipped++; continue; }

        // O Excel já tem scores finais (sem precisar de inversão).
        // A engine de cálculo aplica inversão em Q1-Q8 e Q24-Q27,
        // então desfazemos a pré-inversão antes de salvar: score → 6 - score.
        // Assim a engine inverte de volta e recupera o valor original do Excel.
        const INVERTED_IDS = new Set([1,2,3,4,5,6,7,8,24,25,26,27]);
        const normalizedScores = scores.map((s) => ({
          ...s,
          score: INVERTED_IDS.has(s.question_id) ? 6 - s.score : s.score,
        }));

        const { error: aErr } = await supabase
          .from("question_answers")
          .insert(normalizedScores.map((s) => ({ ...s, response_id: responseId })));

        if (aErr) { skipped++; continue; }
        imported++;
      }

      setMsg({
        type: imported > 0 ? "ok" : "err",
        text: `${imported} funcionário(s) importado(s)${skipped ? ` · ${skipped} ignorado(s)` : ""}.`,
      });

      if (imported > 0) onImportDone();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Erro ao importar." });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium text-muted">Excel:</span>
      <Button type="button" variant="secondary" loading={exporting} onClick={handleExport}>
        Exportar
      </Button>
      <Button type="button" variant="secondary" loading={importing} onClick={() => fileRef.current?.click()}>
        Importar
      </Button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
      {msg ? (
        <span className={`text-xs ${msg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
          {msg.text}
        </span>
      ) : null}
    </div>
  );
}
