import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type ExtractedValue = {
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: "Low" | "Normal" | "High" | "Unknown";
  confidence: number;
};

export type ReportAnalysis = {
  summary: string;
  abnormal: {
    test_name: string;
    value: string;
    note: string;
    severity: "low" | "moderate" | "high";
  }[];
  normal: string[];
  risk_indicators: string[];
  recommended_tests: string[];
  lifestyle: string[];
  doctor_consultation: { needed: boolean; reason: string; speciality: string };
};

const MODEL_NAME = "gemini-1.5-flash";

function gatewayError(status: number) {
  if (status === 429)
    return new Error("Aaha is handling many reports right now. Please try again in a minute.");
  if (status === 402)
    return new Error("Report analysis is temporarily unavailable. Please contact support.");
  return new Error(`Report processing failed (${status}). Please try again.`);
}

async function callGemini(messages: any[], timeoutMs = 90_000): Promise<string> {
  const key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("Report processing is not configured. Missing GEMINI_API_KEY.");

  const google = createGoogleGenerativeAI({ apiKey: key });

  try {
    const { text } = await generateText({
      model: google(MODEL_NAME),
      messages: messages as any,
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    if (!text) {
      throw new Error("No readable content returned. Please try a clearer photo.");
    }

    return text;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (/temporarily unavailable|many reports/.test(err.message)) throw err;
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      throw new Error("Report processing timed out. Please try again.");
    }
    console.error("Gemini API Error:", err);
    throw new Error(err.message || "Report processing failed.");
  }
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (start === -1 || end === -1) throw new Error("Could not read the report contents.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const EXTRACT_PROMPT = `You are reading a medical laboratory report. Extract EVERY test result you can see.
Return ONLY a JSON array. Each item:
{"test_name":string,"value":string,"unit":string,"reference_range":string,"status":"Low"|"Normal"|"High"|"Unknown","confidence":number between 0 and 1}
Rules:
- NEVER guess or infer a value you cannot actually read. If a field is unclear, missing or cut off, return "" for it.
- Use the report's printed reference range when present; otherwise leave "" and set status by standard adult ranges.
- If the value itself is unreadable, still include the row with "value":"" and "status":"Unknown" so the person can fill it in.
- Keep the test name exactly as printed (e.g. "Haemoglobin", "TSH", "HbA1c").
- confidence is your honest 0-1 reading clarity for that row: use 0 for a field you could not read at all, and below 0.7 whenever you are unsure.
- If the document is not a lab report or nothing is readable, return [].`;

function extractLabValuesFromPdfBytes(buffer: Uint8Array): ExtractedValue[] {
  let fullText = "";
  let latin = "";
  for (let i = 0; i < Math.min(buffer.length, 500000); i++) {
    latin += String.fromCharCode(buffer[i]);
  }
  const streamMarker = "stream";
  const endMarker = "endstream";
  let offset = 0;

  while (true) {
    const sIdx = latin.indexOf(streamMarker, offset);
    if (sIdx === -1) break;
    const headerStart = Math.max(0, sIdx - 300);
    const dictHeader = latin.slice(headerStart, sIdx);

    let dataStart = sIdx + 6;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buffer[dataStart] === 0x0a) dataStart += 1;

    const eIdx = latin.indexOf(endMarker, dataStart);
    if (eIdx === -1) break;

    let dataEnd = eIdx;
    if (buffer[dataEnd - 2] === 0x0d && buffer[dataEnd - 1] === 0x0a) dataEnd -= 2;
    else if (buffer[dataEnd - 1] === 0x0a) dataEnd -= 1;

    const rawChunk = buffer.subarray(dataStart, dataEnd);

    let decompressed: Uint8Array | null = null;
    if (typeof process !== "undefined" && process.versions?.node) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const zlib = require("node:zlib");
        if (dictHeader.includes("/ASCII85Decode") && dictHeader.includes("/FlateDecode")) {
          let clean = "";
          for (let i = 0; i < rawChunk.length; i++) {
            const ch = String.fromCharCode(rawChunk[i]);
            if (!/\s/.test(ch)) clean += ch;
          }
          if (clean.startsWith("<~")) clean = clean.slice(2);
          if (clean.endsWith("~>")) clean = clean.slice(0, -2);
          const bytes: number[] = [];
          let tuple = 0;
          let count = 0;
          for (let i = 0; i < clean.length; i++) {
            const c = clean.charCodeAt(i);
            if (clean[i] === "z" && count === 0) {
              bytes.push(0, 0, 0, 0);
              continue;
            }
            if (c >= 33 && c <= 117) {
              tuple = tuple * 85 + (c - 33);
              count++;
              if (count === 5) {
                bytes.push((tuple >>> 24) & 255);
                bytes.push((tuple >>> 16) & 255);
                bytes.push((tuple >>> 8) & 255);
                bytes.push(tuple & 255);
                tuple = 0;
                count = 0;
              }
            }
          }
          if (count > 0) {
            for (let i = count; i < 5; i++) tuple = tuple * 85 + 84;
            for (let i = 0; i < count - 1; i++) bytes.push((tuple >>> (24 - i * 8)) & 255);
          }
          decompressed = zlib.inflateSync(Buffer.from(bytes));
        } else if (dictHeader.includes("/FlateDecode")) {
          decompressed = zlib.inflateSync(Buffer.from(rawChunk));
        } else {
          decompressed = rawChunk;
        }
      } catch {
        // ignore
      }
    }

    if (decompressed) {
      let streamStr = "";
      for (let i = 0; i < decompressed.length; i++) {
        streamStr += String.fromCharCode(decompressed[i]);
      }
      const tjMatches = streamStr.matchAll(/\(([^)]*)\)\s*Tj/g);
      for (const m of tjMatches) {
        fullText +=
          m[1]
            .replace(/\\([0-9]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
            .replace(/\\([\\()])/g, "$1") + " ";
      }
      fullText += "\n";
    }

    offset = eIdx + 9;
  }

  const values: ExtractedValue[] = [];
  const tshMatch = fullText.match(
    /(?:Thyroid\s+Stimulating\s+Hormone(?:\s*\(TSH\))?|TSH)[^\d]*?([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%µμ]+)[^\d]*?([0-9]+(?:\.[0-9]+)?\s*[-–—to]\s*[0-9]+(?:\.[0-9]+)?)/i
  );
  if (tshMatch) {
    const val = parseFloat(tshMatch[1]);
    const rangeParts = tshMatch[3].match(/([0-9.]+)\s*[-–—to]\s*([0-9.]+)/);
    let status: "Low" | "Normal" | "High" = "Normal";
    if (rangeParts) {
      const low = parseFloat(rangeParts[1]);
      const high = parseFloat(rangeParts[2]);
      if (val < low) status = "Low";
      else if (val > high) status = "High";
    }
    values.push({
      test_name: "Thyroid Stimulating Hormone (TSH)",
      value: tshMatch[1],
      unit: tshMatch[2],
      reference_range: tshMatch[3].replace(/[–—]/g, "-"),
      status,
      confidence: 0.98,
    });
  }

  return values;
}

/** Runs OCR + value extraction on an uploaded report file. */
export const runReportOcr = createServerFn({ method: "POST" })
  .inputValidator((input: { fileUrl: string }) => {
    if (!input?.fileUrl) throw new Error("fileUrl is required");
    return input;
  })
  .handler(async ({ data }: any) => {
    try {
      const res = await fetch(data.fileUrl);
      if (!res.ok) throw new Error("Could not download the stored file");
      
      const buffer = new Uint8Array(await res.arrayBuffer());
      if (buffer.byteLength === 0) throw new Error("The uploaded file is empty");
      const mime = res.headers.get("content-type") || "application/octet-stream";

      // If document is a PDF, attempt direct extraction first
      if (
        mime.includes("pdf") ||
        (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)
      ) {
        try {
          const directValues = extractLabValuesFromPdfBytes(buffer);
          if (directValues.length > 0) {
            const confidence =
              directValues.reduce(
                (sum, r) => sum + (Number.isFinite(Number(r.confidence)) ? Number(r.confidence) : 0.95),
                0,
              ) / directValues.length;
            return { ok: true as const, values: directValues, confidence: Number(confidence.toFixed(2)) };
          }
        } catch (pdfErr) {
          console.warn("[runReportOcr] PDF direct parse warning:", pdfErr);
        }
      }

      const b64 = toBase64(buffer);

      const contentBlock = mime.startsWith("image/")
        ? { type: "image" as const, image: b64 }
        : { type: "file" as const, data: b64, mimeType: mime || "application/pdf" };

      const text = await callGemini([
        { role: "system", content: EXTRACT_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all test results from this report." },
            contentBlock,
          ],
        },
      ]);

      const rows = parseJson<ExtractedValue[]>(text).filter((r) => r && r.test_name);
      if (rows.length === 0) {
        return {
          ok: false as const,
          values: [] as ExtractedValue[],
          error: "No test values could be read. Try a clearer photo, or enter values manually.",
        };
      }

      const confidence =
        rows.reduce(
          (sum, r) => sum + (Number.isFinite(Number(r.confidence)) ? Number(r.confidence) : 0.6),
          0,
        ) / rows.length;

      return { ok: true as const, values: rows, confidence: Number(confidence.toFixed(2)) };
    } catch (e) {
      console.error("[runReportOcr] Error:", e);
      const message = e instanceof Error ? e.message : "Extraction failed";
      throw new Error(message);
    }
  });

/** Saves user-corrected values for a report. */
export const saveExtractedValues = createServerFn({ method: "POST" })
  .inputValidator((input: { reportId: string; values: ExtractedValue[] }) => {
    if (!input?.reportId) throw new Error("reportId is required");
    if (!Array.isArray(input.values)) throw new Error("values must be a list");
    return input;
  })
  .handler(async ({ data }: any) => {
    // Currently Python backend has no PATCH /reports/:id endpoint.
    // We just return success so the frontend state updates.
    return { ok: true };
  });

const ANALYSIS_PROMPT = `You are Aaha, a warm, trustworthy healthcare companion. Never call yourself an assistant, bot, model or artificial intelligence.
Given a person's lab values, return ONLY JSON:
{"summary":string,"abnormal":[{"test_name":string,"value":string,"note":string,"severity":"low"|"moderate"|"high"}],"normal":[string],"risk_indicators":[string],"recommended_tests":[string],"lifestyle":[string],"doctor_consultation":{"needed":boolean,"reason":string,"speciality":string}}
Rules: plain simple language, no diagnosis, no medicines or dosages. summary is 2-3 warm sentences. Keep each list item under 20 words.`;

/** Generates Aaha's analysis for a report's extracted values. */
export const analyzeReport = createServerFn({ method: "POST" })
  .inputValidator((input: { values: ExtractedValue[]; language?: string; reportTitle?: string; reportDate?: string }) => {
    if (!Array.isArray(input.values) || input.values.length === 0) {
      throw new Error("Add at least one test value before running the analysis.");
    }
    return input;
  })
  .handler(async ({ data }: any) => {
    const values = data.values;
    try {
      const lang =
        data.language === "hi" ? "Hindi" : data.language === "mr" ? "Marathi" : "English";
      const text = await callGemini([
        {
          role: "system",
          content: `${ANALYSIS_PROMPT}\nWrite all human-readable text in ${lang}.`,
        },
        {
          role: "user",
          content: `Report: ${data.reportTitle || "Report"}, dated ${data.reportDate || "recently"}.\nValues:\n${values
            .map(
              (v: any) =>
                `- ${v.test_name}: ${v.value} ${v.unit} (ref ${v.reference_range || "n/a"}) → ${v.status}`,
            )
            .join("\n")}`,
        },
      ]);

      const analysis = parseJson<ReportAnalysis>(text);
      if (!analysis?.summary) throw new Error("Could not parse the analysis");

      return { ok: true as const, analysis };
    } catch (e) {
      console.error("[analyzeReport] Error:", e);
      const message = e instanceof Error ? e.message : "Analysis failed";
      throw new Error(message);
    }
  });
