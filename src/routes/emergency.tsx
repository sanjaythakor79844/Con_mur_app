import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, Icon, Row, Screen, Section, TopBar } from "@/components/aaha";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency support | Aaha Companion" },
      {
        name: "description",
        content: "Emergency numbers, the nearest hospital and quick contact with your Aaha Health Centre.",
      },
      { property: "og:title", content: "Emergency support | Aaha Companion" },
      { property: "og:description", content: "Help when you need it quickly." },
    ],
  }),
  component: Emergency,
});

function Emergency() {
  return (
    <Screen>
      <TopBar title="Emergency Support" subtitle="Quick help" />
      <Section>
        <Card className="border-danger/30 bg-danger/5">
          <div className="flex items-center gap-2 text-danger">
            <Icon name="emergency" />
            <p className="text-sm font-bold">In a medical emergency, call 108 immediately</p>
          </div>
          <Btn size="md" className="mt-3" icon="call" href="tel:108">
            Call 108 ambulance
          </Btn>
        </Card>
      </Section>

      <Section title="Emergency contacts">
        <div className="space-y-3">
          <Row icon="call" title="Ambulance" subtitle="108" />
          <Row icon="local_police" title="Police" subtitle="112" />
          <Row icon="woman" title="Women's helpline" subtitle="181" />
          <Row icon="family_restroom" title="Rakesh Sharma" subtitle="Husband · +91 98250 11111" />
        </div>
      </Section>

      <Section title="Nearest hospital">
        <Card>
          <p className="text-sm font-bold">Sanjivani Multispeciality Hospital</p>
          <p className="text-xs text-muted-foreground">2.1 km · 24×7 emergency</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn
              size="md"
              variant="outline"
              icon="directions"
              href="https://www.google.com/maps/search/?api=1&query=Sanjivani+Multispeciality+Hospital"
            >
              Directions
            </Btn>
            <Btn size="md" icon="call" href="tel:108">
              Call 108
            </Btn>
          </div>
        </Card>
      </Section>

      <Section title="Aaha support">
        <div className="space-y-3">
          <Row icon="support_agent" title="Aaha helpline" subtitle="1800 000 000 · Toll free" />
          <Row icon="favorite" title="Ask Aaha" subtitle="Non-emergency health questions" to="/aaha" />
        </div>
      </Section>
    </Screen>
  );
}
