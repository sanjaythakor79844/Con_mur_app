import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Btn, Icon, Screen } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import {
  listAppointments,
  bookAppointment,
  cancelAppointment,
  getAppointmentSlots,
  type Appointment,
} from "@/lib/aaha-api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Care & Appointments | Aaha Companion" },
      {
        name: "description",
        content: "Book, view, and manage your Aaha health centre appointments and kiosk screenings.",
      },
    ],
  }),
  component: AppointmentsScreen,
});

const APPOINTMENT_TYPES = [
  "General Checkup",
  "Follow-up",
  "Lab Report Review",
  "Screening",
  "Consultation",
];

const DOCTORS = [
  {
    id: "Dr. Meera Joshi",
    name: "Dr. Meera Joshi",
    speciality: "Women's Health & Lifestyle",
    focus: "PCOS, Preventive Care, Wellness",
    initial: "M",
  },
  {
    id: "Dr. Anand Rao",
    name: "Dr. Anand Rao",
    speciality: "General Medicine & Chronic Care",
    focus: "Thyroid, Diabetes, Hypertension",
    initial: "A",
  },
];

function getUpcomingDays(count = 7) {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatAppointmentDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function AppointmentsScreen() {
  return (
    <RequireAuth message="Sign in to book and manage your Aaha appointments.">
      <AppointmentsPage />
    </RequireAuth>
  );
}

function AppointmentsPage() {
  const { t } = useI18n();
  const { userId, patient } = useAuth();

  // Navigation tab: 'my' (My Appointments) vs 'book' (Book New)
  const [view, setView] = useState<"my" | "book">("my");
  // Sub-filter for 'my' appointments: 'upcoming' vs 'past'
  const [listFilter, setListFilter] = useState<"upcoming" | "past">("upcoming");

  // Booking states
  const [careTab, setCareTab] = useState<"doctor" | "kiosk">("doctor");
  const [selectedDoctorId, setSelectedDoctorId] = useState(DOCTORS[0].id);
  const [appointmentType, setAppointmentType] = useState("Consultation");
  const [mode, setMode] = useState("In person");
  const [notes, setNotes] = useState("");

  const upcomingDays = useMemo(() => getUpcomingDays(7), []);
  const [selectedDate, setSelectedDate] = useState(
    () => upcomingDays[0].toISOString().split("T")[0],
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Real slots from backend
  const [slotsList, setSlotsList] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Submitting / Action state
  const [submitting, setSubmitting] = useState(false);

  // Cancellation modal state
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  // Load appointments on mount
  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const items = await listAppointments();
      setAppointments(items);
      // If user has no appointments at all, default to book view
      if (items.length === 0) {
        setView("book");
      }
    } catch (err: any) {
      console.error("Failed to load appointments:", err);
      setListError(err?.message || "Could not load appointments. Please try again.");
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch real slots whenever selected date, careTab, or doctor changes
  useEffect(() => {
    if (view !== "book") return;

    let isCancelled = false;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSlotsError(null);
      setSelectedSlot(null);

      try {
        const doctorId = careTab === "doctor" ? selectedDoctorId : undefined;
        const kioskId = careTab === "kiosk" ? "Aaha Kiosk" : undefined;
        const res = await getAppointmentSlots(selectedDate, doctorId, kioskId);

        if (!isCancelled) {
          setSlotsList(res.slots || []);
        }
      } catch (err: any) {
        console.error("Failed to fetch slots from backend:", err);
        if (!isCancelled) {
          setSlotsList([]);
          setSlotsError(err?.message || "Could not load slots for this date.");
        }
      } finally {
        if (!isCancelled) {
          setLoadingSlots(false);
        }
      }
    };

    void fetchSlots();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, careTab, selectedDoctorId, view]);

  // Book appointment handler
  const handleBook = async () => {
    if (!selectedSlot) {
      toast.error(t("Please select an available time slot"));
      return;
    }

    setSubmitting(true);
    try {
      const isKiosk = careTab === "kiosk";
      const selectedDoc = DOCTORS.find((d) => d.id === selectedDoctorId) || DOCTORS[0];

      await bookAppointment({
        userId: userId || undefined,
        patientId: patient?.patient_id ? String(patient.patient_id) : undefined,
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot,
        appointmentType: isKiosk ? "Screening" : appointmentType,
        bookingType: isKiosk ? "kiosk" : "doctor",
        mode: isKiosk ? "In person" : mode,
        centre: "Aaha Health Centre, Aundh, Pune",
        doctorId: isKiosk ? undefined : selectedDoc.id,
        doctorName: isKiosk ? undefined : selectedDoc.name,
        kioskId: isKiosk ? "Aaha Kiosk" : undefined,
        speciality: isKiosk ? "Kiosk Screening" : selectedDoc.speciality,
        notes: notes.trim()
          ? notes.trim()
          : isKiosk
            ? "Kiosk Health Screening"
            : `${appointmentType} (${mode})`,
      });

      toast.success(t("Appointment booked successfully! 🎉"));
      setSelectedSlot(null);
      setNotes("");
      setView("my");
      setListFilter("upcoming");
      await loadAppointments();
    } catch (err: any) {
      console.error("Booking error:", err);
      if (err?.status === 409 || err?.message?.toLowerCase().includes("already booked")) {
        toast.error(t("This slot was just booked by another patient. Please choose another time."));
        // Refresh slots for this date
        try {
          const doctorId = careTab === "doctor" ? selectedDoctorId : undefined;
          const kioskId = careTab === "kiosk" ? "Aaha Kiosk" : undefined;
          const res = await getAppointmentSlots(selectedDate, doctorId, kioskId);
          setSlotsList(res.slots || []);
        } catch {}
      } else {
        toast.error(err?.message || t("Failed to book appointment. Please check your connection."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel appointment handler
  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;
    const apptId = cancellingAppt.appointment_id || cancellingAppt.id || cancellingAppt._id;
    if (!apptId) return;

    setCancelBusy(true);
    try {
      await cancelAppointment(apptId);
      toast.success(t("Appointment cancelled successfully"));
      setCancellingAppt(null);
      await loadAppointments();
    } catch (err: any) {
      console.error("Cancellation error:", err);
      toast.error(err?.message || t("Could not cancel appointment. Please try again."));
    } finally {
      setCancelBusy(false);
    }
  };

  // Group appointments into upcoming and past
  const upcomingAppointments = appointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "completed",
  );
  const pastAppointments = appointments.filter(
    (a) => a.status === "cancelled" || a.status === "completed",
  );

  const displayedList = listFilter === "upcoming" ? upcomingAppointments : pastAppointments;

  return (
    <Screen nav={true}>
      {/* Header */}
      <header className="px-5 pt-6 pb-2 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
              {t("Care & Appointments")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("Manage your health consultations and kiosk screenings")}
            </p>
          </div>
          {view === "my" ? (
            <button
              onClick={() => setView("book")}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-xs font-bold transition-transform active:scale-95 shadow-sm"
            >
              <Icon name="add" className="text-[18px]" />
              <span>{t("Book New")}</span>
            </button>
          ) : (
            <button
              onClick={() => setView("my")}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors"
            >
              <Icon name="calendar_today" className="text-[16px]" />
              <span>{t("My Bookings")}</span>
              {upcomingAppointments.length > 0 && (
                <span className="size-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold grid place-items-center ml-0.5">
                  {upcomingAppointments.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* View Segmented Switcher */}
        <div className="h-12 p-1 rounded-2xl bg-muted/70 border border-border/80 grid grid-cols-2 gap-1 mb-2">
          <button
            onClick={() => setView("my")}
            className={cn(
              "rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
              view === "my"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon name="event_available" className="text-[18px]" />
            <span>{t("My Appointments")}</span>
            {upcomingAppointments.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                {upcomingAppointments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setView("book")}
            className={cn(
              "rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
              view === "book"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon name="edit_calendar" className="text-[18px]" />
            <span>{t("Schedule Visit")}</span>
          </button>
        </div>
      </header>

      {/* VIEW: MY APPOINTMENTS */}
      {view === "my" && (
        <div className="px-5 pb-24 sm:px-6 flex flex-col gap-4">
          {/* Sub-filter chips */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setListFilter("upcoming")}
              className={cn(
                "h-9 px-4 rounded-full text-xs font-bold transition-colors border",
                listFilter === "upcoming"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {t("Upcoming")} ({upcomingAppointments.length})
            </button>
            <button
              onClick={() => setListFilter("past")}
              className={cn(
                "h-9 px-4 rounded-full text-xs font-bold transition-colors border",
                listFilter === "past"
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {t("Past & Cancelled")} ({pastAppointments.length})
            </button>
          </div>

          {/* Loading state */}
          {loadingList ? (
            <div className="space-y-3 pt-2">
              <div className="h-36 w-full animate-pulse rounded-2xl bg-muted/60" />
              <div className="h-36 w-full animate-pulse rounded-2xl bg-muted/60" />
            </div>
          ) : listError ? (
            /* Error state */
            <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/10 text-center">
              <Icon name="error" className="text-3xl text-destructive mx-auto mb-2" />
              <p className="text-sm font-bold text-destructive">{listError}</p>
              <Btn
                onClick={loadAppointments}
                variant="outline"
                size="sm"
                className="mt-3 w-auto mx-auto"
              >
                {t("common.retry")}
              </Btn>
            </div>
          ) : displayedList.length === 0 ? (
            /* Empty state */
            <div className="p-8 text-center rounded-3xl border border-border/80 bg-card/60 my-4 shadow-soft">
              <div className="size-16 rounded-2xl bg-accent text-primary grid place-items-center mx-auto mb-3">
                <Icon
                  name={listFilter === "upcoming" ? "calendar_month" : "history"}
                  className="text-3xl"
                />
              </div>
              <h2 className="text-base font-bold text-foreground">
                {listFilter === "upcoming"
                  ? t("No upcoming appointments")
                  : t("No past appointments")}
              </h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                {listFilter === "upcoming"
                  ? t(
                      "You have no scheduled visits. Schedule a doctor consultation or a quick kiosk health screening.",
                    )
                  : t("Past completed and cancelled appointments will appear here.")}
              </p>
              {listFilter === "upcoming" && (
                <div className="mt-4 flex justify-center">
                  <Btn onClick={() => setView("book")} icon="add" size="sm" className="w-auto">
                    {t("Book an Appointment")}
                  </Btn>
                </div>
              )}
            </div>
          ) : (
            /* Appointment cards */
            <div className="flex flex-col gap-3.5 pt-1">
              {displayedList.map((appt) => {
                const isKiosk =
                  appt.booking_type === "kiosk" ||
                  Boolean(appt.kiosk_id) ||
                  appt.appointment_type === "Screening";
                const isCancelled = appt.status === "cancelled";
                const isCompleted = appt.status === "completed";
                const isPending = appt.status === "pending";

                const dateStr = appt.appointment_date || appt.scheduled_for;
                const timeStr = appt.appointment_time || appt.slot_label;

                return (
                  <section
                    key={appt.id || appt.appointment_id || appt._id}
                    className={cn(
                      "p-4 rounded-[22px] border bg-card transition-all shadow-soft flex flex-col gap-3",
                      isCancelled
                        ? "border-border/60 opacity-75"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    {/* Top Row: Provider & Status Badge */}
                    <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-border/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "size-11 rounded-xl grid place-items-center text-lg font-bold shrink-0",
                            isKiosk
                              ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          <Icon name={isKiosk ? "monitor_heart" : "stethoscope"} />
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-foreground truncate">
                            {isKiosk ? t("Aaha Health Kiosk") : t(appt.doctor_name || "Doctor")}
                          </h2>
                          <p className="text-xs text-muted-foreground truncate">
                            {isKiosk
                              ? t("Full Vitals & AWIS Screening")
                              : t(appt.speciality || "General Consultation")}
                          </p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase shrink-0 flex items-center gap-1",
                          isCancelled && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                          isCompleted && "bg-muted text-muted-foreground",
                          isPending && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                          !isCancelled &&
                            !isCompleted &&
                            !isPending &&
                            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        <Icon
                          name={
                            isCancelled
                              ? "cancel"
                              : isCompleted
                                ? "task_alt"
                                : isPending
                                  ? "schedule"
                                  : "check_circle"
                          }
                          className="text-[13px]"
                        />
                        <span>{t(appt.status)}</span>
                      </span>
                    </div>

                    {/* Middle details: Date, Time, Mode, Location */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                          {t("Date & Time")}
                        </span>
                        <span className="font-semibold text-foreground mt-0.5">
                          {formatAppointmentDate(dateStr)}, {timeStr}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                          {t("Consultation Mode")}
                        </span>
                        <span className="font-semibold text-foreground mt-0.5">
                          {t(appt.mode || "In person")}
                        </span>
                      </div>
                    </div>

                    {/* Centre / Location Note */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl">
                      <Icon
                        name={appt.mode === "Video call" ? "videocam" : "location_on"}
                        className="text-[16px] text-primary shrink-0"
                      />
                      <span className="truncate">
                        {appt.mode === "Video call"
                          ? t("Secure video link will be sent via SMS before visit")
                          : t(appt.centre || "Aaha Health Centre, Aundh, Pune")}
                      </span>
                    </div>

                    {/* Kiosk informational banner */}
                    {isKiosk && !isCancelled && (
                      <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-800 dark:text-teal-200 text-xs leading-relaxed">
                        <span className="font-bold">{t("Included in screening")}:</span>{" "}
                        {t(
                          "Blood pressure, ECG, body composition, and blood sugar, guided step-by-step by a nurse.",
                        )}
                      </div>
                    )}

                    {/* Actions: Cancel Appointment (only on active upcoming) */}
                    {!isCancelled && !isCompleted && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setCancellingAppt(appt)}
                          className="text-xs font-semibold text-destructive/90 hover:text-destructive hover:underline p-1 flex items-center gap-1 transition-colors"
                        >
                          <Icon name="cancel" className="text-[15px]" />
                          <span>{t("Cancel Appointment")}</span>
                        </button>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: BOOK APPOINTMENT */}
      {view === "book" && (
        <div className="px-5 pb-36 sm:px-6 flex flex-col gap-5">
          {/* 1. Service Type Segmented Toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              {t("Select Service")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCareTab("doctor")}
                className={cn(
                  "p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all",
                  careTab === "doctor"
                    ? "bg-accent/40 border-primary ring-1 ring-primary/30"
                    : "bg-card border-border hover:border-border/80",
                )}
              >
                <div className="flex items-center gap-2 text-primary">
                  <Icon name="stethoscope" className="text-[20px]" />
                  <span className="text-sm font-bold text-foreground">{t("Doctor Consultation")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {t("Expert doctor review in person or via video call")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCareTab("kiosk")}
                className={cn(
                  "p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all",
                  careTab === "kiosk"
                    ? "bg-accent/40 border-primary ring-1 ring-primary/30"
                    : "bg-card border-border hover:border-border/80",
                )}
              >
                <div className="flex items-center gap-2 text-primary">
                  <Icon name="monitor_heart" className="text-[20px]" />
                  <span className="text-sm font-bold text-foreground">{t("Kiosk Screening")}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {t("Nurse-guided checkup with immediate AWIS score")}
                </p>
              </button>
            </div>
          </div>

          {/* 2. Doctor Consultation Configuration */}
          {careTab === "doctor" && (
            <div className="flex flex-col gap-4">
              {/* Mode Selection */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {t("Consultation Mode")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "In person", label: "In person at Centre", icon: "location_on" },
                    { id: "Video call", label: "Video Call (Telehealth)", icon: "videocam" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={cn(
                        "h-11 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all",
                        mode === m.id
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                          : "bg-card text-foreground border-border hover:bg-muted/50",
                      )}
                    >
                      <Icon name={m.icon} className="text-[17px]" />
                      <span className="truncate">{t(m.label)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose of Visit */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {t("Reason for visit")}
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
                  {APPOINTMENT_TYPES.map((typeStr) => (
                    <button
                      key={typeStr}
                      type="button"
                      onClick={() => setAppointmentType(typeStr)}
                      className={cn(
                        "h-9 px-3.5 rounded-full border text-xs font-semibold shrink-0 transition-colors",
                        appointmentType === typeStr
                          ? "bg-primary text-primary-foreground border-primary font-bold"
                          : "bg-card text-foreground border-border hover:bg-muted/60",
                      )}
                    >
                      {t(typeStr)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Doctor */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  {t("Choose Doctor")}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DOCTORS.map((doc) => {
                    const isSelected = selectedDoctorId === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={cn(
                          "p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all",
                          isSelected
                            ? "bg-accent/40 border-primary ring-1 ring-primary/30"
                            : "bg-card border-border hover:border-border/80",
                        )}
                      >
                        <span className="size-11 rounded-full bg-accent text-primary font-bold text-base grid place-items-center shrink-0">
                          {doc.initial}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate">
                            {t(doc.name)}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {t(doc.speciality)}
                          </p>
                          <span className="text-[10px] text-primary/80 font-medium">
                            {t(doc.focus)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Kiosk Information */}
          {careTab === "kiosk" && (
            <div className="p-4 rounded-2xl border border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-100 flex flex-col gap-2 shadow-soft">
              <div className="flex items-center gap-2">
                <Icon name="verified" className="text-teal-600 text-lg" />
                <span className="text-sm font-bold">{t("Aaha Health Centre, Aundh, Pune")}</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90 m-0">
                {t(
                  "A nurse assists you through blood pressure, ECG, body composition, and blood sugar measurements in under 15 minutes. Results & AWIS score appear in your app immediately.",
                )}
              </p>
            </div>
          )}

          {/* 3. Date Selection (7-day horizontal strip) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              {t("Select Date")}
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
              {upcomingDays.map((d, index) => {
                const dateStr = d.toISOString().split("T")[0];
                const isSelected = selectedDate === dateStr;
                const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
                const dayNum = d.getDate();

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "h-18 w-15 rounded-2xl border flex flex-col items-center justify-center shrink-0 transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-foreground border-border hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isSelected ? "text-primary-foreground/90" : "text-muted-foreground",
                      )}
                    >
                      {index === 0 ? t("Today") : t(weekday)}
                    </span>
                    <span className="text-xl font-extrabold leading-none mt-1">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Real Slots Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("Available Time Slots")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatAppointmentDate(selectedDate)}
              </span>
            </div>

            {loadingSlots ? (
              <div className="p-8 rounded-2xl border border-border/80 bg-card/60 text-center flex flex-col items-center justify-center gap-2">
                <Icon name="progress_activity" className="animate-spin text-primary text-2xl" />
                <span className="text-xs text-muted-foreground font-medium">
                  {t("Checking real-time slot availability…")}
                </span>
              </div>
            ) : slotsError ? (
              <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-center text-xs text-destructive">
                {slotsError}
              </div>
            ) : slotsList.length === 0 ? (
              <div className="p-6 rounded-2xl border border-border/80 bg-card text-center text-xs text-muted-foreground">
                <Icon name="event_busy" className="text-2xl mb-1 text-muted-foreground" />
                <p className="font-semibold text-foreground m-0">
                  {t("No available slots for this date")}
                </p>
                <p className="mt-1 mb-0">{t("Please select another date from the strip above.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slotsList.map((time) => {
                  const isSelected = selectedSlot === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedSlot(time)}
                      className={cn(
                        "h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card text-foreground border-border hover:bg-muted/50",
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Optional Notes Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="booking-notes"
              className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1"
            >
              {t("Notes / Symptoms (Optional)")}
            </label>
            <input
              id="booking-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("e.g. Reviewing recent thyroid report, feeling fatigued")}
              className="h-11 rounded-xl border border-border bg-card px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
            />
          </div>

          {/* 6. Sticky Confirmation Summary Bar */}
          <div className="fixed bottom-[74px] left-1/2 w-full max-w-md -translate-x-1/2 px-4 pb-2 pointer-events-none z-20">
            {selectedSlot ? (
              <div className="p-3.5 rounded-2xl bg-foreground text-background shadow-lifted flex items-center justify-between gap-3 pointer-events-auto border border-border/20">
                <div className="min-w-0 py-0.5">
                  <div className="text-xs font-bold truncate">
                    {formatAppointmentDate(selectedDate)} • {selectedSlot}
                  </div>
                  <div className="text-[11px] opacity-80 truncate">
                    {careTab === "doctor"
                      ? `${t(selectedDoctorId)} (${t(mode)})`
                      : t("Kiosk Screening, Aundh")}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBook}
                  disabled={submitting}
                  className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shrink-0 flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Icon name="progress_activity" className="animate-spin text-[16px]" />
                      <span>{t("Booking…")}</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" className="text-[16px]" />
                      <span>{t("Confirm Booking")}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="h-12 px-4 rounded-2xl bg-card border border-border text-muted-foreground text-xs font-medium flex items-center justify-center shadow-soft pointer-events-auto">
                <Icon name="touch_app" className="text-[16px] mr-1.5 text-primary" />
                <span>{t("Select an available time slot above to continue")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-card border border-border shadow-lifted flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-destructive">
              <span className="size-11 rounded-full bg-destructive/10 grid place-items-center shrink-0">
                <Icon name="warning" className="text-xl" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("Cancel Appointment?")}
                </h3>
                <p className="text-xs text-muted-foreground">{t("This slot will be released.")}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/60 text-xs flex flex-col gap-1 border border-border/60">
              <span className="font-bold text-foreground">
                {cancellingAppt.booking_type === "kiosk"
                  ? t("Aaha Health Kiosk")
                  : t(cancellingAppt.doctor_name || "Doctor Consultation")}
              </span>
              <span className="text-muted-foreground">
                {formatAppointmentDate(
                  cancellingAppt.appointment_date || cancellingAppt.scheduled_for,
                )}
                , {cancellingAppt.appointment_time || cancellingAppt.slot_label}
              </span>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={cancelBusy}
                onClick={() => setCancellingAppt(null)}
                className="flex-1 h-11 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-colors"
              >
                {t("Keep Visit")}
              </button>
              <button
                type="button"
                disabled={cancelBusy}
                onClick={handleConfirmCancel}
                className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60 shadow-sm"
              >
                {cancelBusy ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin text-[16px]" />
                    <span>{t("Cancelling…")}</span>
                  </>
                ) : (
                  <span>{t("Yes, Cancel")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
