import type { ReactNode } from "react";
import { Btn, Card, Icon, Section } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";

/** Renders children only for signed-in users, with a warm sign-in prompt and instant demo unlock. */
export function RequireAuth({ children, message }: { children: ReactNode; message?: string }) {
  const { userId, loading } = useAuth();

  const handleDemoAccess = () => {
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
      window.location.reload();
    }
  };

  if (loading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" />
          Loading your details…
        </Card>
      </Section>
    );

  if (!userId)
    return (
      <Section>
        <Card className="bg-soft border border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="lock" />
            <p className="text-sm font-bold">Sign in to continue</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {message ?? "Your health records are private and stored securely in your account."}
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Btn to="/login" search={{ mode: "signin" }} size="md" className="flex-1" icon="login">
              Sign in with Mobile
            </Btn>
            <button
              type="button"
              onClick={handleDemoAccess}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-accent px-4 py-2.5 text-xs font-bold text-primary hover:bg-accent/80 transition-colors shadow-2xs"
            >
              <Icon name="bolt" className="text-[18px]" />
              Explore Demo (1-Click)
            </button>
          </div>

          <div className="mt-3 text-center border-t border-border/60 pt-2.5">
            <Btn to="/login" search={{ mode: "signup" }} variant="ghost" size="sm">
              New here? Create an account
            </Btn>
          </div>
        </Card>
      </Section>
    );

  return <>{children}</>;
}
