import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AahaSays,
  Btn,
  Card,
  Icon,
  NextStepCard,
  Pill,
  Ring,
  Screen,
  Section,
} from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { bandLabel, bandTone, formatDate, useDisplayName, useOverview } from "@/hooks/use-overview";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home | Aaha Companion" },
      {
        name: "description",
        content:
          "Your health status, appointments, reminders and quick actions — all in one warm, simple dashboard.",
      },
      { property: "og:title", content: "Home | Aaha Companion" },
      { property: "og:description", content: "Your health at a glance with Aaha." },
    ],
  }),
  component: HomeScreen,
});

const QUICK = [
  { icon: "clinical_notes", label: "Guided Check-up", to: "/checkup" },
  { icon: "monitor_heart", label: "Kiosk Screenings", to: "/visits" },
  { icon: "upload_file", label: "Upload Lab Report", to: "/upload" },
  { icon: "event", label: "Book Appointment", to: "/appointments" },
  { icon: "spa", label: "Therapy Services", to: "/therapies" },
  { icon: "lab_profile", label: "Health Reports", to: "/reports" },
  { icon: "favorite", label: "Talk to Aaha", to: "/aaha" },
  { icon: "timeline", label: "Health Journey", to: "/journey" },
];

function HomeScreen() {
  return (
    <RequireAuth message="Sign in to see your health dashboard, reports and appointments.">
      <Home />
    </RequireAuth>
  );
}

function Home() {
  const { t } = useI18n();
  const { firstName, fullName } = useDisplayName();
  const { latestAssessment, reports, upcoming, unreadCount, loading } = useOverview();
  const suspected = latestAssessment?.suspected_conditions ?? [];

  // Determine patient phase
  const hasAssessment = !!latestAssessment;
  const hasReport = reports.length > 0;
  const phase = hasAssessment && hasReport ? 2 : hasAssessment ? 1 : 0;

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).toUpperCase();

  // Kiosk visits state
  const [latestVisit, setLatestVisit] = useState<any>(null);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    loadLatestVisit();
  }, []);

  const loadLatestVisit = async () => {
    setLoadingVisits(true);
    try {
      // API not yet implemented in production
      setLatestVisit(null);
    } catch (error) {
      console.error("Failed to load visits:", error);
    } finally {
      setLoadingVisits(false);
    }
  };

  return (
    <Screen>
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <div>
          <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase">{t(todayStr)}</div>
          <h1 className="text-[26px] font-bold leading-tight">{t("Namaste")}, {firstName || t("Welcome")}</h1>
        </div>
        <button className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground" aria-label="Notifications">
          <Icon name="notifications" className="text-[22px]" />
          {unreadCount > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-danger"></span>}
        </button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-3">
        {loading ? (
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            {t("Loading your health summary…")}
          </Card>
        ) : phase === 0 ? (
          <>
            <section className="bg-hero text-white rounded-[28px] p-5 pb-6 flex flex-col items-center gap-2">
              <div className="w-full flex justify-between items-center text-[12px] text-[#E3BFC9]">
                <span className="font-bold tracking-widest uppercase">{t("Aaha score")}</span>
              </div>
              <div className="relative shrink-0 w-[180px] h-[153px] flex flex-col items-center justify-center pt-3">
                 <svg width="180" height="153" viewBox="0 0 200 170" fill="none" aria-hidden="true" className="absolute inset-0">
                   <circle cx="100" cy="100" r="84" stroke="var(--track)" strokeWidth="14" strokeLinecap="round" strokeDasharray="395.8 527.8" transform="rotate(135 100 100)"/>
                 </svg>
                 <div className="text-[20px] font-bold z-10">{t("No score yet")}</div>
                 <div className="text-[13px] text-[#E3BFC9] z-10">{t("out of 100")}</div>
              </div>
              <p className="m-0 text-[15px] font-medium text-center leading-snug">
                {t("One number for your health, built from your check-up, kiosk screening and lab reports.")}
              </p>
              <Btn to="/checkup" className="mt-2 bg-[#FFD3DF] text-[#5C0A24]">
                {t("Start my check-up")}
              </Btn>
            </section>
            
            <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase mt-2">{t("Other ways to begin")}</div>
            <Link to="/upload" className="flex items-center gap-3.5 min-h-[68px] p-2.5 px-4 rounded-[22px] bg-card border border-border w-full text-left">
              <span className="grid size-10 place-items-center rounded-full bg-accent text-primary shrink-0"><Icon name="description" className="text-[20px]"/></span>
              <span className="flex-1 flex flex-col min-w-0">
                <span className="text-[16px] font-semibold">{t("Upload a lab report")}</span>
                <span className="text-[13px] text-muted-foreground">{t("Aaha reads and explains it")}</span>
              </span>
              <Icon name="chevron_right" className="text-muted-foreground shrink-0"/>
            </Link>
            <Link to="/appointments" className="flex items-center gap-3.5 min-h-[68px] p-2.5 px-4 rounded-[22px] bg-card border border-border w-full text-left">
              <span className="grid size-10 place-items-center rounded-full bg-accent text-primary shrink-0"><Icon name="monitor_heart" className="text-[20px]"/></span>
              <span className="flex-1 flex flex-col min-w-0">
                <span className="text-[16px] font-semibold">{t("Book a kiosk screening")}</span>
                <span className="text-[13px] text-muted-foreground">{t("Quick health check at a centre")}</span>
              </span>
              <Icon name="chevron_right" className="text-muted-foreground shrink-0"/>
            </Link>
            <Link to="/doctors" className="flex items-center gap-3.5 min-h-[68px] p-2.5 px-4 rounded-[22px] bg-card border border-border w-full text-left">
              <span className="grid size-10 place-items-center rounded-full bg-accent text-primary shrink-0"><Icon name="calendar_month" className="text-[20px]"/></span>
              <span className="flex-1 flex flex-col min-w-0">
                <span className="text-[16px] font-semibold">{t("Book a doctor")}</span>
                <span className="text-[13px] text-muted-foreground">{t("In person or video")}</span>
              </span>
              <Icon name="chevron_right" className="text-muted-foreground shrink-0"/>
            </Link>
          </>
        ) : (
          <>
            <section className="bg-hero text-white rounded-[28px] p-5 pb-6 flex flex-col items-center gap-2">
              <div className="w-full flex justify-between items-center text-[12px] text-[#E3BFC9]">
                <span className="font-bold tracking-widest text-[#FFD3DF] uppercase">{t("Aaha score")}</span>
                <span>{phase === 1 ? t('From your check-up') : t('Updated today')}</span>
              </div>
              
              <div className="relative shrink-0 w-[220px] h-[187px] flex flex-col items-center justify-center pt-3">
                 <svg width="220" height="187" viewBox="0 0 200 170" fill="none" aria-hidden="true" className="absolute inset-0 transition-all duration-1000">
                   <circle cx="100" cy="100" r="84" stroke="var(--track)" strokeWidth="14" strokeLinecap="round" strokeDasharray="395.8 527.8" transform="rotate(135 100 100)"/>
                   <circle cx="100" cy="100" r="84" stroke="var(--arc)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${395.8 * (Number(latestAssessment!.score || 0) / 100)} 527.8`} transform="rotate(135 100 100)"/>
                 </svg>
                 <div className="text-[76px] leading-none font-bold z-10">{latestAssessment!.score || 0}</div>
                 <div className="text-[13px] text-[#E3BFC9] z-10">{t("out of 100")}</div>
              </div>
              
              {phase === 1 && <span className="text-[12px] font-bold px-2.5 py-1 rounded-xl bg-[#FFD3DF]/20 text-[#FFD3DF] mt-1">{t("Provisional")}</span>}
              <p className="m-0 text-[16px] font-semibold text-center leading-snug mt-1">
                {phase === 1 ? t("Provisional. A lab report will make it exact.") : latestAssessment!.summary || t("Good overall. Two things to follow up.")}
              </p>
            </section>

            {phase >= 2 && latestAssessment?.readings && Object.keys(latestAssessment.readings).length > 0 && (
              <div className="grid grid-cols-3 gap-2.5">
                {Object.entries(latestAssessment.readings).slice(0,3).map(([key, val]: [string, any]) => (
                  <div key={key} className="bg-card border border-border rounded-[20px] p-3 flex flex-col gap-1">
                    <span className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase truncate">{key}</span>
                    <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0 min-w-0">
                      <span className="text-[26px] font-bold leading-none break-words min-w-0">{val.value || val}</span>
                      {val.unit && (
                        <span className="text-[12px] text-muted-foreground break-words min-w-0">{val.unit}</span>
                      )}
                    </div>
                    <span className={`text-[12px] font-semibold ${val.status === 'Low' || val.status === 'High' ? 'text-danger' : 'text-success'}`}>{val.status || "Recorded"}</span>
                  </div>
                ))}
              </div>
            )}

            {phase === 1 ? (
              <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-1.5">
                <div className="text-[12px] font-bold tracking-widest text-accent-foreground uppercase">{t("Next step")}</div>
                <h2 className="text-[18px] font-bold leading-snug">{t("Add your lab report")}</h2>
                <p className="text-[15px] text-muted-foreground m-0">{t("Aaha reads it and updates your score.")}</p>
                <Btn to="/upload" className="mt-2">{t("Upload my lab report")}</Btn>
              </section>
            ) : upcoming ? (
              <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-1.5">
                <div className="text-[12px] font-bold tracking-widest text-accent-foreground uppercase">{t("Upcoming visit")}</div>
                <h2 className="text-[18px] font-bold leading-snug">{formatDate(upcoming.scheduled_for)}, {t(upcoming.slot_label)}</h2>
                <p className="text-[15px] text-muted-foreground m-0">{upcoming.doctor_name || upcoming.speciality}. {upcoming.mode}{upcoming.mode === 'In person' && upcoming.centre ? `, ${upcoming.centre}` : ''}.</p>
                <Btn to="/appointments" variant="ghost" className="mt-2">{t("View visit")}</Btn>
              </section>
            ) : (
              <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-1.5">
                <div className="text-[12px] font-bold tracking-widest text-accent-foreground uppercase">{t("Next step")}</div>
                <h2 className="text-[18px] font-bold leading-snug">{t("Review your results with a doctor")}</h2>
                <p className="text-[15px] text-muted-foreground m-0">{t("Aaha Health Centre. In person or video.")}</p>
                <Btn onClick={() => {}} to="/appointments" className="mt-2">{t("Book a consultation")}</Btn>
              </section>
            )}

            {latestVisit && (
               <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-1.5">
                <div className="text-[12px] font-bold tracking-widest text-accent-foreground uppercase">Kiosk screening booked</div>
                <h2 className="text-[18px] font-bold leading-snug">{formatDate(latestVisit.visit_date)}, {latestVisit.slot || "Morning"}</h2>
                <p className="text-[15px] text-muted-foreground m-0">{latestVisit.centre || "Aaha Health Centre"}</p>
                <Btn to="/visits" variant="ghost" className="mt-2">View booking</Btn>
              </section>
            )}

            {phase >= 2 && (
              <Link to="/upload" className="flex items-center gap-3.5 min-h-[68px] p-2.5 px-4 rounded-[22px] bg-card border border-border w-full text-left mt-2">
                <span className="grid size-10 place-items-center rounded-full bg-accent text-primary shrink-0"><Icon name="description" className="text-[20px]"/></span>
                <span className="flex-1 flex flex-col min-w-0">
                  <span className="text-[16px] font-semibold">{t("Upload a report")}</span>
                  <span className="text-[13px] text-muted-foreground">{t("Aaha reads and explains it")}</span>
                </span>
                <Icon name="chevron_right" className="text-muted-foreground shrink-0"/>
              </Link>
            )}

            <Link to="/aaha" search={{ report: undefined }} className="flex items-center justify-between h-[52px] px-4 pl-5 rounded-[26px] bg-card border border-border text-[15px] text-muted-foreground mt-1 transition-colors hover:border-primary">
              <span>{t("Ask Aaha about your results")}</span>
              <span className="grid size-9 place-items-center rounded-full bg-brand text-brand-foreground shrink-0"><Icon name="mic" className="text-[18px]"/></span>
            </Link>
          </>
        )}

        <section className="mt-4">
          <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase mb-3 px-1">{t("Quick actions")}</div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 bg-card border border-border rounded-[24px] p-4">
            {QUICK.map((q) => (
              <Link key={q.label} to={q.to} className="flex flex-col items-center gap-1.5 text-center group">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon name={q.icon} className="text-[24px]" />
                </span>
                <span className="text-[10px] font-semibold leading-tight text-muted-foreground transition-colors group-hover:text-foreground">
                  {t(q.label)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Screen>
  );
}
