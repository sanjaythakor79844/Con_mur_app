import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Btn, Icon, Screen } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { apiService, type Appointment } from "@/lib/api-service";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Care | Aaha Companion" },
      {
        name: "description",
        content: "Book and manage your Aaha health centre appointments.",
      },
    ],
  }),
  component: AppointmentsScreen,
});

const APPOINTMENT_TYPES = ["General Checkup", "Follow-up", "Screening", "Lab Test", "Consultation"];
const DOCTORS = [
  { n: "Dr. Meera Joshi", s: "Women's Health", slots: ["11:30 AM", "1:00 PM", "4:30 PM"] },
  { n: "Dr. Anand Rao", s: "Thyroid & Hormones", slots: ["10:00 AM", "3:15 PM"] },
];
const KSLOTS = ["9:30 AM", "10:00 AM", "11:00 AM", "12:30 PM", "3:00 PM", "4:30 PM"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getNextDays(count = 5) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
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

function AppointmentsScreen() {
  return (
    <RequireAuth message="Sign in to book and view your appointments.">
      <AppointmentsPage />
    </RequireAuth>
  );
}

function AppointmentsPage() {
  const { t } = useI18n();
  const [view, setView] = useState<"list" | "book">("list");
  const [careTab, setCareTab] = useState<"doctor" | "kiosk">("doctor");
  const [appointmentType, setAppointmentType] = useState("Consultation");
  const [mode, setMode] = useState("In person");
  
  const upcomingDays = getNextDays(5);
  const [selectedDate, setSelectedDate] = useState(upcomingDays[0].toISOString().split("T")[0]);
  const [slot, setSlot] = useState<{ doctor: string; time: string } | null>(null);
  const [kioskSlot, setKioskSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [kioskSlotsList, setKioskSlotsList] = useState<string[]>([]);
  const [doctorSlotsList, setDoctorSlotsList] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const kioskRes = await apiService.getAppointmentSlots(selectedDate, undefined, "Aaha Kiosk");
        const doc1Res = await apiService.getAppointmentSlots(selectedDate, "Dr. Meera Joshi", undefined);
        const doc2Res = await apiService.getAppointmentSlots(selectedDate, "Dr. Anand Rao", undefined);
        setKioskSlotsList(kioskRes.slots || []);
        setDoctorSlotsList({
          "Dr. Meera Joshi": doc1Res.slots || [],
          "Dr. Anand Rao": doc2Res.slots || []
        });
      } catch (error) {
        console.error("Failed to load slots", error);
        setKioskSlotsList([]);
        setDoctorSlotsList({});
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDate]);

  const loadAppointments = async () => {
    setLoadingList(true);
    try {
      const res = await apiService.getMyAppointments();
      setAppointments(res.appointments ?? []);
      if ((res.appointments ?? []).length === 0) {
        setView("book");
      }
    } catch {
      setAppointments([]);
      setView("book");
    } finally {
      setLoadingList(false);
    }
  };

  const handleBook = async () => {
    setBusy(true);
    try {
      if (careTab === "doctor") {
        if (!slot) { toast.error("Pick a time slot"); setBusy(false); return; }
        await apiService.bookAppointment({
          appointment_date: selectedDate,
          appointment_time: slot.time,
          appointment_type: appointmentType,
          centre: "Aaha Health Centre, Aundh, Pune",
          doctor_name: slot.doctor,
          doctor_id: slot.doctor,
          mode: mode,
          notes: `Mode: ${mode}`,
        });
      } else {
        if (!kioskSlot) { toast.error("Pick a time slot"); setBusy(false); return; }
        await apiService.bookAppointment({
          appointment_date: selectedDate,
          appointment_time: kioskSlot,
          appointment_type: "Screening",
          centre: "Aaha Health Centre, Aundh, Pune",
          kiosk_id: "Aaha Kiosk",
          mode: "In person",
          notes: "Kiosk screening",
        });
      }
      toast.success("Appointment booked! 🎉");
      setSlot(null);
      setKioskSlot(null);
      setView("list");
      await loadAppointments();
    } catch (error) {
      toast.info("Appointment saved locally");
      const localAppointment: Appointment = {
        appointment_id: `local_${Date.now()}`,
        patient_id: "local",
        appointment_date: selectedDate,
        appointment_time: careTab === "doctor" ? slot!.time : kioskSlot!,
        slot_label: careTab === "doctor" ? slot!.time : kioskSlot!,
        appointment_type: careTab === "doctor" ? appointmentType : "Screening",
        centre: "Aaha Health Centre, Aundh, Pune",
        doctor_name: careTab === "doctor" ? slot!.doctor : "Aaha Kiosk",
        status: "confirmed",
        created_at: new Date().toISOString(),
      };
      setAppointments((prev) => [localAppointment, ...prev]);
      setSlot(null);
      setKioskSlot(null);
      setView("list");
    } finally {
      setBusy(false);
    }
  };

  const upcoming = appointments.filter((a) => a.status !== "cancelled" && a.status !== "completed");
  const past = appointments.filter((a) => a.status === "completed" || a.status === "cancelled");

  const activeKioskSlots = kioskSlotsList;
  const mainAppt = upcoming[0];

  return (
    <Screen nav={true}>
      {view === "list" && (upcoming.length > 0 || past.length > 0) ? (
        <div className="px-5 pt-6 pb-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[28px] font-bold leading-tight">{t("Your Care")}</h1>
            <button onClick={() => setView("book")} className="text-primary font-bold text-[14px]">{t("Book new")}</button>
          </div>
          
          <div className="flex flex-col gap-4 mt-2">
            {upcoming.map((appt) => {
              const isKiosk = appt.booking_type === "kiosk" || appt.appointment_type === 'Screening';
              return (
                <section key={appt.appointment_id || appt._id} className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between items-start pb-2 border-b border-border">
                    <div className="flex flex-col">
                      <b className="text-[17px] font-bold">{isKiosk ? t("Aaha Kiosk") : t(appt.doctor_name || appt.doctor_id || "Doctor")}</b>
                      <span className="text-[14px] text-muted-foreground">
                        {isKiosk ? t("Screening") : `${t(appt.appointment_type)} • ${t(appt.mode || "In person")}`}
                      </span>
                    </div>
                    <div className="px-3 py-1 bg-brand/10 text-brand rounded-full text-[12px] font-bold capitalize">
                      {t(appt.status)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[15px] py-1">
                    <span className="text-muted-foreground">{t("Date & Time")}</span>
                    <span className="font-semibold text-right">{formatAppointmentDate(appt.appointment_date)}, {appt.appointment_time || appt.slot_label}</span>
                  </div>
                  <div className="flex justify-between items-center text-[15px] pt-1">
                    <span className="text-muted-foreground">{isKiosk ? t("Centre") : (appt.mode === 'Video call' ? t("Location") : t("Location"))}</span>
                    <span className="font-semibold text-right">{appt.mode === 'Video call' ? t("Video Call link sent via SMS") : (appt.centre || t('Aaha Health Centre, Aundh, Pune'))}</span>
                  </div>
                  {isKiosk && (
                    <div className="mt-2 p-3 bg-muted rounded-[16px]">
                      <h3 className="text-[13px] font-bold">{t("What gets checked")}</h3>
                      <p className="text-[13px] text-muted-foreground mt-1 mb-0">{t("Blood pressure, ECG, body composition, blood sugar, guided by a nurse.")}</p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {past.length > 0 && (
            <div className="mt-8">
              <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase mb-3">{t("Past bookings")}</div>
              <div className="flex flex-col gap-3">
                {past.map((a) => {
                  const isKiosk = a.booking_type === "kiosk" || a.appointment_type === 'Screening';
                  return (
                    <div key={a.appointment_id || a._id} className="bg-card border border-border rounded-[20px] p-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-[15px]">{isKiosk ? t("Aaha Kiosk") : t(a.doctor_name || a.doctor_id || "Doctor")}</div>
                        <div className="text-[13px] text-muted-foreground">{formatAppointmentDate(a.appointment_date)} • {t(a.appointment_type)}</div>
                      </div>
                      <div className="px-3 py-1 bg-muted rounded-full text-[12px] font-bold text-muted-foreground capitalize">
                        {t(a.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      ) : view === "book" ? (
        <div className="flex flex-col h-full relative pb-[80px]">
          <div className="px-5 pt-6 pb-2">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-[28px] font-bold leading-tight">{t("Care")}</h1>
              {upcoming.length > 0 && (
                <button onClick={() => setView("list")} className="text-primary font-bold text-[14px]">{t("View Bookings")}</button>
              )}
            </div>
            
            <div className="h-[48px] p-1 rounded-[24px] bg-card border border-border grid grid-cols-2 gap-1 shrink-0 mb-3">
              <button onClick={() => setCareTab("doctor")} className={`rounded-[20px] text-[15px] font-semibold transition-colors ${careTab === "doctor" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {t("Book a doctor")}
              </button>
              <button onClick={() => setCareTab("kiosk")} className={`rounded-[20px] text-[15px] font-semibold transition-colors ${careTab === "kiosk" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {t("Kiosk screening")}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-[100px] flex flex-col gap-4">
            {careTab === "doctor" && (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase">{t("Reason for visit")}</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
                    {APPOINTMENT_TYPES.map(typeStr => (
                      <button key={typeStr} onClick={() => setAppointmentType(typeStr)} className={`h-[44px] px-4 rounded-full border shrink-0 text-[15px] font-semibold transition-colors ${appointmentType === typeStr ? 'bg-primary border-primary text-primary-foreground font-bold' : 'bg-transparent border-border text-foreground'}`}>
                        {t(typeStr)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {['In person', 'Video call'].map(m => (
                    <button key={m} onClick={() => setMode(m)} className={`h-[44px] px-4 rounded-full border shrink-0 text-[15px] font-semibold transition-colors ${mode === m ? 'bg-primary border-primary text-primary-foreground font-bold' : 'bg-transparent border-border text-foreground'}`}>
                      {t(m)}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Icon name="location_on" className="text-[18px]" />
                  <span>{mode === 'In person' ? t('Aaha Health Centre, Aundh, Pune') : t('Video call with an Aaha doctor')}</span>
                </div>
              </>
            )}

            {careTab === "kiosk" && (
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <Icon name="location_on" className="text-[18px]" />
                <span>{t("Aaha Health Centre, Aundh, Pune")}</span>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 mt-1">
              {upcomingDays.map(d => {
                const dateStr = d.toISOString().split("T")[0];
                return (
                  <button key={dateStr} onClick={() => setSelectedDate(dateStr)} className={`h-[68px] w-[60px] rounded-[20px] border flex flex-col items-center justify-center shrink-0 transition-colors ${selectedDate === dateStr ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-foreground'}`}>
                    <small className={`text-[12px] font-bold tracking-wider ${selectedDate === dateStr ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>{t(WEEKDAYS[d.getDay()])}</small>
                    <b className="text-[22px] font-bold leading-tight">{d.getDate()}</b>
                  </button>
                );
              })}
            </div>

            {careTab === "doctor" ? (
              <div className="flex flex-col gap-3">
                {loadingSlots ? (
                  <div className="p-4 text-center text-muted-foreground text-[14px]">
                    <Icon name="progress_activity" className="animate-spin text-primary mr-2" />
                    {t("Loading slots...")}
                  </div>
                ) : (
                  DOCTORS.map((d, k) => {
                    const name = d.n || "Unknown Doctor";
                    const initial = name.replace("Dr. ", "").charAt(0) || "D";
                    return (
                      <section key={k} className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="size-[48px] rounded-full bg-accent text-primary grid place-items-center font-bold text-[18px] shrink-0">
                            {initial}
                          </span>
                          <div>
                            <div className="font-bold text-[17px]">{t(name)}</div>
                            <div className="text-[14px] text-muted-foreground">{t(d.s || "General")}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(doctorSlotsList[name] || []).length === 0 ? (
                            <div className="p-2 text-muted-foreground text-[14px]">{t("No slots available")}</div>
                          ) : (
                            (doctorSlotsList[name] || []).map(t => {
                              const isSelected = slot?.doctor === name && slot?.time === t;
                              return (
                                <button key={t} onClick={() => setSlot({ doctor: name, time: t })} className={`h-[44px] px-[14px] rounded-full border text-[15px] font-semibold transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground font-bold' : 'bg-transparent border-border text-foreground'}`}>
                                  {t}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </section>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="size-[48px] rounded-full bg-accent text-primary grid place-items-center font-bold text-[18px] shrink-0">
                      <Icon name="monitor_heart" />
                    </span>
                    <div>
                      <div className="font-bold text-[17px]">{t("Aaha kiosk")}</div>
                      <div className="text-[14px] text-muted-foreground">{t("A nurse guides you through it")}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {loadingSlots ? (
                      <div className="p-2 text-muted-foreground text-[14px]">
                        {t("Loading slots...")}
                      </div>
                    ) : activeKioskSlots.length === 0 ? (
                      <div className="p-2 text-muted-foreground text-[14px]">
                        {t("No kiosk slots available for this date")}
                      </div>
                    ) : (
                      activeKioskSlots.map(t => {
                        const isSelected = kioskSlot === t;
                        return (
                          <button key={t} onClick={() => setKioskSlot(t)} className={`h-[44px] px-[14px] rounded-full border text-[15px] font-semibold transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground font-bold' : 'bg-transparent border-border text-foreground'}`}>
                            {t}
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
                <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-1.5 mt-2 shadow-sm">
                  <h2 className="text-[15px] font-bold leading-snug">{t("What gets checked")}</h2>
                  <p className="text-[15px] text-foreground m-0">{t("Blood pressure, ECG, body composition and blood sugar, plus a few questions from Aaha.")}</p>
                  <p className="text-[15px] text-muted-foreground m-0 mt-1">{t("Your results and score appear in the app straight after.")}</p>
                </section>
              </>
            )}
          </div>

          <div className="fixed bottom-[76px] left-1/2 w-full max-w-md -translate-x-1/2 px-5 pb-2 pointer-events-none z-10">
            {careTab === "doctor" ? (
              slot ? (
                <div className="min-h-[64px] px-[10px] pl-5 rounded-[32px] bg-brand text-brand-foreground flex items-center justify-between gap-3 shadow-lg pointer-events-auto">
                  <div className="flex flex-col py-2">
                    <b className="text-[16px] font-bold">{formatAppointmentDate(selectedDate)}, {slot.time}</b>
                    <small className="text-[13px] opacity-80">{t(mode)}{mode === 'In person' ? t(', Aundh') : ''}</small>
                  </div>
                  <button onClick={handleBook} disabled={busy} className="h-[44px] px-[22px] rounded-full bg-[#FFD3DF] text-[#5C0A24] font-bold text-[16px]">
                    {busy ? t("Booking...") : t("Confirm")}
                  </button>
                </div>
              ) : (
                <div className="min-h-[64px] px-[10px] rounded-[32px] bg-card border border-border text-muted-foreground flex items-center justify-center text-[15px] font-semibold shadow-lg pointer-events-auto">
                  {t("Pick a time to continue")}
                </div>
              )
            ) : (
              kioskSlot ? (
                <div className="min-h-[64px] px-[10px] pl-5 rounded-[32px] bg-brand text-brand-foreground flex items-center justify-between gap-3 shadow-lg pointer-events-auto">
                  <div className="flex flex-col py-2">
                    <b className="text-[16px] font-bold">{formatAppointmentDate(selectedDate)}, {kioskSlot}</b>
                    <small className="text-[13px] opacity-80">{t("Kiosk screening, Aundh")}</small>
                  </div>
                  <button onClick={handleBook} disabled={busy} className="h-[44px] px-[22px] rounded-full bg-[#FFD3DF] text-[#5C0A24] font-bold text-[16px]">
                    {busy ? t("Booking...") : t("Confirm")}
                  </button>
                </div>
              ) : (
                <div className="min-h-[64px] px-[10px] rounded-[32px] bg-card border border-border text-muted-foreground flex items-center justify-center text-[15px] font-semibold shadow-lg pointer-events-auto">
                  {t("Pick a time to continue")}
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <Icon name="progress_activity" className="animate-spin text-primary text-3xl" />
        </div>
      )}
    </Screen>
  );
}
