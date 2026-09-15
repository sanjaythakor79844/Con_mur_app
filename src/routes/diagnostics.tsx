import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Partner diagnostics | Aaha Companion" },
      {
        name: "description",
        content: "Find nearby partner labs, compare distance and ratings, or book a home sample collection.",
      },
      { property: "og:title", content: "Partner diagnostics | Aaha Companion" },
      { property: "og:description", content: "Nearby labs and home collection booking." },
    ],
  }),
  component: Diagnostics,
});

const LABS = [
  { n: "Aaha Partner Lab — Satellite", d: "1.2 km", r: "4.8", h: "Open until 8 PM" },
  { n: "Shree Diagnostics", d: "2.6 km", r: "4.5", h: "Open until 9 PM" },
  { n: "CityCare Pathology", d: "3.9 km", r: "4.3", h: "Opens 7 AM" },
];

function Diagnostics() {
  return (
    <Screen>
      <TopBar title="Partner Diagnostics" subtitle="Sample collection near you" />
      <Section>
        <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-4">
          <Icon name="search" className="text-muted-foreground" />
          <input
            aria-label="Search diagnostics centres"
            placeholder="Search test or centre"
            className="min-h-13 w-full bg-transparent py-3 text-sm font-medium outline-none"
          />
        </div>
        <div className="mt-3 grid h-40 place-items-center rounded-3xl bg-accent/60 text-center">
          <div>
            <Icon name="map" className="text-[32px] text-primary" />
            <p className="mt-1 text-xs font-semibold text-accent-foreground">Map view · 6 centres nearby</p>
          </div>
        </div>
      </Section>

      <Section title="Nearby centres">
        <ul className="space-y-3">
          {LABS.map((l) => (
            <Card as="li" key={l.n}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{l.n}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.d} away · {l.h}
                  </p>
                </div>
                <Pill tone="green" icon="star">
                  {l.r}
                </Pill>
              </div>
              <div className="mt-3 flex gap-2">
                <Btn to="/recommended-tests" size="md" variant="outline" icon="home_health">
                  Book tests
                </Btn>
                <Btn
                  size="md"
                  variant="soft"
                  icon="directions"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.n)}`}
                >
                  Directions
                </Btn>
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      <Section title="Referral code">
        <Card className="bg-soft">
          <p className="text-xs text-muted-foreground">Show this code at the counter</p>
          <p className="mt-1 text-2xl font-bold tracking-[0.2em] text-primary">AAHA-7391</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Your results come back to Aaha automatically, so nothing needs re-uploading.
          </p>
        </Card>
      </Section>

      <Section>
        <Btn to="/upload" icon="upload_file">
          Already have a report? Upload it
        </Btn>
      </Section>
    </Screen>
  );
}
