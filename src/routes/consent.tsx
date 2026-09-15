import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Icon, TopBar } from "@/components/aaha";

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
    text: "Allow Aaha to store your screening and lab values so your results can be explained to you.",
  },
  {
    id: "face",
    icon: "face",
    title: "Facial Capture Consent",
    text: "Allow the kiosk camera reading used during your screening to be linked to your profile.",
  },
  {
    id: "report",
    icon: "upload_file",
    title: "Report Upload Consent",
    text: "Allow reports you upload to be read and summarised for you in simple language.",
  },
];

function ConsentScreen() {
  const [checked, setChecked] = useState<string[]>([]);
  const all = checked.length === ITEMS.length;
  const toggle = (id: string) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <TopBar title="Privacy & Consent" subtitle="You can change this anytime in Profile" />
      <div className="flex-1 space-y-3 px-4 py-5">
        <Card className="bg-soft">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="lock" />
            <h2 className="text-sm font-bold">Your data stays private</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Your information is used only to guide your care. It is never sold, and you can withdraw
            consent at any time.
          </p>
        </Card>

        {ITEMS.map((i) => (
          <button key={i.id} type="button" onClick={() => toggle(i.id)} className="block w-full text-left">
            <Card className={checked.includes(i.id) ? "border-primary/50 bg-accent/40" : ""}>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <Icon name={i.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{i.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{i.text}</span>
                </span>
                <Icon
                  name={checked.includes(i.id) ? "check_box" : "check_box_outline_blank"}
                  className={checked.includes(i.id) ? "text-primary" : "text-muted-foreground"}
                />
              </div>
            </Card>
          </button>
        ))}
      </div>
      <div className="sticky bottom-0 space-y-2 border-t border-border/60 bg-card/95 p-4 backdrop-blur">
        <Btn
          onClick={() => setChecked(ITEMS.map((i) => i.id))}
          variant="outline"
          size="md"
          icon="done_all"
        >
          Accept all
        </Btn>
        <Btn to="/login" icon="arrow_forward" className={all ? "" : "opacity-60"}>
          Continue
        </Btn>
      </div>
    </main>
  );
}
