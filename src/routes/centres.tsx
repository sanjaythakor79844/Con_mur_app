import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, Icon, Pill, Screen, Section } from "@/components/aaha";
import centre from "@/assets/centre.jpg";

export const Route = createFileRoute("/centres")({
  head: () => ({
    meta: [
      { title: "Aaha Health Centres near you | Aaha Companion" },
      {
        name: "description",
        content:
          "Find your nearest Aaha Health Centre for preventive care, women's wellness, consultations, therapies and follow-up.",
      },
      { property: "og:title", content: "Aaha Health Centres near you" },
      {
        property: "og:description",
        content: "Preventive healthcare, wellness, consultations and therapies close to home.",
      },
    ],
  }),
  component: Centres,
});

const CENTRES = [
  { n: "Aaha Health Centre — Satellite", d: "1.4 km", h: "Open · 8 AM – 8 PM", r: "4.9" },
  { n: "Aaha Health Centre — Maninagar", d: "5.2 km", h: "Open · 9 AM – 7 PM", r: "4.7" },
  { n: "Aaha Health Centre — Gandhinagar", d: "12 km", h: "Opens 8 AM", r: "4.8" },
];

function Centres() {
  return (
    <Screen>
      <div className="relative">
        <img
          src={centre}
          alt="Reception area of an Aaha Health Centre"
          width={1280}
          height={324}
          className="h-52 w-full object-cover"
        />
        <div className="absolute inset-0 bg-hero opacity-80" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 text-primary-foreground">
          <h1 className="text-2xl font-bold leading-tight">Find Your Nearest Aaha Health Centre</h1>
          <p className="mt-2 text-sm text-primary-foreground/85">
            Preventive healthcare, women's wellness, consultations, therapies, nutrition guidance,
            diagnostics support, follow-up care and long-term health management.
          </p>
        </div>
      </div>

      <Section>
        <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-4">
          <Icon name="search" className="text-muted-foreground" />
          <input
            aria-label="Search Aaha Health Centres"
            placeholder="Search centre or area"
            className="min-h-13 w-full bg-transparent py-3 text-sm font-medium outline-none"
          />
        </div>
        <div className="mt-3 grid h-40 place-items-center rounded-3xl bg-accent/60 text-center">
          <div>
            <Icon name="map" className="text-[32px] text-primary" />
            <p className="mt-1 text-xs font-semibold text-accent-foreground">Map view · 3 centres nearby</p>
          </div>
        </div>
      </Section>

      <Section title="Nearest centres">
        <ul className="space-y-3">
          {CENTRES.map((c, i) => (
            <Card as="li" key={c.n}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{c.n}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.d} away · {c.h}
                  </p>
                </div>
                <Pill tone={i === 0 ? "green" : "neutral"} icon="star">
                  {c.r}
                </Pill>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Btn to="/centre-details" size="md" variant="outline" icon="info">
                  Details
                </Btn>
                <Btn
                  size="md"
                  variant="soft"
                  icon="directions"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.n)}`}
                >
                  Directions
                </Btn>
                <Btn to="/doctors" size="md" icon="event">
                  Book
                </Btn>
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      <Section title="What happens at a centre">
        <ul className="grid grid-cols-2 gap-3">
          {[
            { i: "female", t: "Women's wellness" },
            { i: "nutrition", t: "Nutrition counselling" },
            { i: "self_improvement", t: "Therapies" },
            { i: "event_repeat", t: "Follow-up care" },
          ].map((s) => (
            <Card as="li" key={s.t} className="p-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-accent text-primary">
                <Icon name={s.i} />
              </span>
              <p className="mt-2 text-sm font-semibold">{s.t}</p>
            </Card>
          ))}
        </ul>
        <Btn to="/services" variant="outline" className="mt-3" icon="grid_view">
          See all services
        </Btn>
      </Section>
    </Screen>
  );
}
