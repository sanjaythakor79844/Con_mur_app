import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LivMark, LivPhone } from "@/components/liv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liv — Longevity, measured." },
      {
        name: "description",
        content: "Longevity, measured. Your verified health status, AWIS score, and 90-day plan.",
      },
      { property: "og:title", content: "Liv — Longevity, measured." },
      {
        property: "og:description",
        content: "Longevity, measured. Active Integrated Wellness Score and Living Lab reports.",
      },
    ],
  }),
  component: LivSplashScreen,
});

/**
 * Liv Splash Screen
 * Exact reproduction of reference HTML vSplash:
 * - Liv animated mark (spinning dots, drawing arc, breathing core)
 * - Wordmark "Liv" with letter-spacing animation
 * - Cormorant Garamond italic tagline "Longevity, measured."
 * - Tap to skip / auto-timer transition
 */
function LivSplashScreen() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [isFadingOut, setIsFadingOut] = useState(false);

  const proceed = (toPath = "/welcome") => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (session) {
        void navigate({ to: "/home", replace: true });
      } else {
        void navigate({ to: toPath as any, replace: true });
      }
    }, 380);
  };

  const handleQuickDemo = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    }
    proceed("/home");
  };

  useEffect(() => {
    if (loading) return;
    if (session) {
      void navigate({ to: "/home", replace: true });
      return;
    }
    const timer = setTimeout(() => {
      proceed("/welcome");
    }, 2800);
    return () => clearTimeout(timer);
  }, [loading, session]);

  return (
    <LivPhone theme="dark">
      <div
        onClick={() => proceed("/welcome")}
        className={`splash ${isFadingOut ? "out" : ""}`}
        style={{ width: "100%", height: "100%", cursor: "pointer", position: "relative" }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") proceed("/welcome");
        }}
        aria-label="Liv. Tap to continue to companion app"
      >
        <LivMark size={128} className="text-[var(--liv-text)]" />
        <span className="wm text-[var(--liv-text)]">Liv</span>
        <span className="tag">Longevity, measured.</span>

        <div className="mt-8 flex flex-col items-center gap-2.5 z-10">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--liv-faint)]">
            Tap anywhere to explore
          </span>
          <button
            type="button"
            onClick={handleQuickDemo}
            className="px-3.5 py-1.5 rounded-full border border-[var(--liv-line2)] bg-[var(--liv-surf2)] text-[12px] font-mono text-[var(--liv-text)] hover:opacity-80 transition-opacity"
          >
            ⚡ 1-Click Demo (Kaveri Bhosle)
          </button>
        </div>
      </div>
    </LivPhone>
  );
}

