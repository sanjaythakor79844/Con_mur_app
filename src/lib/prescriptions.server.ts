import type { PrescriptionContent } from "@/lib/prescriptions";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

function gatewayError(status: number) {
  if (status === 429) return new Error("The prescription service is busy. Please try again in a minute.");
  if (status === 402) return new Error("Prescription drafting is temporarily unavailable. Please contact support.");
  return new Error(`Prescription drafting failed (${status}). Please try again.`);
}

async function callGateway(body: unknown, timeoutMs = 90_000): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Prescription drafting is not configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw gatewayError(res.status);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("The draft came back empty. Please try again.");
    return text;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    throw err.name === "AbortError" ? new Error("Prescription drafting timed out. Please try again.") : err;
  } finally {
    clearTimeout(timer);
  }
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Could not read the drafted prescription.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

const DRAFT_PROMPT = `You are a clinical documentation aide preparing a DRAFT prescription for a qualified doctor to review, edit and approve.
Return ONLY JSON in this exact shape:
{"consultation_summary":string,
 "lifestyle_management":[{"title":string,"detail":string}],
 "medication":[{"name":string,"dosage":string,"frequency":string,"duration":string,"route":string,"notes":string}],
 "nutrition":[{"title":string,"detail":string}],
 "physical_activity":[{"title":string,"detail":string}],
 "follow_up":{"timeline":string,"tests":[string],"notes":string},
 "risk_alert":string|null}
ABSOLUTE MEDICATION RULE:
- You must NEVER invent, suggest, infer or add any medicine, dosage, frequency, route or duration.
- The "medication" array may ONLY contain medicines the doctor explicitly wrote in the section "Doctor's medication instructions". Transcribe them into the fields; leave a field as "" when the doctor did not state it.
- If the doctor wrote no medication, return "medication": []. Never fill it from symptoms, scores or diagnosis.
Other rules:
- The doctor is fully responsible; this is a draft suggestion only.
- Base every line on the supplied consultation notes, symptoms and (when present) wellness score and suspected conditions. Never invent findings.
- 2-5 items for each of lifestyle, nutrition and physical activity. Keep each detail under 30 words, plain language.
- Surface any contraindication or limitation already stated in the case inside physical_activity.
- consultation_summary is 2-4 sentences describing the presentation and clinical impression, faithful to the doctor's own notes.
- risk_alert: a one-line escalation note only if the supplied case data already flags high risk; otherwise null.`;

export type DoctorInput = {
  consultation_summary: string;
  impression?: string;
  instructions?: string;
  recorded_symptoms?: string;
  medication_notes?: string;
};

export type WorkflowContext = {
  suspected: string[];
  awis: { score?: number; band?: string; summary?: string; domains?: Record<string, number> };
  symptoms: { label: string; answer: string }[];
  reportLines: string;
};

export type DraftInput = {
  patientName: string;
  patientMeta?: string;
  doctor: DoctorInput;
  workflow?: WorkflowContext | undefined;
  language?: string;
};

/** Asks Lovable AI for a draft care plan built strictly from the doctor's notes and the patient's own data. */
export async function draftPrescription(input: DraftInput): Promise<PrescriptionContent> {
  const lang = input.language === "hi" ? "Hindi" : input.language === "mr" ? "Marathi" : "English";
  const w = input.workflow;
  const text = await callGateway({
    model: MODEL,
    messages: [
      { role: "system", content: `${DRAFT_PROMPT}\nWrite all human-readable text in ${lang}.` },
      {
        role: "user",
        content: [
          `Patient: ${input.patientName}${input.patientMeta ? ` (${input.patientMeta})` : ""}`,
          `Consultation type: ${w ? "screening-based consultation" : "standalone consultation (no screening data available)"}`,
          `Doctor's consultation summary:\n${input.doctor.consultation_summary}`,
          input.doctor.impression ? `Doctor's clinical impression:\n${input.doctor.impression}` : "",
          input.doctor.instructions ? `Doctor's instructions:\n${input.doctor.instructions}` : "",
          input.doctor.recorded_symptoms ? `Doctor-recorded symptoms:\n${input.doctor.recorded_symptoms}` : "",
          input.doctor.medication_notes
            ? `Doctor's medication instructions (the ONLY allowed source of medication):\n${input.doctor.medication_notes}`
            : `Doctor's medication instructions: none. Return an empty medication array.`,
          w ? `Suspected conditions: ${w.suspected.join(", ") || "not established"}` : "",
          w ? `Wellness score (AWIS): ${w.awis.score ?? "n/a"} (${w.awis.band ?? "n/a"})` : "",
          w && w.awis.domains
            ? `AWIS domain scores: ${Object.entries(w.awis.domains)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}`
            : "",
          w && w.awis.summary ? `Screening analysis: ${w.awis.summary}` : "",
          w && w.symptoms.length
            ? `Screening symptoms:\n${w.symptoms.map((s) => `- ${s.label}: ${s.answer}`).join("\n")}`
            : "",
          w && w.reportLines ? `Recent lab reports:\n${w.reportLines}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const draft = parseJson<PrescriptionContent & { risk_alert?: string | null }>(text);
  const doctorPrescribedMedication = Boolean(input.doctor.medication_notes?.trim());

  return {
    consultation_summary: draft.consultation_summary ?? "",
    lifestyle_management: draft.lifestyle_management ?? [],
    // Backend guardrail: drop anything the model produced when the doctor prescribed nothing.
    medication: doctorPrescribedMedication ? (draft.medication ?? []) : [],
    nutrition: draft.nutrition ?? [],
    physical_activity: draft.physical_activity ?? [],
    follow_up: draft.follow_up ?? { timeline: "", tests: [], notes: "" },
  };
}

/** Turns a patient's stored reports into short prompt lines. */
export function describeReports(
  reports: { title: string; report_date: string; extracted_values: unknown }[] | null,
) {
  return (reports ?? [])
    .map((r) => {
      const values = Array.isArray(r.extracted_values)
        ? (r.extracted_values as { test_name: string; value: string; unit: string; status: string }[])
        : [];
      return `- ${r.title} (${r.report_date}): ${values
        .map((v) => `${v.test_name} ${v.value}${v.unit ? ` ${v.unit}` : ""} [${v.status}]`)
        .join(", ")}`;
    })
    .join("\n");
}

const CRISIS = /suicid|self[- ]harm|kill myself|end my life|chest pain|breathless|unconscious|severe bleeding/i;

/** Decides whether the case must follow the existing escalation protocol. */
export function assessRisk(args: {
  band?: string | null;
  score?: number | null;
  suspected: string[];
  freeText: string;
}): { level: "ROUTINE" | "HIGH"; reasons: string[] } {
  const reasons: string[] = [];
  const band = (args.band ?? "").toLowerCase();
  if (band.includes("high") || band.includes("severe") || band.includes("red")) reasons.push("High AWIS risk band");
  if (typeof args.score === "number" && args.score <= 40) reasons.push(`Low wellness score (${args.score})`);
  const highRiskTag = args.suspected.find((s) => /cardiac|cardio|depress|anxiet|thyroid storm|diabet|hypertens|cancer/i.test(s));
  if (highRiskTag) reasons.push(`High-risk condition tag: ${highRiskTag}`);
  if (CRISIS.test(args.freeText)) reasons.push("Possible crisis or red-flag symptom mentioned");
  return { level: reasons.length ? "HIGH" : "ROUTINE", reasons };
}
