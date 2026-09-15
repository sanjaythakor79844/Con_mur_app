import type { ReactNode } from "react";
import { Btn, Card, Icon, Section } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";

/** Renders children only for signed-in users, with a warm sign-in prompt otherwise. */
export function RequireAuth({ children, message }: { children: ReactNode; message?: string }) {
  const { userId, loading } = useAuth();

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
        <Card className="bg-soft">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="lock" />
            <p className="text-sm font-bold">Sign in to continue</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {message ?? "Your health records are private and stored securely in your account."}
          </p>
          <Btn to="/login" size="md" className="mt-3" icon="login">
            Sign in
          </Btn>
        </Card>
      </Section>
    );

  return <>{children}</>;
}
