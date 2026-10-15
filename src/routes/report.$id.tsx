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
import { getReport, processReport, listAssessments } from "@/lib/aaha-api";
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
      { title: "Report Details & Explanation | Aaha Companion" },
      {
        name: "description",
        content: "View clinical check-up readings or extracted laboratory values with plain-language medical explanations.",
      },
    ],
  }),
  component: ReportScreen,
});

function ReportScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <TopBar title={t("Report Details")} subtitle={t("Clinical readings & explanation")} />
      <RequireAuth message={t("Sign in to open this report.")}>
        <ReportDetail />
      </RequireAuth>
    </Screen>
  );
}

function toneFor(status: string) {
  const s = status.toLowerCase();
  if (s.includes("high") || s.includes("danger") || s.includes("critical")) return "red" as const;
  if (s.includes("low") || s.includes("amber") || s.includes("warn")) return "amber" as const;
  if (s.includes("normal") || s.includes("ok") || s.includes("green") || s.includes("in range"))
    return "green" as const;
  return "neutral" as const;
}

function ReportDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, userId } = useAuth();
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

      let statusString: string = row.status || "In range";
      let note = abnormalMatch?.note;

      if (abnormalMatch) {
        if (abnormalMatch.severity === "high") statusString = "High";
        else if (abnormalMatch.severity === "moderate") statusString = "Slightly high";
        else statusString = "Low";
      } else if (row.status === "Normal") {
        statusString = "In range";
        if (!note) {
          note = t("Your reading is in the healthy reference range.");
        }
      }

      return mapToResultMarker({
        name: row.test_name,
        value: row.value,
        unit: row.unit,
        refRange: row.reference_range,
        status: statusString,
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
          if ((res as any).error) throw new Error((res as any).error);
        } catch (backendErr: any) {
          if (backendErr.status && backendErr.status !== 404) {
            throw backendErr;
          }
        }
      }

      // Legacy fallback
      const url = report.data?.file_url;
      if (!url || !url.startsWith("http")) throw new Error(t("No valid document file URL available"));
      const res = await ocr({ data: { fileUrl: url } });
      if (!res.ok) throw new Error(res.error || t("Failed to read file"));
      return res;
    },
    onSuccess: (data: any) => {
      if (data.values) setRows(data.values);
      if (data.analysis) setLocalAnalysis(data.analysis);
      qc.invalidateQueries({ queryKey: ["report", id] });
      toast.success(t("Values re-read from document"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("Could not read the file")),
  });

  const save = useMutation({
    mutationFn: async () => {
      await saveValues({ data: { reportId: id, values: rows } });
      if (localAnalysis) {
        const res = await analyse({
          data: {
            values: rows,
            language: lang,
            reportTitle: report.data?.title,
            reportDate: report.data?.report_date || report.data?.created_at,
          },
        });
        if (res.ok && res.analysis) return res.analysis;
      }
      return null;
    },
    onSuccess: (newAnalysis) => {
      setDirty(false);
      if (newAnalysis) setLocalAnalysis(newAnalysis);
      toast.success(t("Values saved successfully"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("Could not save the values")),
  });

  const explain = useMutation({
    mutationFn: async () => {
      if (dirty) await saveValues({ data: { reportId: id, values: rows } });
      const res = await analyse({
        data: {
          values: rows,
          language: lang,
          reportTitle: report.data?.title,
          reportDate: report.data?.report_date || report.data?.created_at,
        },
      });
      if (!res.ok) throw new Error(t("Failed to analyze"));
      return res.analysis;
    },
    onSuccess: (newAnalysis) => {
      setDirty(false);
      if (newAnalysis) setLocalAnalysis(newAnalysis);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : t("Could not prepare the explanation")),
  });

  const handlePdfAction = async (isRetry = false) => {
    const rawPath = report.data?.report_pdf_url || report.data?.file_url;
    if (!rawPath || !rawPath.startsWith("http")) {
      toast.info(t("PDF is not available yet"));
      return;
    }

    const toastId = toast.loading(t("Opening document..."));
    try {
      const res = await fetch(rawPath);
      if (res.status === 403 || res.status === 401) {
        toast.dismiss(toastId);
        if (!isRetry) {
          const retryToast = toast.loading(t("Refreshing report link..."));
          await qc.invalidateQueries({ queryKey: ["assessments", userId] });
          const freshAssessments = await listAssessments();
          toast.dismiss(retryToast);
          const freshRecord = freshAssessments.find((item) => String(item.id) === String(id));
          if (
            freshRecord?.report_pdf_url &&
            freshRecord.report_pdf_url !== rawPath &&
            freshRecord.report_pdf_url.startsWith("http")
          ) {
            window.open(freshRecord.report_pdf_url, "_blank", "noopener");
            return;
          }
        }
        toast.error(t("Report link has expired. Please try again later."));
        return;
      }
      toast.dismiss(toastId);
      window.open(rawPath, "_blank", "noopener");
    } catch {
      toast.dismiss(toastId);
      window.open(rawPath, "_blank", "noopener");
    }
  };

  if (report.isLoading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground p-6">
          <Icon name="progress_activity" className="animate-spin text-primary text-[22px]" />
          <span>{t("Loading report details...")}</span>
        </Card>
      </Section>
    );

  const r = report.data;
  if (!r)
    return (
      <Section>
        <Card className="text-center p-8">
          <Icon name="folder_off" className="text-[36px] text-muted-foreground" />
          <p className="mt-3 text-base font-bold text-foreground">{t("Report not found")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("This report may have been deleted or is not associated with your account.")}
          </p>
          <Btn to="/reports" className="mt-4" icon="folder_open">
            {t("Back to reports")}
          </Btn>
        </Card>
      </Section>
    );

  const isKiosk = r.source === "kiosk" || r.report_type === "kiosk";
  const confidence = r.extraction_confidence
    ? Math.round(Number(r.extraction_confidence) * 100)
    : null;
  const hasValidPdf = Boolean(r.report_pdf_url && r.report_pdf_url.startsWith("http"));
  const hasUploadedFile = Boolean(r.file_url && r.file_url.startsWith("http"));

  return (
    <>
      {/* 1. Masthead */}
      <ReportMasthead
        date={new Date(r.report_date || r.created_at || Date.now())}
        patientName={patientName}
        reportId={isKiosk && r.kiosk_id ? `Kiosk #${r.kiosk_id}` : r.id}
        statusLabel={isKiosk && r.band ? `${r.band} risk` : r.status_label ?? r.category}
      />

      {/* 2. KIOSK CHECK-UP REPORT VIEW */}
      {isKiosk ? (
        <div className="space-y-4 px-4 sm:px-6 pb-12">
          {/* AWIS Score Dial Hero */}
          {r.score > 0 ? (
            <ResultScoreHero
              score={r.score}
              message={
                r.conclusion
                  ? r.conclusion
                  : r.summary
                  ? r.summary
                  : t("Clinical checkup completed at kiosk.")
              }
            />
          ) : r.conclusion ? (
            <Card className="bg-card border-accent/60 p-4 shadow-soft">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Icon name="favorite" className="text-[18px]" />
                <span>{t("Clinical Summary")}</span>
              </div>
              <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{r.conclusion}</p>
            </Card>
          ) : null}

          {/* Measured Vitals & Readings */}
          {r.baseline_readings && Object.keys(r.baseline_readings).length > 0 && (
            <Section title={t("Measured Health Markers")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(r.baseline_readings).map(([key, val]: [string, any]) => {
                  const displayVal = typeof val === "object" && val !== null ? val.value : val;
                  const unit = typeof val === "object" && val !== null ? val.unit : "";
                  const label = typeof val === "object" && val !== null ? val.label : null;
                  const flag = typeof val === "object" && val !== null ? val.flag : null;
                  const name =
                    typeof val === "object" && val !== null && val.name
                      ? val.name
                      : key.replace(/_/g, " ");

                  const isHighRisk = flag === "red";
                  const isModerate = flag === "amber";

                  return (
                    <Card key={key} className="p-4 shadow-soft flex flex-col justify-between gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[14px] font-bold text-foreground capitalize">
                          {t(name)}
                        </span>
                        {flag && (
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isHighRisk
                                ? "bg-danger/10 text-danger"
                                : isModerate
                                ? "bg-warning/10 text-warning"
                                : "bg-success/10 text-success"
                            }`}
                          >
                            {flag === "green" ? t("Normal") : flag === "amber" ? t("Attention") : t("High")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1.5 my-1">
                        <span className="text-[26px] font-bold text-foreground leading-none">
                          {displayVal}
                        </span>
                        {unit && <span className="text-[13px] text-muted-foreground">{unit}</span>}
                      </div>

                      {label && (
                        <p className="text-[12px] text-muted-foreground border-t border-border/40 pt-1.5">
                          {label}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Recommended Tests from Prediction */}
          {Array.isArray(r.recommended_tests) && r.recommended_tests.length > 0 && (
            <Section title={t("Recommended Laboratory Tests")}>
              <Card className="p-4 shadow-soft">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                  <Icon name="science" className="text-[18px]" />
                  <span>{t("Suggested follow-up tests")}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("Based on your screening markers, these tests were recommended for complete clinical evaluation:")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {r.recommended_tests.map((testName: string) => (
                    <span
                      key={testName}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold"
                    >
                      <Icon name="check_circle" className="text-[15px] text-primary" />
                      <span>{testName}</span>
                    </span>
                  ))}
                </div>
              </Card>
            </Section>
          )}

          {/* Nutrition Guidance from Kiosk */}
          {Array.isArray(r.nutrition_plans) && r.nutrition_plans.length > 0 && (
            <Section title={t("Wellness & Nutrition Guidance")}>
              {r.nutrition_plans.map((np: any, idx: number) => (
                <Card key={idx} className="p-4 shadow-soft mb-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                    <Icon name="restaurant" className="text-[18px]" />
                    <span>{np.title || t("General Nutrition Plan")}</span>
                  </div>
                  {Array.isArray(np.points) && (
                    <ul className="space-y-1.5 pl-1">
                      {np.points.map((pt: string, pIdx: number) => (
                        <li key={pIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </Section>
          )}

          {/* Therapy & Activity Plan from Kiosk */}
          {Array.isArray(r.therapy_plan) && r.therapy_plan.length > 0 && (
            <Section title={t("Activity & Lifestyle Guidance")}>
              <Card className="p-4 shadow-soft">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                  <Icon name="self_improvement" className="text-[18px]" />
                  <span>{t("Lifestyle plan")}</span>
                </div>
                <ul className="space-y-1.5 pl-1">
                  {r.therapy_plan.map((item: string, idx: number) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          )}

          {/* Doctor Consultation Step if referred */}
          {r.refer_to_doctor && (
            <ResultNextStepCard
              reason={r.conclusion || t("Consultation recommended to review check-up results.")}
              speciality={t("General Physician")}
            />
          )}

          {/* PDF View / Download Actions */}
          <Section>
            <Card className="p-4 shadow-soft flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{t("Official Kiosk Report Document")}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasValidPdf
                      ? t("Signed PDF document generated by the clinical kiosk.")
                      : t("Official PDF report is pending generation by the kiosk.")}
                  </p>
                </div>
                {hasValidPdf && (
                  <button
                    type="button"
                    onClick={() => handlePdfAction(false)}
                    className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:brightness-105 active:scale-95 transition-all shadow-sm"
                  >
                    <Icon name="picture_as_pdf" className="text-[16px]" />
                    <span>{t("Open PDF")}</span>
                  </button>
                )}
              </div>
            </Card>
          </Section>

          {/* Medical Disclaimer */}
          <p className="text-[12px] text-muted-foreground text-center py-2 px-4 leading-normal">
            {t("This health screening record is informational and does not replace medical advice or diagnosis from a qualified healthcare professional.")}
          </p>
        </div>
      ) : (
        /* 3. UPLOADED LABORATORY REPORT VIEW */
        <div className="space-y-4 px-4 sm:px-6 pb-12">
          {/* Top Document Summary Card */}
          <Section>
            <Card className="p-4 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.category || t("Lab report")} ·{" "}
                    {new Date(r.report_date || r.created_at || Date.now()).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {r.status_label ? (
                  <Pill tone={(r.status_tone as "amber" | "green" | "info" | "neutral") ?? "neutral"}>
                    {r.status_label}
                  </Pill>
                ) : null}
              </div>

              {/* Document actions: Open original file, Reprocess */}
              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/40">
                {hasUploadedFile && (
                  <button
                    type="button"
                    onClick={() => handlePdfAction(false)}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-primary hover:bg-accent/80 active:scale-95 transition-all"
                  >
                    <Icon name="visibility" className="text-[16px]" /> {t("View original file")}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => rerun.mutate()}
                  disabled={rerun.isPending}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary hover:bg-muted/80 active:scale-95 transition-all"
                >
                  <Icon
                    name={rerun.isPending ? "progress_activity" : "restart_alt"}
                    className={`text-[16px] ${rerun.isPending ? "animate-spin" : ""}`}
                  />
                  {t("Re-read document")}
                </button>
              </div>

              {confidence !== null ? (
                <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                  <span>{t("OCR reading clarity")}:</span>
                  <span className="font-semibold text-primary">{confidence}%</span>
                </p>
              ) : null}

              {r.ocr_error ? <p className="mt-2 text-xs text-destructive">{r.ocr_error}</p> : null}
            </Card>
          </Section>

          {/* Measured Lab Biomarkers Section */}
          <Section title={t("Measured Laboratory Biomarkers")}>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs text-muted-foreground">
                {t("Verify values extracted from your report. Tap any field to edit.")}
              </p>
              <span className="text-xs font-bold text-muted-foreground">
                {rows.length} {t("tests")}
              </span>
            </div>

            <ul className="space-y-3">
              {rows.map((row, index) => {
                const uncertain = Number(row.confidence ?? 1) < 0.7 || !String(row.value).trim();
                return (
                  <Card
                    as="li"
                    key={`${row.test_name}-${index}`}
                    className={`p-4 shadow-soft transition-all ${
                      uncertain ? "border-warning/60 bg-warning/5" : ""
                    }`}
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
                        className="w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground truncate"
                      />
                      <Pill tone={uncertain ? "amber" : toneFor(row.status)}>
                        {uncertain ? t("Please verify") : t(row.status)}
                      </Pill>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          {t("Measured Value")}
                        </label>
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
                          className="min-h-10 w-full rounded-xl bg-muted/60 border border-border/50 px-3 text-sm font-bold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          {t("Unit")}
                        </label>
                        <input
                          aria-label={`${row.test_name} unit`}
                          value={row.unit}
                          placeholder={t("e.g. mg/dL")}
                          onChange={(e) => {
                            const next = [...rows];
                            next[index] = { ...row, unit: e.target.value };
                            setRows(next);
                            setDirty(true);
                          }}
                          className="min-h-10 w-full rounded-xl bg-muted/60 border border-border/50 px-3 text-sm font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>

                    {/* Laboratory Reference Range (distinguished from general informational range) */}
                    <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{t("Lab reference range")}:</span>
                      <input
                        aria-label={`${row.test_name} reference range`}
                        value={row.reference_range || ""}
                        placeholder={t("e.g. 12.0 - 15.5")}
                        onChange={(e) => {
                          const next = [...rows];
                          next[index] = { ...row, reference_range: e.target.value };
                          setRows(next);
                          setDirty(true);
                        }}
                        className="bg-transparent text-right text-xs font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground max-w-[150px]"
                      />
                    </div>
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
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-primary hover:bg-accent/80 active:scale-95 transition-all"
              >
                <Icon name="add" className="text-[16px]" /> {t("Add missing test")}
              </button>
              {dirty ? (
                <button
                  type="button"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:brightness-105 active:scale-95 transition-all shadow-sm"
                >
                  <Icon name="save" className="text-[16px]" /> {t("Save changes")}
                </button>
              ) : null}
            </div>
          </Section>

          {/* 4. PLAIN-LANGUAGE EXPLANATION SECTION (AI-Assisted) */}
          <Section title={t("Plain-Language Explanation")}>
            {/* Informational Guidance Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-[20px] p-4 text-xs text-foreground/80 leading-relaxed mb-3">
              <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                <Icon name="info" className="text-[16px]" />
                <span>{t("AI-Assisted Educational Summary")}</span>
              </div>
              <p className="m-0">
                {t("The following explanations are generated to help you understand your laboratory report. They explain the measured biomarkers in plain language and do not constitute a medical diagnosis, prescription, or clinical advice.")}
              </p>
            </div>

            {explain.isPending ? (
              <Card className="flex items-center gap-3 text-sm text-muted-foreground p-6 shadow-soft">
                <Icon name="progress_activity" className="animate-spin text-primary text-[22px]" />
                <span>{t("Generating plain-language explanation...")}</span>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Score Dial Hero if AWIS score is available */}
                {latestAssessment?.score ? (
                  <ResultScoreHero score={latestAssessment.score} message={localAnalysis?.summary} />
                ) : localAnalysis?.summary ? (
                  <Card className="bg-card border border-border p-4 shadow-soft">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1.5">
                      <Icon name="favorite" className="text-[18px]" />
                      <span>{t("Aaha says")}</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{localAnalysis.summary}</p>
                  </Card>
                ) : null}

                {/* Individual Biomarker Range Cards with Explanations */}
                {markers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("Test Results & Reference Ranges")}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {markers.length} {t("tests")}
                      </span>
                    </div>
                    {markers.map((marker, idx) => (
                      <ResultMarkerCard key={`${marker.name}-${idx}`} marker={marker} explain={true} />
                    ))}
                  </div>
                )}

                {/* Next Step Doctor Consultation Card */}
                <ResultNextStepCard
                  reason={localAnalysis?.doctor_consultation?.reason}
                  speciality={localAnalysis?.doctor_consultation?.speciality}
                />

                {/* Additional Clinical Indicators if present */}
                {localAnalysis?.risk_indicators?.length ? (
                  <ListCard
                    title={t("Observations to watch")}
                    items={localAnalysis.risk_indicators}
                    icon="warning"
                  />
                ) : null}

                {localAnalysis?.recommended_tests?.length ? (
                  <ListCard
                    title={t("Recommended follow-up tests")}
                    items={localAnalysis.recommended_tests}
                    icon="science"
                  />
                ) : null}

                {localAnalysis?.lifestyle?.length ? (
                  <ListCard
                    title={t("Lifestyle & nutritional recommendations")}
                    items={localAnalysis.lifestyle}
                    icon="self_improvement"
                  />
                ) : null}

                {/* Ask Aaha Voice / Chat Action */}
                <div className="pt-2">
                  <Link
                    to="/aaha"
                    search={{ report: id }}
                    className="flex items-center w-full min-h-[56px] rounded-full justify-between px-5 bg-card border border-border text-foreground hover:border-primary shadow-soft transition-all active:scale-[0.99]"
                  >
                    <span className="text-[14px] font-semibold">{t("Ask Aaha questions about this report")}</span>
                    <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shrink-0 shadow-sm">
                      <Icon name="mic" className="text-[18px]" />
                    </span>
                  </Link>
                </div>

                {/* Medical Disclaimer */}
                <p className="text-[12px] text-muted-foreground text-center pt-2 pb-1 leading-normal">
                  {t("Aaha explains your results for your understanding. It does not replace a medical consultation or doctor's diagnosis.")}
                </p>

                {/* Shareable Report Summary */}
                {localAnalysis && (
                  <ReportShare
                    title={r.title}
                    summary={localAnalysis.summary}
                    document={{
                      title: r.title,
                      patientName,
                      reportId: r.id,
                      date: new Date(r.report_date || r.created_at || Date.now()),
                      summary: localAnalysis.summary,
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
                          items: (localAnalysis.abnormal ?? []).map(
                            (a) => `${a.test_name} (${a.value}) — ${a.note} [${a.severity} priority]`,
                          ),
                        },
                        { type: "list", title: "Values within range", items: localAnalysis.normal ?? [] },
                        { type: "list", title: "Observations", items: localAnalysis.risk_indicators ?? [] },
                        {
                          type: "list",
                          title: "Recommended tests",
                          items: localAnalysis.recommended_tests ?? [],
                        },
                        { type: "list", title: "Lifestyle guidance", items: localAnalysis.lifestyle ?? [] },
                        ...(localAnalysis.doctor_consultation?.needed
                          ? [
                              {
                                type: "text" as const,
                                title: "Doctor consultation",
                                body: `${localAnalysis.doctor_consultation.speciality || "Doctor"} — ${localAnalysis.doctor_consultation.reason}`,
                              },
                            ]
                          : []),
                      ],
                    }}
                  />
                )}

                {/* If analysis not yet performed */}
                {!localAnalysis && (
                  <Card className="mt-2 p-5 text-center shadow-soft">
                    <p className="text-sm text-muted-foreground">
                      {t("Generate a warm, plain-language explanation of these biomarkers and suggested next steps.")}
                    </p>
                    <Btn className="mt-3" onClick={() => explain.mutate()} icon="auto_awesome">
                      {t("Explain my results")}
                    </Btn>
                  </Card>
                )}
              </div>
            )}
          </Section>
        </div>
      )}
    </>
  );
}

function ListCard({ title, items, icon }: { title: string; items?: string[]; icon: string }) {
  if (!items || items.length === 0) return null;
  return (
    <Card className="p-4 shadow-soft">
      <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
        <Icon name={icon} className="text-[18px]" />
        <span>{title}</span>
      </div>
      <ul className="space-y-1.5 pl-1">
        {items.map((i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
