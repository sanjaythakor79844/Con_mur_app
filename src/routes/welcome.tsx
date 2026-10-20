import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useDisplayName } from "@/hooks/use-overview";
import { useI18n } from "@/lib/i18n";
import { Screen, Card, Btn, Icon, Pill } from "@/components/aaha";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Aaha | Aaha Companion" },
      {
        name: "description",
        content: "Your personal health dashboard, kiosk screenings, and medical reports are ready.",
      },
      { property: "og:title", content: "Welcome to Aaha | Aaha Companion" },
      {
        property: "og:description",
        content: "Active Integrated Wellness Score and clinical health reports.",
      },
    ],
  }),
  component: WelcomeScreen,
});

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { patient, session } = useAuth();
  const { firstName, fullName } = useDisplayName();
  const { t } = useI18n();

  const rawName = patient?.full_name || fullName || firstName || "Member";
  const first = rawName.trim().split(/\s+/)[0];

  return (
    <Screen>
      <div className="min-h-[85vh] flex flex-col justify-between px-4 sm:px-6 py-8 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center text-center mt-4 space-y-4">
          {/* Animated / Styled Success Icon */}
          <div className="size-20 rounded-full bg-primary/10 text-primary grid place-items-center shadow-soft">
            <Icon name="check_circle" className="text-[44px]" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              {t("Account Active")}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {session ? `${t("Welcome to Aaha")}, ${first}!` : t("Welcome to Aaha!")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {t("Your personal health companion for clinical kiosk check-ups, diagnostic reports, and care tracking.")}
            </p>
          </div>

          {/* Setup / Connected Services Summary */}
          <Card className="w-full text-left p-4 shadow-soft space-y-3 mt-4 border border-border/60">
            <div className="flex items-start gap-3">
              <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <span className="text-xs font-bold text-foreground block">{t("Mobile Connected")}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("Your phone is securely linked to your health records.")}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-border/40 pt-2.5">
              <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <span className="text-xs font-bold text-foreground block">{t("Kiosk & Lab Reports")}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("Clinical kiosk evaluations and uploaded reports sync automatically.")}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-border/40 pt-2.5">
              <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <span className="text-xs font-bold text-foreground block">{t("AWIS Score & Care")}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("View your whole-body wellness score, doctor consultations, and lifestyle plan.")}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Action CTAs */}
        <div className="w-full pt-8 space-y-2.5">
          <Btn
            className="w-full"
            onClick={() => void navigate({ to: "/home" })}
            icon="arrow_forward"
          >
            {t("Go to Health Dashboard")}
          </Btn>

          <Btn
            variant="ghost"
            className="w-full"
            onClick={() => void navigate({ to: "/reports" })}
            icon="folder_open"
          >
            {t("View Health Reports")}
          </Btn>
        </div>
      </div>
    </Screen>
  );
}
