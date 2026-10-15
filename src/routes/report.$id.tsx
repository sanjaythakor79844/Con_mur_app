import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useMemo, useRef } from "react";
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
import {
  LivScope,
  LivCard,
  LivHeading,
  LivLabel,
  LivNumber,
  LivUnit,
  LivSubtext,
  LivPill,
  LivProgressRing,
  LivButton,
  LivMarkerRow,
  LivMark,
} from "@/components/liv";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Longevity Report Viewer | Aaha Companion" },
      {
        name: "description",
        content: "View clinical check-up readings or extracted laboratory values in chapter-based longevity report format.",
      },
    ],
  }),
  component: ReportScreen,
});

function ReportScreen() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to open this report.")}>
      <ReportDetail />
    </RequireAuth>
  );
}

function toneFor(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("high") || s.includes("danger") || s.includes("critical")) return "red" as const;
  if (s.includes("low") || s.includes("amber") || s.includes("warn")) return "amber" as const;
  if (s.includes("normal") || s.includes("ok") || s.includes("green") || s.includes("in range"))
    return "green" as const;
  return "neutral" as const;
}

function livToneFor(status: string): "optimal" | "borderline" | "priority" | "unknown" {
  const s = (status || "").toLowerCase();
  if (s.includes("high") || s.includes("danger") || s.includes("critical") || s.includes("priority"))
    return "priority";
  if (
    s.includes("low") ||
    s.includes("amber") ||
    s.includes("warn") ||
    s.includes("borderline") ||
    s.includes("slightly")
  )
    return "borderline";
  if (
    s.includes("normal") ||
    s.includes("ok") ||
    s.includes("green") ||
    s.includes("in range") ||
    s.includes("optimal")
  )
    return "optimal";
  return "unknown";
}

interface ChapterDef {
  id: string;
  title: string;
  inverted?: boolean;
  content: React.ReactNode;
}

function ReportDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, userId, patient, loading: authLoading } = useAuth();
  const { latestAssessment } = useOverview();
  const patientName =
    (user?.name as string | undefined) ||
    patient?.full_name ||
    user?.email?.split("@")[0] ||
    null;

  const ocr = useServerFn(runReportOcr);
  const analyse = useServerFn(analyzeReport);
  const saveValues = useServerFn(saveExtractedValues);

  const report = useQuery({ queryKey: ["report", id], queryFn: () => getReport(id) });
  const [rows, setRows] = useState<ExtractedValue[]>([]);
  const [dirty, setDirty] = useState(false);
  const [localAnalysis, setLocalAnalysis] = useState<ReportAnalysis | null>(null);

  // View Mode: 'chapters' (Liv-style narrative) vs 'details' (Classic AAHA view)
  const [viewMode, setViewMode] = useState<"chapters" | "details">("chapters");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const rptContainerRef = useRef<HTMLDivElement>(null);

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

  const r = report.data;

  // Patient Ownership Authorization Check
  // Ensures a user cannot view arbitrary report IDs without authorization
  const isAuthorized = useMemo(() => {
    if (!r) return true; // not loaded yet or not found handled separately
    if (authLoading) return true; // wait for auth state
    if (!userId && !patient) return false;

    const reportPatientId = String(r.patient_id ?? "").trim();
    // If the report has no patient_id field, it was fetched through /reports/me or /uploads/me (session-authenticated)
    if (!reportPatientId) return true;

    const patientIdStr = patient?.patient_id ? String(patient.patient_id) : "";
    const firebaseUid = patient?.firebase_uid || userId || "";
    const sessionUserUid = user?.id || "";

    const matchesPatientId = patientIdStr && reportPatientId === patientIdStr;
    const matchesFirebaseUid = firebaseUid && reportPatientId === firebaseUid;
    const matchesSessionUid = sessionUserUid && reportPatientId === sessionUserUid;

    return Boolean(matchesPatientId || matchesFirebaseUid || matchesSessionUid);
  }, [r, authLoading, userId, patient, user]);

  // Loading State
  if (report.isLoading || authLoading) {
    return (
      <LivScope theme="dark" className="min-h-screen flex items-center justify-center p-6">
        <LivCard variant="default" className="max-w-md w-full text-center p-8 border border-[var(--liv-line)] flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-[var(--liv-text)] border-t-transparent animate-spin" />
          <LivSubtext className="text-xs text-[var(--liv-muted)]">
            {t("Loading verified clinical report...")}
          </LivSubtext>
        </LivCard>
      </LivScope>
    );
  }

  // Session Expired / Network Error State
  if (report.isError) {
    const isAuthError = (report.error as any)?.status === 401 || (report.error as any)?.status === 403;
    return (
      <LivScope theme="dark" className="min-h-screen flex items-center justify-center p-6">
        <LivCard variant="default" className="max-w-md w-full text-center p-8 border border-[var(--liv-line)]">
          <div className="mx-auto size-12 rounded-full border border-[var(--liv-line2)] grid place-items-center mb-4 text-[var(--liv-text)]">
            <Icon name={isAuthError ? "schedule" : "error"} className="text-[24px]" />
          </div>
          <LivHeading level={2} className="text-[22px] mb-2">
            {isAuthError ? t("Session Expired") : t("Could Not Load Report")}
          </LivHeading>
          <LivSubtext className="text-xs mb-6 text-[var(--liv-muted)]">
            {isAuthError
              ? t("Your authentication session has expired. Please sign in again to view your clinical report.")
              : t(report.error instanceof Error ? report.error.message : "A network error occurred while fetching report data.")}
          </LivSubtext>
          <div className="flex flex-col gap-2.5">
            <LivButton onClick={() => report.refetch()} className="w-full">
              {t("Retry Loading")}
            </LivButton>
            <LivButton
              variant="ghost"
              onClick={() => navigate({ to: isAuthError ? "/login" : "/reports" })}
              className="w-full"
            >
              {isAuthError ? t("Sign In") : t("Back to Reports")}
            </LivButton>
          </div>
        </LivCard>
      </LivScope>
    );
  }

  // Unauthorized Patient Record
  if (!isAuthorized) {
    return (
      <LivScope theme="dark" className="min-h-screen flex items-center justify-center p-6">
        <LivCard variant="default" className="max-w-md w-full text-center p-8 border border-[var(--liv-line)]">
          <div className="mx-auto size-12 rounded-full border border-[var(--liv-line2)] grid place-items-center mb-4 text-[var(--liv-text)]">
            <Icon name="lock" className="text-[24px]" />
          </div>
          <LivHeading level={2} className="text-[22px] mb-2">
            {t("Report Access Restricted")}
          </LivHeading>
          <LivSubtext className="text-xs mb-6 text-[var(--liv-muted)]">
            {t("This clinical record belongs to a different patient profile. A report identifier alone does not authorize access.")}
          </LivSubtext>
          <LivButton onClick={() => navigate({ to: "/reports" })} className="w-full">
            {t("Back to My Reports")}
          </LivButton>
        </LivCard>
      </LivScope>
    );
  }

  // Report Not Found State
  if (!r) {
    return (
      <LivScope theme="dark" className="min-h-screen flex items-center justify-center p-6">
        <LivCard variant="default" className="max-w-md w-full text-center p-8 border border-[var(--liv-line)]">
          <div className="mx-auto size-12 rounded-full border border-[var(--liv-line2)] grid place-items-center mb-4 text-[var(--liv-text)]">
            <Icon name="folder_off" className="text-[24px]" />
          </div>
          <LivHeading level={2} className="text-[22px] mb-2">
            {t("Report Not Found")}
          </LivHeading>
          <LivSubtext className="text-xs mb-6 text-[var(--liv-muted)]">
            {t("This report may have been deleted or is not associated with your account.")}
          </LivSubtext>
          <div className="flex flex-col gap-2.5">
            <LivButton onClick={() => report.refetch()} className="w-full">
              {t("Retry")}
            </LivButton>
            <LivButton variant="ghost" onClick={() => navigate({ to: "/reports" })} className="w-full">
              {t("Back to Reports")}
            </LivButton>
          </div>
        </LivCard>
      </LivScope>
    );
  }

  const isKiosk = r.source === "kiosk" || r.report_type === "kiosk";
  const confidence = r.extraction_confidence
    ? Math.round(Number(r.extraction_confidence) * 100)
    : null;
  const hasValidPdf = Boolean(r.report_pdf_url && r.report_pdf_url.startsWith("http"));
  const hasUploadedFile = Boolean(r.file_url && r.file_url.startsWith("http"));
  const reportDate = new Date(r.report_date || r.created_at || Date.now());
  const formattedDate = reportDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Physician review / sign-off info if actually provided by backend payload
  const physicianInfo = r.physician || r.doctor_name || r._raw?.reviewed_by || r._raw?.doctor || null;

  // Build Chapters based strictly on real payload fields
  const chapters: ChapterDef[] = [];

  // Chapter 1: Cover & Executive Overview (Always present)
  chapters.push({
    id: "cover",
    title: t("Overview"),
    inverted: true,
    content: (
      <div className="flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
        <LivMark size={56} className="text-[var(--liv-inv-fg)]" />
        <div>
          <LivLabel className="text-[var(--liv-inv-muted)]">
            {t("Prepared for")} {patientName || t("Member")} · {formattedDate}
          </LivLabel>
          <LivHeading level={1} className="text-[32px] sm:text-[38px] mt-2 text-[var(--liv-inv-fg)]">
            {r.title || (isKiosk ? t("Longevity Check-up") : t("Laboratory Report"))}
          </LivHeading>
        </div>

        {r.score > 0 ? (
          <div className="flex flex-col items-center gap-2.5 my-2">
            <LivProgressRing
              size={136}
              strokeWidth={7}
              progress={r.score / 100}
              onBg={true}
            >
              <div className="text-center">
                <span className="block font-serif text-[44px] leading-none font-medium text-[var(--liv-inv-fg)]">
                  {r.score}
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--liv-inv-muted)]">
                  / 100
                </span>
              </div>
            </LivProgressRing>
            <LivLabel className="mt-1 text-[var(--liv-inv-muted)]">
              {t("AWIS · Active Wellness Index Score")}
            </LivLabel>
            {r.band && (
              <LivPill tone={r.band.toLowerCase().includes("low") ? "optimal" : r.band.toLowerCase().includes("mod") ? "borderline" : "priority"}>
                {r.band} {t("Risk Band")}
              </LivPill>
            )}
          </div>
        ) : (
          <div className="my-2 p-4 rounded-2xl border border-[var(--liv-inv-line)] bg-white/5 text-center">
            <LivLabel className="text-[var(--liv-inv-muted)]">{t("Clinical Screening")}</LivLabel>
            <p className="font-serif italic text-base mt-1 text-[var(--liv-inv-fg)]">
              {r.conclusion || r.summary || t("Screening successfully registered at Living Lab")}
            </p>
          </div>
        )}

        <div className="text-center text-xs text-[var(--liv-inv-muted)] space-y-2">
          <p>
            {isKiosk && r.kiosk_id ? `Living Lab Kiosk #${r.kiosk_id}` : t("Screening Document")}
          </p>
          {hasValidPdf && (
            <div className="pt-1">
              <LivButton
                variant="ghost"
                size="sm"
                onClick={() => handlePdfAction(false)}
                className="border-[var(--liv-inv-line)] text-[var(--liv-inv-fg)] hover:bg-white/10"
                icon={<Icon name="picture_as_pdf" className="text-[16px]" />}
              >
                {t("Open Official PDF")}
              </LivButton>
            </div>
          )}
        </div>
      </div>
    ),
  });

  // Chapter 2: Clinical Summary & Conditions (If summary, conclusion or conditions exist)
  if (r.conclusion || r.summary || localAnalysis?.summary || (r.conditions_found && r.conditions_found.length > 0)) {
    chapters.push({
      id: "summary",
      title: t("Summary"),
      inverted: false,
      content: (
        <div className="space-y-4 max-w-lg mx-auto w-full">
          <div>
            <LivLabel>{t("Ambika Engine Evaluation")}</LivLabel>
            <LivHeading level={1} className="text-[28px] sm:text-[34px] mt-1 text-[var(--liv-text)]">
              {t("Clinical Summary")}
            </LivHeading>
          </div>

          <p className="lead">
            {r.conclusion || r.summary || localAnalysis?.summary}
          </p>

          {Array.isArray(r.conditions_found) && r.conditions_found.length > 0 && (
            <div className="space-y-2 pt-2">
              <LivLabel>{t("Conditions Flagged for Attention")}</LivLabel>
              <div className="flex flex-col gap-2">
                {r.conditions_found.map((c: string, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-[var(--liv-text)]">{c}</span>
                    <LivPill tone="priority">{t("To Review")}</LivPill>
                  </div>
                ))}
              </div>
            </div>
          )}

          {r.refer_to_doctor && (
            <div className="p-4 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] text-xs flex items-start gap-3 mt-3">
              <Icon name="medical_services" className="text-[20px] text-[var(--liv-text)] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-[var(--liv-text)]">{t("Doctor Consultation Recommended")}</span>
                <span className="text-[var(--liv-muted)] mt-1 block leading-relaxed">
                  {r.conclusion || t("Results indicate health markers that should be reviewed with a qualified physician.")}
                </span>
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  // Chapter 3: Recorded Kiosk Vitals (If baseline readings exist)
  if (r.baseline_readings && Object.keys(r.baseline_readings).length > 0) {
    chapters.push({
      id: "vitals",
      title: t("Vitals"),
      inverted: false,
      content: (
        <div className="space-y-4 max-w-lg mx-auto w-full">
          <div>
            <LivLabel>{t("Living Lab Kiosk")}</LivLabel>
            <LivHeading level={1} className="text-[28px] sm:text-[34px] mt-1 text-[var(--liv-text)]">
              {t("Recorded Kiosk Vitals")}
            </LivHeading>
          </div>

          <p className="lead">
            {t("Direct cardiovascular, metabolic and body measurements recorded during your check-in.")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {Object.entries(r.baseline_readings).map(([key, val]: [string, any]) => {
              const displayVal = typeof val === "object" && val !== null ? val.value : val;
              const unit = typeof val === "object" && val !== null ? val.unit : "";
              const label = typeof val === "object" && val !== null ? val.label : null;
              const flag = typeof val === "object" && val !== null ? val.flag : null;
              const name = typeof val === "object" && val !== null && val.name ? val.name : key.replace(/_/g, " ");
              const tone = flag === "red" ? "priority" : flag === "amber" ? "borderline" : "optimal";

              return (
                <div
                  key={key}
                  className="p-4 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] flex flex-col justify-between gap-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs uppercase font-mono tracking-wider text-[var(--liv-muted)] capitalize">
                      {t(name)}
                    </span>
                    {flag && (
                      <LivPill tone={tone}>
                        {flag === "green" ? t("Normal") : flag === "amber" ? t("Attention") : t("High")}
                      </LivPill>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="font-serif text-[32px] leading-none font-medium text-[var(--liv-text)]">
                      {displayVal}
                    </span>
                    {unit && <span className="text-xs font-mono text-[var(--liv-muted)]">{unit}</span>}
                  </div>
                  {label && (
                    <p className="text-[11px] text-[var(--liv-muted)] pt-1.5 border-t border-[var(--liv-line)]">
                      {label}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ),
    });
  }

  // Chapter 4: Laboratory Biomarkers (If extracted tests exist)
  if (rows.length > 0) {
    chapters.push({
      id: "biomarkers",
      title: t("Biomarkers"),
      inverted: false,
      content: (
        <div className="space-y-4 max-w-lg mx-auto w-full">
          <div>
            <LivLabel>{t("Laboratory Data")}</LivLabel>
            <LivHeading level={1} className="text-[28px] sm:text-[34px] mt-1 text-[var(--liv-text)]">
              {t("Laboratory Biomarkers")}
            </LivHeading>
          </div>

          <p className="lead">
            {t("Extracted test values and clinical reference ranges supplied by the testing laboratory.")}
          </p>

          <div className="p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] text-[11px] text-[var(--liv-muted)] leading-relaxed">
            {t("Clinical laboratory reference ranges establish health baseline and disease boundaries. They remain distinct from future longevity-optimal targets.")}
          </div>

          <div className="flex flex-col gap-2.5 mt-2">
            {rows.map((row, idx) => {
              const tone = livToneFor(row.status);
              return (
                <LivMarkerRow
                  key={`${row.test_name}-${idx}`}
                  name={row.test_name || t("Laboratory test")}
                  value={row.value}
                  unit={row.unit}
                  clinicalRefRange={row.reference_range}
                  status={tone}
                  statusLabel={row.status || undefined}
                  reportOrigin={r.title || undefined}
                />
              );
            })}
          </div>
        </div>
      ),
    });
  }

  // Chapter 5: Guidance & Lifestyle Plan (If verified recommendations exist)
  if (
    (Array.isArray(r.recommended_tests) && r.recommended_tests.length > 0) ||
    (Array.isArray(r.nutrition_plans) && r.nutrition_plans.length > 0) ||
    (Array.isArray(r.therapy_plan) && r.therapy_plan.length > 0) ||
    (localAnalysis?.lifestyle && localAnalysis.lifestyle.length > 0)
  ) {
    chapters.push({
      id: "guidance",
      title: t("Guidance"),
      inverted: false,
      content: (
        <div className="space-y-4 max-w-lg mx-auto w-full">
          <div>
            <LivLabel>{t("Ambika & Clinical Guidance")}</LivLabel>
            <LivHeading level={1} className="text-[28px] sm:text-[34px] mt-1 text-[var(--liv-text)]">
              {t("Recommendations & Plan")}
            </LivHeading>
          </div>

          <p className="lead">
            {t("Evidence-based recommendations derived from your verified screening results.")}
          </p>

          {Array.isArray(r.recommended_tests) && r.recommended_tests.length > 0 && (
            <div className="space-y-2 mt-2">
              <LivLabel>{t("Recommended Laboratory Follow-up Tests")}</LivLabel>
              <div className="flex flex-wrap gap-2">
                {r.recommended_tests.map((testName: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full border border-[var(--liv-line)] bg-[var(--liv-surf)] text-xs font-mono text-[var(--liv-text)]"
                  >
                    {testName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(r.nutrition_plans) && r.nutrition_plans.length > 0 && (
            <div className="space-y-2 mt-3">
              <LivLabel>{t("Nutrition Plan")}</LivLabel>
              {r.nutrition_plans.map((np: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] space-y-1.5">
                  <span className="text-xs font-bold text-[var(--liv-text)] block">{np.title || t("Nutrition Guidance")}</span>
                  {Array.isArray(np.points) && (
                    <ul className="text-xs text-[var(--liv-muted)] space-y-1 list-disc pl-4">
                      {np.points.map((pt: string, pIdx: number) => (
                        <li key={pIdx}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {Array.isArray(r.therapy_plan) && r.therapy_plan.length > 0 && (
            <div className="space-y-2 mt-3">
              <LivLabel>{t("Activity & Lifestyle Guidance")}</LivLabel>
              <div className="p-3.5 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] space-y-1">
                <ul className="text-xs text-[var(--liv-muted)] space-y-1 list-disc pl-4">
                  {r.therapy_plan.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  // Chapter 6: Document Verification & Sign-off (Always present as concluding chapter)
  chapters.push({
    id: "document",
    title: t("Document"),
    inverted: true,
    content: (
      <div className="space-y-5 max-w-sm mx-auto w-full text-center">
        <div>
          <LivLabel className="text-[var(--liv-inv-muted)]">{t("Document & Sign-off")}</LivLabel>
          <LivHeading level={1} className="text-[28px] sm:text-[34px] mt-1 text-[var(--liv-inv-fg)]">
            {t("Official Record")}
          </LivHeading>
        </div>

        {physicianInfo ? (
          <div className="space-y-1 py-2">
            <span className="font-serif italic text-[26px] font-medium block text-[var(--liv-inv-fg)]">
              {typeof physicianInfo === "object" ? physicianInfo.name : String(physicianInfo)}
            </span>
            <span className="text-xs text-[var(--liv-inv-muted)] block">
              {typeof physicianInfo === "object" && physicianInfo.qualification
                ? physicianInfo.qualification
                : t("Reviewing Physician")}
              {` · ${formattedDate}`}
            </span>
          </div>
        ) : (
          <div className="p-4 rounded-2xl border border-[var(--liv-inv-line)] bg-white/5 text-center space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--liv-inv-fg)] font-semibold block">
              {t("Automated Kiosk Clinical Evaluation")}
            </span>
            <p className="text-xs text-[var(--liv-inv-muted)] leading-relaxed m-0">
              {t("Generated at an authorized health screening kiosk. Official physician sign-off can be reviewed with your personal treating doctor.")}
            </p>
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          {hasValidPdf || hasUploadedFile ? (
            <LivButton
              variant="primary"
              onClick={() => handlePdfAction(false)}
              className="w-full bg-[var(--liv-inv-fg)] text-[var(--liv-inv)] border-[var(--liv-inv-fg)] hover:opacity-90 active:scale-95 transition-all shadow-md"
              icon={<Icon name="picture_as_pdf" className="text-[18px]" />}
            >
              {t("Open Official PDF Document")}
            </LivButton>
          ) : (
            <div className="p-3 text-center text-xs text-[var(--liv-inv-muted)] border border-dashed border-[var(--liv-inv-line)] rounded-xl">
              {t("Official PDF report is pending generation by the kiosk.")}
            </div>
          )}

          <div className="flex gap-2">
            <LivButton
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("details")}
              className="flex-1 border-[var(--liv-inv-line)] text-[var(--liv-inv-fg)] hover:bg-white/10"
              icon={<Icon name="tune" className="text-[16px]" />}
            >
              {t("Detailed View & OCR")}
            </LivButton>
            <LivButton
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/reports" })}
              className="flex-1 border-[var(--liv-inv-line)] text-[var(--liv-inv-fg)] hover:bg-white/10"
              icon={<Icon name="folder_open" className="text-[16px]" />}
            >
              {t("All Reports")}
            </LivButton>
          </div>
        </div>

        <p className="text-[11px] text-[var(--liv-inv-muted)] text-center leading-normal pt-2">
          {t("This health screening record is informational and does not replace medical advice, diagnosis, or treatment from a qualified healthcare professional.")}
        </p>
      </div>
    ),
  });

  // Track active chapter during scroll
  useEffect(() => {
    if (viewMode !== "chapters") return;
    const container = rptContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const children = Array.from(container.children) as HTMLElement[];
      let currentIdx = 0;
      const threshold = container.scrollTop + container.clientHeight * 0.45;
      for (let i = 0; i < children.length; i++) {
        if (children[i].offsetTop <= threshold) {
          currentIdx = i;
        }
      }
      setActiveChapterIndex(currentIdx);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [chapters.length, viewMode]);

  const scrollToChapter = (index: number) => {
    const container = rptContainerRef.current;
    if (!container) return;
    const target = container.children[index] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveChapterIndex(index);
    }
  };

  const activeChapter = chapters[activeChapterIndex] || chapters[0];
  const isCurrentInverted = Boolean(activeChapter?.inverted);

  // If in Chapters mode, render the full-bleed Liv Chapter Report Viewer
  if (viewMode === "chapters") {
    return (
      <LivScope theme="dark" className="h-screen flex flex-col overflow-hidden relative">
        {/* Sticky Liv Chapter Header */}
        <header
          className={`liv-rhead ${isCurrentInverted ? "dark" : ""}`}
          role="banner"
        >
          <button
            type="button"
            onClick={() => navigate({ to: "/reports" })}
            className="p-1 rounded-full text-current hover:opacity-75 transition-opacity"
            aria-label={t("Back to reports")}
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </button>

          <span className="ttl" aria-live="polite">
            {activeChapter.title} · {activeChapterIndex + 1} of {chapters.length}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode("details")}
              className="px-2.5 py-1 rounded-full text-[11px] font-mono border border-current hover:opacity-80 active:scale-95 transition-all flex items-center gap-1"
              aria-label={t("Switch to detailed view")}
            >
              <Icon name="table_chart" className="text-[14px]" />
              <span className="hidden sm:inline">{t("Details")}</span>
            </button>
            {(hasValidPdf || hasUploadedFile) && (
              <button
                type="button"
                onClick={() => handlePdfAction(false)}
                className="p-1.5 rounded-full border border-current hover:opacity-80 active:scale-95 transition-all"
                aria-label={t("Open PDF")}
              >
                <Icon name="picture_as_pdf" className="text-[16px]" />
              </button>
            )}
          </div>
        </header>

        {/* Vertical Chapter Indicator Dots */}
        <nav
          className={`liv-dotsv ${isCurrentInverted ? "inv" : ""}`}
          aria-label={t("Report chapters navigation")}
        >
          {chapters.map((ch, idx) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => scrollToChapter(idx)}
              className={idx === activeChapterIndex ? "on" : ""}
              aria-label={`${t("Go to chapter")} ${idx + 1}: ${ch.title}`}
              aria-current={idx === activeChapterIndex ? "true" : undefined}
            />
          ))}
        </nav>

        {/* Scroll-Snapped Chapter Sections */}
        <main
          ref={rptContainerRef}
          className="liv-rpt flex-1 overflow-y-auto"
          tabIndex={0}
          aria-label={t("Longevity Report Chapters")}
        >
          {chapters.map((ch, idx) => (
            <section
              key={ch.id}
              className={`liv-ch ${ch.inverted ? "inv" : ""}`}
              aria-label={`${ch.title} (Chapter ${idx + 1} of ${chapters.length})`}
            >
              {ch.content}
            </section>
          ))}
        </main>
      </LivScope>
    );
  }

  // CLASSIC AAHA REPORT VIEW (Preserved for full OCR inspection, editing, and explanation)
  return (
    <Screen>
      <TopBar
        title={t("Report Details")}
        subtitle={t("Clinical readings & explanation")}
        action={
          <button
            type="button"
            onClick={() => setViewMode("chapters")}
            className="px-3 py-1.5 rounded-full text-xs font-mono font-medium border border-border bg-card text-foreground hover:bg-accent active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Icon name="auto_stories" className="text-[15px] text-primary" />
            <span>{t("Chapters")}</span>
          </button>
        }
      />

      {/* 1. Masthead */}
      <ReportMasthead
        date={reportDate}
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
                    {reportDate.toLocaleDateString("en-IN", {
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

                    {/* Laboratory Reference Range */}
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

                <ResultNextStepCard
                  reason={localAnalysis?.doctor_consultation?.reason}
                  speciality={localAnalysis?.doctor_consultation?.speciality}
                />

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

                <p className="text-[12px] text-muted-foreground text-center pt-2 pb-1 leading-normal">
                  {t("Aaha explains your results for your understanding. It does not replace a medical consultation or doctor's diagnosis.")}
                </p>

                {localAnalysis && (
                  <ReportShare
                    title={r.title}
                    summary={localAnalysis.summary}
                    document={{
                      title: r.title,
                      patientName,
                      reportId: r.id,
                      date: reportDate,
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
    </Screen>
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
