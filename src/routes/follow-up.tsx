import { createFileRoute } from "@tanstack/react-router";
import { AahaSays, Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";

export const Route = createFileRoute("/follow-up")({
  head: () => ({
    meta: [
      { title: "A few follow-up questions | Aaha Companion" },
      {
        name: "description",
        content: "Answer a few short questions so Aaha can read your report in the right context.",
      },
      { property: "og:title", content: "Follow-up questions | Aaha Companion" },
      { property: "og:description", content: "Cycle day, fasting, medication and symptoms." },
    ],
  }),
  component: FollowUp,
});

function FollowUp() {
  return (
    <Screen>
      <TopBar title="Follow-up Questions" subtitle="Step 2 of 3" />
      <Section>
        <AahaSays>
          These few answers help me read your report correctly. You can tap the microphone instead of
          typing.
        </AahaSays>
      </Section>

      <Section title="Cycle day">
        <div className="flex flex-wrap gap-2">
          {["Day 1–5", "Day 6–14", "Day 15–28", "Not sure"].map((d) => (
            <button key={d} type="button">
              <Pill tone="brand">{d}</Pill>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Fasting status">
        <div className="flex gap-2">
          {["Fasting", "Not fasting"].map((d) => (
            <button key={d} type="button" className="flex-1">
              <Card className="p-3 text-center text-sm font-semibold">{d}</Card>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Collection date">
        <Card>
          <div className="flex items-center gap-3">
            <Icon name="calendar_month" className="text-primary" />
            <input
              aria-label="Collection date"
              defaultValue="12 Jul 2026"
              className="min-h-11 w-full bg-transparent text-sm font-semibold outline-none"
            />
          </div>
        </Card>
      </Section>

      <Section title="Current medication">
        <Card>
          <textarea
            aria-label="Current medication"
            rows={3}
            placeholder="e.g. Thyronorm 25 mcg, iron tablets"
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-primary"
          >
            <Icon name="mic" className="text-[18px]" /> Speak instead
          </button>
        </Card>
      </Section>

      <Section title="Additional symptoms">
        <div className="flex flex-wrap gap-2">
          {["Tiredness", "Hair fall", "Weight gain", "Low mood", "Heavy periods", "None"].map((s) => (
            <button key={s} type="button">
              <Pill tone="neutral">{s}</Pill>
            </button>
          ))}
        </div>
      </Section>

      <Section>
        <Btn to="/assessment" icon="arrow_forward">
          Continue
        </Btn>
      </Section>
    </Screen>
  );
}
