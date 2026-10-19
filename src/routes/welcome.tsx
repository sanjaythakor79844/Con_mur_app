import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useDisplayName } from "@/hooks/use-overview";
import { useI18n } from "@/lib/i18n";
import {
  LivMark,
  LivPhone,
  LivIcon,
  LivCard,
  LivHeading,
  LivLabel,
  LivButton,
} from "@/components/liv";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Aaha Companion & Liv Living Lab" },
      {
        name: "description",
        content:
          "Your trusted health and longevity companion: view screening results, upload lab reports, access doctor consultations and 90-day longevity care.",
      },
      { property: "og:title", content: "Aaha Companion & Liv Living Lab" },
      {
        property: "og:description",
        content: "Longevity, measured. Preventive health companion for your whole family.",
      },
    ],
  }),
  component: WelcomeScreen,
});

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { session, patient } = useAuth();
  const { firstName, fullName } = useDisplayName();
  const { t } = useI18n();

  const handleInstantDemo = () => {
    if (typeof window !== "undefined") {
      const demoSession = {
        uid: "demo_patient_6",
        phoneNumber: "+918077224457",
        fullName: "Kaveri Bhosle",
        email: "demo@aaha.health",
        token: "demo_token",
      };
      localStorage.setItem("aaha_demo_session", JSON.stringify(demoSession));
      localStorage.setItem("aaha.onboarded", "true");
      localStorage.setItem("liv.onboarded", "true");
      toast.success(t("Welcome, Kaveri Bhosle (Demo Account)"), {
        description: t("Loaded complete health profile, screening vitals, and reports."),
      });
    }
    void navigate({ to: "/home" });
  };

  const displayName = patient?.full_name || fullName || firstName;

  return (
    <LivPhone theme="dark">
      <main className="scroll enter">
        {/* Top Header */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <LivMark size={28} />
            <div>
              <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[var(--liv-text)] block">
                Liv · Aaha
              </span>
              <span className="text-[10px] text-[var(--liv-muted)] block">
                Health Companion
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstantDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--liv-line2)] bg-[var(--liv-surf2)] text-[11.5px] font-mono text-[var(--liv-text)] hover:opacity-80 transition-opacity"
          >
            <span>⚡ Demo</span>
          </button>
        </header>

        {/* Hero Title */}
        <div className="space-y-1.5 mt-2">
          <LivLabel>{t("Preventive Care & Longevity")}</LivLabel>
          <LivHeading level={1}>
            {session && displayName ? `Welcome back, ${displayName.split(" ")[0]}.` : "Your health, measured."}
          </LivHeading>
          <p className="sub">
            {t("Sync kiosk screenings, understand lab reports with AI, and access doctor care all in one place.")}
          </p>
        </div>

        {/* 1-Click Demo Highlight Card */}
        <div className="rounded-2xl border border-[var(--liv-line2)] bg-[var(--liv-surf)] p-4 text-left shadow-lg relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="size-10 rounded-xl bg-[var(--liv-surf2)] border border-[var(--liv-line)] flex items-center justify-center shrink-0">
              <LivIcon name="spark" size={20} />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Instant Preview
            </span>
          </div>

          <div className="mt-3">
            <h2 className="text-[15px] font-semibold text-[var(--liv-text)]">
              {t("Explore Complete Consumer App")}
            </h2>
            <p className="text-[12.5px] text-[var(--liv-muted)] mt-1 leading-relaxed">
              {t("Instant 1-click access with sample patient Kaveri Bhosle: explore AIWS score (69/100), 52 biomarkers, doctor appointments and prescriptions.")}
            </p>
          </div>

          <div className="mt-3.5 pt-3 border-t border-[var(--liv-line)]">
            <LivButton variant="primary" onClick={handleInstantDemo} size="sm" className="w-full">
              {t("Enter Health Dashboard (1-Click Demo)")} →
            </LivButton>
          </div>
        </div>

        {/* Liv Living Lab Showcase Card */}
        <Link
          to="/liv"
          search={{ view: "splash" }}
          className="rounded-2xl border border-[var(--liv-line)] bg-gradient-to-br from-[var(--liv-surf)] to-[var(--liv-bg)] p-4 text-left transition-transform active:scale-[0.985] block group"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="size-7 rounded-lg bg-[var(--liv-surf2)] flex items-center justify-center font-mono text-[10px] font-bold tracking-widest text-[var(--liv-text)]">
                LIV
              </span>
              <div>
                <p className="text-[13px] font-semibold text-[var(--liv-text)]">
                  {t("Living Lab Kiosk Experience")}
                </p>
                <p className="text-[11px] text-[var(--liv-muted)]">
                  {t("4-part longevity story & clinical vs optimal ranges")}
                </p>
              </div>
            </div>
            <span className="text-[13px] text-[var(--liv-muted)] group-hover:text-[var(--liv-text)] transition-colors">
              →
            </span>
          </div>
        </Link>

        {/* 4 Feature Columns */}
        <div className="space-y-2 mt-1">
          <span className="k">{t("What's inside")}</span>

          <Link
            to="/reports"
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] text-left hover:border-[var(--liv-line2)] transition-colors"
          >
            <span className="size-9 rounded-lg bg-[var(--liv-surf2)] flex items-center justify-center shrink-0">
              <LivIcon name="drop" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[var(--liv-text)] truncate">
                {t("Screening Reports & 52 Biomarkers")}
              </p>
              <p className="text-[11.5px] text-[var(--liv-muted)] truncate">
                {t("AWIS score, vitals, blood, metabolic and signed PDFs")}
              </p>
            </div>
            <LivIcon name="chev" size={14} />
          </Link>

          <Link
            to="/appointments"
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] text-left hover:border-[var(--liv-line2)] transition-colors"
          >
            <span className="size-9 rounded-lg bg-[var(--liv-surf2)] flex items-center justify-center shrink-0">
              <LivIcon name="cal" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[var(--liv-text)] truncate">
                {t("Doctor Consultations & Care")}
              </p>
              <p className="text-[11.5px] text-[var(--liv-muted)] truncate">
                {t("Book specialist appointments and video visits")}
              </p>
            </div>
            <LivIcon name="chev" size={14} />
          </Link>

          <Link
            to="/journey"
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] text-left hover:border-[var(--liv-line2)] transition-colors"
          >
            <span className="size-9 rounded-lg bg-[var(--liv-surf2)] flex items-center justify-center shrink-0">
              <LivIcon name="plan" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[var(--liv-text)] truncate">
                {t("90-Day Longevity Plan")}
              </p>
              <p className="text-[11.5px] text-[var(--liv-muted)] truncate">
                {t("Daily habits, biomarker targets and progress tracking")}
              </p>
            </div>
            <LivIcon name="chev" size={14} />
          </Link>

          <Link
            to="/upload"
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] text-left hover:border-[var(--liv-line2)] transition-colors"
          >
            <span className="size-9 rounded-lg bg-[var(--liv-surf2)] flex items-center justify-center shrink-0">
              <LivIcon name="up" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[var(--liv-text)] truncate">
                {t("AI Lab Report Explanations")}
              </p>
              <p className="text-[11.5px] text-[var(--liv-muted)] truncate">
                {t("Upload any PDF/photo from any diagnostic lab")}
              </p>
            </div>
            <LivIcon name="chev" size={14} />
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 pb-2 space-y-2 mt-auto">
          {session ? (
            <LivButton variant="primary" onClick={() => void navigate({ to: "/home" })}>
              {t("Continue to Dashboard")} →
            </LivButton>
          ) : (
            <>
              <LivButton
                variant="primary"
                onClick={() => void navigate({ to: "/login", search: { mode: "signin" } })}
              >
                {t("Sign in with Mobile or Google")}
              </LivButton>

              <LivButton
                variant="ghost"
                onClick={() => void navigate({ to: "/login", search: { mode: "signup" } })}
              >
                {t("Create New Account")}
              </LivButton>
            </>
          )}

          <p className="text-[11px] text-center text-[var(--liv-muted)] pt-1">
            🔒 {t("Your health records stay encrypted and private.")}
          </p>
        </div>
      </main>
    </LivPhone>
  );
}
