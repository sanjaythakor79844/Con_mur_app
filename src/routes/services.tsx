import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Btn, Card, Icon, NextStepCard, Screen, Section, TopBar } from "@/components/aaha";
import { fetchServices } from "@/lib/services-catalog";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Our services | Aaha Companion" },
      {
        name: "description",
        content:
          "Women's health, consultations, preventive checkups, nutrition, hormonal and metabolic care at Aaha Health Centres.",
      },
      { property: "og:title", content: "Our services | Aaha Companion" },
      { property: "og:description", content: "Everything an Aaha Health Centre offers, in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Services,
});

function Services() {
  const services = useQuery({ queryKey: ["services"], queryFn: fetchServices });

  return (
    <Screen>
      <TopBar title="Our Services" subtitle="At Aaha Health Centres" />
      <Section>
        <Card className="bg-soft">
          <p className="text-sm text-muted-foreground">
            Care that stays with you — from a first preventive check to long-term monitoring, with the
            same team who already know your story.
          </p>
        </Card>
      </Section>

      <Section>
        {services.isLoading ? (
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            Loading services…
          </Card>
        ) : services.isError ? (
          <Card className="text-center">
            <Icon name="error" className="text-[28px] text-danger" />
            <p className="mt-2 text-sm font-semibold">
              We couldn't load our services right now. Please try again.
            </p>
            <Btn className="mt-3" size="md" icon="refresh" onClick={() => void services.refetch()}>
              Try again
            </Btn>
          </Card>
        ) : (services.data ?? []).length === 0 ? (
          <Card className="text-center text-sm text-muted-foreground">
            No services available at the moment.
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(services.data ?? []).map((s) => (
              <Card as="li" key={s.id} className="p-0">
                <Link
                  to={s.to}
                  className="flex h-full flex-col rounded-[inherit] p-3 active:scale-[0.99]"
                  aria-label={`${s.name} — ${s.description}`}
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary">
                    <Icon name={s.icon} />
                  </span>
                  <p className="mt-2 text-sm font-semibold leading-tight">{s.name}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{s.description}</p>
                  <span className="mt-auto pt-2 text-xs font-semibold text-primary">Learn more</span>
                </Link>
              </Card>
            ))}
          </ul>
        )}
      </Section>

      <Section>
        <Btn to="/doctors" icon="event">
          Book an appointment
        </Btn>
      </Section>

      <Section>
        <NextStepCard
          title="Not sure which service fits?"
          text="Aaha can suggest the right service based on your latest assessment."
          to="/aaha"
          cta="Ask Aaha"
        />
      </Section>
    </Screen>
  );
}
