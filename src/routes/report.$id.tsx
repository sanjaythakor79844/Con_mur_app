import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { ReportShare } from "@/components/report-share";
import { ReportMasthead } from "@/components/report-editorial";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { getReport, reportFileUrl } from "@/lib/aaha-api";
import {
  analyzeReport,
  runReportOcr,
  saveExtractedValues,
  type ExtractedValue,
  type ReportAnalysis,
} from "@/lib/report-ocr.functions";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Report details | Aaha Companion" },
      {
        name: "description",
        content: "See the values Aaha read from your lab report, correct anything, and get a simple explanation.",
      },
      { property: "og:title", content: "Report details | Aaha Companion" },
      { property: "og:description", content: "Extracted lab values with a warm, plain-language explanation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportScreen,
});

function ReportScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <TopBar title="Report" subtitle={t("report.analysis")} />
      <RequireAuth message="Sign in to open this report.">
        <ReportDetail />
      </RequireAuth>
    </Screen>
  );
}

function toneFor(status: string) {
  if (status === "High") return "red" as const;
  if (status === "Low") return "amber" as const;
  if (status === "Normal") return "green" as const;
  return "neutral" as const;
}

function ReportDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const patientName =
    (user?.name as string | undefined) || user?.email?.split("@")[0] || null;

  const ocr = useServerFn(runReportOcr);
  const analyse = useServerFn(analyzeReport);
  const saveValues = useServerFn(saveExtractedValues);

  const report = useQuery({ queryKey: ["report", id], queryFn: () => getReport(id) });
  const [rows, setRows] = useState<ExtractedValue[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const values = (report.data?.extracted_values ?? []) as unknown as ExtractedValue[];
    if (Array.isArray(values)) setRows(values);
    setDirty(false);
  }, [report.data?.id, report.data?.extracted_values]);

  const rerun = useMutation({
    mutationFn: () => ocr({ data: { reportId: id } }),
    onSuccess: () => {
      toast.success("Values re-read");
      void qc.invalidateQueries({ queryKey: ["report", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not read the file"),
  });

  const save = useMutation({
    mutationFn: async () => {
      await saveValues({ data: { reportId: id, values: rows } });
      // Edited values change the picture — refresh the explanation straight away.
      if (report.data?.analysis) await analyse({ data: { reportId: id, language: lang } });
    },
    onSuccess: () => {
      setDirty(false);
      toast.success("Values saved");
      void qc.invalidateQueries({ queryKey: ["report", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the values"),
  });

  const explain = useMutation({
    mutationFn: async () => {
      if (dirty) await saveValues({ data: { reportId: id, values: rows } });
      return analyse({ data: { reportId: id, language: lang } });
    },
    onSuccess: () => {
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["report", id] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not prepare the explanation"),
  });

  const openFile = async () => {
    if (!report.data?.file_path) return;
    try {
      const url = await reportFileUrl(report.data.file_path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the file");
    }
  };

  if (report.isLoading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" />
          {t("common.loading")}
        </Card>
      </Section>
    );

  const r = report.data;
  if (!r)
    return (
      <Section>
        <Card className="text-center">
          <Icon name="folder_off" className="text-[32px] text-primary" />
          <p className="mt-2 text-sm font-bold">Report not found</p>
          <Btn to="/reports" className="mt-3" icon="folder_open">
            Back to reports
          </Btn>
        </Card>
      </Section>
    );

  const analysis = (r.analysis ?? null) as ReportAnalysis | null;
  const confidence = r.extraction_confidence ? Math.round(Number(r.extraction_confidence) * 100) : null;

  return (
    <>
      <ReportMasthead
        date={new Date(r.report_date || r.created_at || Date.now())}
        patientName={patientName}
        reportId={r.id}
        statusLabel={r.status_label ?? r.category}
      />
      <Section>
        <Card>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{r.title}</p>
              <p className="text-xs text-muted-foreground">
                {r.category} · {new Date(r.report_date || r.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
            {r.status_label ? (
              <Pill tone={(r.status_tone as "amber" | "green" | "info" | "neutral") ?? "neutral"}>
                {r.status_label}
              </Pill>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {r.file_path ? (
              <button
                type="button"
                onClick={() => void openFile()}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
              >
                <Icon name="download" className="text-[16px]" /> Open file
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => rerun.mutate()}
              disabled={rerun.isPending}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
            >
              <Icon
                name={rerun.isPending ? "progress_activity" : "restart_alt"}
                className={`text-[16px] ${rerun.isPending ? "animate-spin" : ""}`}
              />
              {t("report.reRun")}
            </button>
          </div>
          {confidence !== null ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("report.confidence")}: <span className="font-semibold text-primary">{confidence}%</span>
            </p>
          ) : null}
          {r.ocr_error ? <p className="mt-2 text-xs text-destructive">{r.ocr_error}</p> : null}
        </Card>
      </Section>

      <Section title={t("report.values")}>
        <p className="mb-2 text-xs text-muted-foreground">{t("report.needsReview")}</p>
        <ul className="space-y-3">
          {rows.map((row, index) => {
            const uncertain = Number(row.confidence ?? 1) < 0.7 || !String(row.value).trim();
            return (
            <Card as="li" key={`${row.test_name}-${index}`} className={uncertain ? "border-warning/60 bg-warning/5" : undefined}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="truncate text-sm font-bold">{row.test_name}</p>
                <Pill tone={uncertain ? "amber" : toneFor(row.status)}>{uncertain ? "Please check" : row.status}</Pill>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  aria-label={`${row.test_name} value`}
                  value={row.value}
                  placeholder="Not detected — add it"
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, value: e.target.value };
                    setRows(next);
                    setDirty(true);
                  }}
                  className="min-h-11 w-full rounded-2xl bg-muted px-3 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
                <input
                  aria-label={`${row.test_name} unit`}
                  value={row.unit}
                  placeholder="Unit"
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, unit: e.target.value };
                    setRows(next);
                    setDirty(true);
                  }}
                  className="min-h-11 w-full rounded-2xl bg-muted px-3 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Reference: {row.reference_range || "—"}
                {row.confidence !== undefined && row.confidence !== null
                  ? ` · read ${Math.round(Number(row.confidence) * 100)}% clear`
                  : ""}
              </p>

            </Card>
            );
          })}
        </ul>


        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setRows([
                ...rows,
                { test_name: "New test", value: "", unit: "", reference_range: "", status: "Unknown", confidence: 1 },
              ]);
              setDirty(true);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
          >
            <Icon name="add" className="text-[16px]" /> Add a value
          </button>
          {dirty ? (
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Icon name="save" className="text-[16px]" /> {t("common.save")}
            </button>
          ) : null}
        </div>
      </Section>

      <Section title={t("report.analysis")}>
        {explain.isPending ? (
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            {t("upload.analysing")}
          </Card>
        ) : analysis ? (
          <div className="space-y-3">
            <Card className="bg-soft">
              <div className="flex items-center gap-2 text-primary">
                <Icon name="favorite" />
                <p className="text-sm font-bold">Aaha says</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{analysis.summary}</p>
            </Card>

            {analysis.abnormal?.length ? (
              <Card>
                <p className="text-sm font-bold">{t("report.abnormal")}</p>
                <ul className="mt-2 space-y-2">
                  {analysis.abnormal.map((a) => (
                    <li key={a.test_name} className="rounded-2xl bg-muted p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{a.test_name}</p>
                        <Pill tone={a.severity === "high" ? "red" : a.severity === "moderate" ? "amber" : "info"}>
                          {a.value}
                        </Pill>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{a.note}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <ListCard title={t("report.normal")} items={analysis.normal} icon="check_circle" />
            <ListCard title={t("report.risks")} items={analysis.risk_indicators} icon="warning" />
            <ListCard title={t("report.tests")} items={analysis.recommended_tests} icon="science" />
            <ListCard title={t("report.lifestyle")} items={analysis.lifestyle} icon="self_improvement" />

            {analysis.doctor_consultation?.needed ? (
              <Card className="bg-soft">
                <p className="text-sm font-bold">{t("report.doctor")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{analysis.doctor_consultation.reason}</p>
                <Btn to="/doctors" size="md" className="mt-3" icon="stethoscope">
                  Book {analysis.doctor_consultation.speciality || "a doctor"}
                </Btn>
              </Card>
            ) : null}

            <Btn
              variant="outline"
              icon="chat"
              onClick={() => void navigate({ to: "/aaha", search: { report: id } })}
            >
              {t("report.askAaha")}
            </Btn>

            <ReportShare
              title={r.title}
              summary={analysis.summary}
              document={{
                title: r.title,
                patientName,
                reportId: r.id,
                date: new Date(r.report_date || r.created_at || Date.now()),
                summary: analysis.summary,
                sections: [
                  {
                    type: "table",
                    title: "Test results",
                    columns: ["Test", "Result", "Reference range", "Status"],
                    rows: rows.map((row) => [
                      row.test_name,
                      `${row.value} ${row.unit ?? ""}`.trim(),
                      row.reference_range || "—",
                      row.status,
                    ]),
                  },
                  {
                    type: "list",
                    title: "Values needing attention",
                    items: (analysis.abnormal ?? []).map(
                      (a) => `${a.test_name} (${a.value}) — ${a.note} [${a.severity} priority]`,
                    ),
                  },
                  { type: "list", title: "Values within range", items: analysis.normal ?? [] },
                  { type: "list", title: "Risk indicators", items: analysis.risk_indicators ?? [] },
                  { type: "list", title: "Recommended tests", items: analysis.recommended_tests ?? [] },
                  { type: "list", title: "Lifestyle guidance", items: analysis.lifestyle ?? [] },
                  ...(analysis.doctor_consultation?.needed
                    ? [
                        {
                          type: "text" as const,
                          title: "Doctor consultation",
                          body: `${analysis.doctor_consultation.speciality || "Doctor"} — ${analysis.doctor_consultation.reason}`,
                        },
                      ]
                    : []),
                ],
              }}
            />
          </div>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">
              Aaha can explain these values in simple words and suggest what to do next.
            </p>
            <Btn className="mt-3" onClick={() => explain.mutate()} icon="auto_awesome">
              {t("report.analyze")}
            </Btn>
          </Card>
        )}
      </Section>
    </>
  );
}

function ListCard({ title, items, icon }: { title: string; items?: string[]; icon: string }) {
  if (!items || items.length === 0) return null;
  return (
    <Card>
      <div className="flex items-center gap-2 text-primary">
        <Icon name={icon} className="text-[18px]" />
        <p className="text-sm font-bold">{title}</p>
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i} className="text-xs text-muted-foreground">
            • {i}
          </li>
        ))}
      </ul>
    </Card>
  );
}
