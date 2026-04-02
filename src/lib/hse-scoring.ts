import type { RiskLevel } from "@/types";
import {
  HSE_DOMAIN_ORDER,
  HSE_QUESTIONS,
  type HseDomainKey,
} from "@/lib/hse-questions";

export interface RawResponse {
  question_id: number;
  /** Resposta na escala 1–5 (Nunca … Sempre) conforme formulário */
  raw_score: number;
}

export interface ClassifyResult {
  label: string;
  color: string;
  bg: string;
  riskLevel: RiskLevel;
}

const DOMAIN_LABEL: Record<HseDomainKey, string> = {
  demandas: "Demandas",
  controle: "Controle",
  apoio_gestao: "Apoio da Gestão",
  suporte_colegas: "Suporte dos Colegas",
  relacionamentos: "Relacionamentos",
  clareza_funcao: "Clareza de Função",
  gestao_mudancas: "Gestão de Mudanças",
};

export function answerToHseScore(
  questionId: number,
  rawScore: number,
): number {
  const q = HSE_QUESTIONS.find((x) => x.id === questionId);
  if (!q) throw new Error(`Questão inválida: ${questionId}`);
  if (rawScore < 1 || rawScore > 5) {
    throw new Error("Pontuação deve estar entre 1 e 5");
  }
  return q.inverted ? 6 - rawScore : rawScore;
}

export function calcGroupScores(
  responses: RawResponse[],
): Record<HseDomainKey, number> {
  const byDomain: Record<HseDomainKey, number[]> = {
    demandas: [],
    controle: [],
    apoio_gestao: [],
    suporte_colegas: [],
    relacionamentos: [],
    clareza_funcao: [],
    gestao_mudancas: [],
  };

  for (const r of responses) {
    const q = HSE_QUESTIONS.find((x) => x.id === r.question_id);
    if (!q) continue;
    const s = answerToHseScore(r.question_id, r.raw_score);
    byDomain[q.domain].push(s);
  }

  const out = {} as Record<HseDomainKey, number>;
  for (const { key } of HSE_DOMAIN_ORDER) {
    const arr = byDomain[key];
    out[key] =
      arr.length === 0
        ? 0
        : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) /
          100;
  }
  return out;
}

export function classify(score: number): ClassifyResult {
  if (score >= 4.33) {
    return {
      label: "Muito positivo",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
      riskLevel: "muito_positivo",
    };
  }
  if (score >= 3.67) {
    return {
      label: "Positivo",
      color: "#86efac",
      bg: "rgba(134,239,172,0.15)",
      riskLevel: "positivo",
    };
  }
  if (score >= 3.0) {
    return {
      label: "Aceitável com atenção",
      color: "#eab308",
      bg: "rgba(234,179,8,0.15)",
      riskLevel: "aceitavel",
    };
  }
  if (score >= 2.33) {
    return {
      label: "Risco moderado",
      color: "#f97316",
      bg: "rgba(249,115,22,0.15)",
      riskLevel: "moderado",
    };
  }
  return {
    label: "Risco elevado",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    riskLevel: "elevado",
  };
}

export function overallAverage(scores: Record<HseDomainKey, number>): number {
  const vals = HSE_DOMAIN_ORDER.map(({ key }) => scores[key]).filter((v) => v > 0);
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length + Number.EPSILON) * 10000) / 10000;
}

const DOMAIN_RECS: Record<
  HseDomainKey,
  Record<"elevado" | "moderado" | "aceitavel" | "positivo" | "muito_positivo", string>
> = {
  demandas: {
    elevado: "Revisar urgentemente a carga de trabalho. Redistribuir tarefas, eliminar atividades sem valor e estabelecer processos claros de priorização com participação da equipe.",
    moderado: "Revisar distribuição de tarefas e prazos. Mapeie gargalos com a equipe e defina critérios objetivos de priorização.",
    aceitavel: "Monitorar ritmo de trabalho e prazos. Reforçar comunicação sobre expectativas e capacidade real da equipe.",
    positivo: "Boa gestão de demandas. Acompanhar oscilações sazonais e garantir que os prazos permaneçam viáveis.",
    muito_positivo: "Excelente equilíbrio de demandas. Documentar práticas e usá-las como referência para outras áreas.",
  },
  controle: {
    elevado: "Ampliar urgentemente a autonomia dos trabalhadores. Revisar processos engessados e criar mecanismos de participação nas decisões que afetam o trabalho.",
    moderado: "Capacitar líderes para delegação efetiva e criar grupos de trabalho participativos nas decisões operacionais.",
    aceitavel: "Ampliar autonomia nas decisões rotineiras. Criar canais formais para sugestões e participação nas melhorias.",
    positivo: "Bom nível de autonomia e controle. Manter espaços participativos e reconhecer iniciativas da equipe.",
    muito_positivo: "Alta autonomia e senso de controle. Documentar práticas de delegação e replicar em outras áreas.",
  },
  apoio_gestao: {
    elevado: "Intervir imediatamente na qualidade do suporte gerencial. Implementar programa de desenvolvimento de lideranças com foco em escuta ativa, feedback e apoio ao crescimento.",
    moderado: "Treinar lideranças em escuta ativa, feedback construtivo e suporte ao desenvolvimento da equipe.",
    aceitavel: "Implementar rotinas de 1:1 quinzenal e estruturar melhor o suporte gerencial ao dia a dia.",
    positivo: "Boa percepção de apoio da gestão. Manter consistência nas práticas de suporte e feedback.",
    muito_positivo: "Excelente suporte gerencial. Usar as lideranças como mentores internos e referência de boas práticas.",
  },
  suporte_colegas: {
    elevado: "Intervir na dinâmica de equipe. Promover atividades de integração, criar acordos de colaboração e investigar possíveis conflitos interpessoais.",
    moderado: "Promover atividades de integração e criar espaços formais de colaboração e apoio mútuo entre pares.",
    aceitavel: "Fortalecer cultura de cooperação. Reconhecer e incentivar comportamentos colaborativos no cotidiano.",
    positivo: "Boa cooperação entre pares. Manter iniciativas de integração e reconhecimento coletivo.",
    muito_positivo: "Excelente suporte entre colegas. Fortalecer essa cultura e usá-la como diferencial organizacional.",
  },
  relacionamentos: {
    elevado: "Investigar e intervir em conflitos, assédio ou clima hostil. Implementar canal de denúncia seguro e política clara de respeito e combate ao assédio.",
    moderado: "Reforçar normas de convivência e promover treinamento de relacionamento interpessoal e gestão de conflitos.",
    aceitavel: "Monitorar dinâmicas de relacionamento. Reforçar política de respeito e criar canais de diálogo.",
    positivo: "Boas relações interpessoais. Reforçar política de respeito e diversidade continuamente.",
    muito_positivo: "Clima relacional excelente. Documentar e manter as práticas que sustentam esse ambiente.",
  },
  clareza_funcao: {
    elevado: "Revisar urgentemente descrições de cargo e responsabilidades. Realizar reuniões individuais para alinhar expectativas, metas e papel de cada colaborador.",
    moderado: "Revisar descrições de cargo e definir responsabilidades com clareza junto a cada equipe e sua liderança.",
    aceitavel: "Comunicar expectativas de forma mais estruturada. Revisar metas e indicadores com cada colaborador.",
    positivo: "Boa clareza de função e responsabilidades. Manter alinhamentos periódicos para garantir continuidade.",
    muito_positivo: "Funções e responsabilidades muito bem definidas. Documentar e replicar boas práticas de alinhamento.",
  },
  gestao_mudancas: {
    elevado: "Estruturar urgentemente a comunicação de mudanças. Criar plano com antecedência, participação dos envolvidos e canais claros para dúvidas e feedbacks.",
    moderado: "Criar plano estruturado de comunicação para mudanças organizacionais com antecedência e espaços de participação.",
    aceitavel: "Melhorar antecipação das comunicações e criar espaços de consulta prévia antes de implementar mudanças.",
    positivo: "Boa gestão de transições. Manter práticas de comunicação proativa e canais de participação.",
    muito_positivo: "Excelente gestão de mudanças. Documentar o processo e usá-lo como modelo para projetos futuros.",
  },
};

export function buildRecommendations(
  scores: Record<HseDomainKey, number>,
): { domain: string; score: number; text: string; color: string; label: string }[] {
  return HSE_DOMAIN_ORDER
    .filter(({ key }) => scores[key] > 0)
    .map(({ key, label }) => {
      const s = scores[key];
      const c = classify(s);
      return {
        domain: label,
        score: s,
        text: DOMAIN_RECS[key][c.riskLevel],
        color: c.color,
        label: c.label,
      };
    });
}

export function buildConclusionText(
  scores: Record<HseDomainKey, number>,
  overall: number,
): string {
  const o = classify(overall);
  const worst = HSE_DOMAIN_ORDER.map(({ key, label }) => ({
    label,
    s: scores[key],
  }))
    .filter((x) => x.s > 0)
    .sort((a, b) => a.s - b.s)[0];

  const best = HSE_DOMAIN_ORDER.map(({ key, label }) => ({
    label,
    s: scores[key],
  }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)[0];

  let paragraph = `A média geral HSE-IT foi de ${overall.toFixed(2)}, classificada como "${o.label}". `;
  if (best) {
    paragraph += `O domínio com melhor desempenho foi ${best.label} (${best.s.toFixed(2)}). `;
  }
  if (worst && worst.label !== best?.label) {
    paragraph += `O domínio que demanda maior atenção é ${worst.label} (${worst.s.toFixed(2)}). `;
  }
  paragraph +=
    "Recomenda-se integrar estas evidências ao PGR/GRO e ao programa de gerenciamento de riscos psicossociais, com plano de ação participativo e revisão periódica.";
  return paragraph;
}

/** Uma lista de respostas por participante (cada item = 35 linhas ou subset).
 *  Usa média poolada: soma todos os scores do domínio de todos os participantes
 *  e divide pelo total de scores — não faz média de médias.
 */
export function aggregateCampaignScores(
  perParticipant: RawResponse[][],
): Record<HseDomainKey, number> {
  const totals: Record<HseDomainKey, number> = {
    demandas: 0, controle: 0, apoio_gestao: 0,
    suporte_colegas: 0, relacionamentos: 0, clareza_funcao: 0, gestao_mudancas: 0,
  };
  const counts: Record<HseDomainKey, number> = { ...totals };

  if (perParticipant.length === 0) return { ...totals };

  for (const responses of perParticipant) {
    for (const r of responses) {
      const q = HSE_QUESTIONS.find((x) => x.id === r.question_id);
      if (!q) continue;
      const s = answerToHseScore(r.question_id, r.raw_score);
      totals[q.domain] += s;
      counts[q.domain] += 1;
    }
  }

  const out = { ...totals };
  for (const { key } of HSE_DOMAIN_ORDER) {
    out[key] = counts[key] === 0
      ? 0
      : Math.round((totals[key] / counts[key] + Number.EPSILON) * 10000) / 10000;
  }
  return out;
}

export function scoresToDimensionRows(
  scores: Record<HseDomainKey, number>,
  respondents: number,
): {
  dimension: HseDomainKey;
  label: string;
  avg_score: number;
  score_pct: number;
  risk_level: RiskLevel;
  respondents: number;
}[] {
  return HSE_DOMAIN_ORDER.map(({ key }) => {
    const avg = scores[key];
    const c = classify(avg);
    return {
      dimension: key,
      label: DOMAIN_LABEL[key],
      avg_score: avg,
      score_pct: Math.round(((avg - 1) / 4) * 10000) / 100,
      risk_level: c.riskLevel,
      respondents,
    };
  }).filter((r) => r.avg_score > 0);
}
