import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ReportSectionDoc =
  | { type: "text"; title: string; body: string }
  | { type: "list"; title: string; items: string[] }
  | { type: "table"; title: string; columns: string[]; rows: string[][] };

export type ReportDoc = {
  title: string;
  patientName?: string | null;
  patientAge?: number | string | null;
  patientGender?: string | null;
  reportId?: string | null;
  date?: Date | string | null;
  score?: { value: number; max: number; label?: string; description?: string } | null;
  summary?: string | null;
  rawReport?: any; // Contains the full Ambika report
  sections: ReportSectionDoc[];
};

const BRAND: [number, number, number] = [114, 38, 77]; // Maroon header
const ACCENT: [number, number, number] = [24, 91, 87]; // Dark Teal for subheaders
const INK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [100, 100, 100];
const RED: [number, number, number] = [197, 49, 45];
const GREEN: [number, number, number] = [43, 138, 62];
const YELLOW: [number, number, number] = [230, 119, 0];
const BEIGE: [number, number, number] = [245, 240, 235];

function toDate(value: ReportDoc["date"]) {
  if (!value) return new Date();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function safe(part: string) {
  return part.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
}

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
    xOffset = M,
    maxWidth = width
  ) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    if (!value) return;
    const lines = pdf.splitTextToSize(value, maxWidth) as string[];
    for (const line of lines) {
      ensure(size + gap);
      pdf.text(line, xOffset, y + size);
      y += size + gap;
    }
  };

  const renderHeader = () => {
    pdf.setFillColor(...BRAND);
    pdf.rect(0, 0, page.w, 80, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("AAHA", M, 36);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("AI WELLNESS PHC · AN AAROOGYA AI FOUNDATION INITIATIVE", M, 52);
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("HEALTH SCREENING REPORT", page.w - M, 36, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const dateStr = toDate(doc.date).toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric"
    });
    pdf.text(`Report ID ${doc.reportId || "—"} · ${dateStr}`, page.w - M, 52, { align: "right" });
  };

  const renderPatientBox = () => {
    y = 96;
    pdf.setFillColor(...BEIGE);
    pdf.rect(M, y, width, 50, "F");
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...MUTED);
    pdf.text("PATIENT", M + 10, y + 16);
    pdf.text("AGE / GENDER", M + 140, y + 16);
    pdf.text("REPORT ID", M + 260, y + 16);
    pdf.text("SCREENING DATE", M + 360, y + 16);
    pdf.text("CENTRE", M + 470, y + 16);

    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    pdf.text(doc.patientName || "—", M + 10, y + 36);
    const ageGender = [doc.patientAge, doc.patientGender].filter(Boolean).join(" · ") || "—";
    pdf.text(ageGender, M + 140, y + 36);
    pdf.text(doc.reportId || "—", M + 260, y + 36);
    const dateStr = toDate(doc.date).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    pdf.text(dateStr, M + 360, y + 36);
    pdf.text("Aaha Wellness PHC", M + 470, y + 36);
    y += 70;
  };

  const renderAwis = () => {
    if (!doc.score) return;
    pdf.setFillColor(...ACCENT);
    pdf.rect(M, y, width, 24, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("AWIS — Aaroogya Wellness Intelligence Score", M + 10, y + 16);
    y += 24 + 10;

    // Score box
    const isHighRisk = doc.score.label?.toLowerCase().includes("high");
    pdf.setDrawColor(isHighRisk ? RED[0] : GREEN[0], isHighRisk ? RED[1] : GREEN[1], isHighRisk ? RED[2] : GREEN[2]);
    pdf.setLineWidth(1.5);
    pdf.setFillColor(250, 250, 250);
    pdf.rect(M, y, 120, 70, "FD");
    
    pdf.setTextColor(isHighRisk ? RED[0] : GREEN[0], isHighRisk ? RED[1] : GREEN[1], isHighRisk ? RED[2] : GREEN[2]);
    pdf.setFontSize(32);
    pdf.text(`${doc.score.value}`, M + 60, y + 40, { align: "center" });
    pdf.setFontSize(12);
    pdf.text(`/${doc.score.max}`, M + 90, y + 40);
    pdf.setFontSize(10);
    pdf.text(doc.score.label?.toUpperCase() || "", M + 60, y + 60, { align: "center" });

    // Text next to score
    pdf.setTextColor(...INK);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    
    const summaryLines = pdf.splitTextToSize(doc.summary || "", width - 140) as string[];
    let textY = y + 16;
    for (const line of summaryLines) {
      pdf.text(line, M + 140, textY);
      textY += 14;
    }

    if (doc.score.description) {
      textY += 4;
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...RED);
      pdf.text("ACTION: ", M + 140, textY);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...INK);
      const actionLines = pdf.splitTextToSize(doc.score.description, width - 140 - pdf.getTextWidth("ACTION: ")) as string[];
      pdf.text(actionLines[0] || "", M + 140 + pdf.getTextWidth("ACTION: "), textY);
      for (let i = 1; i < actionLines.length; i++) {
        textY += 14;
        pdf.text(actionLines[i], M + 140, textY);
      }
    }
    y += 90;
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("high") || s.includes("abnormal") || s.includes("severe")) return RED;
    if (s.includes("normal") || s.includes("optimal") || s.includes("good")) return GREEN;
    if (s.includes("borderline") || s.includes("mild") || s.includes("elevated")) return YELLOW;
    return MUTED;
  };

  const renderGlanceTable = () => {
    if (!doc.rawReport) return;
    const readings = [...(doc.rawReport.essential || []), ...(doc.rawReport.rapid || []), ...(doc.rawReport.lab || []), ...(doc.rawReport.pending || [])];
    if (readings.length === 0) return;

    pdf.setFillColor(...ACCENT);
    pdf.rect(M, y, width, 24, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Findings at a Glance", M + 10, y + 16);
    y += 24;

    const rows = readings.map((r: any) => [
      r.name,
      `${r.value ?? "Pending"} ${r.unit ?? ""}`.trim(),
      r.ref_text || "—",
      r.flag === "green" ? "Normal" : r.status === "pending" ? "Pending" : (r.label || "Abnormal")
    ]);

    autoTable(pdf, {
      startY: y,
      margin: { left: M, right: M },
      head: [["PARAMETER", "RESULT", "REFERENCE", "STATUS"]],
      body: rows,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: INK },
      headStyles: { fillColor: [114, 38, 77], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const status = data.cell.raw as string;
          const color = getStatusColor(status);
          pdf.setFillColor(...color);
          pdf.circle(data.cell.x + 8, data.cell.y + data.cell.height / 2, 3, "F");
          pdf.setTextColor(...color);
          pdf.setFont("helvetica", "bold");
          pdf.text(status, data.cell.x + 16, data.cell.y + data.cell.height / 2 + 3);
        } else if (data.section === 'body' && data.column.index !== 3) {
          pdf.setTextColor(...INK);
          pdf.setFont("helvetica", "bold");
          if (data.column.index === 0) {
            pdf.text(data.cell.raw as string, data.cell.x + 6, data.cell.y + data.cell.height / 2 + 3);
          } else {
            pdf.setFont("helvetica", "normal");
            pdf.text(data.cell.raw as string, data.cell.x + 6, data.cell.y + data.cell.height / 2 + 3);
          }
        }
      },
      willDrawCell: (data) => {
        if (data.section === 'body') {
          data.doc.setTextColor(255, 255, 255); // hide default text
        }
      }
    });
    y = (pdf as any).lastAutoTable.finalY + 20;
  };

  const renderDetailedReadings = () => {
    if (!doc.rawReport) return;
    ensure(100);
    pdf.setTextColor(...BRAND);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("MEASURED AT THE AAHA KIOSK", M, y);
    y += 10;
    
    pdf.setFillColor(...ACCENT);
    pdf.rect(M, y, width, 24, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.text("Detailed Readings", M + 10, y + 16);
    y += 24 + 10;

    const readings = [...(doc.rawReport.essential || []), ...(doc.rawReport.rapid || []), ...(doc.rawReport.lab || []), ...(doc.rawReport.pending || [])];
    
    let col = 0;
    let cardY = y;
    let maxCardH = 0;
    
    readings.forEach((r: any, idx: number) => {
      const cardW = (width - 10) / 2;
      const x = M + col * (cardW + 10);
      
      const statusStr = r.flag === "green" ? "Normal" : r.status === "pending" ? "Awaiting lab result" : (r.label || "Abnormal");
      const color = getStatusColor(statusStr);
      
      pdf.setDrawColor(220, 220, 220);
      pdf.setFillColor(250, 250, 250);
      pdf.rect(x, cardY, cardW, 80, "S");
      
      pdf.setTextColor(...MUTED);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(r.name.toUpperCase(), x + 10, cardY + 16);
      
      pdf.setTextColor(...INK);
      pdf.setFontSize(18);
      const valText = `${r.value ?? "Pending"} ${r.unit ?? ""}`.trim();
      pdf.text(valText, x + 10, cardY + 36);
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text(`Reference: ${r.ref_text || "—"}`, x + 10, cardY + 52);
      
      pdf.setFillColor(...color);
      pdf.circle(x + 12, cardY + 68, 3, "F");
      pdf.setTextColor(...color);
      pdf.setFont("helvetica", "bold");
      pdf.text(statusStr, x + 20, cardY + 71);
      
      if (80 > maxCardH) maxCardH = 80;
      
      col++;
      if (col > 1) {
        col = 0;
        cardY += maxCardH + 10;
        maxCardH = 0;
        ensure(100);
      }
    });
    
    y = col === 1 ? cardY + maxCardH + 20 : cardY + 10;
  };

  const renderFooter = () => {
    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...MUTED);
      pdf.setDrawColor(230, 230, 230);
      pdf.line(M, page.h - 40, page.w - M, page.h - 40);
      const f1 = "Screening report generated at an Aaha AI Wellness PHC. Not a diagnosis; does not replace examination by a qualified physician. Correlate clinically. Estimated values are marked (est.).";
      const f2 = "AAHA AI Wellness PHC · Aaroogya AI Foundation · aaroogya.org · Reports & follow-up via the AAHA app";
      pdf.text(f1, M, page.h - 28);
      pdf.text(f2, M, page.h - 18);
      pdf.setTextColor(...BRAND);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Page ${i} of ${pages}`, page.w - M, page.h - 18, { align: "right" });
    }
  };

  const renderSections = () => {
    for (const section of doc.sections) {
      if (section.title === "Recorded values") continue;
      if (section.type === "list" && section.items.filter(Boolean).length === 0) continue;
      if (section.type === "table" && section.rows.length === 0) continue;
      if (section.type === "text" && !section.body?.trim()) continue;

      ensure(60);
      pdf.setFillColor(...ACCENT);
      pdf.rect(M, y, width, 20, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(section.title, M + 8, y + 14);
      y += 28;

      if (section.type === "text") {
        text(section.body, 10, INK, "normal", 5);
      } else if (section.type === "list") {
        for (const item of section.items.filter(Boolean)) {
          pdf.setFillColor(...BRAND);
          pdf.rect(M + 2, y + 2, 4, 4, "F");
          text(item, 10, INK, "normal", 4, M + 14, width - 14);
        }
      } else {
        autoTable(pdf, {
          startY: y,
          margin: { left: M, right: M },
          head: [section.columns],
          body: section.rows,
          styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: INK },
          headStyles: { fillColor: [240, 240, 240], textColor: INK, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [252, 252, 252] },
        });
        y = (pdf as any).lastAutoTable.finalY + 12;
      }
      y += 10;
    }
  };

  // Build Document
  renderHeader();
  renderPatientBox();
  renderAwis();
  renderGlanceTable();
  
  if (doc.rawReport) {
    renderDetailedReadings();
  }
  
  renderSections();
  renderFooter();

  return pdf;
}

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
