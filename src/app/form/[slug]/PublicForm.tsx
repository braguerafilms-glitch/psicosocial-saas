"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { HSE_DOMAIN_ORDER, HSE_QUESTIONS } from "@/lib/hse-questions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const labels = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] as const;

const demoSchema = z.object({
  department: z.string().min(2, "Informe o setor"),
  job_level: z.string().min(2, "Informe o cargo/nível"),
  gender: z.string().min(1, "Selecione"),
  age_range: z.string().min(1, "Selecione"),
  tenure_range: z.string().min(1, "Selecione"),
  work_type: z.string().min(1, "Selecione"),
});

type DemoForm = z.infer<typeof demoSchema>;

type CampaignRow = {
  id: string;
  title: string;
  custom_message: string | null;
  companies: { name: string } | null;
};

type Props = { campaign: CampaignRow };

export function PublicForm({ campaign }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [demo, setDemo] = useState<DemoForm | null>(null);

  const companyName = campaign.companies?.name ?? "Empresa";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DemoForm>({ resolver: zodResolver(demoSchema) });

  const answeredCount = useMemo(
    () => Object.keys(answers).length,
    [answers],
  );
  const progress = Math.round((answeredCount / 35) * 100);

  const grouped = useMemo(() => {
    return HSE_DOMAIN_ORDER.map(({ key, label }) => ({
      key,
      label,
      items: HSE_QUESTIONS.filter((q) => q.domain === key),
    }));
  }, []);

  function setAnswer(questionId: number, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function submitAll() {
    setError(null);
    if (!demo) {
      setError("Preencha os dados profissionais antes de enviar.");
      setStep(2);
      return;
    }
    if (answeredCount < 35) {
      setError("Responda todas as 35 questões.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const responseId = crypto.randomUUID();
    const { error: rErr } = await supabase
      .from("employee_responses")
      .insert({
        id: responseId,
        campaign_id: campaign.id,
        department: demo.department,
        job_level: demo.job_level,
        gender: demo.gender,
        age_range: demo.age_range,
        tenure_range: demo.tenure_range,
        work_type: demo.work_type,
      });

    if (rErr) {
      setSubmitting(false);
      setError(supabaseErrorMessage(rErr, "Erro ao enviar respostas"));
      return;
    }

    const rows = Object.entries(answers).map(([qid, score]) => ({
      response_id: responseId,
      question_id: Number(qid),
      score,
    }));

    const { error: aErr } = await supabase.from("question_answers").insert(rows);
    setSubmitting(false);
    if (aErr) {
      setError(supabaseErrorMessage(aErr, "Erro ao salvar questões"));
      return;
    }
    setStep(4);
  }

  if (step === 4) {
    return (
      <Card className="mx-auto max-w-xl border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Obrigado!</h1>
        <p className="mt-2 text-sm text-muted">
          Suas respostas foram registradas com sucesso.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      {step === 1 ? (
        <div className="mx-auto max-w-2xl">
          {/* Hero header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
              HSE-IT · Stress Indicator Tool
            </div>
            <h1 className="mt-4 text-3xl font-bold text-foreground">
              Levantamento de Riscos Psicossociais
            </h1>
            <p className="mt-2 text-base text-muted">{companyName}</p>
          </div>

          <Card className="border-border bg-card p-0 overflow-hidden">
            {/* Colored top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-accent via-blue-500 to-accent/50" />

            <div className="p-8 space-y-5">
              {campaign.custom_message ? (
                <p className="text-sm leading-relaxed text-muted">{campaign.custom_message}</p>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-muted">
                    A <span className="font-semibold text-foreground">{companyName}</span> está comprometida com a saúde, segurança e bem-estar de seus colaboradores.
                  </p>
                  <p className="text-sm leading-relaxed text-muted">
                    Reconhecemos que o estresse relacionado ao trabalho é um tema relevante de saúde e segurança, e queremos identificar seus fatores de risco.
                  </p>

                  {/* Destaque anonimato */}
                  <div className="rounded-xl border border-green-500/25 bg-green-500/8 px-5 py-4">
                    <p className="font-semibold text-green-400">🔒 O anonimato será garantido, não precisa se identificar!</p>
                    <p className="mt-1 text-sm text-muted">
                      O questionário contém 35 perguntas simples sobre suas condições de trabalho. Ele é anônimo e não permite a identificação individual.
                    </p>
                  </div>

                  <p className="text-sm leading-relaxed text-muted">
                    Os resultados serão compartilhados com todos, seguidos de conversas em grupo para validar os achados e definir ações.
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Sua opinião é essencial para melhorar o ambiente de trabalho.
                  </p>
                </>
              )}

              {/* Instruções */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: "⏱", title: "~10 minutos", sub: "Tempo estimado" },
                  { icon: "☑", title: "Uma resposta", sub: "Por pergunta" },
                  { icon: "💬", title: "Dúvidas?", sub: "Contate seu supervisor" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
                    <p className="text-xl">{item.icon}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted">{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* Aceite */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                />
                <span className="text-sm text-muted">
                  Estou ciente de que este questionário é <span className="font-medium text-foreground">anônimo</span>, que minha participação é <span className="font-medium text-foreground">voluntária</span> e que os resultados serão utilizados para fins de <span className="font-medium text-foreground">melhoria do ambiente de trabalho</span>.
                </span>
              </label>

              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  disabled={!agreed}
                  onClick={() => setStep(2)}
                >
                  Iniciar questionário →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 2 ? (
        <Card className="border-border bg-card p-8">
          <h2 className="text-lg font-semibold text-foreground">
            Dados profissionais
          </h2>
          <p className="mt-1 text-sm text-muted">
            Informações agregadas para análise (sem identificação individual).
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={handleSubmit((values) => {
              setDemo(values);
              setStep(3);
            })}
          >
            <Input
              label="Setor"
              error={errors.department?.message}
              {...register("department")}
            />
            <Input
              label="Cargo / nível hierárquico"
              error={errors.job_level?.message}
              {...register("job_level")}
            />
            <Select
              label="Gênero"
              error={errors.gender?.message}
              {...register("gender")}
            >
              <option value="">Selecione</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="nao_binario">Não-binário</option>
              <option value="prefiro_nao_informar">Prefiro não informar</option>
            </Select>
            <Select
              label="Faixa etária"
              error={errors.age_range?.message}
              {...register("age_range")}
            >
              <option value="">Selecione</option>
              <option value="ate_29">Até 29</option>
              <option value="30_39">30–39</option>
              <option value="40_49">40–49</option>
              <option value="50_59">50–59</option>
              <option value="60_mais">60 ou mais</option>
            </Select>
            <Select
              label="Tempo de empresa"
              error={errors.tenure_range?.message}
              {...register("tenure_range")}
            >
              <option value="">Selecione</option>
              <option value="ate_1">Até 1 ano</option>
              <option value="1_5">1 a 5 anos</option>
              <option value="6_10">6 a 10 anos</option>
              <option value="10_mais">Mais de 10 anos</option>
            </Select>
            <Select
              label="Modalidade de trabalho"
              error={errors.work_type?.message}
              {...register("work_type")}
            >
              <option value="">Selecione</option>
              <option value="presencial">Presencial</option>
              <option value="hibrido">Híbrido</option>
              <option value="remoto">Remoto</option>
              <option value="externo">Externo / campo</option>
            </Select>
            <div className="flex justify-between gap-3">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Continuar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="sticky top-0 z-10 rounded-xl border border-border bg-surface/95 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Questões HSE-IT · {answeredCount}/35
              </p>
              <p className="text-sm font-medium text-foreground">{progress}%</p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-card">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {grouped.map((g) => (
            <Card key={g.key} className="border-border bg-card p-6">
              <h3 className="text-base font-semibold text-foreground">
                {g.label}
              </h3>
              <div className="mt-4 space-y-6">
                {g.items.map((q) => (
                  <div key={q.id} className="space-y-3">
                    <p className="text-sm text-foreground">
                      <span className="text-muted">{q.id}.</span> {q.text}
                    </p>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((v) => {
                        const active = answers[q.id] === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAnswer(q.id, v)}
                            className={`rounded-lg border px-2 py-3 text-center text-[11px] leading-tight sm:text-xs ${
                              active
                                ? "border-accent bg-accent/15 text-foreground"
                                : "border-border bg-surface text-muted hover:border-accent/50"
                            }`}
                          >
                            <div className="font-semibold text-foreground">
                              {v}
                            </div>
                            <div className="mt-1 text-[10px] text-muted sm:text-[11px]">
                              {labels[v - 1]}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button
              type="button"
              loading={submitting}
              onClick={() => void submitAll()}
            >
              Enviar respostas
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
