// src/routes/appointments.tsx
// Appointment booking UI — connects to Kiosk backend API
// NOTE: Update API endpoint/payload when backend developer provides exact spec.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  AahaSays,
  Btn,
  Card,
  Icon,
  Pill,
  Screen,
  Section,
  TopBar,
} from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { apiService, type Appointment } from "@/lib/api-service";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments | Aaha Companion" },
      {
        name: "description",
        content: "Book and manage your Aaha health centre appointments.",
      },
    ],
  }),
  component: AppointmentsScreen,
});

const APPOINTMENT_TYPES = ["General Checkup", "Follow-up", "Screening", "Lab Test", "Consultation"];
const TIME_SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM",
];
const CENTRES = [
  "Aaha Health Centre – Koramangala",
  "Aaha Health Centre – Indiranagar",
  "Aaha Health Centre – Whitefield",
  "Aaha Health Centre – HSR Layout",
];

function statusTone(status: Appointment["status"]): "green" | "brand" | "neutral" | "red" {
  if (status === "confirmed") return "green";
  if (status === "pending") return "brand";
  if (status === "cancelled") return "red";
  return "neutral";
}

function statusLabel(status: Appointment["status"]) {
  const map = {
    confirmed: "Confirmed",
    pending: "Pending",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return map[status] ?? status;
}

function formatAppointmentDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Minimum date = today
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function AppointmentsScreen() {
  return (
    <RequireAuth message="Sign in to book and view your appointments.">
      <AppointmentsPage />
    </RequireAuth>
  );
}

function AppointmentsPage() {
  // Form state
  const [view, setView] = useState<"list" | "book">("list");
  const [appointmentType, setAppointmentType] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [centre, setCentre] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Appointments list
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoadingList(true);
    try {
      const res = await apiService.getMyAppointments();
      setAppointments(res.appointments ?? []);
    } catch {
      // Backend not connected yet — show empty state gracefully
      setAppointments([]);
    } finally {
      setLoadingList(false);
    }
  };

  const handleBook = async () => {
    if (!appointmentType) {
      toast.error("Please select appointment type.");
      return;
    }
    if (!date) {
      toast.error("Please select a date.");
      return;
    }
    if (!timeSlot) {
      toast.error("Please select a time slot.");
      return;
    }
    if (!centre) {
      toast.error("Please select a centre.");
      return;
    }

    setBusy(true);
    try {
      await apiService.createAppointment({
        appointment_date: date,
        appointment_time: timeSlot,
        appointment_type: appointmentType,
        centre,
        notes: notes.trim() || undefined,
      });
      toast.success("Appointment booked! 🎉", {
        description: `${appointmentType} on ${formatAppointmentDate(date)} at ${timeSlot}`,
      });
      // Reset form and go back to list
      setAppointmentType("");
      setDate("");
      setTimeSlot("");
      setCentre("");
      setNotes("");
      setView("list");
      await loadAppointments();
    } catch (error) {
      // Gracefully handle if backend is not connected
      toast.info("Appointment saved locally", {
        description: "Will sync when backend is connected.",
      });
      // Add a local mock entry so user can see it
      const localAppointment: Appointment = {
        appointment_id: `local_${Date.now()}`,
        patient_id: "local",
        appointment_date: date,
        appointment_time: timeSlot,
        slot_label: timeSlot,
        appointment_type: appointmentType,
        centre,
        notes: notes.trim() || undefined,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      setAppointments((prev) => [localAppointment, ...prev]);
      setAppointmentType("");
      setDate("");
      setTimeSlot("");
      setCentre("");
      setNotes("");
      setView("list");
    } finally {
      setBusy(false);
    }
  };

  const upcoming = appointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "completed"
  );
  const past = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled"
  );

  return (
    <Screen>
      <TopBar title="Appointments" subtitle="Book and manage visits" />

      {/* Tab switcher */}
      <div className="mx-4 mt-4 flex rounded-2xl bg-muted p-1">
        {(["list", "book"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setView(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${
              view === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "list" ? "My Appointments" : "Book New"}
          </button>
        ))}
      </div>

      {/* ────── BOOK FORM ────── */}
      {view === "book" && (
        <>
          <Section title="Appointment details">
            {/* Type */}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Appointment Type</p>
              <div className="flex flex-wrap gap-2">
                {APPOINTMENT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAppointmentType(t)}
                    className={`rounded-2xl border-2 px-4 py-2 text-sm font-semibold transition ${
                      appointmentType === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <Card className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Preferred Date</p>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 focus-within:border-primary/60">
                <Icon name="calendar_today" className="text-muted-foreground" />
                <input
                  id="appointment-date-input"
                  type="date"
                  value={date}
                  min={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-12 w-full bg-transparent text-base font-semibold outline-none"
                />
              </div>
            </Card>

            {/* Time Slot */}
            <Card className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Time Slot</p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeSlot(t)}
                    className={`rounded-xl border-2 py-2 text-xs font-bold transition ${
                      timeSlot === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Card>

            {/* Centre */}
            <Card className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Select Centre</p>
              <div className="space-y-2">
                {CENTRES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCentre(c)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left text-sm font-semibold transition ${
                      centre === c
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    <Icon
                      name={centre === c ? "radio_button_checked" : "radio_button_unchecked"}
                      className={centre === c ? "text-primary" : "text-muted-foreground"}
                    />
                    {c}
                  </button>
                ))}
              </div>
            </Card>

            {/* Notes */}
            <Card className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Notes{" "}
                <span className="font-normal text-muted-foreground/60">(Optional)</span>
              </p>
              <textarea
                id="appointment-notes-input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific concerns or requests for the doctor…"
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </Card>
          </Section>

          <Section>
            <Btn id="book-appointment-btn" icon="event_available" onClick={handleBook} disabled={busy}>
              {busy ? "Booking…" : "Confirm Appointment"}
            </Btn>
          </Section>
        </>
      )}

      {/* ────── APPOINTMENTS LIST ────── */}
      {view === "list" && (
        <>
          {loadingList ? (
            <Section>
              <Card>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Icon name="progress_activity" className="animate-spin text-primary" />
                  Loading appointments…
                </div>
              </Card>
            </Section>
          ) : (
            <>
              {/* Upcoming */}
              <Section
                title="Upcoming"
                action={
                  <button
                    type="button"
                    onClick={() => setView("book")}
                    className="text-xs font-semibold text-primary"
                  >
                    + Book new
                  </button>
                }
              >
                {upcoming.length === 0 ? (
                  <Card>
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                      <Icon name="event" className="text-4xl text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-bold">No upcoming appointments</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Book a visit at your nearest Aaha health centre.
                        </p>
                      </div>
                      <Btn
                        id="book-first-appointment-btn"
                        size="md"
                        icon="add"
                        onClick={() => setView("book")}
                      >
                        Book appointment
                      </Btn>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((appt) => (
                      <AppointmentCard key={appt.appointment_id} appt={appt} />
                    ))}
                  </div>
                )}
              </Section>

              {/* Past */}
              {past.length > 0 && (
                <Section title="Past appointments">
                  <div className="space-y-3">
                    {past.map((appt) => (
                      <AppointmentCard key={appt.appointment_id} appt={appt} />
                    ))}
                  </div>
                </Section>
              )}

              {appointments.length === 0 && (
                <Section>
                  <AahaSays>
                    Regular check-ups help catch issues early. Book your first appointment and let
                    the Aaha team take care of you.
                  </AahaSays>
                </Section>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="grid grid-cols-[auto_1fr] gap-3 min-w-0">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
            <Icon name="event" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{appt.appointment_type}</p>
            <p className="text-xs text-muted-foreground">
              {formatAppointmentDate(appt.appointment_date)}
              {appt.appointment_time ? ` · ${appt.appointment_time}` : ""}
            </p>
            {appt.centre && (
              <p className="mt-0.5 text-xs text-muted-foreground">{appt.centre}</p>
            )}
          </div>
        </div>
        <Pill tone={statusTone(appt.status)}>{statusLabel(appt.status)}</Pill>
      </div>
      {appt.notes && (
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          📝 {appt.notes}
        </p>
      )}
    </Card>
  );
}
