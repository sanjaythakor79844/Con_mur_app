import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Btn, Card, FlowNav, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { cancelAppointment, listAppointments } from "@/lib/aaha-api";
import { formatDate } from "@/hooks/use-overview";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/doctors")({
  head: () => ({
    meta: [
      { title: "Doctor Consultations | Aaha Companion" },
      {
        name: "description",
        content: "Specialist doctors at your Aaha Health Centre and telehealth options.",
      },
    ],
  }),
  component: Doctors,
});

const DOCTORS = [
  {
    n: "Dr. Meera Joshi",
    s: "Women's Health & Lifestyle",
    e: "12 years experience",
    focus: "PCOS, Hormones, Preventive Wellness",
    initial: "M",
  },
  {
    n: "Dr. Anand Rao",
    s: "General Medicine & Chronic Care",
    e: "9 years experience",
    focus: "Thyroid, Diabetes, Hypertension",
    initial: "A",
  },
];

function Doctors() {
  const { t } = useI18n();

  return (
    <Screen nav={true}>
      <TopBar title="Doctor Consultation" subtitle="Aaha Health Centre, Aundh, Pune" back={true} />
      <RequireAuth message="Sign in to book and manage your consultations.">
        <DoctorsContent />
      </RequireAuth>
      <FlowNav
        steps={[
          {
            to: "/appointments",
            title: t("Schedule an appointment"),
            subtitle: t("Pick an available time slot"),
            icon: "calendar_month",
          },
          {
            to: "/journey",
            title: t("My health journey"),
            subtitle: t("See your next follow-up"),
            icon: "timeline",
          },
        ]}
      />
    </Screen>
  );
}

function DoctorsContent() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const appts = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: () => {
      toast.success(t("Consultation cancelled"));
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || t("Could not cancel consultation"));
    },
  });

  const activeConsultations = (appts.data ?? []).filter(
    (a) =>
      a.status?.toLowerCase() !== "cancelled" &&
      a.status?.toLowerCase() !== "completed" &&
      a.booking_type !== "kiosk",
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Action: Book on Care / Appointments */}
      <Section>
        <div className="p-4 rounded-2xl bg-accent/40 border border-primary/20 flex flex-col gap-2.5">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {t("Real-time Slot Booking")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {t(
                "Check live doctor availability, choose between in-person clinic visits or video teleconsultation, and book your slot directly.",
              )}
            </p>
          </div>
          <Btn to="/appointments" icon="event_available" size="sm">
            {t("Book a Doctor Consultation")}
          </Btn>
        </div>
      </Section>

      {/* Active Consultations List */}
      {activeConsultations.length > 0 && (
        <Section title="Your Active Consultations">
          <ul className="space-y-3">
            {activeConsultations.map((a) => (
              <Card as="li" key={a.id || a.appointment_id || a._id} className="p-3.5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{a.doctor_name || "Doctor Consultation"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(a.scheduled_for || a.appointment_date)}, {a.slot_label || a.appointment_time} • {a.mode || "In person"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {a.centre || "Aaha Health Centre, Aundh, Pune"}
                    </p>
                  </div>
                  <Pill tone="green">{t(a.status)}</Pill>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 flex justify-end">
                  <button
                    type="button"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(a.id || a.appointment_id || a._id!)}
                    className="text-xs font-semibold text-destructive hover:underline p-1 flex items-center gap-1"
                  >
                    <Icon name="cancel" className="text-[14px]" />
                    <span>{t("Cancel Consultation")}</span>
                  </button>
                </div>
              </Card>
            ))}
          </ul>
        </Section>
      )}

      {/* Available Doctors List */}
      <Section title="Our Healthcare Specialists">
        <ul className="space-y-3">
          {DOCTORS.map((d) => (
            <Card as="li" key={d.n} className="p-4">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <span className="size-14 rounded-full bg-accent text-lg font-extrabold text-primary grid place-items-center shrink-0">
                  {d.initial}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-foreground">{d.n}</h3>
                  <p className="truncate text-xs text-muted-foreground">{d.s}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{d.e}</p>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    <Pill tone="brand">{d.focus}</Pill>
                    <Pill tone="neutral">Hindi · English · Marathi</Pill>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("In person & Video consultations")}
                </span>
                <Btn to="/appointments" size="sm" variant="outline" className="w-auto text-xs h-8 px-3">
                  {t("Check Slots")} →
                </Btn>
              </div>
            </Card>
          ))}
        </ul>
      </Section>
    </div>
  );
}
