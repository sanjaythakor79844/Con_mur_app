import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Btn, Card, Icon } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "Privacy & consent | Aaha Companion" },
      {
        name: "description",
        content:
          "Review and accept health data, facial capture and report upload consents before using Aaha Companion.",
      },
      { property: "og:title", content: "Privacy & consent | Aaha Companion" },
      { property: "og:description", content: "You stay in control of your health data." },
    ],
  }),
  component: ConsentScreen,
});

const ITEMS = [
  {
    id: "health",
    icon: "health_and_safety",
    title: "Health Data Consent",
    text: "Allow Aaha to securely store your screening and lab values so your results can be explained to you.",
    required: true,
  },
  {
    id: "report",
    icon: "upload_file",
    title: "Report Upload Consent",
    text: "Allow lab reports you upload to be read, extracted, and summarized in simple everyday language.",
    required: true,
  },
  {
    id: "face",
    icon: "face",
    title: "Facial Screening Consent",
    text: "Allow the kiosk camera reading used during your screening to be linked to your health profile.",
    required: false,
  },
];

function ConsentScreen() {
  const [checked, setChecked] = useState<string[]>(["health", "report"]);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { lang, setLang, t } = useI18n();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(window.localStorage.getItem("aaha.consent") || "[]");
        if (Array.isArray(saved) && saved.length > 0) {
          setChecked(saved);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const allRequiredChecked = ITEMS.filter((i) => i.required).every((i) => checked.includes(i.id));
  const allChecked = ITEMS.every((i) => checked.includes(i.id));

  const toggle = (id: string) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const handleContinue = () => {
    if (!allRequiredChecked) {
      toast.error(t("Please accept the required consents to continue."));
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aaha.consent", JSON.stringify(checked));
      window.localStorage.setItem("aaha.onboarded", "true");
    }
    toast.success(t("Privacy preferences saved"));
    if (session) {
      void navigate({ to: "/profile" });
    } else {
      void navigate({ to: "/login" });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background sm:border-x sm:border-border/60">
      {/* Header with back button */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            if (session) {
              void navigate({ to: "/profile" });
            } else {
              void navigate({ to: "/welcome" });
            }
          }}
          className="flex size-9 items-center justify-center rounded-xl text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Back"
        >
          <Icon name="arrow_back" className="text-[20px]" />
        </button>

        <h1 className="text-base font-bold text-foreground">{t("Privacy & Consent")}</h1>

        {/* Quick Language Toggle */}
        <div className="flex items-center rounded-full border border-border/80 bg-muted/60 p-0.5">
          {[
            { code: "en", label: "EN" },
            { code: "hi", label: "हिं" },
            { code: "mr", label: "मरा" },
          ].map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setLang(item.code as Lang)}
              className={cn(
                "h-6 px-2 rounded-full text-[11px] font-semibold transition-all",
                lang === item.code
                  ? "bg-card text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 space-y-4 px-5 pt-5 pb-8 sm:px-6">
        {/* Privacy Banner Card */}
        <div className="rounded-2xl border border-primary/20 bg-accent/40 p-4">
          <div className="flex items-center gap-2 text-primary">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10">
              <Icon name="lock" className="text-[18px]" />
            </span>
            <h2 className="text-sm font-bold text-foreground">
              {t("Your data stays 100% private")}
            </h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t(
              "Your information is used only to guide your personal care and explain your health results. It is never sold, and you can withdraw or update your consent anytime in your Profile.",
            )}
          </p>
        </div>

        {/* Consent Items */}
        <div className="space-y-3">
          {ITEMS.map((i) => {
            const isChecked = checked.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => toggle(i.id)}
                className="block w-full text-left transition-all active:scale-[0.99]"
              >
                <Card
                  className={cn(
                    "p-4 transition-all border",
                    isChecked
                      ? "border-primary/40 bg-accent/20 ring-1 ring-primary/20"
                      : "border-border/80 hover:border-border",
                  )}
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
                        isChecked
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon name={i.icon} className="text-[20px]" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{t(i.title)}</span>
                        {i.required ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {t("Required")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {t("Optional")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t(i.text)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-md border transition-colors mt-0.5",
                        isChecked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-card text-transparent",
                      )}
                    >
                      <Icon name="check" className="text-[14px]" />
                    </span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div
        className="sticky bottom-0 z-20 space-y-2 border-t border-border/80 bg-card/95 px-5 py-3.5 backdrop-blur shadow-[0_-4px_16px_rgba(11,79,80,0.04)] sm:px-6"
        style={{
          paddingBottom: "max(0.875rem, calc(0.875rem + env(safe-area-inset-bottom, 0px)))",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (allChecked) {
              setChecked(ITEMS.filter((i) => i.required).map((i) => i.id));
            } else {
              setChecked(ITEMS.map((i) => i.id));
            }
          }}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card text-xs font-bold text-foreground hover:bg-muted/60 transition-colors"
        >
          <Icon
            name={allChecked ? "remove_done" : "done_all"}
            className="text-[16px] text-primary"
          />
          <span>{allChecked ? t("Accept required only") : t("Accept all")}</span>
        </button>

        <Btn
          onClick={handleContinue}
          icon="arrow_forward"
          size="lg"
          disabled={!allRequiredChecked}
          className={cn(!allRequiredChecked && "opacity-50 cursor-not-allowed")}
        >
          {t("Save & Continue")}
        </Btn>
      </div>
    </main>
  );
}
