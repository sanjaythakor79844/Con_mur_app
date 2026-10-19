import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  LivProgressRing,
} from "@/components/liv";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Account Active | Liv Living Lab" },
      {
        name: "description",
        content:
          "Your longevity story starts with one visit. Everything after that lives here.",
      },
      { property: "og:title", content: "Account Active | Liv Living Lab" },
      {
        property: "og:description",
        content: "Active Integrated Wellness Score and Living Lab records.",
      },
    ],
  }),
  component: LivWelcomeScreen,
});

/**
 * Liv Post-Auth Welcome Screen (Reference vWelcome)
 * - Animated checkmark circle (drawing SVG ring + pop check)
 * - "Account active" label
 * - "You're in, {first}." in Cormorant Garamond
 * - Italic tagline
 * - AIWS explanation card with radial gauge
 * - 3-step vertical onboarding preview
 * - Direct navigation to Health Dashboard
 */
export function LivWelcomeScreen() {
  const navigate = useNavigate();
  const { patient, session } = useAuth();
  const { firstName, fullName } = useDisplayName();
  const { t } = useI18n();

  const rawName = patient?.full_name || fullName || firstName || "Member";
  const first = rawName.trim().split(/\s+/)[0];

  return (
    <LivPhone theme="dark">
      <main className="welcome scroll enter">
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
        <div className="space-y-2">
          <span className="k">{t("Account active")}</span>
          <h1 className="h1" style={{ marginTop: "8px" }}>
            {session ? `You're in, ${first}.` : "You're in."}
          </h1>
          <p
            className="sub"
            style={{
              marginTop: "8px",
              font: "italic 400 17px/1.4 var(--font-serif, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Your longevity story starts with one visit. Everything after that lives here.
          </p>
        </div>

        {/* AIWS Explanation Card */}
        <div className="aiws">
          <LivProgressRing size={48} strokeWidth={4.5} progress={0.69} onBg={true}>
            <span className="unit" style={{ fontSize: "10px", color: "var(--liv-text)", fontWeight: 700 }}>
              AIWS
            </span>
          </LivProgressRing>
          <div className="min-w-0">
            <span className="k">{t("Active Integrated Wellness Score")}</span>
            <p className="text-[12px] text-[var(--liv-muted)] mt-0.5 leading-relaxed">
              One number out of 100 for your whole body. Your benchmark across 8 biological systems.
            </p>
          </div>
        </div>

        {/* 3-Step Onboarding Preview */}
        <div className="next space-y-2.5">
          <div className="flex items-start gap-3">
            <b>1</b>
            <span>
              Mobile verified
              <small>Your phone is securely connected to your health records.</small>
            </span>
          </div>
          <div className="flex items-start gap-3">
            <b>2</b>
            <span>
              We find your kiosk screening
              <small>Your longevity report arrives in the app automatically.</small>
            </span>
          </div>
          <div className="flex items-start gap-3">
            <b>3</b>
            <span>
              Your AIWS score and plan
              <small>Three priorities, daily steps, and care team access.</small>
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="w-full pt-4 space-y-2.5 mt-auto">
          <LivButton
            variant="primary"
            onClick={() => void navigate({ to: "/home" })}
          >
            {t("Continue to Health Dashboard")} →
          </LivButton>

          <LivButton
            variant="ghost"
            onClick={() => void navigate({ to: "/reports", search: { tab: "markers" } })}
          >
            {t("View 52 Longevity Biomarkers")}
          </LivButton>
        </div>
      </main>
    </LivPhone>
  );
}
