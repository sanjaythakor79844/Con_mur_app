import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Icon } from "@/components/aaha";
import { useDisplayName } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, type Lang } from "@/lib/i18n";
import hero from "@/assets/aaha-hero.png";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Aaha | Aaha Companion" },
      {
        name: "description",
        content: "Continue your health journey with Aaha after your kiosk health screening.",
      },
      { property: "og:title", content: "Welcome to Aaha" },
      { property: "og:description", content: "Continue your health journey with Aaha." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { lang, setLang, t } = useI18n();
  const { session, patient } = useAuth();
  const { firstName, fullName } = useDisplayName();

  const displayName = patient?.full_name || fullName || firstName;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-6 sm:px-6">
      {/* Top Header with Brand and Language Switcher */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Icon name="favorite" className="text-[20px]" />
          </span>
          <span className="text-xl font-bold tracking-tight text-foreground">Aaha</span>
        </div>

        {/* Quick Language Selector */}
        <div className="flex items-center rounded-full border border-border/80 bg-card p-1 shadow-2xs">
          {[
            { code: "en", label: "EN" },
            { code: "hi", label: "हिं" },
            { code: "mr", label: "मरा" },
          ].map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code as Lang)}
              className={`h-7 px-2.5 rounded-full text-xs font-semibold transition-all ${
                lang === item.code
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liv Living Lab Experience Switcher */}
      <Link
        to="/liv"
        search={{ view: "splash" }}
        className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[#0b0b0c] text-white p-3.5 shadow-md border border-neutral-800 hover:border-neutral-700 transition-all group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="size-8 rounded-xl bg-white/10 flex items-center justify-center font-mono text-[10px] font-bold tracking-widest text-white shrink-0">
            LIV
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white leading-tight">
              {t("Liv Living Lab Experience")}
            </p>
            <p className="text-[11px] text-neutral-400 truncate">
              {t("Monochrome longevity onboarding & 4-part story")}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-neutral-400 group-hover:text-white transition-colors shrink-0">
          {t("Open")} →
        </span>
      </Link>

      {/* Hero Illustration Card */}
      <div className="rounded-[28px] border border-border/80 bg-accent/40 p-5 text-center shadow-soft">
        <img
          src={hero}
          alt="Friendly illustration welcoming you to Aaha"
          width={1024}
          height={1024}
          loading="lazy"
          className="mx-auto w-full max-w-[210px] object-contain drop-shadow-sm"
        />
      </div>

      {/* Main Content Area */}
      {session ? (
        // Authenticated Returning User View
        <>
          <div className="mt-6">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
              {displayName ? `${t("Namaste")}, ${displayName}` : t("Welcome back")}
              <span className="mt-1 block text-lg font-semibold text-primary">
                {t("Ready to continue your health journey?")}
              </span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("Your screening records, reports, and doctor consultations are synced and ready.")}
            </p>
          </div>

          {patient && (
            <Card className="mt-4 border-primary/20 bg-accent/30 p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="verified_user" className="text-[20px]" />
                </span>
                <div className="min-w-0 text-xs">
                  <p className="font-bold text-foreground">
                    {t("Connected to your health records")}
                  </p>
                  <p className="text-muted-foreground">
                    {t("Patient ID")}: {patient.patient_id} • {t("Age")}: {patient.age}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="mt-5 space-y-2.5">
            {[
              {
                i: "monitor_heart",
                t: t("See your screening results in simple words"),
                d: t("AWIS score, vitals, and signed kiosk reports"),
              },
              {
                i: "upload_file",
                t: t("Upload lab reports and get them explained"),
                d: t("AI highlights abnormal values with reference ranges"),
              },
              {
                i: "event_available",
                t: t("Book doctor consultations and clinic visits"),
                d: t("Women's health specialists at an Aaha Centre"),
              },
            ].map((r) => (
              <div
                key={r.i}
                className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3 shadow-2xs"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <Icon name={r.i} className="text-[20px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{r.t}</p>
                  <p className="text-xs text-muted-foreground">{r.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-3 pt-6">
            <Btn to="/home" icon="rocket_launch" size="lg">
              {t("Continue to Health Dashboard")}
            </Btn>
            <Btn to="/upload" icon="upload_file" variant="outline" size="lg">
              {t("Upload Lab Report")}
            </Btn>
          </div>
        </>
      ) : (
        // Unauthenticated First-time Visitor View
        <>
          <div className="mt-6">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
              {t("Your Trusted Health Companion")}
              <span className="mt-1 block text-lg font-semibold text-primary">
                {t("Preventive care, simplified.")}
              </span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(
                "Access your kiosk screening results, understand lab reports in plain words, and connect with doctor care.",
              )}
            </p>
          </div>

          {/* Value Proposition Cards */}
          <div className="mt-5 space-y-2.5">
            {[
              {
                i: "monitor_heart",
                t: t("Kiosk Screening Results"),
                d: t("Sync your AWIS score, vitals, and signed PDFs with your mobile number."),
              },
              {
                i: "description",
                t: t("Lab Reports Explained"),
                d: t("AI reads your test results and highlights markers in simple words."),
              },
              {
                i: "event_available",
                t: t("Doctor Care & Follow-ups"),
                d: t("Consult with specialists and follow doctor-guided health plans."),
              },
            ].map((r) => (
              <div
                key={r.i}
                className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3 shadow-2xs"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <Icon name={r.i} className="text-[20px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{r.t}</p>
                  <p className="text-xs text-muted-foreground">{r.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action CTAs: Get Started and Log In */}
          <div className="mt-auto space-y-3 pt-6">
            <Btn to="/login" search={{ mode: "signup" }} icon="arrow_forward" size="lg">
              {t("Get Started")}
            </Btn>
            <Btn to="/login" search={{ mode: "signin" }} variant="outline" icon="login" size="lg">
              {t("Log In with Mobile")}
            </Btn>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-muted-foreground">
              <Icon name="lock" className="text-[16px] text-primary" />
              <span>{t("Your health records stay 100% private and encrypted.")}</span>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
