import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useDisplayName } from "@/hooks/use-overview";
import { LivMark, LivIcon, LivScope } from "@/components/liv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Choose Your Experience | AAHA Health & Liv" },
      {
        name: "description",
        content:
          "Select between Liv App (Longevity and personalized health companion) and AAHA Consumer App (Personal health dashboard and reports).",
      },
      { property: "og:title", content: "Choose Your Experience | AAHA Health & Liv" },
      {
        property: "og:description",
        content:
          "Select your health experience: Liv Longevity Companion or AAHA Consumer Health Dashboard.",
      },
    ],
  }),
  component: AppSelectorScreen,
});

/**
 * App Selection / Launch Screen
 * Monochrome, premium design system matching Liv.
 * Provides two clear options:
 * 1. Liv App -> /liv
 * 2. AAHA Consumer App -> /home
 */
export function AppSelectorScreen() {
  const navigate = useNavigate();
  const { session, patient } = useAuth();
  const { fullName, firstName } = useDisplayName();

  const handleSelectLiv = () => {
    void navigate({ to: "/liv" });
  };

  const handleSelectConsumer = () => {
    void navigate({ to: "/home" });
  };

  return (
    <LivScope theme="dark" className="min-h-[100dvh] w-full flex flex-col justify-between items-center bg-[#0A0A0B] text-[#F5F5F1] p-4 sm:p-6 md:p-8 select-none">
      {/* Background subtle radial glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 120, 120, 0.15), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Top Header / Branding */}
      <header className="w-full max-w-xl mx-auto pt-4 sm:pt-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <LivMark size={28} className="text-[#F5F5F1]" />
          <span className="font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.22em] text-[#9B9B96] font-medium">
            AAHA LIVING LAB
          </span>
        </div>

        {session && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141415] border border-[#29292C] text-[11px] font-mono text-[#9B9B96]">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Active Session</span>
          </span>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-xl mx-auto flex flex-col flex-1 justify-center my-auto py-8 sm:py-12 z-10">
        {/* Heading Section */}
        <div className="text-left mb-8 sm:mb-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9B9B96] block mb-2">
            WELCOME
          </span>
          <h1 className="font-serif text-[32px] sm:text-[42px] leading-[1.08] tracking-tight text-[#F5F5F1] font-normal mb-3 text-balance">
            Choose Your Experience
          </h1>
          <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#9B9B96] max-w-md">
            Select which application you want to open today. You can switch between them at any time.
          </p>
        </div>

        {/* Two Primary Options */}
        <div className="flex flex-col gap-4 sm:gap-5 w-full">
          {/* Option 1: Liv App */}
          <button
            type="button"
            id="selector-liv-app"
            onClick={handleSelectLiv}
            className="group relative w-full p-6 sm:p-7 rounded-3xl bg-[#141415] border border-[#29292C] hover:border-[#F5F5F1] focus-visible:border-[#F5F5F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F1] transition-all duration-200 text-left active:scale-[0.985] cursor-pointer"
            aria-label="Open Liv App: Your longevity and personalized health companion"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="size-13 sm:size-14 rounded-2xl bg-[#1D1D1F] border border-[#29292C] flex items-center justify-center text-[#F5F5F1] group-hover:bg-[#F5F5F1] group-hover:text-[#0A0A0B] transition-colors duration-200 shadow-sm shrink-0">
                <LivMark size={32} />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-wider px-3 py-1 rounded-full bg-[#1D1D1F] text-[#9B9B96] border border-[#29292C] group-hover:border-[#3D3D41] transition-colors">
                Longevity & AI
              </span>
            </div>

            <div>
              <h2 className="font-serif text-[24px] sm:text-[28px] font-medium text-[#F5F5F1] tracking-tight mb-1 flex items-center gap-2">
                Liv App
              </h2>
              <p className="text-[13px] sm:text-[14px] text-[#9B9B96] leading-relaxed mb-4">
                Your longevity and personalized health companion
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1F] text-[12px] text-[#6A6A66]">
                <span className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-[#9B9B96]" />
                  52 Biomarkers
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-[#9B9B96]" />
                  Biological Age
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-[#9B9B96]" />
                  90-Day Plan
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-[13px] font-medium text-[#F5F5F1]">
              <span className="font-mono text-[12px] uppercase tracking-wider text-[#9B9B96] group-hover:text-[#F5F5F1] transition-colors">
                Launch Liv
              </span>
              <span className="size-8 rounded-full bg-[#1D1D1F] border border-[#29292C] group-hover:bg-[#F5F5F1] group-hover:text-[#0A0A0B] flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5">
                <LivIcon name="chev" size={16} strokeWidth={2} />
              </span>
            </div>
          </button>

          {/* Option 2: AAHA Consumer App */}
          <button
            type="button"
            id="selector-consumer-app"
            onClick={handleSelectConsumer}
            className="group relative w-full p-6 sm:p-7 rounded-3xl bg-[#141415] border border-[#29292C] hover:border-[#F5F5F1] focus-visible:border-[#F5F5F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F1] transition-all duration-200 text-left active:scale-[0.985] cursor-pointer"
            aria-label="Open AAHA Consumer App: Your personal health dashboard and reports"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="size-13 sm:size-14 rounded-2xl bg-[#1D1D1F] border border-[#29292C] flex items-center justify-center text-[#F5F5F1] group-hover:bg-[#F5F5F1] group-hover:text-[#0A0A0B] transition-colors duration-200 shadow-sm shrink-0">
                <LivIcon name="home" size={26} strokeWidth={1.8} />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-wider px-3 py-1 rounded-full bg-[#1D1D1F] text-[#9B9B96] border border-[#29292C] group-hover:border-[#3D3D41] transition-colors">
                Healthcare Portal
              </span>
            </div>

            <div>
              <h2 className="font-serif text-[24px] sm:text-[28px] font-medium text-[#F5F5F1] tracking-tight mb-1 flex items-center gap-2">
                AAHA Consumer App
              </h2>
              <p className="text-[13px] sm:text-[14px] text-[#9B9B96] leading-relaxed mb-4">
                Your personal health dashboard and reports
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1D1D1F] text-[12px] text-[#6A6A66]">
                <span className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-[#9B9B96]" />
                  Kiosk Screenings
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-[#9B9B96]" />
                  Lab Reports & PDFs
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-[#9B9B96]" />
                  Care Visits
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-[13px] font-medium text-[#F5F5F1]">
              <span className="font-mono text-[12px] uppercase tracking-wider text-[#9B9B96] group-hover:text-[#F5F5F1] transition-colors">
                Launch Consumer App
              </span>
              <span className="size-8 rounded-full bg-[#1D1D1F] border border-[#29292C] group-hover:bg-[#F5F5F1] group-hover:text-[#0A0A0B] flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5">
                <LivIcon name="chev" size={16} strokeWidth={2} />
              </span>
            </div>
          </button>
        </div>
      </main>

      {/* Footer / Trust / Auth Status */}
      <footer className="w-full max-w-xl mx-auto pb-4 sm:pb-6 pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left z-10 border-t border-[#1D1D1F]">
        <div className="text-[12px] text-[#6A6A66] flex items-center gap-1.5">
          <LivIcon name="shield" size={14} className="text-[#9B9B96]" />
          <span>Encrypted Health Records · Living Lab Platform</span>
        </div>

        {session ? (
          <div className="text-[12px] text-[#9B9B96] flex items-center gap-2">
            <span>Signed in as <b className="text-[#F5F5F1]">{fullName || firstName || patient?.full_name || "Member"}</b></span>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-[12px] font-mono text-[#9B9B96] hover:text-[#F5F5F1] transition-colors"
          >
            Sign in with Mobile →
          </Link>
        )}
      </footer>
    </LivScope>
  );
}
