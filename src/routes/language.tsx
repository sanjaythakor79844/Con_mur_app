import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Btn, Card, Icon, TopBar } from "@/components/aaha";
import { useAuth } from "@/hooks/use-auth";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";
import { updateProfile } from "@/lib/aaha-api";
import { LANG_NAME } from "@/lib/i18n";

export const Route = createFileRoute("/language")({
  head: () => ({
    meta: [
      { title: "Choose your language | Aaha Companion" },
      {
        name: "description",
        content: "Use Aaha Companion in English, Hindi or Marathi — screens, Aaha's replies and reports.",
      },
      { property: "og:title", content: "Choose your language | Aaha Companion" },
      { property: "og:description", content: "English, Hindi and Marathi supported across the app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LanguageScreen,
});

function LanguageScreen() {
  const { lang, setLang, t } = useI18n();
  const { userId } = useAuth();
  const navigate = useNavigate();

  const choose = (code: Lang) => {
    setLang(code);
    if (userId) void updateProfile(userId, { language: LANG_NAME[code] }).catch(() => {});
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <TopBar title={t("lang.title")} subtitle={t("lang.subtitle")} />
      <div className="flex-1 px-4 py-5">
        <ul className="space-y-3">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => choose(l.code)}
                aria-pressed={lang === l.code}
                className="w-full text-left"
              >
                <Card
                  className={lang === l.code ? "border-primary/60 bg-accent/50 ring-2 ring-primary/25" : ""}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <span className="min-w-0">
                      <span className="block text-lg font-bold">{l.native}</span>
                      <span className="block text-xs text-muted-foreground">{l.name}</span>
                    </span>
                    <Icon
                      name={lang === l.code ? "check_circle" : "radio_button_unchecked"}
                      className={lang === l.code ? "text-primary" : "text-muted-foreground"}
                    />
                  </div>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="sticky bottom-0 border-t border-border/60 bg-card/95 p-4 backdrop-blur">
        <Btn onClick={() => void navigate({ to: "/consent" })} icon="arrow_forward">
          {t("common.continue")}
        </Btn>
      </div>
    </main>
  );
}
