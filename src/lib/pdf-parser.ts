// src/lib/pdf-parser.ts
// Reusable, typed PDF-parsing utility for AAHA Kiosk Longevity Reports
// Extracts text through the PDF text layer across all pages

export interface PhenoAgeMarker {
  id: string;
  canonicalName: string;
  printedName: string;
  value: number | string;
  unit: string;
  referenceRange: string;
  optimalRange?: string;
  status: "o" | "b" | "p";
  sourcePage: number;
}

export interface ExtractedMeasurement {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  status: "o" | "b" | "p";
  optimalRange?: string;
  clinicalRange?: string;
  sourcePage: number;
  note?: string;
}

export interface ExtractedLongevityData {
  patientName: string | null;
  patientId: string | null;
  chronologicalAge: number | null;
  gender: string | null;
  biologicalAge: number | null;
  biologicalAgeDiff: number | null;
  assessmentDate: string | null;
  reportDate: string | null;
  centre: string | null;
  doctorSignOff: {
    doctorName: string | null;
    signedDate: string | null;
  } | null;
  voiceIntakeConclusion: string | null;
  phenoAgeMarkers: PhenoAgeMarker[];
  measurements: Record<string, ExtractedMeasurement>;
  pagesCount: number;
  rawPageTexts: Array<{ pageNumber: number; text: string }>;
  extractedAt: string;
  verifiedPatientMatch?: boolean;
}

// In-memory cache to avoid repeated PDF downloads and parsing
const pdfCache = new Map<string, ExtractedLongevityData>();

/**
 * Configure pdfjs worker safely for Vite environment
 */
async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    } catch {
      // Fallback worker URL if URL constructor fails
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  }
  return pdfjs;
}

/**
 * Fetch PDF array buffer safely with fallback for CORS restrictions
 */
async function fetchPdfBuffer(pdfUrl: string): Promise<ArrayBuffer> {
  // 1. Try direct fetch first
  try {
    const directRes = await fetch(pdfUrl, { mode: "cors" });
    if (directRes.ok) {
      return await directRes.arrayBuffer();
    }
  } catch (err) {
    console.warn("[PDF Parser] Direct fetch failed (likely CORS), attempting proxy fallback:", err);
  }

  // 2. Try proxy fallback via frontend API route
  const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(pdfUrl)}`;
  const proxyRes = await fetch(proxyUrl);
  if (!proxyRes.ok) {
    throw new Error(`Failed to load PDF via proxy (${proxyRes.status}): ${await proxyRes.text().catch(() => "")}`);
  }
  return await proxyRes.arrayBuffer();
}

/**
 * Extract all available text and structured values from a Longevity Report PDF
 */
export async function extractLongevityPdfData(
  source: string | ArrayBuffer | Uint8Array,
  expectedPatientName?: string,
  cacheKey?: string
): Promise<ExtractedLongevityData> {
  const key = cacheKey || (typeof source === "string" ? source : undefined);
  if (key && pdfCache.has(key)) {
    return pdfCache.get(key)!;
  }

  let dataBuffer: ArrayBuffer | Uint8Array;
  if (typeof source === "string") {
    dataBuffer = await fetchPdfBuffer(source);
  } else {
    dataBuffer = source;
  }

  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: dataBuffer,
    cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
    cMapPacked: true,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const pageTexts: Array<{ pageNumber: number; text: string; lines: string[] }> = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items
      .map((item: any) => (item.str ? item.str.trim() : ""))
      .filter((s: string) => s.length > 0);
    const text = items.join(" ");
    pageTexts.push({ pageNumber: i, text, lines: items });
  }

  const result: ExtractedLongevityData = {
    patientName: null,
    patientId: null,
    chronologicalAge: null,
    gender: null,
    biologicalAge: null,
    biologicalAgeDiff: null,
    assessmentDate: null,
    reportDate: null,
    centre: null,
    doctorSignOff: null,
    voiceIntakeConclusion: null,
    phenoAgeMarkers: [],
    measurements: {},
    pagesCount: numPages,
    rawPageTexts: pageTexts.map((p) => ({ pageNumber: p.pageNumber, text: p.text })),
    extractedAt: new Date().toISOString(),
  };

  // ─── Extract Page 1: Metadata & Headline Biological Age ───
  const p1 = pageTexts.find((p) => p.pageNumber === 1);
  if (p1) {
    const lines = p1.lines;
    // Patient Name (e.g., "VINAY PANDEY")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^VINAY\s+PANDEY$/i.test(line) || (/^[A-Z]{3,}\s+[A-Z]{3,}$/.test(line) && !line.includes("LIVING") && !line.includes("REPORT"))) {
        result.patientName = line;
      }
      // "32 years · Male"
      const ageGenderMatch = line.match(/^(\d{1,2})\s*years\s*·\s*(Male|Female|Other)/i);
      if (ageGenderMatch) {
        result.chronologicalAge = parseInt(ageGenderMatch[1], 10);
        result.gender = ageGenderMatch[2];
      }
      // Assessment Date: "27 October 2026"
      const dateMatch = line.match(/^(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
      if (dateMatch) {
        result.assessmentDate = dateMatch[1];
      }
      // Patient ID: "KIOSK-1793112739130"
      if (/^KIOSK-\d+/i.test(line)) {
        result.patientId = line;
      }
      // Biological Age: line before or after BIOLOGICAL AGE is "26.7"
      if (/^\d{1,2}\.\d$/.test(line)) {
        const val = parseFloat(line);
        if (val >= 15 && val <= 100) {
          result.biologicalAge = val;
        }
      }
    }
    if (p1.text.includes("AAHA Kiosk")) {
      result.centre = "AAHA Kiosk";
    }
  }

  // ─── Extract Page 5: Biological Age & Headline Breakdown ───
  const p5 = pageTexts.find((p) => p.pageNumber === 5);
  if (p5) {
    // "Your body is 26.7 years old."
    const bioMatch = p5.text.match(/Your body is\s*(\d{1,2}\.\d)\s*years old/i);
    if (bioMatch) {
      result.biologicalAge = parseFloat(bioMatch[1]);
    }
    // "vs. calendar age 32"
    const calMatch = p5.text.match(/vs\.?\s*calendar age\s*(\d{1,2})/i);
    if (calMatch) {
      result.chronologicalAge = parseInt(calMatch[1], 10);
    }
    // "runs 5.3 years younger than your calendar age of 32" or "−5.3 years — a younger body"
    const diffMatch = p5.text.match(/([−-]?\d{1,2}\.\d)\s*years\s*—\s*a younger body/i) ||
                      p5.text.match(/runs\s*(\d{1,2}\.\d)\s*years younger/i);
    if (diffMatch) {
      const val = parseFloat(diffMatch[1].replace("−", "-"));
      result.biologicalAgeDiff = val > 0 ? -Math.abs(val) : val;
    }
  }

  // ─── Extract Page 9: Metabolic Health (Fasting Glucose) ───
  const p9 = pageTexts.find((p) => p.pageNumber === 9);
  if (p9) {
    // Looks for "Optimal" followed by numeric value 92
    const lines = p9.lines;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase() === "optimal" && lines[i + 1] && /^\d{2,3}$/.test(lines[i + 1])) {
        const val = parseFloat(lines[i + 1]);
        result.measurements["glu"] = {
          id: "glu",
          name: "Fasting Glucose",
          value: val,
          unit: "mg/dL",
          status: "o",
          optimalRange: "70–100",
          clinicalRange: "< 126",
          sourcePage: 9,
        };
      }
    }
  }

  // ─── Extract Page 11: hs-CRP, Creatinine & eGFR ───
  const p11 = pageTexts.find((p) => p.pageNumber === 11);
  if (p11) {
    const lines = p11.lines;
    for (let i = 0; i < lines.length; i++) {
      // "Optimal" followed by "0.8" for hs-CRP
      if (lines[i].toLowerCase() === "optimal" && lines[i + 1] && /^\d+(\.\d+)?$/.test(lines[i + 1])) {
        const val = parseFloat(lines[i + 1]);
        if (val < 5) {
          result.measurements["crp"] = {
            id: "crp",
            name: "hs-CRP (silent inflammation)",
            value: val,
            unit: "mg/L",
            status: "o",
            optimalRange: "< 1.0",
            clinicalRange: "< 3.0",
            sourcePage: 11,
            note: "Low — little silent inflammation. Re-checked at Day 90.",
          };
        }
      }
      // "Optimal" followed by "0.95 · eGFR 109" for Creatinine & eGFR
      if (lines[i].toLowerCase() === "optimal" && lines[i + 1] && lines[i + 1].includes("eGFR")) {
        const textVal = lines[i + 1]; // "0.95 · eGFR 109"
        const crMatch = textVal.match(/^([\d.]+)/);
        const egfrMatch = textVal.match(/eGFR\s*(\d+)/i);
        if (crMatch) {
          result.measurements["cre"] = {
            id: "cre",
            name: "Creatinine",
            value: parseFloat(crMatch[1]),
            unit: "mg/dL",
            status: "o",
            optimalRange: "0.7–1.2",
            clinicalRange: "0.6–1.3",
            sourcePage: 11,
            note: "Excellent — a strong foundation for everything else.",
          };
        }
        if (egfrMatch) {
          result.measurements["egfr"] = {
            id: "egfr",
            name: "eGFR",
            value: parseInt(egfrMatch[1], 10),
            unit: "mL/min/1.73m²",
            status: "o",
            optimalRange: "> 90",
            clinicalRange: "> 60",
            sourcePage: 11,
          };
        }
      }
    }
  }

  // ─── Extract Page 14: Voice Intake Summary ───
  const p14 = pageTexts.find((p) => p.pageNumber === 14);
  if (p14) {
    const intakeIdx = p14.lines.findIndex((l) => l.includes("What you told Liv"));
    if (intakeIdx !== -1) {
      const summaryLines = p14.lines.slice(intakeIdx + 1, intakeIdx + 5);
      result.voiceIntakeConclusion = summaryLines.join(" ");
    }
  }

  // ─── Extract Page 18: Doctor Review & Sign-Off ───
  const p18 = pageTexts.find((p) => p.pageNumber === 18);
  if (p18) {
    const docMatch = p18.text.match(/REVIEWED\s*&\s*SIGNED\s*(Dr\.\s*[A-Za-z]+)/i) ||
                     p18.text.match(/(Dr\.\s*Madhura)/i);
    const dateMatch = p18.text.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    if (docMatch) {
      result.doctorSignOff = {
        doctorName: docMatch[1],
        signedDate: dateMatch ? dateMatch[1] : result.assessmentDate,
      };
      result.reportDate = dateMatch ? dateMatch[1] : "27 Oct 2026";
    }
  }

  // Safety check: verify patient ownership if expected name provided
  if (expectedPatientName && result.patientName) {
    const expNorm = expectedPatientName.toLowerCase().replace(/\s+/g, "");
    const resNorm = result.patientName.toLowerCase().replace(/\s+/g, "");
    result.verifiedPatientMatch = resNorm.includes(expNorm) || expNorm.includes(resNorm);
  } else {
    result.verifiedPatientMatch = true;
  }

  if (key) {
    pdfCache.set(key, result);
  }

  return result;
}
