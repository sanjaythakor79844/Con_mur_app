import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, FlowNav, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/hooks/use-auth";
import { bookAppointment, cancelAppointment, listAppointments } from "@/lib/aaha-api";

export const Route = createFileRoute("/doctors")({
  head: () => ({
    meta: [
      { title: "Book a consultation | Aaha Companion" },
      {
        name: "description",
        content: "Choose a doctor at your Aaha Health Centre and pick a slot that suits you.",
      },
      { property: "og:title", content: "Book a consultation | Aaha Companion" },
      { property: "og:description", content: "Doctors, specialities and available slots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Doctors,
});

const DOCTORS = [
  { n: "Dr. Meera Joshi", s: "Women's Health", e: "12 years", slots: ["11:30 AM", "1:00 PM", "4:30 PM"] },
  { n: "Dr. Anand Rao", s: "Thyroid & Hormones", e: "9 years", slots: ["10:00 AM", "3:15 PM"] },
  { n: "Dr. Kavita Patel", s: "General Medicine", e: "15 years", slots: ["9:30 AM", "12:00 PM", "5:00 PM"] },
];

function Doctors() {
  return (
    <Screen>
      <TopBar title="Doctor Consultation" subtitle="Aaha Health Centre, Satellite" />
      <RequireAuth message="Sign in to book and manage your consultations.">
        <Booking />
      </RequireAuth>
      <Section>
        <Btn to="/teleconsultation" variant="outline" icon="videocam">
          Consult from home instead
        </Btn>
      </Section>
      <FlowNav
        steps={[
          { to: "/therapies", title: "Explore therapies", subtitle: "Nutrition, physio and wellness", icon: "spa" },
          { to: "/journey", title: "My health journey", subtitle: "See your next follow-up", icon: "timeline" },
        ]}
      />
    </Screen>
  );
}

function Booking() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState("In person");
  const [slot, setSlot] = useState<{ doctor: string; time: string } | null>(null);

  const appts = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });

  const book = useMutation({
    mutationFn: (d: (typeof DOCTORS)[number]) => {
      if (!userId) throw new Error("Please sign in");
      if (!slot || slot.doctor !== d.n) throw new Error("Pick a time slot first");
      return bookAppointment({
        userId,
        doctorName: d.n,
        speciality: d.s,
        mode,
        slotLabel: slot.time,
      });
    },
    onSuccess: () => {
      toast.success("Consultation confirmed", { description: "We've added it to your reminders." });
      setSlot(null);
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not book"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: () => {
      toast.success("Consultation cancelled");
      void qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const upcoming = (appts.data ?? []).filter((a) => a.status !== "Cancelled");

  return (
    <>
      <Section>
        <div className="flex gap-2">
          {["In person", "Teleconsultation"].map((t) => (
            <button key={t} type="button" onClick={() => setMode(t)} className="flex-1">
              <Card
                className={`p-3 text-center text-sm font-semibold ${
                  mode === t ? "border-primary/50 bg-accent/50" : ""
                }`}
              >
                {t}
              </Card>
            </button>
          ))}
        </div>
      </Section>

      {upcoming.length > 0 ? (
        <Section title="Your consultations">
          <ul className="space-y-3">
            {upcoming.map((a) => (
              <Card as="li" key={a.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{a.doctor_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.slot_label} · {a.mode} · {new Date(a.scheduled_for).toLocaleDateString()}
                    </p>
                  </div>
                  <Pill tone="green">{a.status}</Pill>
                </div>
                <button
                  type="button"
                  onClick={() => cancel.mutate(a.id)}
                  className="mt-3 text-xs font-semibold text-destructive"
                >
                  Cancel consultation
                </button>
              </Card>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Available doctors">
        <ul className="space-y-3">
          {DOCTORS.map((d) => (
            <Card as="li" key={d.n}>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-primary">
                  {d.n.split(" ").slice(-1)[0][0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{d.n}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.s} · {d.e}
                  </p>
                  <div className="mt-1 flex gap-2">
                    <Pill tone="green" icon="star">
                      4.9
                    </Pill>
                    <Pill tone="neutral">Hindi · English</Pill>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.slots.map((s) => (
                  <button key={s} type="button" onClick={() => setSlot({ doctor: d.n, time: s })}>
                    <Pill
                      tone={slot?.doctor === d.n && slot.time === s ? "green" : "brand"}
                      icon={slot?.doctor === d.n && slot.time === s ? "check" : "schedule"}
                    >
                      {s}
                    </Pill>
                  </button>
                ))}
              </div>
              <Btn
                size="md"
                className="mt-3"
                icon="event_available"
                disabled={book.isPending}
                onClick={() => book.mutate(d)}
              >
                {slot?.doctor === d.n ? `Book ${slot.time}` : "Book consultation"}
              </Btn>
            </Card>
          ))}
        </ul>
      </Section>

      {appts.isLoading ? (
        <Section>
          <Card className="flex items-center gap-3 text-sm text-muted-foreground">
            <Icon name="progress_activity" className="animate-spin text-primary" />
            Loading your bookings…
          </Card>
        </Section>
      ) : null}
    </>
  );
}
