import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { ReportShare } from "@/components/report-share";
import { ReportMasthead } from "@/components/report-editorial";
import { useAuth } from "@/hooks/use-auth";
import { useOverview } from "@/hooks/use-overview";
import { useI18n } from "@/lib/i18n";
import { getReport, processReport } from "@/lib/aaha-api";
import {
  ResultMarkerCard,
  ResultScoreHero,
  ResultNextStepCard,
  mapToResultMarker,
  type ResultMarker,
} from "@/components/result-explanation";
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
        content:
          "See the values Aaha read from your lab report, correct anything, and get a simple explanation.",
      },
      { property: "og:title", content: "Report details | Aaha Companion" },
      {
        property: "og:description",
        content: "Extracted lab values with a warm, plain-language explanation.",
      },
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
      <TopBar title={t("Your results, explained")} subtitle={t("report.analysis")} />
      <RequireAuth message={t("Sign in to open this report.")}>
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
  const { latestAssessment } = useOverview();
  const patientName = (user?.name as string | undefined) || user?.email?.split("@")[0] || null;

  const ocr = useServerFn(runReportOcr);
  const analyse = useServerFn(analyzeReport);
  const saveValues = useServerFn(saveExtractedValues);

  const report = useQuery({ queryKey: ["report", id], queryFn: () => getReport(id) });
  const [rows, setRows] = useState<ExtractedValue[]>([]);
  const [dirty, setDirty] = useState(false);
  const [localAnalysis, setLocalAnalysis] = useState<ReportAnalysis | null>(null);

  const markers: ResultMarker[] = useMemo(() => {
    return rows.map((row) => {
      const abnormalMatch = localAnalysis?.abnormal?.find(
        (a) =>
          a.test_name.toLowerCase().trim() === row.test_name.toLowerCase().trim() ||
          row.test_name.toLowerCase().includes(a.test_name.toLowerCase()) ||
          a.test_name.toLowerCase().includes(row.test_name.toLowerCase()),
      );

      let status = row.status || "In range";
      let note = abnormalMatch?.note;

      if (abnormalMatch) {
        if (abnormalMatch.severity === "high") status = "High";
        else if (abnormalMatch.severity === "moderate") status = "Slightly high";
        else status = "Low";
      } else if (row.status === "Normal") {
        status = "In range";
        if (!note) {
          note = t("Your reading is in the healthy reference range.");
        }
      }

      return mapToResultMarker({
        name: row.test_name,
        value: row.value,
        unit: row.unit,
        refRange: row.reference_range,
        status,
        note,
      });
    });
  }, [rows, localAnalysis, t]);

  useEffect(() => {
    const values = (report.data?.extracted_values ?? []) as unknown as ExtractedValue[];
    if (Array.isArray(values)) setRows(values);
    if (report.data?.analysis) setLocalAnalysis(report.data.analysis);
    setDirty(false);
  }, [report.data?.id, report.data?.extracted_values, report.data?.analysis]);

  const rerun = useMutation({
    mutationFn: async () => {
      // Reprocess via separate feature backend if this is an uploaded report
      if (report.data?.source !== "kiosk") {
        try {
          const res = await processReport(id);
          if (res.ok && res.values) {
            return res;
          }
          if (res.error) throw new Error(res.error);
        } catch (backendErr: any) {
          // If the error is not a 404/network error, propagate the useful message
          if (backendErr.status && backendErr.status !== 404) {
            throw backendErr;
          }
        }
      }

      // Legacy/Kiosk fallback
      const url = report.data?.file_url || report.data?.file_path;
      if (!url) throw new Error("No file URL available");
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://aaha-api-REDACTED_SENDER_ID.asia-south1.run.app/api/v2";
      const fullUrl = url.startsWith("http") ? url : apiBaseUrl.replace("/api/v2", "") + (url.startsWith("/") ? url : "/" + url);
      const res = await ocr({ data: { fileUrl: fullUrl } });
      if (!res.ok) throw new Error(res.error || "Failed to read file");
      return res;
    },
    onSuccess: (data: any) => {
      if (data.values) setRows(data.values);
      if (data.analysis) setLocalAnalysis(data.analysis);
      qc.invalidateQueries({ queryKey: ["report", id] });
      toast.success("Values re-read");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not read the file"),
  });

  const save = useMutation({
    mutationFn: async () => {
      await saveValues({ data: { reportId: id, values: rows } });
      if (localAnalysis) {
        const res = await analyse({ data: { values: rows, language: lang, reportTitle: report.data?.title, reportDate: report.data?.report_date || report.data?.created_at } });
        if (res.ok && res.analysis) return res.analysis;
      }
      return null;
    },
    onSuccess: (newAnalysis) => {
      setDirty(false);
      if (newAnalysis) setLocalAnalysis(newAnalysis);
      toast.success("Values saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save the values"),
  });

  const explain = useMutation({
    mutationFn: async () => {
      if (dirty) await saveValues({ data: { reportId: id, values: rows } });
      const res = await analyse({ data: { values: rows, language: lang, reportTitle: report.data?.title, reportDate: report.data?.report_date || report.data?.created_at } });
      if (!res.ok) throw new Error("Failed to analyze");
      return res.analysis;
    },
    onSuccess: (newAnalysis) => {
      setDirty(false);
      if (newAnalysis) setLocalAnalysis(newAnalysis);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not prepare the explanation"),
  });

  const openFile = () => {
    const r = report.data;
    if (!r) return;

    if (r.source === "kiosk") {
      if (r.report_pdf_url) {
        window.open(r.report_pdf_url, "_blank", "noopener");
      } else {
        toast.info(t("PDF is not available yet"));
      }
      return;
    }

    // Consumer App manually uploaded reports
    const path = r.file_url || r.file_path;
    if (path) {
      if (path.startsWith("http")) {
        window.open(path, "_blank", "noopener");
      } else {
        const fetchAndOpen = async () => {
          const toastId = toast.loading("Opening file...");
          try {
            const { apiService } = await import("@/lib/api-service");
            const blob = await apiService.getFileBlob(path, Number(r.id));
            const objectUrl = URL.createObjectURL(blob);
            toast.dismiss(toastId);
            window.open(objectUrl, "_blank", "noopener");
          } catch (e) {
            toast.dismiss(toastId);
            toast.error(t("Original file is unavailable"));
          }
        };
        void fetchAndOpen();
      }
    } else {
      toast.error(t("Original file is unavailable"));
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
          <p className="mt-2 text-sm font-bold">{t("Report not found")}</p>
          <Btn to="/reports" className="mt-3" icon="folder_open">
            {t("Back to reports")}
          </Btn>
        </Card>
      </Section>
    );

  const analysis = localAnalysis;
  const confidence = r.extraction_confidence
    ? Math.round(Number(r.extraction_confidence) * 100)
    : null;

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
                {r.category} ·{" "}
                {new Date(r.report_date || r.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
            {r.status_label ? (
              <Pill tone={(r.status_tone as "amber" | "green" | "info" | "neutral") ?? "neutral"}>
                {r.status_label}
              </Pill>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(r.source === "kiosk" ? r.report_pdf_url : (r.file_url || r.file_path)) ? (
              <button
                type="button"
                onClick={() => void openFile()}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
              >
                <Icon name="download" className="text-[16px]" /> {t("Open file")}
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
              {t("report.confidence")}:{" "}
              <span className="font-semibold text-primary">{confidence}%</span>
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
              <Card
                as="li"
                key={`${row.test_name}-${index}`}
                className={uncertain ? "border-warning/60 bg-warning/5" : undefined}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <input
                    aria-label="Test name"
                    value={row.test_name}
                    placeholder={t("Enter test name")}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...row, test_name: e.target.value };
                      setRows(next);
                      setDirty(true);
                    }}
                    className="w-full bg-transparent text-sm font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground truncate"
                  />
                  <Pill tone={uncertain ? "amber" : toneFor(row.status)}>
                    {uncertain ? t("Please check") : t(row.status)}
                  </Pill>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    aria-label={`${row.test_name || "Test"} value`}
                    value={row.value}
                    placeholder={t("Not detected — add value")}
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
                    placeholder={t("Unit")}
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
                  {t("Reference:")} {row.reference_range || "—"}
                  {row.confidence !== undefined && row.confidence !== null
                    ? ` · ${t("read")} ${Math.round(Number(row.confidence) * 100)}% ${t("clear")}`
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
                {
                  test_name: "",
                  value: "",
                  unit: "",
                  reference_range: "",
                  status: "Unknown",
                  confidence: 1,
                },
              ]);
              setDirty(true);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
          >
            <Icon name="add" className="text-[16px]" /> {t("Add a value")}
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

      <Section title={t("Your results, explained")}>
        {explain.isPending ? (
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            {t("upload.analysing")}
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Score Dial Hero matching reference HTML */}
            {latestAssessment?.score ? (
              <ResultScoreHero
                score={latestAssessment.score}
                message={analysis?.summary}
              />
            ) : analysis?.summary ? (
              <Card className="bg-soft border-accent/60">
                <div className="flex items-center gap-2 text-primary">
                  <Icon name="favorite" />
                  <p className="text-sm font-bold">{t("Aaha says")}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {analysis.summary}
                </p>
              </Card>
            ) : null}

            {/* Result Markers: Explained cards with range bar & clinical notes matching reference HTML */}
            {markers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t("Test results, explained")}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {markers.length} {t("tests")}
                  </span>
                </div>
                {markers.map((marker, idx) => (
                  <ResultMarkerCard
                    key={`${marker.name}-${idx}`}
                    marker={marker}
                    explain={true}
                  />
                ))}
              </div>
            ) : null}

            {/* Next step consultation card matching reference HTML */}
            <ResultNextStepCard
              reason={analysis?.doctor_consultation?.reason}
              speciality={analysis?.doctor_consultation?.speciality}
            />

            {/* Additional clinical breakdown */}
            {analysis?.risk_indicators?.length ? (
              <ListCard title={t("report.risks")} items={analysis.risk_indicators} icon="warning" />
            ) : null}
            {analysis?.recommended_tests?.length ? (
              <ListCard title={t("report.tests")} items={analysis.recommended_tests} icon="science" />
            ) : null}
            {analysis?.lifestyle?.length ? (
              <ListCard
                title={t("report.lifestyle")}
                items={analysis.lifestyle}
                icon="self_improvement"
              />
            ) : null}

            {/* Ask Aaha button */}
            <div className="pt-2">
              <Link
                to="/aaha"
                search={{ report: id }}
                className="flex items-center w-full min-h-[64px] rounded-[32px] justify-between px-5 bg-card border border-border text-foreground hover:border-primary shadow-sm transition-colors"
              >
                <span className="text-[16px] font-semibold">{t("report.askAaha")}</span>
                <span className="grid size-10 place-items-center rounded-full bg-brand text-brand-foreground shrink-0 shadow-sm">
                  <Icon name="mic" className="text-[20px]" />
                </span>
              </Link>
            </div>

            {/* Medical disclaimer matching reference HTML */}
            <p className="fine m-0 text-[13px] text-muted-foreground text-center pt-1 pb-1">
              {t("Aaha explains your results. It does not replace a doctor.")}
            </p>

            {/* Report Share */}
            {analysis && (
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
                    {
                      type: "list",
                      title: "Recommended tests",
                      items: analysis.recommended_tests ?? [],
                    },
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
            )}

            {!analysis && (
              <Card className="mt-2">
                <p className="text-sm text-muted-foreground">
                  {t("Aaha can explain these values in simple words and suggest what to do next.")}
                </p>
                <Btn className="mt-3" onClick={() => explain.mutate()} icon="auto_awesome">
                  {t("report.analyze")}
                </Btn>
              </Card>
            )}
          </div>
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
