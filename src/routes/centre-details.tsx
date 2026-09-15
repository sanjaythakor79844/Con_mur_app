import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import centre from "@/assets/centre.jpg";

export const Route = createFileRoute("/centre-details")({
  head: () => ({
    meta: [
      { title: "Aaha Health Centre, Satellite | Aaha Companion" },
      {
        name: "description",
        content: "Doctors, facilities, therapies and services at the Aaha Health Centre in Satellite.",
      },
      { property: "og:title", content: "Aaha Health Centre, Satellite" },
      { property: "og:description", content: "Doctors, facilities, therapies and opening hours." },
    ],
  }),
  component: CentreDetails,
});

function CentreDetails() {
  return (
    <Screen>
      <img
        src={centre}
        alt="Interior of the Aaha Health Centre in Satellite"
        width={1280}
        height={324}
        className="h-48 w-full object-cover"
      />
      <TopBar title="Aaha Health Centre" subtitle="Satellite, Ahmedabad" />

      <Section>
        <Card>
          <div className="flex flex-wrap gap-2">
            <Pill tone="green" icon="schedule">
              Open · 8 AM – 8 PM
            </Pill>
            <Pill tone="brand" icon="star">
              4.9 · 820 visits
            </Pill>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            A calm, women-friendly centre for preventive checks, hormonal and metabolic care,
            therapies and long-term follow-up — with the same team each visit.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Btn
              size="md"
              variant="outline"
              icon="directions"
              href="https://www.google.com/maps/search/?api=1&query=Aaha+Health+Centre+Satellite+Ahmedabad"
            >
              Directions
            </Btn>
            <Btn size="md" icon="event" to="/doctors">
              Book
            </Btn>
          </div>
        </Card>
      </Section>

      <Section title="Doctors here">
        <ul className="space-y-3">
          {[
            { n: "Dr. Meera Joshi", s: "Women's Health · 12 yrs" },
            { n: "Dr. Anand Rao", s: "Endocrinology · 9 yrs" },
            { n: "Ritika Shah", s: "Clinical Nutrition · 7 yrs" },
          ].map((d) => (
            <Card as="li" key={d.n} className="p-3">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-primary font-bold">
                  {d.n.split(" ").slice(-1)[0][0]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{d.n}</span>
                  <span className="block truncate text-xs text-muted-foreground">{d.s}</span>
                </span>
                <Icon name="chevron_right" className="text-muted-foreground" />
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      <Section title="Facilities">
        <div className="flex flex-wrap gap-2">
          {["Sample collection", "Women-only hours", "Wheelchair access", "Parking", "Pharmacy", "Counselling room"].map(
            (f) => (
              <Pill key={f} tone="neutral">
                {f}
              </Pill>
            ),
          )}
        </div>
      </Section>

      <Section title="Services & therapies">
        <ul className="grid grid-cols-2 gap-3">
          {[
            { i: "female", t: "Women's Health" },
            { i: "nutrition", t: "Nutrition Therapy" },
            { i: "self_improvement", t: "Stress Management" },
            { i: "fitness_center", t: "Lifestyle Coaching" },
          ].map((s) => (
            <Card as="li" key={s.t} className="p-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-accent text-primary">
                <Icon name={s.i} />
              </span>
              <p className="mt-2 text-sm font-semibold">{s.t}</p>
            </Card>
          ))}
        </ul>
        <Btn to="/therapies" variant="outline" className="mt-3" icon="spa">
          View all therapies
        </Btn>
      </Section>
    </Screen>
  );
}
