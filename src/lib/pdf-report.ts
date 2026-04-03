import { jsPDF } from "jspdf";
import type { Company, Engineer, Campaign } from "@/types";
import type { HseDomainKey } from "@/lib/hse-questions";
import { HSE_DOMAIN_ORDER, HSE_QUESTIONS } from "@/lib/hse-questions";
import { classify, buildConclusionText, overallAverage } from "@/lib/hse-scoring";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AepPdfInput {
  campaign: Campaign;
  company: Company;
  engineer: Engineer;
  companyReport: {
    legalName: string;
    cnpj: string;
    address: string;
    activity: string;
    sampleNotes: string;
  };
  domainScores: Record<HseDomainKey, number>;
  perQuestionAvg: Record<number, number>;
  respondentCount: number;
  conclusionsOverride?: string;
  limitationsText?: string;
  logoBase64?: string;
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function scoreColor(score: number): [number, number, number] {
  return hexToRgb(classify(score).color);
}

// ─── Page layout constants ────────────────────────────────────────────────────
const PW = 210; // A4 width mm
const PH = 297; // A4 height mm
const ML = 20;  // left margin
const MR = 20;  // right margin
const CW = PW - ML - MR; // content width 170mm
const CT = 25;  // content top
const CB = 272; // content bottom
const NAVY: [number, number, number] = [26, 54, 97];
const BLUE: [number, number, number] = [0, 84, 166];
const LGRAY: [number, number, number] = [220, 220, 220];
const MGRAY: [number, number, number] = [150, 150, 150];
const BLACK: [number, number, number] = [30, 30, 30];
const WHITE: [number, number, number] = [255, 255, 255];

// ─── Header / footer ─────────────────────────────────────────────────────────
function addHeader(doc: jsPDF, engineer: Engineer, monthYear: string, logoBase64?: string) {
  // Top thick line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(ML, 10, PW - MR, 10);
  // Thin line
  doc.setLineWidth(0.3);
  doc.line(ML, 11.5, PW - MR, 11.5);

  // Logo or engineer name
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", ML, 4, 22, 7, "", "FAST"); } catch { /* skip */ }
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(engineer.name.toUpperCase(), ML, 8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MGRAY);
    doc.text(engineer.company_name, ML, 11);
  }

  // AEP date right
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MGRAY);
  doc.text(`AEP – ${monthYear}`, PW - MR, 8, { align: "right" });
}

function addFooter(doc: jsPDF, engineer: Engineer, pageNum: number) {
  // Thin line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.line(ML, 275, PW - MR, 275);
  // Thick line
  doc.setLineWidth(0.8);
  doc.line(ML, 276.5, PW - MR, 276.5);

  const parts = [
    engineer.company_name,
    engineer.email,
    engineer.phone ?? null,
    engineer.website ?? null,
  ].filter(Boolean).join(" | ");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MGRAY);
  doc.text(parts, PW / 2, 281, { align: "center" });
  doc.text(String(pageNum), PW - MR, 281, { align: "right" });
}

function newPage(doc: jsPDF, engineer: Engineer, monthYear: string, counter: { n: number }, logoBase64?: string): number {
  doc.addPage();
  counter.n++;
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, PW, PH, "F");
  addHeader(doc, engineer, monthYear, logoBase64);
  addFooter(doc, engineer, counter.n);
  return CT;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────
function bodyText(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH = 5): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}

function sectionTitle(doc: jsPDF, num: string, title: string, x: number, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(num, x, y);
  doc.setTextColor(...BLACK);
  doc.text(title, x + doc.getTextWidth(num) + 2, y);
  return y + 7;
}

function subTitle(doc: jsPDF, text: string, x: number, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(text, x, y);
  return y + 6;
}

function checkPage(doc: jsPDF, y: number, needed: number, engineer: Engineer, monthYear: string, counter: { n: number }, logoBase64?: string): number {
  if (y + needed > CB) return newPage(doc, engineer, monthYear, counter, logoBase64);
  return y;
}

// ─── Table helpers ────────────────────────────────────────────────────────────
function drawTableRow(doc: jsPDF, cols: { text: string; w: number; bold?: boolean; bg?: [number,number,number]; fg?: [number,number,number] }[], x: number, y: number, h = 7) {
  let cx = x;
  cols.forEach((col) => {
    if (col.bg) { doc.setFillColor(...col.bg); doc.rect(cx, y, col.w, h, "F"); }
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.rect(cx, y, col.w, h, "S");
    doc.setFont("helvetica", col.bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...(col.fg ?? BLACK));
    const lines = doc.splitTextToSize(col.text, col.w - 4);
    doc.text(lines[0] ?? "", cx + 2, y + h / 2 + 1.5);
    cx += col.w;
  });
}

// ─── Vertical bar chart (domain overview) ─────────────────────────────────────
function drawVerticalBarChart(
  doc: jsPDF,
  rows: { label: string; avg: number }[],
  x: number, y: number, w: number, h: number
) {
  if (rows.length === 0) return y + h;
  const axisW = 8;
  const labelH = 12;
  const chartX = x + axisW;
  const chartW = w - axisW;
  const barAreaH = h - labelH;
  const barW = (chartW / rows.length) * 0.55;
  const gap = chartW / rows.length;

  // Y-axis lines and labels
  doc.setFontSize(7);
  doc.setTextColor(...MGRAY);
  for (let v = 0; v <= 5; v++) {
    const ly = y + barAreaH - (v / 5) * barAreaH;
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(chartX, ly, chartX + chartW, ly);
    doc.text(v.toFixed(2).replace(".", ","), x + axisW - 1, ly + 1, { align: "right" });
  }

  // Bars
  rows.forEach((row, i) => {
    const bx = chartX + i * gap + (gap - barW) / 2;
    const barH2 = (row.avg / 5) * barAreaH;
    const by = y + barAreaH - barH2;
    const [r, g, b] = scoreColor(row.avg);
    doc.setFillColor(r, g, b);
    doc.rect(bx, by, barW, barH2, "F");
    // Score above bar
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    doc.text(row.avg.toFixed(2).replace(".", ","), bx + barW / 2, by - 1.5, { align: "center" });
    // Label below
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const labelLines = doc.splitTextToSize(row.label, gap - 2);
    labelLines.slice(0, 2).forEach((line: string, li: number) => {
      doc.text(line, bx + barW / 2, y + barAreaH + 4 + li * 4, { align: "center" });
    });
  });

  return y + h;
}

// ─── Horizontal bar chart (per-question) ─────────────────────────────────────
function drawHorizontalBarChart(
  doc: jsPDF,
  domainLabel: string,
  domainAvg: number,
  questions: { id: number; text: string; avg: number }[],
  x: number, startY: number, w: number
): number {
  const LW = 68; // label column width
  const BW = w - LW - 12; // bar area width
  const rowH = 9;
  const headerH = 10;
  const scaleH = 6;
  const [dr, dg, db] = scoreColor(domainAvg);

  let y = startY;

  // Box top
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.3);

  // Title bar
  doc.setFillColor(245, 245, 245);
  doc.rect(x, y, w, headerH, "F");
  doc.rect(x, y, w, headerH, "S");

  // Colored square + title
  doc.setFillColor(dr, dg, db);
  doc.rect(x + w / 2 - 20, y + 2.5, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(`Média = ${domainAvg.toFixed(2).replace(".", ",")}`, x + w / 2 - 12, y + 7);

  y += headerH;

  // Scale header
  doc.setFillColor(240, 240, 240);
  doc.rect(x + LW, y, BW + 12, scaleH, "F");
  doc.rect(x, y, w, scaleH, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MGRAY);
  for (let v = 0; v <= 5; v++) {
    const bx = x + LW + (v / 5) * BW;
    doc.text(v.toFixed(2).replace(".", ","), bx, y + 4, { align: "center" });
    // Vertical grid line
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.15);
  }
  y += scaleH;

  // Question rows
  questions.forEach((q) => {
    const [qr, qg, qb] = scoreColor(q.avg);
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, rowH, "S");

    // Question text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BLACK);
    const qlines = doc.splitTextToSize(`${q.id}. ${q.text}`, LW - 4);
    const displayLine = qlines[0] + (qlines.length > 1 ? "…" : "");
    doc.text(displayLine, x + 2, y + rowH / 2 + 1.5);

    // Gray background bar
    doc.setFillColor(235, 235, 235);
    doc.rect(x + LW, y + 1.5, BW, rowH - 3, "F");

    // Vertical grid lines
    for (let v = 1; v <= 5; v++) {
      const bx = x + LW + (v / 5) * BW;
      doc.setDrawColor(...LGRAY);
      doc.setLineWidth(0.15);
      doc.line(bx, y + 1.5, bx, y + rowH - 1.5);
    }

    // Colored bar
    const barW2 = (q.avg / 5) * BW;
    doc.setFillColor(qr, qg, qb);
    doc.rect(x + LW, y + 1.5, barW2, rowH - 3, "F");

    // Score
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(q.avg.toFixed(2).replace(".", ","), x + LW + BW + 10, y + rowH / 2 + 1.5, { align: "right" });

    y += rowH;
  });

  // Bottom border
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + w, y);

  return y + 5;
}

// ─── Fixed text blocks ────────────────────────────────────────────────────────
const T_OBJETIVO = `Esta Avaliação Ergonômica Preliminar (AEP) tem como objetivo identificar e analisar de forma técnica os fatores de riscos psicossociais presentes no ambiente laboral, que podem contribuir para o estresse ocupacional e impactar a saúde, o bem-estar e a produtividade dos trabalhadores. Este relatório está em estrita conformidade com a NR-17 e NR-1 (GRO e PGR), atendendo ao Guia de Informações sobre Fatores de Riscos Psicossociais Relacionados ao Trabalho (MTE) e HSE-SIT-UK, garantindo alinhamento com as melhores práticas nacionais e internacionais em saúde e segurança do trabalho.\n\nAlém de cumprir os requisitos legais, esta AEP-FRPRT oferece subsídios técnicos robustos para a tomada de decisão quanto à necessidade de aprofundamento por meio de Análise Ergonômica do Trabalho (AET), priorização de medidas de controle e definição de planos de ação alinhados ao PGR, visando ambientes de trabalho mais seguros, saudáveis e produtivos.`;

const T_METODOLOGIA_P1 = `Para a realização desta Avaliação Ergonômica Preliminar (AEP), foi utilizado o Stress Indicator Tool (SIT), ferramenta de avaliação psicossocial internacionalmente validada pelo Health and Safety Executive (HSE) do Reino Unido (UK) e adaptada para o contexto organizacional brasileiro, considerando as exigências da NR-1, NR-17 e o Guia de Fatores Psicossociais Relacionados ao Trabalho do MTE.\n\nO instrumento é composto por 35 perguntas estruturadas distribuídas nos domínios Demandas, Controle, Apoio, Relacionamentos, Papel e Mudanças, reconhecidos pela literatura e pelas normas técnicas como determinantes para a saúde mental e o bem-estar dos trabalhadores.`;

const T_METODOLOGIA_BULLETS = [
  "Coleta sistemática e anônima das percepções dos trabalhadores, garantindo confidencialidade e autenticidade das respostas;",
  "Categorização, tabulação e análise estatística das respostas, permitindo o mapeamento de áreas críticas e pontos de atenção;",
  "Interpretação técnica alinhada aos dispositivos legais vigentes e boas práticas internacionais de SST, possibilitando rastreabilidade e subsidiando o planejamento de ações alinhadas ao GRO e ao PGR.",
];

const T_METODOLOGIA_P2 = `O uso do SIT neste processo permite a identificação consistente de riscos psicossociais presentes no ambiente laboral, sendo um ponto de partida para priorização de medidas corretivas e preventivas, além de possibilitar o monitoramento contínuo da evolução das condições psicossociais ao longo do tempo.\n\nRessalta-se que o SIT é uma das ferramentas recomendadas pelo HSE-UK por sua eficácia na coleta de percepções dos trabalhadores de forma prática e estruturada. Os resultados obtidos refletem a percepção dos colaboradores em determinado momento e contexto, o que reforça a necessidade de reavaliações periódicas conforme o ciclo de monitoramento do PGR e do GRO.`;

const T_AMOSTRA_P1 = `Há várias questões a serem consideradas na seleção de uma população de pesquisa: quais listas de trabalhadores podem ser usadas; quantos trabalhadores você precisa amostrar; como selecionar uma amostra de trabalhadores.\n\nSe você estiver selecionando uma amostra de trabalhadores, precisará garantir que tenha uma lista atualizada dos trabalhadores selecionados. A lista pode ser a folha de pagamento, registros de funcionários ou fonte similar. Uma pesquisa com todos os seus funcionários sempre fornecerá uma imagem mais precisa do que uma amostra.`;

const T_PARTICIPACAO = `A participação ativa, genuína e informada dos trabalhadores é um pilar essencial para a efetividade desta Avaliação Ergonômica Preliminar (AEP), estando em conformidade com os princípios de participação previstos na NR-1 (item 1.5.3.1) e NR-17, que destacam a importância do envolvimento dos trabalhadores na identificação e gestão dos riscos ocupacionais, incluindo fatores psicossociais relacionados ao trabalho.\n\nOs trabalhadores são os que vivenciam diariamente os processos, as demandas e os desafios do ambiente laboral, possuindo conhecimento prático e percepções realistas sobre os fatores que impactam sua saúde, bem-estar, segurança e desempenho.\n\nA coleta de percepções diretamente com os trabalhadores, de forma anônima e confidencial, reduz vieses de avaliação e possibilita a identificação de fatores subjetivos que não seriam captados apenas por métodos observacionais ou de análise documental. Além disso, a participação efetiva dos colaboradores reforça o compromisso coletivo com a saúde e segurança, incentivando o engajamento nas ações de melhoria que venham a ser implementadas posteriormente.\n\nSem o engajamento dos trabalhadores, os dados coletados podem apresentar lacunas significativas, tornando o diagnóstico impreciso ou incompleto e comprometendo a eficácia das medidas corretivas e preventivas propostas. Por este motivo, destaca-se que a qualidade das informações obtidas depende diretamente de um ambiente de confiança, onde os trabalhadores sintam-se seguros para expressar suas percepções de forma honesta, sem receio de represálias ou julgamentos.\n\nA promoção de transparência, escuta ativa e diálogo constante são estratégias fundamentais para garantir esta participação, alinhadas ao ciclo de melhoria contínua do Gerenciamento de Riscos Ocupacionais (GRO) e ao Programa de Gerenciamento de Riscos (PGR).`;

const T_LIMITACOES = `Esta Avaliação Ergonômica Preliminar (AEP) possui caráter preliminar, sendo realizada em conformidade com os requisitos da NR-17 (Portaria MTP n° 423/2021), item 17.3.2, que determina a necessidade de avaliação inicial para subsidiar o gerenciamento dos fatores de risco relacionados à ergonomia no ambiente de trabalho.\n\nA AEP tem como objetivo identificar indícios de fatores de risco, subsidiar o Programa de Gerenciamento de Riscos (PGR) e o Gerenciamento de Riscos Ocupacionais (GRO), conforme exigido pela NR-1 (Portaria SEPRT n° 6.730/2020), e auxiliar na priorização de medidas corretivas e preventivas no ambiente laboral. No entanto, este instrumento não substitui a Análise Ergonômica do Trabalho (AET), que possui caráter aprofundado e investigativo, exigindo observações diretas em campo, medições ambientais e biomecânicas, entrevistas e avaliações detalhadas das condições de trabalho.\n\nAlém disso, os resultados obtidos representam a percepção dos trabalhadores sobre o ambiente de trabalho em um período específico, podendo sofrer alterações em virtude de mudanças organizacionais, tecnológicas ou de processos de trabalho. Portanto, os dados devem ser utilizados de forma crítica, sendo recomendada sua atualização periódica para manter a rastreabilidade das informações e a efetividade das ações de prevenção e controle implementadas.\n\nPor fim, destaca-se que a participação dos trabalhadores nesta avaliação é voluntária e confidencial, e, embora a amostra seja representativa, podem existir limitações relacionadas a fatores como receio de exposição, interpretação subjetiva das perguntas e condições específicas do local de trabalho não observadas no momento da avaliação.`;

const T_RESPONSABILIDADES = `Ressalta-se que a responsabilidade pela implementação, monitoramento e acompanhamento das ações corretivas e preventivas recomendadas neste relatório é integralmente da empresa, conforme estabelece a NR-1 (item 1.5.3.1) e o Programa de Gerenciamento de Riscos (PGR), cabendo à organização avaliar a aplicabilidade das medidas no contexto de suas operações, garantindo a conformidade com as normas regulamentadoras vigentes e as melhores práticas de saúde, segurança e ergonomia ocupacional.\n\nEste relatório, elaborado com rigor técnico e em conformidade com a NR-1, NR-17 e o Guia de Fatores de Riscos Psicossociais Relacionados ao Trabalho, visa subsidiar a gestão da empresa na tomada de decisões informadas, mantendo rastreabilidade e evidências técnicas para auditorias, fiscalizações e processos de melhoria contínua do sistema de gestão de SST.`;

// ─── Main generator ───────────────────────────────────────────────────────────
export function generateAepPdf(input: AepPdfInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const now = new Date();
  const monthYear = `${months[now.getMonth()]}/${now.getFullYear()}`;
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const cityStr = input.engineer.city ?? "São Paulo";
  const counter = { n: 1 };
  const { engineer, company, companyReport } = input;
  const logo = input.logoBase64;

  // ── PAGE 1: Cover ──────────────────────────────────────────────────────────
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, PW, PH, "F");
  addHeader(doc, engineer, monthYear, logo);
  addFooter(doc, engineer, 1);

  // AEP huge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(72);
  doc.setTextColor(...NAVY);
  doc.text("AEP", PW / 2, 90, { align: "center" });

  // Subtitle
  doc.setFontSize(18);
  doc.setTextColor(...BLUE);
  doc.text("Avaliação Ergonômica Preliminar", PW / 2, 103, { align: "center" });

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MGRAY);
  doc.text("RELATÓRIO DE FATORES DE RISCOS PSICOSSOCIAIS", PW / 2, 112, { align: "center" });
  doc.text("RELACIONADOS AO TRABALHO (FRPRT)", PW / 2, 117, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("NR-01, NR-17, Guia de Fatores Psicossociais, HSE-SIT-UK", PW / 2, 125, { align: "center" });

  // Company name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  const cLines = doc.splitTextToSize(companyReport.legalName.toUpperCase(), 140);
  let cy = 150;
  cLines.forEach((line: string) => { doc.text(line, PW / 2, cy, { align: "center" }); cy += 9; });

  // City
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MGRAY);
  doc.text(`${company.city ?? ""} (${company.state ?? ""})`.trim().replace(/^\(|\)$/g, ""), PW / 2, cy + 3, { align: "center" });

  // Unit (MATRIZ default)
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text("MATRIZ", PW / 2, cy + 13, { align: "center" });

  // Year range
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...BLUE);
  doc.text(`${now.getFullYear()}/${now.getFullYear() + 1}`, PW / 2, cy + 25, { align: "center" });

  // ── PAGE 2: Index ──────────────────────────────────────────────────────────
  doc.addPage();
  counter.n++;
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, PW, PH, "F");
  addHeader(doc, engineer, monthYear, logo);
  addFooter(doc, engineer, counter.n);

  let y = CT;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("ÍNDICE", PW / 2, y, { align: "center" });
  y += 12;

  const toc: [string, string, string][] = [
    ["1", "IDENTIFICAÇÃO", "3"],
    ["1.1", "Identificação da Empresa", "3"],
    ["1.1.1", "Comprovante de Inscrição e de Situação Cadastral", "4"],
    ["1.2", "Responsável pela Elaboração", "5"],
    ["2", "OBJETIVO", "6"],
    ["3", "METODOLOGIA", "7"],
    ["3.1", "Selecionando uma Amostra", "8"],
    ["3.1.1", "Lista de trabalhadores", "8"],
    ["3.1.2", "Tamanho mínimo de amostra recomendado", "8"],
    ["3.2", "Classificação Recomendada pela HSE", "9"],
    ["4", "IMPORTÂNCIA DA PARTICIPAÇÃO DOS TRABALHADORES", "10"],
    ["5", "RESULTADOS GERAIS", "12"],
    ["5.1", "Gráficos dos Resultados", "13"],
    ["5.1.1", "Demandas", "13"],
    ["5.1.2", "Controle", "13"],
    ["5.1.3", "Apoio da Gestão", "14"],
    ["5.1.4", "Suporte dos Colegas", "14"],
    ["5.1.5", "Relacionamentos", "15"],
    ["5.1.6", "Clareza de Função", "15"],
    ["5.1.7", "Gestão de Mudanças", "16"],
    ["6", "CONCLUSÕES E RECOMENDAÇÕES", "17"],
    ["7", "LIMITAÇÕES", "18"],
    ["8", "RESPONSABILIDADES", "19"],
  ];
  toc.forEach(([num, title, pg]) => {
    const depth = num.split(".").length; // 1 = top, 2 = sub, 3 = sub-sub
    const isBold = depth === 1;
    const indent = ML + (depth - 1) * 6;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(depth === 3 ? 8.5 : 9);
    doc.setTextColor(...(isBold ? NAVY : BLACK));
    doc.text(`${num}  ${title}`, indent, y);
    doc.setTextColor(...MGRAY);
    // Dots
    const dotStart = indent + doc.getTextWidth(`${num}  ${title}`) + 2;
    const dotEnd = PW - MR - 10;
    doc.setLineWidth(0.1);
    doc.setDrawColor(...LGRAY);
    for (let dx = dotStart; dx < dotEnd; dx += 2) { doc.text(".", dx, y); }
    doc.setTextColor(...BLACK);
    doc.text(pg, PW - MR, y, { align: "right" });
    y += 6;
  });

  // ── PAGE 3: Section 1 – Identificação ─────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "1", "IDENTIFICAÇÃO", ML, y);
  y += 3;
  y = subTitle(doc, "1.1  IDENTIFICAÇÃO DA EMPRESA", ML, y);
  y += 2;

  const idRows: [string, string][] = [
    ["Nome Empresarial", companyReport.legalName],
    ["Nome Fantasia", company.trade_name ?? "—"],
    ["CNPJ", companyReport.cnpj],
    ["Filial", "Matriz"],
    ["Endereço", companyReport.address],
    ["Atividade Econômica", companyReport.activity],
    ["Nº de Trabalhadores", company.employee_count ? `${company.employee_count} trabalhadores` : "—"],
  ];
  idRows.forEach(([label, value]) => {
    y = checkPage(doc, y, 8, engineer, monthYear, counter, logo);
    drawTableRow(doc, [
      { text: label, w: 50, bold: true, bg: [245, 247, 252] },
      { text: value, w: CW - 50 },
    ], ML, y, 8);
    y += 8;
  });

  // ── Page 1.1.1: CNPJ certificate placeholder ──────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "1.1.1", "COMPROVANTE DE INSCRIÇÃO E DE SITUAÇÃO CADASTRAL", ML, y);
  y += 6;

  // Outer dashed frame
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 2], 0);
  doc.rect(ML, y, CW, 120);
  doc.setLineDashPattern([], 0);

  // Inner content
  const boxCx = ML + CW / 2;
  const boxMidY = y + 60;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...LGRAY);
  doc.text("📄", boxCx, boxMidY - 16, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...MGRAY);
  doc.text("ANEXAR COMPROVANTE DE INSCRIÇÃO", boxCx, boxMidY, { align: "center" });
  doc.text("E DE SITUAÇÃO CADASTRAL", boxCx, boxMidY + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MGRAY);
  doc.text("Obtido em: https://www.gov.br/receitafederal", boxCx, boxMidY + 16, { align: "center" });
  doc.text(`CNPJ: ${companyReport.cnpj}`, boxCx, boxMidY + 23, { align: "center" });

  y += 120 + 8;

  // ── Page 1.2: Responsável ─────────────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = subTitle(doc, "1.2  RESPONSÁVEL PELA ELABORAÇÃO", ML, y);
  y += 2;
  const respRows: [string, string][] = [
    ["Nome", engineer.name],
    ["Cargo", "Engenheiro de Saúde e Segurança do Trabalho"],
    ["CREA-SP", engineer.crea],
  ];
  respRows.forEach(([label, value]) => {
    drawTableRow(doc, [
      { text: label, w: 50, bold: true, bg: [245, 247, 252] },
      { text: value, w: CW - 50 },
    ], ML, y, 8);
    y += 8;
  });

  // ── Section 2: Objetivo ────────────────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "2", "OBJETIVO", ML, y);
  y += 3;
  y = bodyText(doc, T_OBJETIVO, ML, y, CW, 5.2);

  // ── Section 3: Metodologia ─────────────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "3", "METODOLOGIA", ML, y);
  y += 3;
  y = bodyText(doc, T_METODOLOGIA_P1, ML, y, CW, 5.2);
  y += 4;
  y = checkPage(doc, y, 10, engineer, monthYear, counter, logo);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text("Este método possibilita uma análise técnica aprofundada dos fatores críticos do ambiente de trabalho, contemplando as seguintes etapas:", ML, y, { maxWidth: CW });
  y += 10;
  T_METODOLOGIA_BULLETS.forEach((b) => {
    y = checkPage(doc, y, 12, engineer, monthYear, counter, logo);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.circle(ML + 2, y - 1.5, 0.8, "F");
    const blines = doc.splitTextToSize(b, CW - 8);
    doc.text(blines, ML + 6, y);
    y += blines.length * 5.2 + 2;
  });
  y += 2;
  y = checkPage(doc, y, 20, engineer, monthYear, counter, logo);
  y = bodyText(doc, T_METODOLOGIA_P2, ML, y, CW, 5.2);

  // 3.1 Selecionando uma amostra
  y += 6;
  y = checkPage(doc, y, 40, engineer, monthYear, counter, logo);
  y = subTitle(doc, "3.1  SELECIONANDO UMA AMOSTRA", ML, y);
  y += 2;
  y = bodyText(doc, T_AMOSTRA_P1, ML, y, CW, 5.2);

  // 3.1.1 Lista de trabalhadores
  y += 5;
  y = checkPage(doc, y, 30, engineer, monthYear, counter, logo);
  y = subTitle(doc, "3.1.1  Lista de trabalhadores", ML, y);
  y += 2;
  y = bodyText(doc, `Se você estiver selecionando uma amostra de trabalhadores, precisará garantir que tenha uma lista atualizada dos trabalhadores elegíveis. A lista pode ser a folha de pagamento, registros de funcionários ou fonte similar. Todos os nomes na lista devem ser verificados antes de serem incluídos. Uma pesquisa com todos os seus funcionários sempre fornecerá uma imagem mais precisa do que uma amostra.`, ML, y, CW, 5.2);

  // 3.1.2 Sample size table
  y += 5;
  y = checkPage(doc, y, 50, engineer, monthYear, counter, logo);
  y = subTitle(doc, "3.1.2  Tamanho mínimo de amostra recomendado", ML, y);
  y += 2;
  const sampleHeader = [
    { text: "Número total de trabalhadores", w: 80, bold: true, bg: [245, 247, 252] as [number,number,number] },
    { text: "Tamanho de amostra recomendado", w: CW - 80, bold: true, bg: [245, 247, 252] as [number,number,number] },
  ];
  drawTableRow(doc, sampleHeader, ML, y);
  y += 7;
  [["< 500","Todos os funcionários"],["501 – 1.000","500 respostas"],["1.001 – 2.000","650 respostas"],["2.001 – 3.000","700 respostas"],["> 3.000","800 respostas"]].forEach(([a, b]) => {
    drawTableRow(doc, [{ text: a, w: 80 }, { text: b, w: CW - 80 }], ML, y);
    y += 7;
  });

  // 3.2 Classification table
  y += 6;
  y = checkPage(doc, y, 55, engineer, monthYear, counter, logo);
  y = subTitle(doc, "3.2  CLASSIFICAÇÃO RECOMENDADA PELA HSE", ML, y);
  y += 2;
  drawTableRow(doc, [
    { text: "Faixa de Média", w: 35, bold: true, bg: [245,247,252] as [number,number,number] },
    { text: "Interpretação", w: 65, bold: true, bg: [245,247,252] as [number,number,number] },
    { text: "Ação Recomendável", w: CW - 100, bold: true, bg: [245,247,252] as [number,number,number] },
  ], ML, y);
  y += 7;
  const classRows = [
    ["4,33 a 5,00", "Muito positivo", "#22c55e", "Manter boas práticas e reforçar fatores protetores"],
    ["3,67 a 4,32", "Positivo", "#86efac", "Monitorar regularmente"],
    ["3,00 a 3,66", "Aceitável com atenção", "#eab308", "Avaliar possíveis melhorias; atenção à tendência"],
    ["2,33 a 2,99", "Risco moderado", "#f97316", "Ações corretivas recomendadas"],
    ["1,00 a 2,32", "Risco elevado", "#ef4444", "Intervenção imediata necessária"],
  ];
  classRows.forEach(([range, label, color, action]) => {
    const [r, g, b] = hexToRgb(color);
    drawTableRow(doc, [
      { text: range, w: 35 },
      { text: label, w: 65, bg: [r, g, b] as [number,number,number], fg: WHITE },
      { text: action, w: CW - 100 },
    ], ML, y);
    y += 7;
  });

  // ── Section 4: Participação ────────────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "4", "IMPORTÂNCIA DA PARTICIPAÇÃO DOS TRABALHADORES", ML, y);
  y += 3;
  y = bodyText(doc, T_PARTICIPACAO, ML, y, CW, 5.2);

  // ── Section 5: Resultados Gerais ───────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "5", "RESULTADOS GERAIS", ML, y);
  y += 4;

  const overall = overallAverage(input.domainScores);
  const domainRows = HSE_DOMAIN_ORDER.map(({ key, label }) => ({ key, label, avg: input.domainScores[key] })).filter(r => r.avg > 0);
  const [or, og, ob] = scoreColor(overall);

  // Two-column results table
  const leftW = 45;
  const rightW = CW - leftW;
  // Header
  drawTableRow(doc, [
    { text: "Média Geral da Empresa", w: leftW, bold: true, bg: [245,247,252] as [number,number,number] },
    { text: "Média por Domínio", w: rightW, bold: true, bg: [245,247,252] as [number,number,number] },
  ], ML, y);
  y += 7;
  const overallH = domainRows.length * 7;
  // Left cell - overall score big
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2);
  doc.setFillColor(or, og, ob, 0.15);
  doc.rect(ML, y, leftW, overallH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(or, og, ob);
  doc.text(overall.toFixed(2).replace(".", ","), ML + leftW / 2, y + overallH / 2 + 4, { align: "center" });
  // Right cell - domain rows
  domainRows.forEach((row) => {
    const [rr, rg, rb] = scoreColor(row.avg);
    doc.setFillColor(rr, rg, rb);
    doc.rect(ML + leftW + rightW - 20, y, 20, 7, "F");
    doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2);
    doc.rect(ML + leftW, y, rightW, 7, "S");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...BLACK);
    doc.text(row.label, ML + leftW + 3, y + 4.5);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...WHITE);
    doc.text(row.avg.toFixed(2).replace(".", ","), ML + leftW + rightW - 10, y + 4.5, { align: "center" });
    y += 7;
  });

  // Sample note
  y += 4;
  doc.setFont("helvetica", "bolditalic"); doc.setFontSize(8); doc.setTextColor(...MGRAY);
  doc.text(`Amostra de respostas: ${input.respondentCount} funcionário(s) responderam`, PW / 2, y, { align: "center" });
  y += 10;

  // Vertical bar chart
  y = checkPage(doc, y, 70, engineer, monthYear, counter, logo);
  const chartH = 55;
  drawVerticalBarChart(doc, domainRows, ML, y, CW, chartH);
  y += chartH + 5;

  // ── Section 5.1: Per-domain charts ────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "5.1", "GRÁFICOS DOS RESULTADOS", ML, y);
  y += 4;

  HSE_DOMAIN_ORDER.forEach(({ key, label }, domainIdx) => {
    const domainAvg = input.domainScores[key];
    if (!domainAvg) return;
    const questions = HSE_QUESTIONS.filter(q => q.domain === key).map(q => ({
      id: q.id,
      text: q.text,
      avg: input.perQuestionAvg[q.id] ?? 0,
    }));
    const subNum = `5.1.${domainIdx + 1}`;
    const estimatedH = 10 + 6 + questions.length * 9 + 8;
    y = checkPage(doc, y, estimatedH + 15, engineer, monthYear, counter, logo);

    // Domain subtitle
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text(`${subNum}  ${label}`, ML, y);
    y += 6;

    y = drawHorizontalBarChart(doc, label, domainAvg, questions, ML, y, CW);
    y += 4;
  });

  // ── Section 6: Conclusões ─────────────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "6", "CONCLUSÕES E RECOMENDAÇÕES", ML, y);
  y += 3;
  const conclusions = input.conclusionsOverride?.trim() || buildConclusionText(input.domainScores, overall);
  y = bodyText(doc, conclusions, ML, y, CW, 5.2);

  // Per-domain recommendations
  y += 5;
  const worstDomains = domainRows.filter(r => r.avg < 3.67).sort((a, b) => a.avg - b.avg);
  if (worstDomains.length > 0) {
    y = checkPage(doc, y, 15, engineer, monthYear, counter, logo);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...BLACK);
    doc.text("Diante disso, recomenda-se:", ML, y);
    y += 6;
    const recs = [
      "Realizar reavaliações periódicas dos riscos psicossociais, preferencialmente a cada 12 meses;",
      "Promover maior participação dos trabalhadores na definição de métodos e organização das tarefas, sempre que possível;",
      "Estimular a flexibilização controlada das atividades, permitindo ao colaborador autonomia na execução (ritmo, sequência ou priorização de tarefas);",
      "Implementar canais de escuta ativa (reuniões periódicas, feedback estruturado), incentivando sugestões e melhorias por parte dos colaboradores.",
    ];
    recs.forEach((rec) => {
      y = checkPage(doc, y, 12, engineer, monthYear, counter, logo);
      doc.setFillColor(...BLACK);
      doc.circle(ML + 2, y - 1.5, 0.8, "F");
      const rlines = doc.splitTextToSize(rec, CW - 8);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BLACK);
      doc.text(rlines, ML + 6, y);
      y += rlines.length * 5.2 + 2;
    });
  }

  // ── Section 7: Limitações ─────────────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "7", "LIMITAÇÕES", ML, y);
  y += 3;
  y = bodyText(doc, input.limitationsText?.trim() || T_LIMITACOES, ML, y, CW, 5.2);

  // ── Section 8: Responsabilidades ──────────────────────────────────────────
  y = newPage(doc, engineer, monthYear, counter, logo);
  y = sectionTitle(doc, "8", "RESPONSABILIDADES", ML, y);
  y += 10;

  // Date + city
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BLACK);
  doc.text(`${cityStr}, ${dateStr}.`, PW - MR, y, { align: "right" });
  y += 20;

  // Signature lines
  const sigW = 70;
  const sigX1 = PW / 2 - sigW - 5;
  const sigX2 = PW / 2 + 5;
  doc.setDrawColor(...BLACK); doc.setLineWidth(0.3);
  doc.line(sigX1, y, sigX1 + sigW, y);
  doc.line(sigX2, y, sigX2 + sigW, y);
  y += 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...BLACK);
  doc.text(companyReport.legalName, sigX1 + sigW / 2, y, { align: "center", maxWidth: sigW });
  doc.text(`CNPJ: ${companyReport.cnpj}`, sigX1 + sigW / 2, y + 5, { align: "center" });
  doc.text(engineer.name.toUpperCase(), sigX2 + sigW / 2, y, { align: "center" });
  doc.text("ENG.º DE SEGURANÇA DO TRABALHO", sigX2 + sigW / 2, y + 5, { align: "center" });
  doc.text(`CREA-SP: ${engineer.crea}`, sigX2 + sigW / 2, y + 10, { align: "center" });
  y += 20;

  y = checkPage(doc, y, 30, engineer, monthYear, counter, logo);
  y = bodyText(doc, T_RESPONSABILIDADES, ML, y, CW, 5.2);

  return doc;
}
