import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Neutral, printable description of any Aaha report — built from live data, never hardcoded. */
export type ReportSectionDoc =
  | { type: "text"; title: string; body: string }
  | { type: "list"; title: string; items: string[] }
  | { type: "table"; title: string; columns: string[]; rows: string[][] };

export type ReportDoc = {
  title: string;
  patientName?: string | null;
  reportId?: string | null;
  date?: Date | string | null;
  score?: { value: number; max: number; label?: string; description?: string } | null;
  summary?: string | null;
  sections: ReportSectionDoc[];
};

const BRAND: [number, number, number] = [17, 94, 89];
const INK: [number, number, number] = [23, 30, 38];
const MUTED: [number, number, number] = [110, 122, 133];

function toDate(value: ReportDoc["date"]) {
  if (!value) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function safe(part: string) {
  return part.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
}

/** AAHA_Health_Report_<PatientName>_<YYYY-MM-DD>.pdf with safe fallbacks. */
export function reportFileName(doc: ReportDoc) {
  const date = toDate(doc.date).toISOString().slice(0, 10);
  const name = safe(doc.patientName ?? "");
  return ["AAHA_Health_Report", name || "Patient", date].filter(Boolean).join("_") + ".pdf";
}

export function buildReportPdf(doc: ReportDoc): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const page = { w: pdf.internal.pageSize.getWidth(), h: pdf.internal.pageSize.getHeight() };
  const M = 44;
  const width = page.w - M * 2;
  let y = 0;

  const ensure = (needed: number) => {
    if (y + needed <= page.h - 56) return;
    pdf.addPage();
    y = M;
  };

  const text = (
    value: string,
    size: number,
    color: [number, number, number],
    style: "normal" | "bold" = "normal",
    gap = 6,
  ) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(value, width) as string[];
    for (const line of lines) {
      ensure(size + gap);
      pdf.text(line, M, y + size);
      y += size + gap;
    }
  };

  // ── Header band ──────────────────────────────────────────────────────────
  pdf.setFillColor(...BRAND);
  pdf.rect(0, 0, page.w, 96, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("AAHA", M, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Health Assessment Report", M, 60);
  pdf.setFontSize(9);
  pdf.text(
    toDate(doc.date).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    page.w - M,
    42,
    { align: "right" },
  );
  if (doc.reportId) pdf.text(`Report ID ${doc.reportId}`, page.w - M, 58, { align: "right" });
  if (doc.patientName) pdf.text(doc.patientName, page.w - M, 74, { align: "right" });

  y = 124;
  text(doc.title, 16, INK, "bold", 8);

  if (doc.score) {
    ensure(70);
    pdf.setDrawColor(226, 232, 236);
    pdf.setFillColor(246, 249, 249);
    pdf.roundedRect(M, y, width, 62, 8, 8, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(26);
    pdf.setTextColor(...BRAND);
    pdf.text(`${doc.score.value}`, M + 18, y + 40);
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text(`of ${doc.score.max}`, M + 18 + pdf.getTextWidth(`${doc.score.value}`) + 8, y + 40);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...INK);
    if (doc.score.label) pdf.text(doc.score.label, M + 130, y + 26);
    if (doc.score.description) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      const lines = pdf.splitTextToSize(doc.score.description, width - 150) as string[];
      pdf.text(lines.slice(0, 3), M + 130, y + 42);
    }
    y += 78;
  }

  if (doc.summary) {
    text("Executive summary", 12, BRAND, "bold", 6);
    text(doc.summary, 10, INK, "normal", 5);
    y += 8;
  }

  for (const section of doc.sections) {
    if (section.type === "list" && section.items.filter(Boolean).length === 0) continue;
    if (section.type === "table" && section.rows.length === 0) continue;
    if (section.type === "text" && !section.body?.trim()) continue;

    ensure(40);
    text(section.title, 12, BRAND, "bold", 6);

    if (section.type === "text") {
      text(section.body, 10, INK, "normal", 5);
    } else if (section.type === "list") {
      for (const item of section.items.filter(Boolean)) text(`•  ${item}`, 10, INK, "normal", 4);
    } else {
      autoTable(pdf, {
        startY: y,
        margin: { left: M, right: M },
        head: [section.columns],
        body: section.rows,
        styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: INK },
        headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [246, 249, 249] },
      });
      y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }
    y += 10;
  }

  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text("AAHA Companion · Not a diagnosis — for clinical review", M, page.h - 28);
    pdf.text(`Page ${i} of ${pages}`, page.w - M, page.h - 28, { align: "right" });
  }

  return pdf;
}

/** Generates the PDF and triggers a browser download without leaving the page. */
export function downloadReportPdf(doc: ReportDoc) {
  const pdf = buildReportPdf(doc);
  const name = reportFileName(doc);
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return name;
}
