import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  abnormal: { test_name: string; value: string; note: string; severity: "low" | "moderate" | "high" }[];
  normal: string[];
  risk_indicators: string[];
  recommended_tests: string[];
  lifestyle: string[];
  doctor_consultation: { needed: boolean; reason: string; speciality: string };
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

function gatewayError(status: number) {
  if (status === 429) return new Error("Aaha is handling many reports right now. Please try again in a minute.");
  if (status === 402) return new Error("Report analysis is temporarily unavailable. Please contact support.");
  return new Error(`Report processing failed (${status}). Please try again.`);
}

async function callGateway(body: unknown, timeoutMs = 90_000): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Report processing is not configured.");

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (res.status === 429 || res.status === 402) throw gatewayError(res.status);
        lastError = gatewayError(res.status);
        continue;
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content ?? "";
      if (!text) {
        lastError = new Error("No readable content returned. Please try a clearer photo.");
        continue;
      }
      return text;
    } catch (e) {
      clearTimeout(timer);
      const err = e instanceof Error ? e : new Error(String(e));
      if (/temporarily unavailable|many reports/.test(err.message)) throw err;
      lastError = err.name === "AbortError" ? new Error("Report processing timed out. Please try again.") : err;
    }
  }
  throw lastError ?? new Error("Report processing failed.");
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


/** Runs OCR + value extraction on an uploaded report file. */
export const runReportOcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string }) => {
    if (!input?.reportId) throw new Error("reportId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabase, userId } = context;

    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", data.reportId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!report) throw new Error("Report not found");
    if (!report.file_path) throw new Error("This report has no file attached");

    await supabase.from("reports").update({ ocr_status: "processing", ocr_error: null }).eq("id", report.id);

    try {
      const file = await supabase.storage.from("reports").download(report.file_path);
      if (file.error || !file.data) throw new Error("Could not read the stored file");

      const buffer = new Uint8Array(await file.data.arrayBuffer());
      if (buffer.byteLength === 0) throw new Error("The uploaded file is empty");
      const mime = report.file_type || file.data.type || "application/octet-stream";
      const b64 = toBase64(buffer);

      const contentBlock =
        mime.startsWith("image/")
          ? { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }
          : {
              type: "file",
              file: { filename: `${report.title}.pdf`, file_data: `data:${mime || "application/pdf"};base64,${b64}` },
            };

      const text = await callGateway({
        model: MODEL,
        messages: [
          { role: "system", content: EXTRACT_PROMPT },
          {
            role: "user",
            content: [{ type: "text", text: "Extract all test results from this report." }, contentBlock],
          },
        ],
      });

      const rows = parseJson<ExtractedValue[]>(text).filter((r) => r && r.test_name);
      if (rows.length === 0) {
        await supabase
          .from("reports")
          .update({
            ocr_status: "failed",
            ocr_error: "No test values could be read. Try a clearer photo, or enter values manually.",
            extracted_values: [],
          })
          .eq("id", report.id);
        return { ok: false as const, values: [] as ExtractedValue[], error: "No test values could be read." };
      }

      const confidence =
        rows.reduce((sum, r) => sum + (Number.isFinite(Number(r.confidence)) ? Number(r.confidence) : 0.6), 0) /
        rows.length;

      await supabase
        .from("reports")
        .update({
          ocr_status: "done",
          ocr_error: null,
          extracted_values: rows as never,
          extraction_confidence: Number(confidence.toFixed(2)),
          status_label: "Values extracted",
          status_tone: "info",
        })
        .eq("id", report.id);

      return { ok: true as const, values: rows, confidence: Number(confidence.toFixed(2)) };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Extraction failed";
      await supabase.from("reports").update({ ocr_status: "failed", ocr_error: message }).eq("id", report.id);
      throw new Error(message);
    }
  });

/** Saves user-corrected values for a report. */
export const saveExtractedValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string; values: ExtractedValue[] }) => {
    if (!input?.reportId) throw new Error("reportId is required");
    if (!Array.isArray(input.values)) throw new Error("values must be a list");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { error } = await context.supabase
      .from("reports")
      .update({ extracted_values: data.values as never, ocr_status: "done" })
      .eq("id", data.reportId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

const ANALYSIS_PROMPT = `You are Aaha, a warm, trustworthy healthcare companion. Never call yourself an assistant, bot, model or artificial intelligence.
Given a person's lab values, return ONLY JSON:
{"summary":string,"abnormal":[{"test_name":string,"value":string,"note":string,"severity":"low"|"moderate"|"high"}],"normal":[string],"risk_indicators":[string],"recommended_tests":[string],"lifestyle":[string],"doctor_consultation":{"needed":boolean,"reason":string,"speciality":string}}
Rules: plain simple language, no diagnosis, no medicines or dosages. summary is 2-3 warm sentences. Keep each list item under 20 words.`;

/** Generates Aaha's analysis for a report's extracted values. */
export const analyzeReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string; language?: string }) => {
    if (!input?.reportId) throw new Error("reportId is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabase, userId } = context;
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", data.reportId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!report) throw new Error("Report not found");

    const values = (report.extracted_values ?? []) as unknown as ExtractedValue[];
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("Add at least one test value before running the analysis.");
    }

    await supabase.from("reports").update({ analysis_status: "processing" }).eq("id", report.id);

    try {
      const lang =
        data.language === "hi" ? "Hindi" : data.language === "mr" ? "Marathi" : "English";
      const text = await callGateway({
        model: MODEL,
        messages: [
          { role: "system", content: `${ANALYSIS_PROMPT}\nWrite all human-readable text in ${lang}.` },
          {
            role: "user",
            content: `Report: ${report.title} (${report.category}), dated ${report.report_date}.\nValues:\n${values
              .map(
                (v) =>
                  `- ${v.test_name}: ${v.value} ${v.unit} (ref ${v.reference_range || "n/a"}) → ${v.status}`,
              )
              .join("\n")}`,
          },
        ],
      });

      const analysis = parseJson<ReportAnalysis>(text);

      await supabase
        .from("reports")
        .update({
          analysis: analysis as never,
          analysis_status: "done",
          analyzed_at: new Date().toISOString(),
          status_label: analysis.abnormal?.length ? "Needs attention" : "All clear",
          status_tone: analysis.abnormal?.length ? "amber" : "green",
        })
        .eq("id", report.id);

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Your report is ready",
        body: analysis.summary.slice(0, 120),
        step: "Report upload",
        due_label: "Just now",
        link: `/report/${report.id}`,
        kind: "update",
      });

      return { ok: true as const, analysis };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Analysis failed";
      await supabase.from("reports").update({ analysis_status: "failed" }).eq("id", report.id);
      throw new Error(message);
    }
  });
