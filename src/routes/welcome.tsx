import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDisplayName } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import { LivIcon, LivPhone, LivProgressRing } from "@/components/liv";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Account Created | Liv Living Lab" },
      {
        name: "description",
        content: "Your longevity story starts with one visit. Everything after that lives here.",
      },
      { property: "og:title", content: "Account Created | Liv Living Lab" },
      { property: "og:description", content: "Active Integrated Wellness Score and Living Lab records." },
    ],
  }),
  component: LivWelcomeScreen,
});

/**
 * Exact reproduction of reference HTML vWelcome:
 * - Animated checkmark circle (drawing SVG ring + pop check)
 * - "Account created" label
 * - "You're in, {first}." in Cormorant Garamond
 * - Italic tagline
 * - AIWS explanation card with radial gauge
 * - 3-step vertical onboarding preview
 * - "Continue to sign in" button
 */
function LivWelcomeScreen() {
  const navigate = useNavigate();
  const { patient } = useAuth();
  const { firstName, fullName } = useDisplayName();

  const rawName = patient?.full_name || fullName || firstName || "Member";
  const first = rawName.trim().split(/\s+/)[0];

  return (
    <LivPhone theme="dark">
      <main className="welcome">
        {/* Animated Drawing Ring + Pop Check */}
        <span className="tick">
          <svg className="ring2" width="96" height="96" viewBox="0 0 96 96">
            <circle className="r2" cx="48" cy="48" r="46" />
          </svg>
          <span className="ck text-[var(--liv-text)]">
            <LivIcon name="check" size={34} strokeWidth={1.8} />
          </span>
        </span>

        {/* Title & Tagline */}
        <div>
          <span className="k">Account created</span>
          <h1 className="h1" style={{ marginTop: "10px" }}>
            You're in, {first}.
          </h1>
          <p
            className="sub"
            style={{
              marginTop: "10px",
              font: "italic 400 17px/1.4 var(--font-serif, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Your longevity story starts with one visit. Everything after that lives here.
          </p>
        </div>

        {/* AIWS Explanation Card */}
        <div className="aiws">
          <LivProgressRing size={44} strokeWidth={4} progress={0.69} onBg={true}>
            <span className="unit" style={{ fontSize: "9.5px", color: "var(--liv-text)" }}>
              AIWS
            </span>
          </LivProgressRing>
          <div>
            <span className="k">Active Integrated Wellness Score</span>
            <p>
              One number out of 100 for your whole body. Your well-being benchmark, and the first thing you will see once your report arrives.
            </p>
          </div>
        </div>

        {/* 3-Step Onboarding Preview */}
        <div className="next">
          <div>
            <b>1</b>
            <span>
              Sign in with your number
              <small>A 4-digit code by SMS, or Google.</small>
            </span>
          </div>
          <div>
            <b>2</b>
            <span>
              We find your kiosk screening
              <small>Your longevity report arrives in the app by itself.</small>
            </span>
          </div>
          <div>
            <b>3</b>
            <span>
              Your AIWS score, and your plan
              <small>Three priorities, daily steps, your care team.</small>
            </span>
          </div>
        </div>

        {/* Action */}
        <button
          type="button"
          className="btn"
          onClick={() => navigate({ to: "/login", search: { mode: "signin" } })}
        >
          Continue to sign in
        </button>
      </main>
    </LivPhone>
  );
}
