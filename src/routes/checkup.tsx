import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AahaSays,
  Btn,
  Card,
  FlowNav,
  Icon,
  Pill,
  Screen,
  Section,
  TopBar,
} from "@/components/aaha";
import {
  PlanCard,
  PlanGrid,
  ReadingTable,
  ReportBreakdown,
  ReportFooter,
  ReportHero,
  ReportMasthead,
  ReportSection,
  TagRow,
  Timeline,
  TranscriptList,
} from "@/components/report-editorial";
import { ReportShare } from "@/components/report-share";
import { DiagnosticsPanel } from "@/components/diagnostics-panel";
import { useAuth } from "@/hooks/use-auth";
import { saveAssessment } from "@/lib/aaha-api";
import {
  completeScreening,
  deleteTestReading,
  getActiveScreening,
  saveScreeningAnswer,
  saveTestReading,
  startScreening,
} from "@/lib/screening.functions";
import type { AwisReport, ConversationState, Reading } from "@/lib/ambika-engine";
import type { TestPlan } from "@/lib/health-recommendations";

export const Route = createFileRoute("/checkup")({
  head: () => ({
    meta: [
      { title: "Guided check-up with Aaha | Aaha Companion" },
      {
        name: "description",
        content:
          "Answer a few questions, share any recent lab reports and get your AWIS score with a personalised nutrition and therapy plan.",
      },
      { property: "og:title", content: "Guided check-up with Aaha" },
      {
        property: "og:description",
        content: "Symptoms, reports and your AWIS score in one guided conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Checkup,
});

type Step =
  | { type: "question"; code: string; text: string; phase: string }
  | { type: "consent_gate"; text: string; devices: Array<{ id: string; name: string }> }
  | {
      type: "consent_check";
      text: string;
      device_id: string;
      device_name: string;
      remaining: number;
    }
  | { type: "diagnostics"; text: string; rapid: string[]; lab: string[] }
  | { type: "report"; text: string; report: AwisReport };

type Turn = { role: "aaha" | "user"; text: string };

async function call(action: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/adaptive/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    state?: ConversationState;
    step?: Step;
    hypothesis?: string;
    reading?: Reading | null;
    answer_record?: {
      question_id: string;
      topic: string;
      answer: string;
      normalized_value: Record<string, unknown>;
    } | null;
    error?: string;
  };

  if (!res.ok || (data.error && data.error !== "value_not_found"))
    throw new Error(data.error || "Something went wrong");
  return data;
}

function Checkup() {
  const [complaint, setComplaint] = useState("");
  const [state, setState] = useState<ConversationState | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const beginScreening = useServerFn(startScreening);
  const persistAnswer = useServerFn(saveScreeningAnswer);
  const persistReading = useServerFn(saveTestReading);
  const removeReading = useServerFn(deleteTestReading);
  const finishScreening = useServerFn(completeScreening);
  const loadActive = useServerFn(getActiveScreening);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, step]);

  // Resume an unfinished check-up instead of losing it on refresh.
  const { data: active } = useQuery({
    queryKey: ["active-screening"],
    queryFn: () => loadActive({ data: undefined }),
    staleTime: 0,
  });

  const savedReadings = useMemo(() => {
    const map: Record<string, Reading> = {};
    for (const r of active?.readings ?? []) {
      map[r.test_id] = {
        device_id: r.test_id,
        name: r.test_name,
        value: r.numeric_value ?? r.text_value ?? "Pending",
        unit: r.unit,
        label: r.label,
        flag: r.flag as Reading["flag"],
        source: r.source as Reading["source"],
        category: (r.category ?? undefined) as Reading["category"],
        status: r.status as Reading["status"],
      };
    }
    return map;
  }, [active]);

  const resumed = useRef(false);
  useEffect(() => {
    const stored = active?.screening;
    if (resumed.current || !stored || state) return;
    const storedState = stored.state as unknown as ConversationState | null;
    if (!storedState?.session_id) return;
    resumed.current = true;
    setScreeningId(stored.id);
    void run(async () => {
        // The answer row is written before the screening state update. If a
        // refresh catches that small window, recover the canonical answers too
        // so the engine cannot ask a just-completed question again.
        const savedAnswers = Object.fromEntries(
          (active?.answers ?? []).map((item) => [item.question_id, item.answer]),
        );
        const data = await call("resume", {
          state: {
            ...storedState,
            answers: { ...savedAnswers, ...(storedState.answers ?? {}) },
            readings: { ...(storedState.readings ?? {}), ...savedReadings },
          },
        });
      // Rebuild the transcript from the stored answers.
      const history: Turn[] = [{ role: "user", text: stored.complaint }];
      for (const a of active?.answers ?? []) history.push({ role: "user", text: a.answer });
      setTurns(history);
      apply(data);
    });
  }, [active, savedReadings, state]);

  const apply = (
    data: { state?: ConversationState; step?: Step; hypothesis?: string },
    userText?: string,
  ) => {
    setTurns((t) => {
      const next = [...t];
      const push = (role: Turn["role"], text: string) => {
        if (!text) return;
        // Never show the same line twice in a row (guards double renders / retries).
        const last = [...next].reverse().find((x) => x.role === role);
        if (last?.text === text) return;
        next.push({ role, text });
      };
      if (userText) next.push({ role: "user", text: userText });
      if (data.hypothesis) push("aaha", data.hypothesis);
      if (data.step) push("aaha", data.step.text);
      return next;
    });
    if (data.state) setState(data.state);
    if (data.step) setStep(data.step);
  };

  const run = async (fn: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toast.error("Aaha couldn't continue", {
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const text = complaint.trim();
      if (!text) return;
      setTurns([{ role: "user", text }]);
      const data = await call("start", { complaint: text, language_code: "en" });
      // Create the stored screening first so every later answer has somewhere to live.
      const { screeningId: id } = await beginScreening({
        data: {
          complaint: text,
          languageCode: "en",
          state: (data.state ?? {}) as never,
        },
      });
      setScreeningId(id);
      apply(data);
    });

  const sendAnswer = (text: string) =>
    run(async () => {
      const value = text.trim();
      if (!value || !state) return;
      setAnswer("");
      const data = await call("answer", { state, answer: value });
      if (screeningId && data.answer_record) {
        await persistAnswer({
          data: {
            screeningId,
            questionId: data.answer_record.question_id,
            topic: data.answer_record.topic,
            questionText: step?.type === "question" ? step.text : null,
            answer: data.answer_record.answer,
            normalizedValue: data.answer_record.normalized_value as never,
            state: (data.state ?? {}) as never,
            phase: data.state?.phase,
            suspectedConditions: data.state?.suspected_conditions,
          },
        });
      }
      apply(data, value);
    });

  const answerConsentGate = (hasReports: boolean) =>
    run(async () => {
      if (!state) return;
      const data = await call("reports_consent", { state, has_reports: hasReports });
      apply(data, hasReports ? "Yes, I have some of them" : "No, I don't have these reports");
    });

  /** Store one reading immediately so a refresh (or the report) never loses it. */
  const storeReading = async (id: string, reading: Reading) => {
    if (!screeningId) return;
    const numeric = Number(reading.value);
    await persistReading({
      data: {
        screeningId,
        testId: id,
        testName: reading.name,
        numericValue: Number.isFinite(numeric) ? numeric : null,
        textValue: Number.isFinite(numeric) ? null : String(reading.value ?? ""),
        unit: reading.unit ?? "",
        flag: reading.flag,
        label: reading.label,
        status: reading.status ?? "recorded",
        source: reading.source ?? "manual",
        category: reading.category ?? null,
      },
    });
    void qc.invalidateQueries({ queryKey: ["active-screening"] });
    void qc.invalidateQueries({ queryKey: ["test-readings"] });
  };

  const finalize = (readings: Record<string, unknown>) =>
    run(async () => {
      if (!state) return;
      // Include everything already stored for this screening, so the report can
      // never say "0 readings" when values exist in the database.
      const merged = { ...savedReadings, ...(readings as Record<string, Reading>) };
      const data = await call("finalize", { state, readings: merged });
      const built = data.step?.type === "report" ? data.step.report : null;
      if (screeningId && built) {
        await finishScreening({
          data: {
            screeningId,
            state: (data.state ?? {}) as never,
            report: built as never,
            awis: built.awis,
            awisAvailable: built.awis_available,
            band: built.risk_label,
            summary: built.summary,
            suspectedConditions: data.state?.suspected_conditions,
          },
        });
        void qc.invalidateQueries({ queryKey: ["active-screening"] });
      }
      apply(data);
    });

  const skipReport = () =>
    run(async () => {
      if (!state || step?.type !== "consent_check") return;
      const deviceId = step.device_id;
      const data = await call("upload_report", {
        state,
        device_id: deviceId,
        has_report: false,
      });
      const reading = data.state?.readings?.[deviceId] ?? data.reading ?? null;
      if (reading) await storeReading(deviceId, reading);
      if (screeningId) await persistState({ data: { screeningId, state: (data.state ?? {}) as never, phase: data.state?.phase } });
      apply(data, `I don't have my ${step.device_name} report`);
      setManual(null);
    });

  const submitManual = (value: string) =>
    run(async () => {
      if (!state || step?.type !== "consent_check") return;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        toast.error("Please enter the number from your report");
        return;
      }
      const deviceId = step.device_id;
      const data = await call("upload_report", {
        state,
        device_id: deviceId,
        value: numeric,
      });
      const reading = data.state?.readings?.[deviceId] ?? data.reading ?? null;
      if (reading) await storeReading(deviceId, reading);
      if (screeningId) await persistState({ data: { screeningId, state: (data.state ?? {}) as never, phase: data.state?.phase } });
      apply(data, `${step.device_name}: ${numeric}`);
      setManual(null);
    });

  const uploadFile = (file: File) =>
    run(async () => {
      if (!state || step?.type !== "consent_check") return;
      const deviceId = step.device_id;
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/adaptive/upload_report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          state,
          device_id: deviceId,
          file: dataUrl,
          media_type: file.type,
        }),
      });
      const data = (await res.json()) as {
        state?: ConversationState;
        step?: Step;
        reading?: Reading | null;
        error?: string;
      };
      if (data.error === "value_not_found") {
        toast.error("Aaha couldn't find that value", {
          description: "Please type the number from your report.",
        });
        setManual(deviceId);
        return;
      }
      if (!res.ok || data.error) throw new Error(data.error || "Upload failed");
      const reading = data.state?.readings?.[deviceId] ?? data.reading ?? null;
      if (reading) await storeReading(deviceId, reading);
      if (screeningId) await persistState({ data: { screeningId, state: (data.state ?? {}) as never, phase: data.state?.phase } });
      apply(data, `Shared my ${step.device_name} report`);
      setManual(null);
    });


  const report = step?.type === "report" ? step.report : null;

  const { userId, user } = useAuth();
  const patientName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email?.split("@")[0] || null;
  const qc = useQueryClient();
  const savedRef = useRef(false);

  useEffect(() => {
    if (!report || !state || !userId || savedRef.current) return;
    savedRef.current = true;
    saveAssessment({
      userId,
      complaint: state.initial_complaint,
      score: report.awis,
      band: report.risk_band,
      summary: report.summary,
      suspectedConditions: state.suspected_conditions,
      answers: state.answers,
      readings: state.readings as unknown as Record<string, unknown>,
      report,
    })
      .then(() => {
        toast.success("Saved to your health record");
        void qc.invalidateQueries({ queryKey: ["assessments"] });
        void qc.invalidateQueries({ queryKey: ["notifications"] });
        void qc.invalidateQueries({ queryKey: ["test-readings"] });
      })
      .catch(() => {
        savedRef.current = false;
      });
  }, [report, state, userId, qc]);

  return (
    <Screen>
      <TopBar title="Guided check-up" subtitle="Aaha asks, listens and explains" />

      {!state && (
        <>
          <Section>
            <AahaSays>
              Tell me in your own words what is troubling you. I'll ask a few questions, look at any
              recent reports you have, and explain what it all means.
            </AahaSays>
          </Section>
          <Section title="What brings you here today?">
            <Card>
              <textarea
                aria-label="Describe how you are feeling"
                rows={4}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="e.g. I feel very tired all day and my periods are irregular"
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </Card>
          </Section>
          <Section>
            <Btn icon="arrow_forward" onClick={start} disabled={busy || !complaint.trim()}>
              {busy ? "Starting…" : "Start my check-up"}
            </Btn>
          </Section>
        </>
      )}

      {state && (
        <Section>
          <div className="space-y-3">
            {turns.map((t, i) => (
              <div
                key={`${i}-${t.text.slice(0, 12)}`}
                className={
                  t.role === "user"
                    ? "ml-auto max-w-[85%] rounded-3xl rounded-tr-md bg-brand p-4 text-sm text-primary-foreground"
                    : "max-w-[90%] rounded-3xl rounded-tl-md bg-card p-4 text-sm shadow-soft"
                }
              >
                {t.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </Section>
      )}

      {step?.type === "question" && (
        <Section title={step.phase === "intake" ? "Your answer" : "Focused question"}>
          <Card>
            <textarea
              aria-label="Your answer"
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Answer in your own words…"
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </Card>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Yes", "No", "Not sure"].map((q) => (
              <button key={q} type="button" disabled={busy} onClick={() => sendAnswer(q)}>
                <Pill tone="neutral">{q}</Pill>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Btn icon="send" onClick={() => sendAnswer(answer)} disabled={busy || !answer.trim()}>
              {busy ? "Aaha is listening…" : "Send answer"}
            </Btn>
          </div>
        </Section>
      )}

      {step?.type === "consent_gate" && (
        <Section title="Recent laboratory reports">
          <Card className="space-y-3">
            <ul className="space-y-1">
              {step.devices.map((d) => (
                <li key={d.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                  <Icon name="labs" className="text-primary" />
                  <span className="min-w-0 text-sm font-semibold">{d.name}</span>
                </li>
              ))}
            </ul>
            <Btn icon="check" onClick={() => answerConsentGate(true)} disabled={busy}>
              Yes, I have some of these
            </Btn>
            <Btn
              variant="outline"
              icon="close"
              onClick={() => answerConsentGate(false)}
              disabled={busy}
            >
              No — continue without them
            </Btn>
          </Card>
        </Section>
      )}

      {step?.type === "diagnostics" && state && (
        <DiagnosticsPanel
          conditions={state.suspected_conditions}
          rapidIds={step.rapid}
          labIds={step.lab}
          busy={busy}
          initialReadings={savedReadings}
          onPersist={(id, reading) => storeReading(id, reading)}

          onRemove={async (id) => {
            if (!screeningId) return;
            await removeReading({ data: { screeningId, testId: id } });
            void qc.invalidateQueries({ queryKey: ["active-screening"] });
            void qc.invalidateQueries({ queryKey: ["test-readings"] });
          }}
          onFinish={(readings: Record<string, Reading>) =>
            finalize(readings as unknown as Record<string, unknown>)
          }
        />
      )}

      {step?.type === "consent_check" && (
        <Section title={`Report ${step.device_name}`}>
          <Card className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {step.remaining} report{step.remaining > 1 ? "s" : ""} left to check.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = "";
              }}
            />
            <Btn icon="upload_file" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? "Reading your report…" : `Yes — share my ${step.device_name} report`}
            </Btn>
            <Btn
              variant="outline"
              icon="keyboard"
              onClick={() => setManual(step.device_id)}
              disabled={busy}
            >
              Type the value instead
            </Btn>
            <Btn variant="outline" icon="close" onClick={skipReport} disabled={busy}>
              I don't have it
            </Btn>
            {manual === step.device_id && (
              <ManualValue name={step.device_name} busy={busy} onSubmit={submitManual} />
            )}
          </Card>
        </Section>
      )}

      {report && (
        <article className="print-report">
          <ReportMasthead
            patientName={patientName}
            reportId={state?.session_id ?? null}
            statusLabel={
              report.awis_available
                ? `${report.risk_label} · AWIS ${report.awis}/20`
                : `${report.risk_label} · AWIS not available yet`
            }
          />

          <ReportHero
            awis={report.awis}
            band={report.risk_band}
            label={report.risk_label}
            headline={report.executive.headline}
            copy={report.executive.overall}
          />

          <ReportBreakdown breakdown={report.score_breakdown} />

          <div className="px-4 pt-6">
            <AahaSays>{report.summary}</AahaSays>
          </div>

          <ReportSection
            index="01"
            title="Executive summary"
            sub="What this screening found, in short."
          >
            <div className="space-y-3">
              <PlanGrid>
                <PlanCard
                  title="Major findings"
                  icon="troubleshoot"
                  items={report.executive.majorFindings}
                />
                <PlanCard
                  title="Positive observations"
                  icon="sentiment_satisfied"
                  items={report.executive.positives}
                />
                <PlanCard
                  title="Areas of concern"
                  icon="priority_high"
                  items={report.executive.concerns}
                />
                <PlanCard
                  title="Risk pattern analysis"
                  icon="monitor_heart"
                  items={report.executive.riskFactors}
                />
              </PlanGrid>
            </div>
          </ReportSection>

          {report.executive.symptomAnalysis.length > 0 && (
            <ReportSection
              index="02"
              title="What you told Aaha"
              sub="The guided conversation that shaped this screening."
            >
              <TranscriptList items={report.executive.symptomAnalysis} />
            </ReportSection>
          )}

          {(report.essential.length > 0 || report.rapid.length > 0 || report.lab.length > 0) && (
            <ReportSection
              index="03"
              title="Recorded values"
              sub="Everything measured or shared during this check-up."
            >
              <div className="space-y-5">
                {report.essential.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {"Essential screening results"}
                    </p>
                    <ReadingTable readings={report.essential} />
                  </div>
                )}
                {report.rapid.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {"Rapid test results"}
                    </p>
                    <ReadingTable readings={report.rapid} />
                  </div>
                )}
                {report.lab.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      {"Laboratory reports"}
                    </p>
                    <ReadingTable readings={report.lab} />
                  </div>
                )}
              </div>
            </ReportSection>
          )}

          {report.pending.length > 0 && (
            <ReportSection
              index="04"
              title="Worth adding next visit"
              sub="Baseline checks not yet recorded."
            >
              <TagRow items={report.pending.map((r) => r.name)} />
              <Btn
                variant="outline"
                size="md"
                className="mt-4 no-print"
                to="/upload"
                icon="upload_file"
              >
                Upload a report now
              </Btn>
            </ReportSection>
          )}

          <ReportSection
            index="05"
            title="Tests recommended for you"
            sub="Grouped by how soon they matter."
          >
            <TestPlanSection plan={report.test_plan} />
          </ReportSection>

          <ReportSection
            index="06"
            title="Care plan"
            sub="Lifestyle, nutrition and hormonal groundwork while awaiting doctor review."
          >
            <PlanGrid>
              <PlanCard
                title="Lifestyle plan"
                icon="directions_walk"
                items={report.guidance.lifestyle}
              />
              <PlanCard
                title={report.nutrition.title}
                icon="restaurant"
                items={report.guidance.nutrition}
              />
              <PlanCard title="Hormonal health" icon="science" items={report.guidance.hormonal} />
              <PlanCard
                title="Preventive care"
                icon="shield_with_heart"
                items={report.guidance.preventive}
              />
              <PlanCard title="Therapy & wellness" icon="spa" items={report.therapy} />
            </PlanGrid>
          </ReportSection>

          <ReportSection index="07" title="Follow-up plan" sub="Keep the momentum going.">
            <Timeline items={[...report.guidance.followUp, ...report.next_steps]} />
          </ReportSection>

          <ReportFooter />

          <Section className="no-print">
            <ReportShare
              title="My Aaha health report"
              summary={report.executive.overall}
              document={{
                title: "Guided check-up report",
                patientName,
                reportId: state?.session_id ?? null,
                date: new Date(),
                score: {
                  value: report.awis,
                  max: 20,
                  label: report.risk_label,
                  description: report.risk_description,
                },
                summary: report.executive.overall,
                sections: [
                  { type: "list", title: "Major findings", items: report.executive.majorFindings },
                  { type: "list", title: "Positive observations", items: report.executive.positives },
                  { type: "list", title: "Areas of concern", items: report.executive.concerns },
                  { type: "list", title: "Risk pattern analysis", items: report.executive.riskFactors },
                  {
                    type: "table",
                    title: "Recorded values",
                    columns: ["Test", "Result", "Reference", "Reading"],
                    rows: [...report.essential, ...report.rapid, ...report.lab].map((r) => [
                      r.name,
                      `${r.value} ${r.unit ?? ""}`.trim(),
                      r.ref_text || "—",
                      r.flag === "green" ? "Normal" : r.label,
                    ]),
                  },
                  { type: "list", title: "Worth adding next visit", items: report.pending.map((r) => r.name) },
                  { type: "list", title: "Lifestyle plan", items: report.guidance.lifestyle },
                  { type: "list", title: report.nutrition.title, items: report.guidance.nutrition },
                  { type: "list", title: "Hormonal health", items: report.guidance.hormonal },
                  { type: "list", title: "Preventive care", items: report.guidance.preventive },
                  { type: "list", title: "Therapy & wellness", items: report.therapy },
                  {
                    type: "list",
                    title: "Follow-up plan",
                    items: [...report.guidance.followUp, ...report.next_steps],
                  },
                ],
              }}
            />
            <Btn to="/doctors" className="mt-3" icon="stethoscope">
              Book a doctor review
            </Btn>
          </Section>
        </article>
      )}

      <div className="h-6" />

      <FlowNav
        steps={[
          { to: "/aaha", title: "Ask Aaha anything", subtitle: "Explain my result", icon: "forum" },
        ]}
      />
    </Screen>
  );
}

function ManualValue({
  name,
  busy,
  onSubmit,
}: {
  name: string;
  busy: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="rounded-2xl bg-soft p-3">
      <label className="text-xs font-semibold text-muted-foreground" htmlFor="manual-value">
        {name} value from your report
      </label>
      <input
        id="manual-value"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 10.4"
        className="mt-1 min-h-11 w-full bg-transparent text-sm font-semibold outline-none"
      />
      <Btn size="md" icon="check" onClick={() => onSubmit(value)} disabled={busy || !value.trim()}>
        Save value
      </Btn>
    </div>
  );
}

function ReadingSection({ title, readings }: { title: string; readings: Reading[] }) {
  if (!readings.length) return null;
  return (
    <Section title={title}>
      <ul className="space-y-3">
        {readings.map((r) => (
          <Card as="li" key={r.device_id}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {r.name} · {r.value} {r.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.label}
                  {r.ref_text ? ` · Reference ${r.ref_text}` : ""}
                </p>
              </div>
              <Pill tone={r.flag === "red" ? "red" : r.flag === "amber" ? "amber" : "green"}>
                {r.flag === "green" ? "Normal" : r.label}
              </Pill>
            </div>
          </Card>
        ))}
      </ul>
    </Section>
  );
}

function BulletCard({
  title,
  icon,
  items,
  tone = "primary",
}: {
  title: string;
  icon: string;
  items: string[];
  tone?: "primary" | "success" | "warning";
}) {
  if (!items?.length) return null;
  const color =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary";
  return (
    <Section title={title}>
      <Card className="space-y-2.5">
        {items.map((p) => (
          <div key={p} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
            <Icon name={icon} className={`text-[18px] ${color}`} />
            <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">{p}</p>
          </div>
        ))}
      </Card>
    </Section>
  );
}

function TestPlanSection({ plan }: { plan: TestPlan }) {
  const groups: Array<{ title: string; note: string; items: TestPlan["essential"] }> = [
    { title: "Essential tests", note: "Done at every Aaha screening", items: plan.essential },
    { title: "Recommended tests", note: "Based on your symptoms", items: plan.recommended },
    { title: "Optional / advanced", note: "Worth considering later", items: plan.optional },
  ];
  return (
    <Section title="Tests recommended for you">
      <div className="space-y-3">
        {groups.map((g) =>
          g.items.length ? (
            <Card key={g.title} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{g.title}</p>
                <span className="text-[11px] text-muted-foreground">{g.note}</span>
              </div>
              <ul className="space-y-2">
                {g.items.map((s) => (
                  <li
                    key={`${g.title}-${s.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-2xl bg-muted p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.reason}</p>
                    </div>
                    <Pill tone={s.recorded ? "green" : "neutral"}>
                      {s.recorded ? "Done" : "To do"}
                    </Pill>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null,
        )}
      </div>
      <Btn variant="outline" size="md" className="mt-3 no-print" to="/diagnostics" icon="science">
        Book these tests
      </Btn>
    </Section>
  );
}
