import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, FlowNav, Icon, NextStepCard, Pill, Screen, Section, TopBar } from "@/components/aaha";
import hero from "@/assets/aaha-hero.png";

export const Route = createFileRoute("/therapies")({
  head: () => ({
    meta: [
      { title: "Therapy services | Aaha Companion" },
      {
        name: "description",
        content:
          "Women's wellness, nutrition, lifestyle, stress and hormonal therapies guided by Aaha Health Centre specialists.",
      },
      { property: "og:title", content: "Therapy services | Aaha Companion" },
      { property: "og:description", content: "Guided therapies for women's and family wellness." },
    ],
  }),
  component: Therapies,
});

const THERAPIES = [
  ["female", "Women's Wellness Therapy", "6 sessions · with a specialist"],
  ["nutrition", "Nutrition Therapy", "Personalised food plan"],
  ["directions_run", "Lifestyle Therapy", "Habits, sleep and movement"],
  ["self_improvement", "Stress Management", "Breathing and mind care"],
  ["monitor_weight", "Weight Management", "Gentle, sustainable pace"],
  ["science", "Hormonal Wellness", "Thyroid, PCOS and cycles"],
  ["fitness_center", "Exercise Guidance", "Safe, guided routines"],
  ["accessibility_new", "Pelvic Floor Support", "Strength and comfort"],
  ["child_care", "Post Pregnancy Wellness", "Recovery and energy"],
  ["spa", "Menopause Wellness", "Comfort through change"],
];

function Therapies() {
  return (
    <Screen>
      <TopBar title="Therapy Services" subtitle="Guided, gentle and personal" />
      <Section>
        <Card className="bg-soft">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-primary">Care beyond the report</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Therapies help your body recover — often alongside your doctor's plan.
              </p>
            </div>
            <img src={hero} alt="" width={1024} height={1024} loading="lazy" className="size-20 shrink-0" />
          </div>
        </Card>
      </Section>

      <Section title="Available therapies">
        <ul className="space-y-3">
          {THERAPIES.map(([i, t, d]) => (
            <Card as="li" key={t}>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <Icon name={i} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{t}</p>
                  <p className="truncate text-xs text-muted-foreground">{d}</p>
                </div>
                <Pill tone="brand">Book</Pill>
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      <Section>
        <Btn to="/doctors" icon="spa">
          Book therapy
        </Btn>
      </Section>


    
      <FlowNav steps={[{ to: "/journey", title: "My health journey", subtitle: "Track therapy and follow-up", icon: "timeline" },{ to: "/progress", title: "My progress", subtitle: "See improvements over time", icon: "show_chart" }]} />
</Screen>
  );
}
