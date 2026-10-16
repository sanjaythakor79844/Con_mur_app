import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, Icon, Screen, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useOverview, formatDate } from "@/hooks/use-overview";
import { deleteReport, listAssessments, type Report, type Assessment } from "@/lib/aaha-api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import {
  LONGEVITY_MARKERS,
  LONGEVITY_GROUPS,
  type LongevityMarker,
} from "@/lib/longevity-baseline";
import {
  LivCard,
  LivHeading,
  LivLabel,
  LivNumber,
  LivUnit,
  LivSubtext,
  LivPill,
  LivMarkerRow,
  LivButton,
} from "@/components/liv";

export const Route = createFileRoute("/reports")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "all" | "kiosk" | "lab" | "markers" } => {
    const t = search.tab;
    if (t === "all" || t === "kiosk" || t === "lab" || t === "markers") {
      return { tab: t };
    }
    return { tab: "all" };
  },
  head: () => ({
    meta: [
      { title: "Health Reports & Lab Results | Aaha Companion & Liv Living Lab" },
      {
        name: "description",
        content:
          "Your verified kiosk screenings, laboratory reports, and biomarker explanations.",
      },
    ],
  }),
  component: ReportsScreen,
});

function ReportsScreen() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to view your health data and reports.")}>
      <Screen>
        <ReportsContent />
      </Screen>
    </RequireAuth>
  );
}

interface VerifiedBiomarker {
  id: string;
  name: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status: "optimal" | "borderline" | "priority" | "unknown";
  statusLabel?: string;
  group: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceReportDate?: string;
  sourceType: "kiosk" | "lab";
}

function classifyMarkerGroup(name: string): string {
  const n = name.toLowerCase();
  if (
    n.includes("pressure") ||
    n.includes("bp") ||
    n.includes("pulse") ||
    n.includes("heart rate") ||
    n.includes("spo2") ||
    n.includes("bmi") ||
    n.includes("weight") ||
    n.includes("height")
  ) {
    return "Vital Signs & Physical Metrics";
  }
  if (
    n.includes("glucose") ||
    n.includes("sugar") ||
    n.includes("hba1c") ||
    n.includes("insulin") ||
    n.includes("glycated")
  ) {
    return "Metabolic & Blood Sugar";
  }
  if (
    n.includes("cholesterol") ||
    n.includes("lipid") ||
    n.includes("triglyceride") ||
    n.includes("hdl") ||
    n.includes("ldl") ||
    n.includes("apob") ||
    n.includes("vldl")
  ) {
    return "Lipids & Cardiovascular";
  }
  if (
    n.includes("hemoglobin") ||
    n.includes("haemoglobin") ||
    n.includes("hb") ||
    n.includes("iron") ||
    n.includes("ferritin") ||
    n.includes("rbc") ||
    n.includes("wbc") ||
    n.includes("platelet")
  ) {
    return "Blood & Iron Stores";
  }
  if (
    n.includes("tsh") ||
    n.includes("thyroid") ||
    n.includes("t3") ||
    n.includes("t4") ||
    n.includes("lh") ||
    n.includes("fsh") ||
    n.includes("testosterone") ||
    n.includes("estrogen") ||
    n.includes("estradiol") ||
    n.includes("prolactin")
  ) {
    return "Hormones & Thyroid";
  }
  if (
    n.includes("alt") ||
    n.includes("ast") ||
    n.includes("sgpt") ||
    n.includes("sgot") ||
    n.includes("bilirubin") ||
    n.includes("creatinine") ||
    n.includes("egfr") ||
    n.includes("urea") ||
    n.includes("uric")
  ) {
    return "Liver & Kidney Function";
  }
  if (
    n.includes("vitamin d") ||
    n.includes("vit d") ||
    n.includes("b12") ||
    n.includes("calcium") ||
    n.includes("electrolyte") ||
    n.includes("sodium") ||
    n.includes("potassium")
  ) {
    return "Vitamins & Minerals";
  }
  if (n.includes("crp") || n.includes("esr") || n.includes("inflammation")) {
    return "Inflammation";
  }
  return "General Laboratory Tests";
}

function mapStatusToTone(
  status?: string,
): "optimal" | "borderline" | "priority" | "unknown" {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (
    s.includes("high") ||
    s.includes("danger") ||
    s.includes("critical") ||
    s.includes("priority") ||
    s.includes("abnormal")
  ) {
    return "priority";
  }
  if (
    s.includes("low") ||
    s.includes("amber") ||
    s.includes("warn") ||
    s.includes("borderline") ||
    s.includes("slight")
  ) {
    return "borderline";
  }
  if (
    s.includes("normal") ||
    s.includes("ok") ||
    s.includes("optimal") ||
    s.includes("in range") ||
    s.includes("good")
  ) {
    return "optimal";
  }
  return "unknown";
}

function EcgStrip({ mini = false }: { mini?: boolean }) {
  const w = mini ? 180 : 360;
  const h = mini ? 44 : 110;
  const beats = mini ? 3 : 5;
  const amp = mini ? 0.55 : 1;
  const base = h * 0.62;
  const bw = w / beats;
  let p = `M0 ${base}`;
  let x = 0;
  for (let i = 0; i < beats; i++) {
    const s = x;
    const u = bw / 100;
    p += ` L${s + 8 * u} ${base} Q${s + 13 * u} ${base - 7 * amp} ${s + 18 * u} ${base}`;
    p += ` L${s + 26 * u} ${base} L${s + 29 * u} ${base + 4 * amp} L${s + 32 * u} ${base - 34 * amp}`;
    p += ` L${s + 35 * u} ${base + 9 * amp} L${s + 38 * u} ${base}`;
    p += ` L${s + 50 * u} ${base} Q${s + 60 * u} ${base - 12 * amp} ${s + 70 * u} ${base}`;
    p += ` L${s + 100 * u} ${base}`;
    x += bw;
  }

  const gridLines: React.ReactNode[] = [];
  for (let gx = 0; gx <= w; gx += 6) {
    gridLines.push(
      <line
        key={`x-${gx}`}
        className={gx % 30 === 0 ? "maj" : ""}
        x1={gx}
        y1={0}
        x2={gx}
        y2={h}
      />,
    );
  }
  for (let gy = 0; gy <= h; gy += 6) {
    gridLines.push(
      <line
        key={`y-${gy}`}
        className={gy % 30 === 0 ? "maj" : ""}
        x1={0}
        y1={gy}
        x2={w}
        y2={gy}
      />,
    );
  }

  return (
    <div className="liv-strip">
      {!mini && (
        <div className="lbl">
          <span className="live" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Lead I · 25 mm/s · 30 s
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-label="ECG trace, regular sinus rhythm"
      >
        <g className="grid">{gridLines}</g>
        <path className={`tr ${mini ? "mini" : ""}`} d={p} />
        {!mini && <circle className="beat" cx={w - 14} cy={h * 0.62} r={3} />}
      </svg>
    </div>
  );
}

function FigureSvg({ big = false }: { big?: boolean }) {
  return (
    <svg viewBox="0 0 150 230" aria-label="Posture figure, front view" className="w-full h-auto">
      <line className="plumb" x1="75" y1="8" x2="75" y2="222" />
      <g className="body">
        <circle cx="79" cy="30" r="15" />
        <path d="M60 52h38l10 8 6 50-10 2-5-36v50l4 90h-12l-6-80-6 80H67l4-90V76l-5 36-10-2 6-50z" />
      </g>
      <line className="ln ok" x1="49" y1="58" x2="107" y2="58" />
      <line className="ln" x1="49" y1="56" x2="107" y2="61" />
      <circle className="dot" cx="49" cy="56" r="2.5" />
      <circle className="dot" cx="107" cy="61" r="2.5" />
      <line className="ln ok" x1="58" y1="126" x2="98" y2="126" />
      <line className="ln" x1="58" y1="127.5" x2="98" y2="124.5" />
      <circle className="dot" cx="79" cy="30" r="2.5" />
      <line className="ln" x1="75" y1="52" x2="79" y2="30" />
      {big && (
        <>
          <text className="ang" x="86" y="22" fill="currentColor" fontSize="10" fontFamily="monospace">
            12°
          </text>
          <text className="ang" x="110" y="66" fill="currentColor" fontSize="10" fontFamily="monospace">
            1.5 cm
          </text>
          <text className="ang" x="101" y="121" fill="currentColor" fontSize="10" fontFamily="monospace">
            tilt
          </text>
        </>
      )}
    </svg>
  );
}

function RangeBar({ marker }: { marker: LongevityMarker }) {
  if (marker.nobar || marker.min === undefined || marker.max === undefined || !marker.z) {
    return null;
  }
  const span = marker.max - marker.min;
  if (span <= 0) return null;

  let prev = marker.min;
  const zones = marker.z.map((z) => {
    const flex = Math.max(0.01, (z[0] - prev) / span);
    prev = z[0];
    return { tone: z[1], flex };
  });

  const position = Math.max(3, Math.min(97, ((marker.x - marker.min) / span) * 100));

  return (
    <div className="liv-rb" aria-hidden="true">
      {zones.map((z, idx) => (
        <i
          key={idx}
          className={`z${z.tone}`}
          style={{ flex: z.flex.toFixed(3) }}
        />
      ))}
      <b style={{ left: `${position.toFixed(1)}%` }} />
    </div>
  );
}

function MarkerStatusPill({ status }: { status: "p" | "b" | "o" | string }) {
  const { t } = useI18n();
  if (status === "p" || status === "priority") {
    return (
      <span className="liv-pill p">
        <span>▲</span>
        <span>{t("Priority")}</span>
      </span>
    );
  }
  if (status === "b" || status === "borderline") {
    return (
      <span className="liv-pill b">
        <span>◆</span>
        <span>{t("Borderline")}</span>
      </span>
    );
  }
  return (
    <span className="liv-pill o">
      <span>●</span>
      <span>{t("Optimal")}</span>
    </span>
  );
}

function MarkerModal({
  marker,
  onClose,
  onAskLiv,
}: {
  marker: LongevityMarker;
  onClose: () => void;
  onAskLiv: (m: LongevityMarker) => void;
}) {
  const { t } = useI18n();
  const groupObj = LONGEVITY_GROUPS.find((g) => g.id === marker.g);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="w-full max-w-md bg-card border border-border rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl max-h-[88vh] overflow-y-auto flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {groupObj?.name || t("Health Marker")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="size-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <div>
          <h2 className="font-serif text-[28px] font-medium text-foreground leading-tight">
            {marker.n}
          </h2>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-[44px] font-medium text-foreground leading-none">
                {marker.v}
              </span>
              <span className="font-mono text-[13px] text-muted-foreground">
                {marker.u}
              </span>
            </div>
            <MarkerStatusPill status={marker.s} />
          </div>
        </div>

        {marker.id === "ecg" && marker.iv && (
          <div className="liv-card p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              {marker.iv.map(([val, label], idx) => (
                <div key={idx} className="rounded-xl bg-muted/60 p-2">
                  <span className="font-serif text-[18px] font-bold block">{val}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block mt-0.5">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {t("Regular sinus rhythm · no ectopic beats in 30 s · read by Dr. A. Deshmukh")}
            </p>
          </div>
        )}

        {marker.id === "posture" && marker.find && (
          <div className="liv-card p-4 space-y-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block">
              {t("Kiosk Camera Findings")}
            </span>
            <div className="space-y-2">
              {marker.find.map(([tone, title, desc], idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-[13px]">
                  <span
                    className={`size-2 rounded-full mt-1.5 shrink-0 ${
                      tone === "p"
                        ? "bg-foreground"
                        : tone === "b"
                          ? "bg-muted-foreground"
                          : "bg-emerald-500"
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-foreground">{title}</span>
                    <span className="text-muted-foreground block text-[12px]">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!marker.nobar && marker.min !== undefined && marker.max !== undefined && (
          <div className="liv-card p-4 space-y-2">
            <RangeBar marker={marker} />
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1">
              <span>{t("Longevity-optimal")}: {marker.opt}</span>
              <span>{t("Clinical")}: {marker.clin}</span>
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed pt-1">
              {t("Solid is optimal, hatched is borderline, faint is priority. Clinical range shows where illness begins; optimal shows where healthspan is built.")}
            </p>
          </div>
        )}

        {marker.prev && (
          <div className="liv-card p-4 flex items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground block">
                {t("Since last check-in")} ({marker.when || "6 Oct"})
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-serif text-[20px] text-muted-foreground line-through">
                  {marker.prev}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-serif text-[22px] font-medium text-foreground">
                  {marker.v}
                </span>
              </div>
            </div>
            <span className="font-mono text-[12px] text-emerald-500 font-bold">
              {t("Trending better")}
            </span>
          </div>
        )}

        <div className="liv-card p-4 space-y-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block">
            {t("What it means")}
          </span>
          <p className="font-serif text-[18px] text-foreground leading-snug">
            {marker.m}
          </p>
        </div>

        {marker.a && marker.a.length > 0 && (
          <div className="liv-card p-4 space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block">
              {marker.s === "o" ? t("How to protect it") : t("How to move it")}
            </span>
            <div className="space-y-2">
              {marker.a.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                  <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-foreground">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="liv-card p-3 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
              {t("Day-90 Target")}
            </span>
            <span className="font-serif text-[22px] font-medium text-foreground block mt-0.5">
              {marker.t || t("Hold")}
            </span>
          </div>
          <div className="liv-card p-3 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
              {t("Next Kiosk Re-test")}
            </span>
            <span className="font-serif text-[22px] font-medium text-foreground block mt-0.5">
              19 Dec
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link
            to="/appointments"
            className="w-full min-h-[44px] rounded-full bg-foreground text-background font-semibold text-[13px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
          >
            {t("Book a review with Dr. Deshmukh")}
          </Link>
          <button
            type="button"
            onClick={() => onAskLiv(marker)}
            className="w-full min-h-[44px] rounded-full border border-border bg-card text-foreground font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-muted active:scale-95 transition-all"
          >
            <Icon name="auto_awesome" className="text-[16px]" />
            <span>{t("Ask Liv about this")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportsContent() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { assessments, reports, latestAssessment, loading, error } = useOverview();
  const [activeTab, setActiveTab] = useState<"all" | "kiosk" | "lab" | "markers">(
    search.tab || "all",
  );
  const [markerFilter, setMarkerFilter] = useState<"all" | "priority" | "borderline" | "optimal">(
    "all",
  );
  const navigate = useNavigate();
  const [selectedMarker, setSelectedMarker] = useState<LongevityMarker | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Latest Kiosk Screening
  const latestKiosk = assessments.find(
    (a) => a.source === "kiosk" || Boolean(a.kiosk_id),
  );

  // 52 Baseline Longevity Biomarkers filtered by status
  const filteredLongevityMarkers = useMemo(() => {
    if (markerFilter === "all") return LONGEVITY_MARKERS;
    const mapTone = { priority: "p", borderline: "b", optimal: "o" } as const;
    const targetS = mapTone[markerFilter];
    return LONGEVITY_MARKERS.filter((m) => m.s === targetS);
  }, [markerFilter]);

  // Exact counts for the 52 Longevity Markers (52, 10, 25, 17)
  const longevityCounts = useMemo(() => {
    return {
      all: LONGEVITY_MARKERS.length,
      priority: LONGEVITY_MARKERS.filter((m) => m.s === "p").length,
      borderline: LONGEVITY_MARKERS.filter((m) => m.s === "b").length,
      optimal: LONGEVITY_MARKERS.filter((m) => m.s === "o").length,
    };
  }, []);

  const handleAskLiv = (m?: LongevityMarker | null) => {
    setSelectedMarker(null);
    navigate({
      to: "/aaha",
      search: { report: undefined },
    });
  };

  // Sync tab with search parameter if changed
  useEffect(() => {
    if (search.tab) {
      setActiveTab(search.tab);
    }
  }, [search.tab]);

  const remove = useMutation({
    mutationFn: (r: Report) => deleteReport(r),
    onSuccess: () => {
      toast.success(t("Report removed"));
      void qc.invalidateQueries({ queryKey: ["reports", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("Could not remove the report")),
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const toastId = toast.loading(t("Refreshing health records..."));
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["assessments", userId] }),
        qc.invalidateQueries({ queryKey: ["reports", userId] }),
        qc.invalidateQueries({ queryKey: ["test-readings", userId] }),
      ]);
      toast.dismiss(toastId);
      toast.success(t("Health records updated"));
    } catch {
      toast.dismiss(toastId);
      toast.error(t("Could not refresh records"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileAction = async (
    r: any,
    action: "view" | "download",
    isRetry = false,
  ) => {
    let rawPath = r.report_pdf_url || r.file_url || "";
    // Protect against exposing internal storage paths
    if (typeof rawPath === "string" && rawPath.startsWith("gs://")) {
      rawPath = "";
    }

    if (!rawPath || !rawPath.startsWith("http")) {
      toast.info(t("PDF is not available yet"));
      return;
    }

    const toastId = toast.loading(
      action === "download" ? t("Downloading...") : t("Opening report..."),
    );

    try {
      const res = await fetch(rawPath);
      if (res.status === 403 || res.status === 401) {
        toast.dismiss(toastId);
        if (!isRetry) {
          const retryToast = toast.loading(t("Refreshing report link..."));
          await qc.invalidateQueries({ queryKey: ["assessments", userId] });
          const freshAssessments = await listAssessments();
          toast.dismiss(retryToast);
          const freshRecord = freshAssessments.find(
            (item) => String(item.id) === String(r.id),
          );
          if (
            freshRecord?.report_pdf_url &&
            freshRecord.report_pdf_url !== rawPath &&
            freshRecord.report_pdf_url.startsWith("http")
          ) {
            return handleFileAction(freshRecord, action, true);
          }
        }
        toast.error(t("Report link has expired. Please try again later."));
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch file (${res.status})`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      toast.dismiss(toastId);

      if (action === "download") {
        const a = document.createElement("a");
        a.href = objectUrl;
        const baseName = r.kiosk_id
          ? `Kiosk_Report_${r.kiosk_id}`
          : r.file_name || r.title || "Health_Report";
        a.download = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      } else {
        window.open(objectUrl, "_blank", "noopener");
      }
    } catch {
      toast.dismiss(toastId);
      // Direct window open fallback
      if (action === "view") {
        window.open(rawPath, "_blank", "noopener");
      } else {
        const a = document.createElement("a");
        a.href = rawPath;
        const baseName = r.kiosk_id
          ? `Kiosk_Report_${r.kiosk_id}`
          : r.file_name || r.title || "Health_Report";
        a.download = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  // ─── Extract verified biomarkers from real assessments and reports ──────────
  const verifiedMarkers: VerifiedBiomarker[] = useMemo(() => {
    const list: VerifiedBiomarker[] = [];
    const seenNames = new Set<string>();

    // 1. Extract from kiosk assessments (vitals & readings)
    for (const a of assessments) {
      const readings = (a.readings || {}) as Record<string, any>;
      for (const [key, val] of Object.entries(readings)) {
        if (val === undefined || val === null || val === "") continue;
        const normKey = key.toLowerCase().replace(/_/g, " ").trim();
        if (seenNames.has(normKey)) continue;

        const isObj = typeof val === "object";
        const readingVal = isObj ? val.value ?? "" : String(val);
        const readingUnit = isObj ? val.unit || "" : "";
        const readingStatus = isObj ? val.status : undefined;
        const refRange = isObj ? val.reference_range || val.refRange : undefined;

        let friendlyName = key.replace(/_/g, " ");
        friendlyName = friendlyName.charAt(0).toUpperCase() + friendlyName.slice(1);
        if (normKey === "bp" || normKey === "blood pressure") friendlyName = "Blood Pressure";
        if (normKey === "hr" || normKey === "heart rate") friendlyName = "Heart Rate";
        if (normKey === "spo2") friendlyName = "Blood Oxygen (SpO2)";
        if (normKey === "bmi") friendlyName = "Body Mass Index (BMI)";

        let clinicalRef = refRange;
        if (!clinicalRef) {
          if (normKey.includes("pressure") || normKey === "bp") clinicalRef = "< 120/80 mmHg";
          else if (normKey.includes("heart rate") || normKey === "hr" || normKey.includes("pulse"))
            clinicalRef = "60 – 100 bpm";
          else if (normKey.includes("spo2")) clinicalRef = "95 – 100%";
          else if (normKey.includes("bmi")) clinicalRef = "18.5 – 24.9 kg/m²";
          else if (normKey.includes("glucose")) clinicalRef = "70 – 100 mg/dL";
        }

        seenNames.add(normKey);
        list.push({
          id: `vital-${a.id}-${key}`,
          name: friendlyName,
          value: String(readingVal),
          unit: readingUnit,
          referenceRange: clinicalRef,
          status: mapStatusToTone(readingStatus),
          statusLabel: readingStatus,
          group: classifyMarkerGroup(friendlyName),
          sourceReportId: a.id,
          sourceReportTitle: a.kiosk_id ? `Kiosk Check-up #${a.kiosk_id}` : "Kiosk Screening",
          sourceReportDate: a.created_at,
          sourceType: "kiosk",
        });
      }

      // Check for extracted_values in report_data
      const rawExtracted = (a._raw?.report_data?.extracted_values || []) as any[];
      if (Array.isArray(rawExtracted)) {
        for (const item of rawExtracted) {
          if (!item.test_name || !item.value) continue;
          const normName = item.test_name.toLowerCase().trim();
          if (seenNames.has(normName)) continue;
          seenNames.add(normName);
          list.push({
            id: `kiosk-ext-${a.id}-${normName}`,
            name: item.test_name,
            value: String(item.value),
            unit: item.unit || "",
            referenceRange: item.reference_range,
            status: mapStatusToTone(item.status),
            statusLabel: item.status,
            group: classifyMarkerGroup(item.test_name),
            sourceReportId: a.id,
            sourceReportTitle: a.kiosk_id ? `Kiosk Check-up #${a.kiosk_id}` : "Kiosk Screening",
            sourceReportDate: a.created_at,
            sourceType: "kiosk",
          });
        }
      }
    }

    // 2. Extract from uploaded lab reports
    for (const r of reports) {
      const extracted = (r.extracted_values || []) as any[];
      if (Array.isArray(extracted)) {
        for (const item of extracted) {
          if (!item.test_name || !item.value) continue;
          const normName = item.test_name.toLowerCase().trim();
          if (seenNames.has(normName)) continue;
          seenNames.add(normName);
          list.push({
            id: `lab-ext-${r.id}-${normName}`,
            name: item.test_name,
            value: String(item.value),
            unit: item.unit || "",
            referenceRange: item.reference_range,
            status: mapStatusToTone(item.status),
            statusLabel: item.status,
            group: classifyMarkerGroup(item.test_name),
            sourceReportId: r.id,
            sourceReportTitle: r.title || "Lab Report",
            sourceReportDate: r.created_at,
            sourceType: "lab",
          });
        }
      }
    }

    return list;
  }, [assessments, reports]);

  // Marker counts for filter pills
  const markerCounts = useMemo(() => {
    return {
      all: verifiedMarkers.length,
      priority: verifiedMarkers.filter((m) => m.status === "priority").length,
      borderline: verifiedMarkers.filter((m) => m.status === "borderline").length,
      optimal: verifiedMarkers.filter((m) => m.status === "optimal").length,
    };
  }, [verifiedMarkers]);

  // Filtered markers list
  const filteredMarkers = useMemo(() => {
    if (markerFilter === "all") return verifiedMarkers;
    return verifiedMarkers.filter((m) => m.status === markerFilter);
  }, [verifiedMarkers, markerFilter]);

  // Grouped markers
  const groupedMarkers = useMemo(() => {
    const groups: Record<string, VerifiedBiomarker[]> = {};
    for (const m of filteredMarkers) {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    }
    return groups;
  }, [filteredMarkers]);

  const totalReports = assessments.length + reports.length;
  const kioskCount = assessments.length;
  const labCount = reports.length;

  return (
    <div className="px-5 pt-6 pb-12 flex flex-col gap-4">
      {/* Top Header */}
      {activeTab === "markers" ? (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block">
              {latestAssessment?.created_at
                ? `ASSESSED ${new Date(latestAssessment.created_at)
                    .toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                    .toUpperCase()}`
                : "ASSESSED 18 SEP 2026"}
            </span>
            <h1 className="font-serif text-[32px] font-normal leading-tight text-foreground tracking-tight">
              {t("Biomarkers")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="size-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm"
              aria-label={t("Profile")}
            >
              <Icon name="person" className="text-[20px]" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-bold leading-tight">{t("Health Reports")}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {t("Kiosk screenings & laboratory test results")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              aria-label={t("Refresh reports")}
              className="size-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shadow-sm"
            >
              <Icon
                name="refresh"
                className={`text-[20px] text-primary ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
            <Link
              to="/upload"
              className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5 shadow-soft hover:brightness-105 active:scale-95 transition-all"
            >
              <Icon name="upload_file" className="text-[18px]" />
              <span>{t("Upload")}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Summary Score Banner if verified score exists (shown on non-markers tabs) */}
      {activeTab !== "markers" &&
      latestAssessment &&
      typeof latestAssessment.score === "number" &&
      latestAssessment.score > 0 ? (
        <section className="bg-card border border-border rounded-[24px] p-4 shadow-soft flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[20px] font-bold text-primary">{latestAssessment.score}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-foreground truncate">
                  {t("Latest AWIS Score")}
                </span>
                {latestAssessment.band ? (
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      latestAssessment.band === "high"
                        ? "bg-danger/10 text-danger"
                        : latestAssessment.band === "moderate"
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                    }`}
                  >
                    {latestAssessment.band}
                  </span>
                ) : null}
              </div>
              <p className="text-[12px] text-muted-foreground truncate">
                {latestAssessment.kiosk_id
                  ? `${t("Recorded at")} ${latestAssessment.kiosk_id}`
                  : t("Verified screening")}
                {" · "}
                {new Date(latestAssessment.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
          <Link
            to="/report/$id"
            params={{ id: latestAssessment.id }}
            className="text-[13px] font-semibold text-primary hover:underline shrink-0"
          >
            {t("View analysis")} →
          </Link>
        </section>
      ) : null}

      {/* Upload & Sync Records Options (shown on non-markers tabs) */}
      {activeTab !== "markers" && (
        <section className="bg-card border border-border rounded-[22px] p-3.5 shadow-soft flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
              <Icon name="cloud_upload" className="text-[17px] text-primary" />
              {t("Upload & Sync Options")}
            </span>
            <Link
              to="/my-uploads"
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              {t("My Uploads")} ({reports.length}) <Icon name="chevron_right" className="text-[14px]" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              to="/upload"
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/40 transition-all text-left"
            >
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon name="auto_awesome" className="text-[17px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-foreground leading-tight truncate">
                  {t("Common Upload (AI OCR)")}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {t("Camera, PDF & 16 categories")}
                </p>
              </div>
            </Link>

            <Link
              to="/upload-file"
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/40 transition-all text-left"
            >
              <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                <Icon name="science" className="text-[17px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-foreground leading-tight truncate">
                  {t("7 Lab Types (Kiosk DB)")}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {t("LH/FSH, TSH, Ferritin, etc.")}
                </p>
              </div>
            </Link>

            <Link
              to="/upload-report"
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/40 transition-all text-left"
            >
              <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                <Icon name="monitor_heart" className="text-[17px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-foreground leading-tight truncate">
                  {t("Add to Kiosk Database")}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {t("Screening vitals & AWIS score")}
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Segmented Filter Tabs including Biomarkers */}
      <div className="flex rounded-full bg-muted/60 p-1 border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex-1 min-h-[36px] rounded-full text-[12.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "all"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("All")}</span>
          <span className="text-[10.5px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {totalReports}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("kiosk")}
          className={`flex-1 min-h-[36px] rounded-full text-[12.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "kiosk"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("Kiosk")}</span>
          <span className="text-[10.5px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {kioskCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lab")}
          className={`flex-1 min-h-[36px] rounded-full text-[12.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "lab"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("Lab")}</span>
          <span className="text-[10.5px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {labCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("markers")}
          className={`flex-1 min-h-[36px] rounded-full text-[12.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "markers"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{t("Biomarkers")}</span>
          <span className="text-[10.5px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
            {longevityCounts.all}
          </span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="flex items-center gap-3 text-sm text-muted-foreground p-5 border border-border">
          <Icon name="progress_activity" className="animate-spin text-primary text-[22px]" />
          <span>{t("Loading your health records...")}</span>
        </Card>
      )}

      {/* Error State with Retry Button */}
      {error && !loading && (
        <div className="bg-danger/10 border border-danger/30 rounded-[20px] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-danger">
            <Icon name="error" className="text-[20px]" />
            <span className="text-[14px] font-bold">{t("Could not load reports")}</span>
          </div>
          <p className="text-[13px] text-foreground/80">
            {error instanceof Error ? error.message : t("Network error while connecting to health service.")}
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="self-start mt-1 px-4 py-2 rounded-full bg-danger text-white text-[12px] font-bold hover:brightness-110 active:scale-95 transition-all"
          >
            {t("Retry")}
          </button>
        </div>
      )}

      {/* Content based on Active Tab */}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {/* Section: Liv Markers Experience */}
          {/* Section: Liv Markers Experience */}
          {activeTab === "markers" && (
            <section className="flex flex-col gap-3">
              {/* Filter Chips */}
              <div className="liv-chips">
                <button
                  type="button"
                  onClick={() => setMarkerFilter("all")}
                  className={`liv-chip ${markerFilter === "all" ? "on" : ""}`}
                >
                  <span>{t("All")}</span>
                  <span>{longevityCounts.all}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarkerFilter("priority")}
                  className={`liv-chip ${markerFilter === "priority" ? "on" : ""}`}
                >
                  <span className="opacity-80">▲</span>
                  <span>{t("Priority")}</span>
                  <span>{longevityCounts.priority}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarkerFilter("borderline")}
                  className={`liv-chip ${markerFilter === "borderline" ? "on" : ""}`}
                >
                  <span className="opacity-80">◆</span>
                  <span>{t("Borderline")}</span>
                  <span>{longevityCounts.borderline}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarkerFilter("optimal")}
                  className={`liv-chip ${markerFilter === "optimal" ? "on" : ""}`}
                >
                  <span className="opacity-80">●</span>
                  <span>{t("Optimal")}</span>
                  <span>{longevityCounts.optimal}</span>
                </button>
              </div>

              {/* Longevity Report Summary Card */}
              <Link
                to="/report/$id"
                params={{ id: latestAssessment?.id ? String(latestAssessment.id) : "longevity" }}
                className="bg-card border border-border rounded-[22px] p-4 shadow-soft flex items-center justify-between gap-3 hover:border-foreground/30 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="size-11 rounded-2xl bg-muted/70 flex items-center justify-center shrink-0 text-foreground">
                    <Icon name="description" className="text-[22px]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[15px] text-foreground leading-tight">
                      {t("Longevity report")}
                    </h3>
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                      {t("Fetched from the Living Lab kiosk · 18 Sep 2026")}
                    </p>
                  </div>
                </div>
                <Icon name="chevron_right" className="text-[20px] text-muted-foreground shrink-0" />
              </Link>

              {/* Eyebrow: From your last check-in */}
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground px-1 mt-1 block">
                {t("FROM YOUR LAST CHECK-IN · 6 OCT")}
              </span>

              {/* Kiosk vitals card */}
              <div className="bg-card border border-border rounded-[24px] p-4 shadow-soft flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[15px] text-foreground">
                    {t("Kiosk vitals")}
                  </h3>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {t("Check-in 6 Oct · next 15 Oct")}
                  </span>
                </div>

                {/* Animated ECG strip */}
                <button
                  type="button"
                  onClick={() => {
                    const ecgMarker = LONGEVITY_MARKERS.find((m) => m.id === "ecg");
                    if (ecgMarker) setSelectedMarker(ecgMarker);
                  }}
                  className="w-full text-left"
                  title={t("Tap for ECG details")}
                >
                  <EcgStrip />
                </button>

                {/* Resting Heart Rate & Blood Pressure */}
                <div className="liv-vit-grid">
                  <button
                    type="button"
                    onClick={() => {
                      const m = LONGEVITY_MARKERS.find((x) => x.id === "hr");
                      if (m) setSelectedMarker(m);
                    }}
                    className="liv-vit-box"
                  >
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground block truncate">
                      {t("Resting Heart Rate")}
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-serif text-[26px] font-medium leading-none text-foreground">68</span>
                      <span className="font-mono text-[11px] text-muted-foreground">bpm</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[11.5px] font-mono text-emerald-500 font-medium">
                        ▼ -6 bpm · better
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const m = LONGEVITY_MARKERS.find((x) => x.id === "bp");
                      if (m) setSelectedMarker(m);
                    }}
                    className="liv-vit-box"
                  >
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground block truncate">
                      {t("Blood Pressure")}
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-serif text-[26px] font-medium leading-none text-foreground">122 / 81</span>
                      <span className="font-mono text-[11px] text-muted-foreground">mmHg</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[11.5px] font-mono text-emerald-500 font-medium">
                        ▼ -4 · better
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Body scan card */}
              <div className="bg-card border border-border rounded-[24px] p-4 shadow-soft flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[15px] text-foreground">
                    {t("Body scan")}
                  </h3>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {t("Smart camera · 6 Oct")}
                  </span>
                </div>

                {/* Figure & Posture score */}
                <button
                  type="button"
                  onClick={() => {
                    const p = LONGEVITY_MARKERS.find((x) => x.id === "posture");
                    if (p) setSelectedMarker(p);
                  }}
                  className="liv-fig-grid p-2 rounded-2xl hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="w-[110px] mx-auto">
                    <FigureSvg big={true} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("Posture")}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-serif text-[38px] font-medium text-foreground leading-none">
                        72
                      </span>
                      <span className="font-mono text-[12px] text-muted-foreground">
                        / 100
                      </span>
                    </div>
                    <span className="text-[11.5px] font-mono text-emerald-500 font-medium">
                      ▲ +3 · better
                    </span>
                    <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
                      {t("Forward head, right shoulder low. Tap for the findings.")}
                    </p>
                  </div>
                </button>

                {/* Mini scan grid (BMI, Body fat, Waist) */}
                <div className="liv-scan-grid">
                  <button
                    type="button"
                    onClick={() => {
                      const m = LONGEVITY_MARKERS.find((x) => x.id === "bmi");
                      if (m) setSelectedMarker(m);
                    }}
                    className="liv-scan-box"
                  >
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground block truncate">
                      BMI
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-serif text-[20px] font-medium leading-none text-foreground">26.4</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-500 block mt-0.5">▼ -0.3 · better</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const m = LONGEVITY_MARKERS.find((x) => x.id === "bf");
                      if (m) setSelectedMarker(m);
                    }}
                    className="liv-scan-box"
                  >
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground block truncate">
                      Body fat
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-serif text-[20px] font-medium leading-none text-foreground">36.2</span>
                      <span className="font-mono text-[9.5px] text-muted-foreground">%</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-500 block mt-0.5">▼ -0.3% · better</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const m = LONGEVITY_MARKERS.find((x) => x.id === "waist");
                      if (m) setSelectedMarker(m);
                    }}
                    className="liv-scan-box"
                  >
                    <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground block truncate">
                      Waist
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-serif text-[20px] font-medium leading-none text-foreground">88</span>
                      <span className="font-mono text-[9.5px] text-muted-foreground">cm</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-500 block mt-0.5">▼ -1 cm · better</span>
                  </button>
                </div>
              </div>

              {/* Grouped 52 Biomarker Rows by Body System */}
              {LONGEVITY_GROUPS.map((grp) => {
                const markersInGroup = filteredLongevityMarkers.filter((m) => m.g === grp.id);
                if (markersInGroup.length === 0) return null;

                return (
                  <div key={grp.id} className="space-y-2 pt-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground px-1 block">
                      {grp.name}
                    </span>
                    <div className="bg-card border border-border rounded-[24px] p-3 shadow-soft divide-y divide-border/60">
                      {markersInGroup.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMarker(m)}
                          className="w-full text-left py-3.5 first:pt-1 last:pb-1 flex flex-col gap-2 hover:bg-muted/20 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-[14.5px] text-foreground">
                              {m.n}
                            </span>
                            <div className="flex items-baseline gap-1 text-right">
                              <span className="font-serif text-[20px] font-medium text-foreground">
                                {m.v}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {m.u.split(" · ")[0]}
                              </span>
                            </div>
                          </div>

                          {!m.nobar && m.min !== undefined && m.max !== undefined && (
                            <RangeBar marker={m} />
                          )}

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono text-muted-foreground">
                              {t("Optimal")} {m.opt}
                            </span>
                            <MarkerStatusPill status={m.s} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Extracted Lab Tests from User Uploads if present */}
              {filteredMarkers.length > 0 && (
                <div className="space-y-2 pt-4">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground px-1 block">
                    {t("ADDITIONAL EXTRACTED LAB TESTS")}
                  </span>
                  <div className="bg-card border border-border rounded-[24px] p-3 shadow-soft divide-y divide-border/60">
                    {filteredMarkers.map((m) => (
                      <div
                        key={m.id}
                        className="py-3 first:pt-1 last:pb-1 flex items-baseline justify-between gap-2 px-2"
                      >
                        <div>
                          <span className="font-semibold text-[14px] text-foreground block">
                            {m.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            {m.referenceRange ? `${t("Range")}: ${m.referenceRange}` : t("Verified test")}
                            {m.sourceReportTitle ? ` · ${m.sourceReportTitle}` : ""}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-serif text-[18px] font-medium text-foreground">
                            {m.value}
                          </span>
                          {m.unit && (
                            <span className="font-mono text-[10.5px] text-muted-foreground ml-1">
                              {m.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add another report shortcut */}
              <Link
                to="/upload"
                className="w-full min-h-[46px] rounded-full border border-border bg-card text-foreground font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-muted active:scale-95 transition-all mt-2"
              >
                <Icon name="upload_file" className="text-[18px]" />
                <span>{t("Add another report")}</span>
              </Link>

              {/* Clinical Disclaimer Note */}
              <p className="text-[11.5px] font-mono leading-relaxed text-muted-foreground px-1 pt-1 pb-4">
                {t(
                  "* Clinical reference ranges are established by accredited diagnostic laboratories and kiosk sensors. Longevity-optimal health ranges are evaluated during physician consultations.",
                )}
              </p>
            </section>
          )}

          {/* Section: Kiosk Check-up Reports */}
          {(activeTab === "all" || activeTab === "kiosk") && (
            <section className="flex flex-col gap-3">
              {activeTab === "all" && (
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[16px] font-bold text-foreground">
                    {t("Kiosk Check-up Reports")}
                  </h2>
                  <span className="text-[12px] text-muted-foreground">
                    {kioskCount} {t("recorded")}
                  </span>
                </div>
              )}

              {assessments.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {assessments.map((a: Assessment) => (
                    <KioskReportCard
                      key={`kiosk-${a.id}`}
                      assessment={a}
                      onFileAction={handleFileAction}
                      onRefresh={handleManualRefresh}
                    />
                  ))}
                </div>
              ) : activeTab === "kiosk" ? (
                <div className="bg-card border border-border rounded-[24px] p-8 text-center flex flex-col items-center gap-3 shadow-soft">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon name="monitor_heart" className="text-[28px]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground">
                      {t("No kiosk check-ups yet")}
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-1 max-w-[280px]">
                      {t("Visit any AAHA Wellness Kiosk to complete a guided health assessment and generate your clinical report.")}
                    </p>
                  </div>
                  <Link
                    to="/checkup"
                    className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all"
                  >
                    {t("Start online check-up")}
                  </Link>
                </div>
              ) : null}
            </section>
          )}

          {/* Section: Laboratory Reports */}
          {(activeTab === "all" || activeTab === "lab") && (
            <section className="flex flex-col gap-3">
              {activeTab === "all" && (
                <div className="flex items-center justify-between px-1 pt-2">
                  <h2 className="text-[16px] font-bold text-foreground">
                    {t("Laboratory Reports")}
                  </h2>
                  <span className="text-[12px] text-muted-foreground">
                    {labCount} {t("uploaded")}
                  </span>
                </div>
              )}

              {reports.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {reports.map((r: Report) => (
                    <LabReportCard
                      key={`lab-${r.id}`}
                      report={r}
                      onFileAction={handleFileAction}
                      onDelete={(item) => remove.mutate(item)}
                    />
                  ))}
                </div>
              ) : activeTab === "lab" ? (
                <div className="bg-card border border-border rounded-[24px] p-8 text-center flex flex-col items-center gap-3 shadow-soft">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Icon name="description" className="text-[28px]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground">
                      {t("No lab reports uploaded yet")}
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-1 max-w-[280px]">
                      {t("Upload blood tests, thyroid, lipid, or iron reports to receive plain-language biomarker explanations.")}
                    </p>
                  </div>
                  <Link
                    to="/upload"
                    className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all"
                  >
                    {t("Upload a lab report")}
                  </Link>
                </div>
              ) : null}
            </section>
          )}

          {/* Combined Empty State */}
          {activeTab === "all" && totalReports === 0 && (
            <div className="bg-card border border-border rounded-[24px] p-8 text-center flex flex-col items-center gap-3 shadow-soft">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Icon name="folder_open" className="text-[28px]" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-foreground">
                  {t("No health records found")}
                </h3>
                <p className="text-[13px] text-muted-foreground mt-1 max-w-[300px]">
                  {t("Complete a check-up at a health kiosk or upload your laboratory reports to start tracking your health journey.")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <Link
                  to="/upload"
                  className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold shadow-soft hover:brightness-105 active:scale-95 transition-all"
                >
                  {t("Upload Lab Report")}
                </Link>
                <Link
                  to="/checkup"
                  className="px-5 py-2.5 rounded-full border border-primary text-primary text-[13px] font-semibold hover:bg-primary/5 active:scale-95 transition-all"
                >
                  {t("Start Check-up")}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Ask Liv button on Biomarkers tab */}
      {activeTab === "markers" && (
        <button
          type="button"
          onClick={() => handleAskLiv(null)}
          className="fixed bottom-20 right-5 z-40 h-11 px-4 rounded-full bg-foreground text-background text-[13px] font-semibold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
          aria-label={t("Ask Liv")}
        >
          <Icon name="auto_awesome" className="text-[17px]" />
          <span>{t("Ask Liv")}</span>
        </button>
      )}

      {/* Marker Detail Sheet / Modal */}
      {selectedMarker && (
        <MarkerModal
          marker={selectedMarker}
          onClose={() => setSelectedMarker(null)}
          onAskLiv={(m) => handleAskLiv(m)}
        />
      )}
    </div>
  );
}

/** Card representing a verified Kiosk Assessment Report */
function KioskReportCard({
  assessment,
  onFileAction,
  onRefresh,
}: {
  assessment: Assessment;
  onFileAction: (item: any, action: "view" | "download") => void;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  const dateFormatted = new Date(assessment.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const readingsMap = (assessment.readings || {}) as Record<string, any>;
  const vitals = Object.entries(readingsMap).slice(0, 3);
  const hasValidPdf = Boolean(
    assessment.report_pdf_url && assessment.report_pdf_url.startsWith("http")
  );

  return (
    <div className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-3 shadow-soft hover:border-primary/40 transition-all">
      {/* Top Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="monitor_heart" className="text-[20px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-foreground truncate">
              {assessment.kiosk_id
                ? `${t("Kiosk Check-up")} #${assessment.kiosk_id}`
                : t(assessment.complaint || "Health Assessment")}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {dateFormatted} · {t("Clinical Screening")}
            </p>
          </div>
        </div>

        {/* Risk Band Pill */}
        {assessment.band ? (
          <span
            className={`shrink-0 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              assessment.band === "high"
                ? "bg-danger/10 text-danger"
                : assessment.band === "moderate"
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success"
            }`}
          >
            {assessment.band}
          </span>
        ) : null}
      </div>

      {/* AWIS Score & Summary */}
      <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-3 border border-border/40">
        <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl px-2.5 py-1.5 shrink-0 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {t("AWIS")}
          </span>
          <span className="text-[18px] font-bold text-primary leading-tight">
            {assessment.score > 0 ? assessment.score : "—"}
          </span>
        </div>
        <p className="text-[13px] text-foreground/90 leading-snug line-clamp-2">
          {assessment.summary ? t(assessment.summary) : t("Comprehensive health assessment recorded.")}
        </p>
      </div>

      {/* Vitals Badges Preview if present */}
      {vitals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {vitals.map(([key, val]) => {
            const displayVal = typeof val === "object" && val !== null ? val.value : val;
            const unit = typeof val === "object" && val !== null ? val.unit : "";
            return (
              <span
                key={key}
                className="text-[11px] px-2.5 py-1 rounded-full bg-accent text-accent-foreground font-medium flex items-center gap-1"
              >
                <span className="capitalize text-muted-foreground">{key}:</span>
                <span className="font-bold text-foreground">
                  {displayVal} {unit}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Action Row */}
      <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
        <div className="flex gap-2">
          <Link
            to="/report/$id"
            params={{ id: assessment.id }}
            className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold hover:brightness-105 active:scale-95 transition-all shadow-sm"
          >
            <Icon name="visibility" className="text-[16px]" />
            <span>{t("View Details")}</span>
          </Link>

          {hasValidPdf ? (
            <>
              <button
                type="button"
                onClick={() => onFileAction(assessment, "view")}
                className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-accent text-primary text-[13px] font-semibold hover:bg-accent/80 active:scale-95 transition-all"
              >
                <Icon name="picture_as_pdf" className="text-[16px]" />
                <span>{t("Open PDF")}</span>
              </button>
              <button
                type="button"
                onClick={() => onFileAction(assessment, "download")}
                aria-label={t("Download PDF")}
                className="size-[38px] flex items-center justify-center rounded-full bg-accent text-primary hover:bg-accent/80 active:scale-95 transition-all shrink-0"
              >
                <Icon name="download" className="text-[16px]" />
              </button>
            </>
          ) : null}
        </div>

        {/* Clear status note if PDF is not available yet */}
        {!hasValidPdf && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Icon name="info" className="text-[14px]" />
              <span>
                {assessment.has_storage_path
                  ? t("PDF document is pending generation by kiosk.")
                  : t("Digital checkup summary recorded.")}
              </span>
            </span>
            <button
              type="button"
              onClick={onRefresh}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              <Icon name="refresh" className="text-[13px]" />
              <span>{t("Check status")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Card representing an Uploaded Laboratory Report */
function LabReportCard({
  report,
  onFileAction,
  onDelete,
}: {
  report: Report;
  onFileAction: (item: any, action: "view" | "download") => void;
  onDelete: (item: Report) => void;
}) {
  const { t } = useI18n();
  const dateFormatted = new Date(
    report.report_date || report.created_at || Date.now(),
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const extractedCount = Array.isArray(report.extracted_values)
    ? report.extracted_values.length
    : 0;

  const hasFile = Boolean(report.file_url && report.file_url.startsWith("http"));

  return (
    <div className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-3 shadow-soft hover:border-primary/40 transition-all">
      {/* Top Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="science" className="text-[20px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-foreground truncate">{report.title}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {dateFormatted} · {report.category || t("Lab report")}
            </p>
          </div>
        </div>

        {report.status_label && (
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {report.status_label}
          </span>
        )}
      </div>

      {/* Extracted Biomarkers Summary */}
      <div className="bg-muted/40 rounded-2xl p-3 border border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="biotech" className="text-[18px] text-primary" />
          <span className="text-[13px] font-medium text-foreground">
            {extractedCount > 0
              ? `${extractedCount} ${t("biomarkers read from report")}`
              : t("Document uploaded · Ready for explanation")}
          </span>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Link
          to="/report/$id"
          params={{ id: report.id }}
          className="flex-1 min-h-[38px] flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold hover:brightness-105 active:scale-95 transition-all shadow-sm"
        >
          <Icon name="auto_awesome" className="text-[16px]" />
          <span>{t("View Explanation")}</span>
        </Link>

        {hasFile && (
          <button
            type="button"
            onClick={() => onFileAction(report, "view")}
            aria-label={t("View original file")}
            className="size-[38px] flex items-center justify-center rounded-full bg-accent text-primary hover:bg-accent/80 active:scale-95 transition-all shrink-0"
          >
            <Icon name="visibility" className="text-[16px]" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(report)}
          aria-label={t("Delete report")}
          className="size-[38px] flex items-center justify-center rounded-full bg-accent text-danger hover:bg-danger/10 active:scale-95 transition-all shrink-0"
        >
          <Icon name="delete" className="text-[16px]" />
        </button>
      </div>
    </div>
  );
}
