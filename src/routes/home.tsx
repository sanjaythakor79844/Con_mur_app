import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import {
  bandLabel,
  bandTone,
  formatDate,
  useDisplayName,
  useOverview,
} from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { listAssessments } from "@/lib/aaha-api";
import {
  LivPhone,
  LivIcon,
  LivBottomNav,
  LivProgressRing,
  type LivTabId,
} from "@/components/liv";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home | Liv Living Lab" },
      {
        name: "description",
        content:
          "Your verified health status, AWIS score, kiosk screenings, vitals and appointments in one calm, monochrome dashboard.",
      },
      { property: "og:title", content: "Home | Liv Living Lab" },
      { property: "og:description", content: "Longevity and wellness measured at a glance." },
    ],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to see your health dashboard, reports and appointments.")}>
      <HomeDashboard />
    </RequireAuth>
  );
}

interface VitalReading {
  value?: string | number;
  unit?: string;
  status?: string;
}

const DEFAULT_HABITS = [
  { id: "walk", title: "Walk for 10 minutes after main meals", desc: "Easy pace, after lunch and dinner" },
  { id: "protein", title: "Protein at every meal", desc: "Target 1.4 g per kg per day" },
  { id: "sleep", title: "Protect a 7-hour night", desc: "Lights out by 11 PM · wake 6:30 AM" },
];

function HomeDashboard() {
  const { t } = useI18n();
  const { patient, userId } = useAuth();
  const { firstName, fullName } = useDisplayName();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const {
    latestAssessment,
    assessments,
    reports,
    upcoming,
    loading,
    error,
  } = useOverview();

  // Liv theme state
  const [livTheme, setLivTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("liv.theme");
      if (saved === "light" || saved === "dark") return saved;
    }
    return "dark";
  });

  const toggleTheme = () => {
    const next = livTheme === "dark" ? "light" : "dark";
    setLivTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("liv.theme", next);
    }
  };

  // Daily habits checklist state
  const [doneHabits, setDoneHabits] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("liv.habits");
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return { walk: true };
  });

  const toggleHabit = (id: string) => {
    setDoneHabits((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("liv.habits", JSON.stringify(updated));
        } catch (_) {}
      }
      return updated;
    });
  };

  const displayName = patient?.full_name?.trim() || fullName || firstName || "Member";
  const userFirstName = (displayName || "").split(/\s+/)[0];

  // Salutation based on current time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Formatted date string
  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateStr = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;

  // AWIS score validity
  const hasValidScore =
    latestAssessment &&
    typeof latestAssessment.score === "number" &&
    latestAssessment.score > 0;
  const scoreValue = hasValidScore ? latestAssessment.score : 0;
  const riskTone = bandTone(latestAssessment?.band);
  const riskLabel = bandLabel(latestAssessment);

  // Biological age calculation (clinical model: delta based on AWIS score)
  const calendarAge = patient?.age ? Number(patient.age) : 42;
  const bioAgeDelta = hasValidScore ? ((100 - scoreValue) * 0.12).toFixed(1) : "3.8";
  const bioAge = (calendarAge + Number(bioAgeDelta)).toFixed(1);

  // Kiosk assessment
  const latestKiosk = assessments.find(
    (a) => a.source === "kiosk" || Boolean(a.kiosk_id),
  );

  // Real verified recorded vitals
  const readingsMap = (latestAssessment?.readings || {}) as Record<string, VitalReading | string | number>;
  const vitalsEntries = Object.entries(readingsMap)
    .filter(([_, val]) => val !== undefined && val !== null)
    .slice(0, 5);

  // Completed habits calculation
  const completedHabitsCount = DEFAULT_HABITS.filter((h) => doneHabits[h.id]).length;
  const habitProgressPercent = (completedHabitsCount / DEFAULT_HABITS.length) * 100;

  // Safe PDF Handler (no gs:// exposure)
  const handlePdfAction = async (
    target: { id: string; report_pdf_url?: string; file_url?: string; kiosk_id?: string; title?: string },
    action: "view" | "download" = "view",
    isRetry = false,
  ) => {
    let rawPath = target.report_pdf_url || target.file_url || "";
    if (typeof rawPath === "string" && rawPath.startsWith("gs://")) {
      rawPath = "";
    }

    if (!rawPath || !rawPath.startsWith("http")) {
      toast.info(t("PDF is not available yet"));
      return;
    }

    const toastId = toast.loading(
      action === "download" ? t("Downloading report...") : t("Opening report..."),
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
          const freshRecord = freshAssessments.find((item) => String(item.id) === String(target.id));
          if (
            freshRecord?.report_pdf_url &&
            freshRecord.report_pdf_url !== rawPath &&
            freshRecord.report_pdf_url.startsWith("http")
          ) {
            return handlePdfAction(freshRecord, action, true);
          }
        }
        toast.error(t("Report link has expired. Please try again later."));
        return;
      }

      if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      toast.dismiss(toastId);

      if (action === "download") {
        const a = document.createElement("a");
        a.href = objectUrl;
        const baseName = target.kiosk_id
          ? `Kiosk_Report_${target.kiosk_id}`
          : target.title || "Health_Report";
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
      window.open(rawPath, "_blank", "noopener");
    }
  };

  const handleTabChange = (tab: LivTabId) => {
    if (tab === "home") return;
    if (tab === "markers") {
      void navigate({ to: "/reports", search: { tab: "markers" } });
    } else if (tab === "plan") {
      void navigate({ to: "/journey" });
    } else if (tab === "care") {
      void navigate({ to: "/appointments" });
    }
  };

  return (
    <LivPhone theme={livTheme}>
      <main className="scroll enter">
        {/* Header */}
        <div className="hd">
          <div>
            <span className="k">{dateStr}</span>
            <h1 className="h1" style={{ marginTop: "6px" }}>
              {greeting}, {userFirstName}
            </h1>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="icb"
              onClick={toggleTheme}
              aria-label={livTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title="Toggle theme"
            >
              <LivIcon name={livTheme === "dark" ? "moon" : "spark"} size={18} />
            </button>
            <Link to="/profile" className="icb" aria-label="Profile and settings">
              <LivIcon name="user" size={20} />
            </Link>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px 0" }}>
            <div className="card" style={{ height: "140px", opacity: 0.5, animation: "breathe 1.5s infinite" }} />
            <div className="card" style={{ height: "90px", opacity: 0.5 }} />
          </div>
        ) : error ? (
          /* Error State */
          <div className="card" style={{ textAlign: "center", padding: "24px" }}>
            <span className="k">Connection Error</span>
            <h2 className="h2" style={{ marginTop: "8px" }}>Could not load health records</h2>
            <p className="sub" style={{ margin: "8px 0 16px" }}>
              Please check your network connection and try again.
            </p>
            <button
              type="button"
              className="btn sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : hasValidScore ? (
          /* ─── HOME FULL (Valid Score / Report Fetched) ────────────────────────── */
          <>
            {/* AIWS Score Card (Inverted) */}
            <button
              type="button"
              className="card inv score"
              onClick={() => void navigate({ to: "/reports" })}
              style={{ cursor: "pointer" }}
            >
              <LivProgressRing
                size={118}
                strokeWidth={7}
                progress={scoreValue / 100}
                onBg={false}
              >
                <span className="num" style={{ fontSize: "44px" }}>
                  {scoreValue}
                </span>
                <div className="unit" style={{ marginTop: "4px" }}>
                  / 100
                </div>
              </LivProgressRing>

              <span className="txt">
                <span className="k">AIWS score</span>
                <span className="h3" style={{ fontSize: "16px" }}>
                  {riskLabel || "Longevity Score"}
                </span>
                <span className="sub">
                  {latestAssessment?.summary ||
                    "Calculated from verified biomarkers and lifestyle metrics. Tap to see what moves it."}
                </span>
              </span>
            </button>

            {/* Quick Report Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              {latestKiosk && (
                <button
                  type="button"
                  className="btn sm ghost"
                  style={{ flex: 1 }}
                  onClick={() => handlePdfAction(latestKiosk, "view")}
                >
                  <LivIcon name="file" size={16} />
                  <span>View report</span>
                </button>
              )}
              <button
                type="button"
                className="btn sm ghost"
                style={{ flex: 1 }}
                onClick={() => void navigate({ to: "/reports", search: { tab: "markers" } })}
              >
                <LivIcon name="drop" size={16} />
                <span>Biomarkers</span>
              </button>
            </div>

            {/* Stat Split: Biological Age & 90-day Programme */}
            <div className="split">
              <button
                type="button"
                className="card stat"
                onClick={() => void navigate({ to: "/reports" })}
              >
                <span className="k">Biological age</span>
                <span>
                  <span className="num">{bioAge}</span> <span className="unit">yrs</span>
                </span>
                <span className="sub">+{bioAgeDelta} vs calendar age {calendarAge}</span>
              </button>

              <button
                type="button"
                className="card stat"
                onClick={() => void navigate({ to: "/journey" })}
              >
                <span className="k">Programme</span>
                <span>
                  <span className="num">Day 1</span> <span className="unit">/ 90</span>
                </span>
                <span className="sub" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <LivIcon name="flame" size={14} />
                  <span>Active rhythm</span>
                </span>
              </button>
            </div>

            {/* Three Things Today (Habits) */}
            <div className="card" id="today">
              <div className="hd">
                <span className="h3">Three things today</span>
                <span className="unit" id="tcount">
                  {completedHabitsCount} of {DEFAULT_HABITS.length} done
                </span>
              </div>
              <div className="prog">
                <i style={{ width: `${habitProgressPercent}%` }} />
              </div>
              <div>
                {DEFAULT_HABITS.map((h) => {
                  const isDone = Boolean(doneHabits[h.id]);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      className={`habit ${isDone ? "done" : ""}`}
                      onClick={() => toggleHabit(h.id)}
                      role="checkbox"
                      aria-checked={isDone}
                    >
                      <span className={`box ${isDone ? "on" : ""}`}>
                        <LivIcon name="check" size={15} strokeWidth={2.4} />
                      </span>
                      <span className="t">
                        {h.title}
                        <small>{h.desc}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="link"
                style={{ padding: "4px 0 0", textAlign: "left" }}
                onClick={() => void navigate({ to: "/journey" })}
              >
                Everything else is on <b>Plan</b>
              </button>
            </div>

            {/* Needs Attention / Recorded Vitals (Horizontal Scroller) */}
            {vitalsEntries.length > 0 && (
              <>
                <div className="sec">
                  <span className="k">Biomarkers & Vitals</span>
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/reports", search: { tab: "markers" } })}
                  >
                    All {vitalsEntries.length} recorded
                  </button>
                </div>
                <div className="hs">
                  {vitalsEntries.map(([key, val]) => {
                    const isObj = typeof val === "object" && val !== null;
                    const readingVal = isObj ? ((val as VitalReading).value ?? "") : val;
                    const readingUnit = isObj ? (val as VitalReading).unit || "" : "";
                    const readingStatus = isObj ? (val as VitalReading).status || "Normal" : "Normal";
                    const isOptimal = readingStatus === "Normal" || readingStatus === "Optimal";

                    return (
                      <button
                        key={key}
                        type="button"
                        className="card"
                        onClick={() => void navigate({ to: "/reports", search: { tab: "markers" } })}
                      >
                        <span className="k">{key.replace(/_/g, " ")}</span>
                        <span>
                          <span className="num">{readingVal}</span>{" "}
                          <span className="unit">{readingUnit}</span>
                        </span>
                        <div className="rb">
                          <i className={isOptimal ? "zo" : "zp"} style={{ flex: 1 }} />
                          <b style={{ left: isOptimal ? "70%" : "30%" }} />
                        </div>
                        <span className="sub">Status: {readingStatus}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Upcoming Appointment */}
            {upcoming ? (
              <>
                <div className="sec">
                  <span className="k">Next appointment</span>
                  <button type="button" onClick={() => void navigate({ to: "/appointments" })}>
                    Book another
                  </button>
                </div>
                <button
                  type="button"
                  className="card appt"
                  onClick={() => void navigate({ to: "/appointments" })}
                >
                  <span className="date">
                    <b>{new Date(upcoming.scheduled_for || upcoming.appointment_date || Date.now()).getDate()}</b>
                    <span>
                      {months[new Date(upcoming.scheduled_for || upcoming.appointment_date || Date.now()).getMonth()]}
                    </span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="h3" style={{ display: "block" }}>
                      {upcoming.doctor_name || upcoming.speciality || "Consultation"}
                    </span>
                    <span className="sub" style={{ display: "block" }}>
                      {upcoming.centre || upcoming.mode || "Living Lab"}
                    </span>
                    <span className="sub" style={{ display: "block" }}>
                      {upcoming.slot_label || formatDate(upcoming.scheduled_for || upcoming.appointment_date)}
                    </span>
                  </span>
                  <LivIcon name="chev" size={18} />
                </button>
              </>
            ) : (
              <div style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void navigate({ to: "/appointments" })}
                >
                  <LivIcon name="cal" size={18} />
                  <span>Book an appointment</span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* ─── HOME EMPTY (Waiting for Screening / No Valid Score Yet) ──────────── */
          <>
            {/* Kiosk Status Card */}
            {latestKiosk ? (
              <div className="card inv" id="kiosk">
                <span className="k">Longevity report ready</span>
                <h2 className="h2" style={{ marginTop: "6px" }}>
                  Your kiosk screening is waiting
                </h2>
                <p className="sub" style={{ margin: "8px 0 16px" }}>
                  Living Lab Kiosk #{latestKiosk.kiosk_id || "Verified"}
                  <br />
                  Screening data recorded. Tap below to view your full results.
                </p>
                {latestKiosk.report_pdf_url ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handlePdfAction(latestKiosk, "view")}
                  >
                    <LivIcon name="down" size={20} />
                    <span>Get my longevity report</span>
                  </button>
                ) : (
                  <Link
                    to="/report/$id"
                    params={{ id: latestKiosk.id }}
                    className="btn"
                  >
                    <LivIcon name="file" size={20} />
                    <span>View kiosk readings</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="card empty" id="kiosk">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="spin" style={{ width: "20px", height: "20px" }} />
                  <span className="k">Living Lab Kiosk Sync</span>
                </div>
                <h2 className="h2" style={{ marginTop: "6px" }}>
                  Checking for your screening
                </h2>
                <p className="sub" style={{ margin: "8px 0 16px" }}>
                  Looking for records linked to {patient?.mobile_number ? `+91 ${patient.mobile_number.slice(-10)}` : "your mobile number"}.
                  When you complete a check-up, your AWIS score appears here.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void navigate({ to: "/checkup" })}
                >
                  <LivIcon name="spark" size={18} />
                  <span>Start Guided Check-up</span>
                </button>
              </div>
            )}

            {/* Other Ways to Start */}
            <span className="k" style={{ marginTop: "10px" }}>Other ways to start</span>
            <button
              type="button"
              className="opt"
              onClick={() => void navigate({ to: "/upload" })}
            >
              <LivIcon name="up" size={22} />
              <div>
                <div className="h3">Upload a lab report</div>
                <div className="sub">A photo or PDF from any lab</div>
              </div>
              <LivIcon name="chev" size={16} />
            </button>

            <button
              type="button"
              className="opt"
              onClick={() => void navigate({ to: "/appointments" })}
            >
              <LivIcon name="cal" size={22} />
              <div>
                <div className="h3">Book a kiosk screening</div>
                <div className="sub">Blood, heart and body in one visit</div>
              </div>
              <LivIcon name="chev" size={16} />
            </button>

            {/* What Your Report Gives You */}
            <div className="card" style={{ marginTop: "4px" }}>
              <span className="k">What your report gives you</span>
              {[
                ["AIWS score", "One number out of 100 for your whole body"],
                ["Biological age", "How old your body is, and what is adding years"],
                ["A 90-day plan", "Three priorities, daily steps and your care team"],
              ].map(([title, desc]) => (
                <div key={title} className="hd" style={{ justifyContent: "flex-start", gap: "12px", marginTop: "10px" }}>
                  <span className="box on" style={{ borderRadius: "11px" }}>
                    <LivIcon name="check" size={14} strokeWidth={2.4} />
                  </span>
                  <div>
                    <div className="h3">{title}</div>
                    <div className="sub">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Spacing for bottom navigation */}
        <div style={{ height: "64px", flexShrink: 0 }} />
      </main>

      {/* Floating Action Button: Ask Liv */}
      <button
        type="button"
        className="fab"
        onClick={() => void navigate({ to: "/aaha", search: { report: undefined } })}
        aria-label="Ask Liv"
      >
        <LivIcon name="spark" size={20} />
        <span>Ask Liv</span>
      </button>

      {/* Bottom Navigation */}
      <LivBottomNav activeTab="home" onTabChange={handleTabChange} />
    </LivPhone>
  );
}
