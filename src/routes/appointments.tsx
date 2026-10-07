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

  const [availableDoctors, setAvailableDoctors] = useState<Array<{ doctorId: string; doctorName: string; specialty: string; availableSlots: string[] }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await apiService.getAppointmentSlots(selectedDate);
        setAvailableDoctors(res.slots || []);
        // Clear slot if current selected doctor isn't in new list or slot doesn't exist
      } catch (error) {
        console.error("Failed to load slots", error);
        setAvailableDoctors([]);
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
          notes: `Mode: ${mode}`,
        });
      } else {
        if (!kioskSlot) { toast.error("Pick a time slot"); setBusy(false); return; }
        await apiService.bookAppointment({
          appointment_date: selectedDate,
          appointment_time: kioskSlot,
          appointment_type: "Screening",
          centre: "Aaha Health Centre, Aundh, Pune",
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
  const mainAppt = upcoming[0];

  return (
    <Screen nav={true}>
      {view === "list" && mainAppt ? (
        <div className="px-5 pt-6 pb-6 flex flex-col">
          <div className="flex flex-col items-center pt-4">
            <div className="size-[76px] rounded-full bg-primary text-primary-foreground grid place-items-center mb-3">
              <Icon name="check" className="text-[38px] font-bold" />
            </div>
            <h1 className="text-[26px] font-bold text-center leading-tight">
              {mainAppt.appointment_type === 'Screening' ? t('Kiosk screening booked') : t('Visit booked')}
            </h1>
            <p className="text-[15px] text-muted-foreground text-center mt-1">
              {t("We will see you at the centre.")}
            </p>
          </div>
          
          <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-2 mt-5 shadow-sm">
            <div className="flex justify-between items-center text-[15px] border-b border-border pb-2">
              <span className="text-muted-foreground">{t("When")}</span>
              <span className="font-semibold text-right">{formatAppointmentDate(mainAppt.appointment_date)}, {mainAppt.appointment_time || mainAppt.slot_label}</span>
            </div>
            <div className="flex justify-between items-center text-[15px] border-b border-border py-2">
              <span className="text-muted-foreground">{mainAppt.appointment_type === 'Screening' ? t('Provider') : t('Doctor')}</span>
              <span className="font-semibold text-right">{t(mainAppt.doctor_name || mainAppt.appointment_type)}</span>
            </div>
            <div className="flex justify-between items-center text-[15px] border-b border-border py-2">
              <span className="text-muted-foreground">{t("Type")}</span>
              <span className="font-semibold text-right">{t(mainAppt.appointment_type)}</span>
            </div>
            <div className="flex justify-between items-center text-[15px] pt-2">
              <span className="text-muted-foreground">{t("Where")}</span>
              <span className="font-semibold text-right">{mainAppt.centre || t('Aaha Health Centre, Aundh, Pune')}</span>
            </div>
          </section>

          {mainAppt.appointment_type === 'Screening' ? (
            <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-1.5 mt-3 shadow-sm">
              <h2 className="text-[16px] font-bold leading-snug">{t("What gets checked")}</h2>
              <p className="text-[14px] text-muted-foreground m-0">{t("Blood pressure, ECG, body composition and blood sugar, plus a few questions from Aaha. A nurse guides you through it, and your results appear in the app straight after.")}</p>
            </section>
          ) : (
            <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-1.5 mt-3 shadow-sm">
              <h2 className="text-[16px] font-bold leading-snug">{t("Your doctor already has your results")}</h2>
              <p className="text-[14px] text-muted-foreground m-0">{t("Your score, check-up answers and lab report are shared before the visit, so you do not need to explain again.")}</p>
            </section>
          )}

          <div className="flex-1 min-h-[40px]"></div>
          
          <div className="flex flex-col gap-3 mt-6">
            <Btn onClick={() => setView("book")} variant="ghost" className="h-[52px]">{t("Book another visit")}</Btn>
          </div>
          
          {past.length > 0 && (
            <div className="mt-8">
              <div className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase mb-3">{t("Past visits")}</div>
              <div className="flex flex-col gap-3">
                {past.map(a => (
                  <div key={a.appointment_id} className="bg-card border border-border rounded-[20px] p-3 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[15px]">{t(a.appointment_type)}</div>
                      <div className="text-[13px] text-muted-foreground">{formatAppointmentDate(a.appointment_date)}</div>
                    </div>
                    <div className="px-3 py-1 bg-muted rounded-full text-[12px] font-bold text-muted-foreground capitalize">
                      {t(a.status)}
                    </div>
                  </div>
                ))}
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
                ) : availableDoctors.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-[14px]">
                    {t("No available slots for this date")}
                  </div>
                ) : (
                  availableDoctors.map((d, k) => (
                    <section key={k} className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="size-[48px] rounded-full bg-accent text-primary grid place-items-center font-bold text-[18px] shrink-0">
                          {d.doctorName.replace("Dr. ", "").charAt(0)}
                        </span>
                        <div>
                          <div className="font-bold text-[17px]">{t(d.doctorName)}</div>
                          <div className="text-[14px] text-muted-foreground">{t(d.specialty)}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {d.availableSlots.map(t => {
                          const isSelected = slot?.doctor === d.doctorName && slot?.time === t;
                          return (
                            <button key={t} onClick={() => setSlot({ doctor: d.doctorName, time: t })} className={`h-[44px] px-[14px] rounded-full border text-[15px] font-semibold transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground font-bold' : 'bg-transparent border-border text-foreground'}`}>
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))
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
                    {KSLOTS.map(t => {
                      const isSelected = kioskSlot === t;
                      return (
                        <button key={t} onClick={() => setKioskSlot(t)} className={`h-[44px] px-[14px] rounded-full border text-[15px] font-semibold transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground font-bold' : 'bg-transparent border-border text-foreground'}`}>
                          {t}
                        </button>
                      );
                    })}
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
