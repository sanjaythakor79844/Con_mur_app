import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, FlowNav, Icon, Screen, Section, TopBar } from "@/components/aaha";

export const Route = createFileRoute("/teleconsultation")({
  head: () => ({
    meta: [
      { title: "Teleconsultation | Aaha Companion" },
      {
        name: "description",
        content: "Meet your Aaha doctor by video, audio or chat and share your documents before the call.",
      },
      { property: "og:title", content: "Teleconsultation | Aaha Companion" },
      { property: "og:description", content: "Video, audio or chat consultations from home." },
    ],
  }),
  component: Tele,
});

function Tele() {
  return (
    <Screen>
      <TopBar title="Teleconsultation" subtitle="Care from home" />
      <Section>
        <Card className="bg-soft">
          <p className="text-xs font-semibold text-primary">Your upcoming call</p>
          <p className="mt-1 text-sm font-bold">Dr. Meera Joshi · Women's Health</p>
          <p className="text-xs text-muted-foreground">Tue, 4 Aug · 11:30 AM</p>
          <Btn to="/doctors" size="md" className="mt-3" icon="videocam">
            Go to my appointments
          </Btn>
        </Card>
      </Section>

      <Section title="Choose how to meet">
        <ul className="space-y-3">
          {[
            { i: "videocam", t: "Video consultation", d: "Face to face, best for detailed review" },
            { i: "call", t: "Audio consultation", d: "Works well on slow networks" },
            { i: "chat", t: "Chat consultation", d: "Write at your own pace" },
          ].map((o) => (
            <Card as="li" key={o.t}>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <Icon name={o.i} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{o.t}</p>
                  <p className="truncate text-xs text-muted-foreground">{o.d}</p>
                </div>
                <Icon name="chevron_right" className="text-muted-foreground" />
              </div>
            </Card>
          ))}
        </ul>
      </Section>

      <Section title="Before your call">
        <Card>
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-primary/30 bg-muted px-4 py-8 text-center">
            <Icon name="attach_file" className="text-[28px] text-primary" />
            <p className="mt-2 text-sm font-semibold">Upload documents</p>
            <p className="text-xs text-muted-foreground">Reports, prescriptions or photos</p>
          </div>
          <Btn to="/upload" size="md" variant="outline" className="mt-3" icon="upload_file">
            Add a report
          </Btn>
        </Card>
      </Section>
    
      <FlowNav steps={[{ to: "/doctors", title: "Choose a doctor & slot", subtitle: "In person or from home", icon: "stethoscope" },{ to: "/journey", title: "Back to my journey", subtitle: "Track your care steps", icon: "timeline" }]} />
</Screen>
  );
}
