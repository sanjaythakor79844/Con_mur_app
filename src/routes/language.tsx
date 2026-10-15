import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Btn, Card, Icon } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/language")({
  head: () => ({
    meta: [
      { title: "Choose your language | Aaha Companion" },
      {
        name: "description",
        content:
          "Use Aaha Companion in English, Hindi or Marathi — screens, Aaha's replies and reports.",
      },
      { property: "og:title", content: "Choose your language | Aaha Companion" },
      {
        property: "og:description",
        content: "English, Hindi and Marathi supported across the app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LanguageScreen,
});

function LanguageScreen() {
  const { lang, setLang, t } = useI18n();
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (session) {
        void navigate({ to: "/home", replace: true });
      } else if (
        typeof window !== "undefined" &&
        window.localStorage.getItem("aaha.onboarded") === "true"
      ) {
        void navigate({ to: "/login", replace: true });
      }
    }
  }, [loading, session, navigate]);

  const choose = (code: Lang) => {
    setLang(code);
    toast.success(t("Language updated"));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background sm:border-x sm:border-border/60">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur">
        <button
          type="button"
          onClick={() => void navigate({ to: "/welcome" })}
          className="flex size-9 items-center justify-center rounded-xl text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Back"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>

        <h1 className="text-base font-bold text-foreground">{t("lang.title")}</h1>

        <div className="w-9" />
      </header>

      {/* Main Options */}
      <div className="flex-1 px-5 pt-5 pb-8 sm:px-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("lang.subtitle")}
          </p>
        </div>

        <ul className="space-y-3">
          {LANGUAGES.map((l) => {
            const isSelected = lang === l.code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => choose(l.code)}
                  aria-pressed={isSelected}
                  className="w-full text-left transition-all active:scale-[0.99]"
                >
                  <Card
                    className={cn(
                      "p-4 transition-all border",
                      isSelected
                        ? "border-primary/50 bg-accent/30 ring-1 ring-primary/25 shadow-xs"
                        : "border-border/80 hover:border-border",
                    )}
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5">
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-2xl text-base font-bold transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {l.native.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-base font-bold text-foreground">
                          {l.native}
                        </span>
                        <span className="block text-xs text-muted-foreground">{l.name}</span>
                      </div>
                      <Icon
                        name={isSelected ? "check_circle" : "radio_button_unchecked"}
                        className={cn(
                          "text-[22px]",
                          isSelected ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    </div>
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sticky Bottom Continue */}
      <div
        className="sticky bottom-0 z-20 border-t border-border/80 bg-card/95 px-5 py-3.5 backdrop-blur shadow-[0_-4px_16px_rgba(11,79,80,0.04)] sm:px-6"
        style={{
          paddingBottom: "max(0.875rem, calc(0.875rem + env(safe-area-inset-bottom, 0px)))",
        }}
      >
        <Btn onClick={() => void navigate({ to: "/welcome" })} icon="arrow_forward" size="lg">
          {t("common.continue")}
        </Btn>
      </div>
    </main>
  );
}
