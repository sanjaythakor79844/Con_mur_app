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
  const { firstName, fullName } = useDisplayName();
  const { latestAssessment, reports, upcoming, unreadCount, loading } = useOverview();
  const suspected = latestAssessment?.suspected_conditions ?? [];
  
  // Kiosk visits state
  const [latestVisit, setLatestVisit] = useState<any>(null);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    loadLatestVisit();
  }, []);

  const loadLatestVisit = async () => {
    setLoadingVisits(true);
    try {
      const token = localStorage.getItem('aaha_demo_session') 
        ? JSON.parse(localStorage.getItem('aaha_demo_session')!).token 
        : '';
      
      const response = await fetch('http://localhost:5001/api/v2/visits/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.visits && data.visits.length > 0) {
          setLatestVisit(data.visits[0]); // Get most recent visit
        }
      }
    } catch (error) {
      console.error('Failed to load visits:', error);
    } finally {
      setLoadingVisits(false);
    }
  };

  return (
    <Screen>
      <header className="rounded-b-[2.5rem] bg-hero px-5 pb-8 pt-10 text-primary-foreground">
        <div className="min-w-0">
            <p className="text-sm text-primary-foreground/80">Namaste,</p>
            <h1 className="truncate text-2xl font-bold">{fullName || "Welcome"}</h1>
          </div>

        <Card className="mt-6 border-0">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Icon name="progress_activity" className="animate-spin text-primary" />
              Loading your health summary…
            </div>
          ) : latestAssessment ? (
            <div className="flex items-center gap-4">
              <Ring value={Number(latestAssessment.score ?? 0)} label="AWIS-C" />
              <div className="min-w-0">
                <Pill tone={bandTone(latestAssessment.band)} icon="shield">
                  {bandLabel(latestAssessment)}
                </Pill>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {latestAssessment.summary ||
                    "Your latest check-up result is saved to your record."}
                </p>
                <Link
                  to="/assessment"
                  className="mt-2 inline-flex text-sm font-semibold text-primary"
                >
                  View my assessment →
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold">No health score yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete a guided check-up and Aaha will calculate your AWIS-C score.
              </p>
              <Btn to="/checkup" size="md" className="mt-3" icon="clinical_notes">
                Start guided check-up
              </Btn>
            </div>
          )}
        </Card>
      </header>

      <Section
        title="Upcoming appointment"
        action={
          <Link to="/journey" className="text-xs font-semibold text-primary">
            History
          </Link>
        }
      >
        <Card>
          {upcoming ? (
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                <Icon name="event" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {upcoming.doctor_name}
                  {upcoming.speciality ? ` · ${upcoming.speciality}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(upcoming.scheduled_for)} · {upcoming.slot_label} · {upcoming.centre}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn to="/teleconsultation" size="md" variant="outline" icon="videocam">
                    Join
                  </Btn>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold">No appointment booked</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Book a doctor consultation whenever you're ready — online or at a centre.
              </p>
              <Btn to="/doctors" size="md" className="mt-3" icon="stethoscope">
                Book consultation
              </Btn>
            </div>
          )}
        </Card>
      </Section>

      <Section
        title="Latest Kiosk Screening"
        action={
          <Link to="/visits" className="text-xs font-semibold text-primary">
            View all
          </Link>
        }
      >
        <Card>
          {loadingVisits ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Icon name="progress_activity" className="animate-spin text-primary" />
              Loading screening history…
            </div>
          ) : latestVisit ? (
            <div className="space-y-3">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <Icon name="monitor_heart" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{latestVisit.visit_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(latestVisit.visit_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              {latestVisit.vitals && (
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-accent/50 p-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">BP</p>
                    <p className="text-xs font-semibold">{latestVisit.vitals.blood_pressure}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">SpO₂</p>
                    <p className="text-xs font-semibold">{latestVisit.vitals.oxygen_saturation}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Pulse</p>
                    <p className="text-xs font-semibold">{latestVisit.vitals.pulse_rate} BPM</p>
                  </div>
                </div>
              )}
              
              {latestVisit.visit_summary && (
                <div className="rounded-xl bg-accent/30 p-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    💬 {latestVisit.visit_summary}
                  </p>
                </div>
              )}
              
              <Btn to="/visits" size="md" variant="outline" icon="visibility" className="w-full">
                View conversation & vitals
              </Btn>
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold">No kiosk screenings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Visit your nearest AAHA kiosk center for a quick health screening with our AI assistant.
              </p>
            </div>
          )}
        </Card>
      </Section>

      <Section title="Quick actions">
        <ul className="grid grid-cols-2 gap-3">
          {QUICK.map((q) => (
            <li key={q.label}>
              <Link to={q.to}>
                <Card className="h-full p-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary">
                    <Icon name={q.icon} />
                  </span>
                  <span className="mt-3 block text-sm font-semibold leading-tight">{q.label}</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Recent reports"
        action={
          <Link to="/reports" className="text-xs font-semibold text-primary">
            See all
          </Link>
        }
      >
        <div className="space-y-3">
          {reports.slice(0, 2).map((r) => (
            <Link key={r.id} to="/report/$id" params={{ id: r.id }}>
              <Card>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.report_date)}</p>
                  </div>
                  {r.status_label ? <Pill tone="info">{r.status_label}</Pill> : null}
                </div>
              </Card>
            </Link>
          ))}
          {!loading && reports.length === 0 ? (
            <Card>
              <p className="text-sm font-bold">No reports yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a lab report and Aaha will read and explain it for you.
              </p>
              <Btn to="/upload" size="md" className="mt-3" icon="upload_file">
                Upload a report
              </Btn>
            </Card>
          ) : null}
        </div>
      </Section>

      <Section title="Health tips for you">
        <AahaSays>
          Small daily habits matter most — balanced meals, a short walk and steady sleep do more for
          your results than any single test.
        </AahaSays>
      </Section>

      {suspected.length > 0 ? (
        <Section
          title="Areas to watch"
          action={
            <Link to="/recommended-tests" className="text-xs font-semibold text-primary">
              See tests
            </Link>
          }
        >
          <div className="flex flex-wrap gap-2">
            {suspected.slice(0, 6).map((t) => (
              <Pill key={t} tone="brand" icon="science">
                {t}
              </Pill>
            ))}
          </div>
        </Section>
      ) : null}


    </Screen>
  );
}
