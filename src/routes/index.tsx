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

  const proceed = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (session) {
        void navigate({ to: "/home", replace: true });
      } else {
        void navigate({ to: "/login", search: { mode: "signup" }, replace: true });
      }
    }, 480);
  };

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      proceed();
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading, session]);

  return (
    <LivPhone theme="dark">
      <button
        type="button"
        onClick={proceed}
        className={`splash ${isFadingOut ? "out" : ""}`}
        style={{ background: "none", border: "none", color: "inherit", width: "100%", height: "100%", cursor: "pointer" }}
        aria-label="Liv. Tap to continue"
      >
        <LivMark size={128} className="text-[var(--liv-text)]" />
        <span className="wm text-[var(--liv-text)]">Liv</span>
        <span className="tag">Longevity, measured.</span>
      </button>
    </LivPhone>
  );
}

