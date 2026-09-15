import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  buildReport,
  buildReportQueue,
  consentMessage,
  detectSuspectedConditions,
  generateHypothesis,
  interpretReading,
  nextConditionQuestion,
  nextIntakeQuestion,
  reportName,
  normaliseReadings,
  normaliseState,
  seedComplaintSlot,

  questionTextOf,
  recordAnswer,
  reportUnit,
  type ConversationState,
  type Reading,
} from "@/lib/ambika-engine";
import { recommendedTests } from "@/lib/diagnostics-catalog";
import { normalizedValue, type Slot } from "@/lib/symptom-slots";

type Step =
  | { type: "question"; code: string; text: string; phase: string }
  | { type: "consent_gate"; text: string; devices: Array<{ id: string; name: string }> }
  | { type: "consent_check"; text: string; device_id: string; device_name: string; remaining: number }
  | { type: "diagnostics"; text: string; rapid: string[]; lab: string[] }
  | { type: "report"; text: string; report: ReturnType<typeof buildReport> };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function newState(complaint: string, languageCode: string): ConversationState {
  return {
    session_id: crypto.randomUUID(),
    language_code: languageCode || "en",
    initial_complaint: complaint,
    phase: "intake",
    asked_codes: [],
    skipped_codes: [],
    answers: {},
    slots: {},
    asked_topics: [],
    suspected_conditions: [],
    report_queue: [],
    report_index: 0,
    readings: {},
    current_code: null,
    reports_consent: null,
    hypothesis_shown: false,
    diagnostics_done: false,
  };
}

function pendingLabReading(deviceId: string): Reading {
  return {
    device_id: deviceId,
    name: reportName(deviceId),
    value: "Pending",
    unit: reportUnit(deviceId),
    label: "Awaiting report",
    flag: "amber",
    source: "pending",
    category: "lab",
    status: "pending",
  };
}

/** Move the conversation to whatever comes next, mutating state. Never repeats a phase intro. */
function advance(state: ConversationState): Step {
  if (state.phase === "intake") {
    const q = nextIntakeQuestion(state);
    if (q) {
      state.current_code = q.code;
      if (!state.asked_codes.includes(q.code)) state.asked_codes.push(q.code);
      return { type: "question", code: q.code, text: q.text, phase: "intake" };
    }
    state.suspected_conditions = detectSuspectedConditions(state);
    state.report_queue = buildReportQueue(state.suspected_conditions);
    state.report_index = 0;
    state.phase = state.report_queue.length ? "reports" : "deepdive";
  }

  if (state.phase === "reports") {
    // One single gate for the whole set of reports.
    if (state.reports_consent === null) {
      state.hypothesis_shown = true;
      return {
        type: "consent_gate",
        text: consentMessage(state.suspected_conditions, state.report_queue),
        devices: state.report_queue.map((id) => ({ id, name: reportName(id) })),
      };
    }
    if (state.reports_consent && state.report_index < state.report_queue.length) {
      const deviceId = state.report_queue[state.report_index];
      return {
        type: "consent_check",
        text: `Share your ${reportName(deviceId)} report and I'll read the value for you.`,
        device_id: deviceId,
        device_name: reportName(deviceId),
        remaining: state.report_queue.length - state.report_index,
      };
    }
    // Anything not shared stays pending and can be uploaded later.
    for (const id of state.report_queue) {
      if (!state.readings[id]) state.readings[id] = pendingLabReading(id);
    }
    state.phase = "deepdive";
  }

  if (state.phase === "deepdive") {
    const primary = state.suspected_conditions[0] ?? "general";
    const q = nextConditionQuestion(state, primary);
    if (q) {
      state.current_code = q.code;
      if (!state.asked_codes.includes(q.code)) state.asked_codes.push(q.code);
      return { type: "question", code: q.code, text: q.text, phase: "deepdive" };
    }
    state.phase = "diagnostics";
  }

  if (state.phase === "diagnostics" && !state.diagnostics_done) {
    state.current_code = null;
    return {
      type: "diagnostics",
      text: "Thank you — that's the conversation done. Now let's add your screening measurements. Fill in whatever you have; anything missing can be added later.",
      rapid: recommendedTests("rapid", state.suspected_conditions).map((t) => t.id),
      lab: recommendedTests("lab", state.suspected_conditions).map((t) => t.id),
    };
  }

  state.phase = "done";
  state.current_code = null;
  const report = buildReport(state);
  return { type: "report", text: report.summary, report };
}

async function extractValue(deviceId: string, dataUrl: string, mediaType: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(key);
  const isImage = mediaType.startsWith("image/");
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

  const { text } = await generateText({
    model: gateway("google/gemini-3.6-flash"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `This is a laboratory report. Find the value for "${reportName(deviceId)}"${
              reportUnit(deviceId) ? ` (usual unit: ${reportUnit(deviceId)})` : ""
            }. Reply with ONLY the numeric value, nothing else. If it is not present, reply exactly: NOT_FOUND`,
          },
          isImage
            ? { type: "image" as const, image: base64, mediaType }
            : { type: "file" as const, data: base64, mediaType },
        ],
      },
    ],
  });

  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export const Route = createFileRoute("/api/adaptive/$")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const action = (params._splat ?? "").replace(/^\/+|\/+$/g, "");
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

        try {
          if (action === "start") {
            const state = newState(String(body.complaint ?? ""), String(body.language_code ?? "en"));
            // Facts already given in the complaint are never asked again.
            seedComplaintSlot(state);
            const step = advance(state);
            return json({ state, step });
          }

          const rawState = body.state as ConversationState | undefined;
          if (!rawState || typeof rawState !== "object") return json({ error: "state is required" }, 400);
          const state = normaliseState(rawState);

          if (action === "answer") {
            const answer = String(body.answer ?? "").trim();
            if (!answer) return json({ error: "answer is required" }, 400);
            let slot: Slot | undefined;
            if (state.current_code) {
              // Canonical structured record of the answer — drives skipping and scoring.
              recordAnswer(state, state.current_code, answer);
              slot = state.slots[state.current_code];
            }
            const step = advance(state);
            // Said exactly once, when the deep-dive actually begins.
            const hypothesis =
              step.type === "question" && step.phase === "deepdive" && !state.hypothesis_shown && state.suspected_conditions[0] !== "general"
                ? generateHypothesis(state, state.suspected_conditions)
                : undefined;
            if (hypothesis) state.hypothesis_shown = true;
            return json({
              state,
              step,
              hypothesis,
              // Canonical answer record for the client to persist.
              answer_record: slot
                ? { question_id: slot.code, topic: slot.topic, answer: slot.text, normalized_value: normalizedValue(slot) }
                : null,
            });
          }

          if (action === "reports_consent") {
            state.reports_consent = body.has_reports === true;
            state.report_index = 0;
            const step = advance(state);
            const hypothesis =
              step.type === "question" && step.phase === "deepdive" && !state.hypothesis_shown && state.suspected_conditions[0] !== "general"
                ? generateHypothesis(state, state.suspected_conditions)
                : undefined;
            if (hypothesis) state.hypothesis_shown = true;
            return json({ state, step, hypothesis });
          }

          if (action === "upload_report") {
            const deviceId = String(body.device_id ?? state.report_queue[state.report_index] ?? "");
            const hasReport = body.has_report !== false;

            if (!hasReport) {
              state.readings[deviceId] = pendingLabReading(deviceId);
            } else if (typeof body.value === "number" || typeof body.value === "string") {
              state.readings[deviceId] = { ...interpretReading(deviceId, Number(body.value)), category: "lab", status: "recorded" };
            } else if (typeof body.file === "string") {
              const value = await extractValue(deviceId, body.file, String(body.media_type ?? "image/jpeg"));
              if (value === null) {
                return json({ state, error: "value_not_found", device_id: deviceId }, 200);
              }
              state.readings[deviceId] = { ...interpretReading(deviceId, value), category: "lab", status: "recorded" };
            } else {
              return json({ error: "file or value is required" }, 400);
            }

            state.report_index += 1;
            const step = advance(state);
            return json({ state, step, reading: state.readings[deviceId] });
          }

          if (action === "resume") {
            // Restoring a saved check-up: re-ask the pending question rather than skipping it.
            if (state.phase === "done" || state.diagnostics_done) {
              const report = buildReport(state);
              return json({ state, step: { type: "report", text: report.summary, report } });
            }
            const code = state.current_code;
            if (code && !state.answers[code]) {
              const text = questionTextOf(code, state.language_code);
              if (text) {
                return json({
                  state,
                  step: { type: "question", code, text, phase: state.phase },
                });
              }
            }
            const step = advance(state);
            return json({ state, step });
          }

          if (action === "next_report") {
            const step = advance(state);
            return json({ state, step });
          }

          if (action === "finalize") {
            const readings = (body.readings ?? {}) as Record<string, Reading>;
            // Manual entries win over the earlier placeholder, and every reading is
            // canonicalised so status, counts and the score all agree.
            state.readings = normaliseReadings({ ...state.readings, ...readings });
            state.diagnostics_done = true;
            const step = advance(state);
            return json({ state, step });
          }


          return json({ error: "unknown action" }, 404);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
