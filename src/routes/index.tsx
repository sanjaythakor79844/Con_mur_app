import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Icon } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Aaha Companion — Your trusted health companion" },
      {
        name: "description",
        content:
          "Aaha Companion continues your care after a health screening: results, lab reports, simple explanations and care at an Aaha Health Centre.",
      },
      { property: "og:title", content: "Aaha Companion" },
      {
        property: "og:description",
        content: "Your trusted health companion, from screening to long-term care.",
      },
    ],
  }),
  component: RootRedirect,
} as any));

/**
 * Root route: smart redirect gate.
 *
 * - Authenticated session  → /home (Today dashboard)
 * - Not authenticated      → /login (Welcome / Sign Up screen)
 *
 * While Firebase is still resolving the auth state we show a branded
 * loading indicator so the user never sees a flash of unstyled content.
 */
function RootRedirect() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (session) {
        void navigate({ to: "/home", replace: true });
      } else {
        void navigate({ to: "/login", replace: true });
      }
    }
  }, [loading, session, navigate]);

  // Branded loading state while Firebase auth resolves
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-4">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon name="favorite" className="text-[36px]" />
        </span>
        <span className="text-2xl font-bold tracking-tight text-foreground">Aaha</span>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary text-base" />
          <span>Loading your health journey…</span>
        </div>
      </div>
    </main>
  );
}
