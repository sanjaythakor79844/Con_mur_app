import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Icon, Screen, Card, Btn, Pill } from "@/components/aaha";
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
      { title: "Care, Treatments & Booking | Aaha Companion" },
      {
        name: "description",
        content:
          "Book, view, and manage your clinical treatments, doctor consultations, kiosk screenings, and care packages at the Aaha Health Centre.",
      },
    ],
  }),
  component: AppointmentsScreen,
});

/* ─── Centre Doctors & Practitioners ─── */
const DOCTORS = [
  {
    id: "Dr. Meera Joshi",
    name: "Dr. Meera Joshi",
    speciality: "Women's Health & Lifestyle",
    focus: "PCOS, Preventive Care, Longevity",
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

/* ─── Treatment Categories ─── */
const TREATMENT_CATEGORIES = [
  { id: "all", label: "All Treatments" },
  { id: "skin", label: "Skin & Face" },
  { id: "hair", label: "Hair Therapy" },
  { id: "iv", label: "IV Drips" },
  { id: "clinic", label: "Consults & Kiosk" },
] as const;

type TreatmentCategory = (typeof TREATMENT_CATEGORIES)[number]["id"];

/* ─── Pre-screening Safety Questionnaires ─── */
const SCR_SKIN = [
  "Any active acne flare-up, eczema, or open lesions on the face?",
  "Used prescription retinoids or had an exfoliating peel in the past 14 days?",
];

const SCR_HAIR = [
  "Currently taking blood thinners, anticoagulants, or daily aspirin?",
  "Any active scalp inflammation, folliculitis, or irritation right now?",
];

const SCR_IV = [
  "Any known allergy to medications, sulfur, or vitamin concentrates?",
  "Are you currently pregnant or actively breastfeeding?",
  "Any diagnosed kidney, hepatic, or cardiovascular condition?",
];

export interface TreatmentService {
  id: string;
  cat: "skin" | "hair" | "iv" | "clinic";
  name: string;
  duration: string;
  summary: string;
  packages: number[];
  requiresDoctorSignOff: boolean;
  screeningQuestions?: string[];
  aftercareNotes?: string;
  appointmentType: string;
  defaultMode?: string;
  centreLocation?: string;
}

/* ─── Verified Pune Centre Treatments & Services Catalogue ─── */
const TREATMENTS_CATALOGUE: TreatmentService[] = [
  {
    id: "hf",
    cat: "skin",
    name: "HydraFacial",
    duration: "Cleanse, extract & hydrate · 45 min",
    summary:
      "A medical three-step facial that clears congestion, extracts impurities, and infuses restorative hyaluronic hydration.",
    packages: [1, 3, 6],
    requiresDoctorSignOff: false,
    screeningQuestions: SCR_SKIN,
    aftercareNotes:
      "No make-up for 6 hours. Sunscreen every morning. Skip active serums and retinoids for 48 hours.",
    appointmentType: "HydraFacial",
    defaultMode: "In person",
  },
  {
    id: "peel",
    cat: "skin",
    name: "Medical Chemical Peel",
    duration: "Tone & texture exfoliation · 30 min",
    summary:
      "Physician-calibrated exfoliation targeting texture, pigmentation, and fine lines. Acid formulation selected upon consult.",
    packages: [1, 3],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_SKIN,
    aftercareNotes:
      "Expect light flaking for 3 to 5 days. Avoid direct UV exposure, no scrubbing, apply SPF50+ daily.",
    appointmentType: "Chemical Peel",
    defaultMode: "In person",
  },
  {
    id: "mask",
    cat: "skin",
    name: "Red-Light Photobiomodulation",
    duration: "Collagen & recovery · 20 min",
    summary:
      "Targeted red and near-infrared light wavelengths to stimulate cellular ATP production, collagen synthesis, and decrease erythema.",
    packages: [1, 6],
    requiresDoctorSignOff: false,
    aftercareNotes: "Stay well hydrated. Avoid direct sunbathing for the remainder of the day.",
    appointmentType: "Red-light Therapy",
    defaultMode: "In person",
  },
  {
    id: "gfc",
    cat: "hair",
    name: "Hair Growth Therapy (GFC)",
    duration: "Autologous growth concentrate · 45 min",
    summary:
      "Autologous growth factor concentrate prepared from your blood sample and micro-infused into the scalp to awaken miniaturised follicles.",
    packages: [1, 3, 6],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_HAIR,
    aftercareNotes:
      "No hair wash for 24 hours. Gentle shampoo only for 3 days. No vigorous scalp rubbing or oiling.",
    appointmentType: "Hair Growth Therapy",
    defaultMode: "In person",
  },
  {
    id: "meso",
    cat: "hair",
    name: "Scalp Peptide Mesotherapy",
    duration: "Targeted folicle infusion · 30 min",
    summary:
      "Precision dermal papilla infusion of biomimetic peptides, biotin, and vasodilators to slow shedding and enhance shaft calibre.",
    packages: [1, 4],
    requiresDoctorSignOff: false,
    screeningQuestions: SCR_HAIR,
    aftercareNotes: "Keep the scalp clean and dry for 12 hours. Normal hair wash resumes next day.",
    appointmentType: "Scalp Mesotherapy",
    defaultMode: "In person",
  },
  {
    id: "laser_hair",
    cat: "hair",
    name: "Low-Level Laser Scalp Therapy",
    duration: "Circulation & density · 20 min",
    summary:
      "Cold medical-grade diode laser canopy that stimulates microcirculation around follicles, supporting active anagen growth.",
    packages: [1, 6, 12],
    requiresDoctorSignOff: false,
    aftercareNotes: "No special restrictions. Best paired with physician-prescribed topicals.",
    appointmentType: "Scalp Laser",
    defaultMode: "In person",
  },
  {
    id: "nad",
    cat: "iv",
    name: "NAD+ Longevity Infusion",
    duration: "Cellular repair & energy · 90 min",
    summary:
      "High-bioavailability coenzyme infusion that fuels mitochondrial sirtuins, supports DNA repair enzymes, and sharpens cognitive vitality.",
    packages: [1, 3, 5],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes:
      "Sip room-temperature water. Mild chest tightness or flushing during infusion is normal and resolves instantly with rate adjustment.",
    appointmentType: "NAD+ Infusion",
    defaultMode: "In person",
  },
  {
    id: "gluta",
    cat: "iv",
    name: "Master Antioxidant Drip (Glutathione)",
    duration: "Hepatic detox & radiant tone · 45 min",
    summary:
      "Reduced L-glutathione combined with intravenous vitamin C to neutralise free radicals, ease liver oxidative stress, and brighten skin tone.",
    packages: [1, 4, 8],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes:
      "Stay hydrated through the day. Continue taking vitamin C orally to support glutathione recycling.",
    appointmentType: "Glutathione Drip",
    defaultMode: "In person",
  },
  {
    id: "iron",
    cat: "iv",
    name: "Iron Carboxymaltose Infusion",
    duration: "Rapid ferritin restoration · 45 min",
    summary:
      "Hospital-grade elemental iron infusion to resolve chronic fatigue and correct refractory ferritin deficiency under continuous nursing supervision.",
    packages: [1],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes:
      "Do not take oral iron pills for 5 days. Repeat ferritin blood test in 4 weeks at the centre.",
    appointmentType: "Iron Infusion",
    defaultMode: "In person",
  },
  {
    id: "drip_metabolic",
    cat: "iv",
    name: "Metabolic & Hormonal Health Drip",
    duration: "Insulin & energy balance · 60 min",
    summary:
      "Targeted micronutrient cofactors (alpha-lipoic acid, magnesium, B-complex, zinc) formulated to support peripheral glucose disposal.",
    packages: [1, 4],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes:
      "Have a protein-forward snack within 2 hours. Walk gently in the evening to optimize uptake.",
    appointmentType: "Metabolic Drip",
    defaultMode: "In person",
  },
  {
    id: "consult",
    cat: "clinic",
    name: "Physician Clinical Consultation",
    duration: "Comprehensive 1-on-1 review · 30 min",
    summary:
      "In-depth clinical consult with Dr. Meera Joshi or Dr. Anand Rao to review lab findings, AWIS wellness scores, and calibrate your care plan.",
    packages: [1],
    requiresDoctorSignOff: false,
    appointmentType: "Consultation",
    defaultMode: "In person",
  },
  {
    id: "kiosk",
    cat: "clinic",
    name: "Aaha Health Kiosk Screening",
    duration: "Full vitals, ECG & AWIS · 15 min",
    summary:
      "Walk-in or scheduled vital assessment: blood pressure, SpO2, resting pulse, body composition, and updated AWIS score calculation.",
    packages: [1],
    requiresDoctorSignOff: false,
    appointmentType: "Screening",
    defaultMode: "In person",
  },
];

/* ─── Helper to format upcoming dates for appointment scheduler ─── */
function getUpcomingDays(count = 7): Date[] {
  const list: Date[] = [];
  const start = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    list.push(d);
  }
  return list;
}

function formatAppointmentDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AppointmentsScreen() {
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to manage and schedule your Aaha appointments.")}>
      <AppointmentsContent />
    </RequireAuth>
  );
}

function AppointmentsContent() {
  const { t } = useI18n();
  const { user, userId, patient } = useAuth();

  // Top tabs: 'visits' | 'treatments' | 'book'
  const [activeTab, setActiveTab] = useState<"visits" | "treatments" | "book">("visits");

  // List filter: 'upcoming' | 'past'
  const [listFilter, setListFilter] = useState<"upcoming" | "past">("upcoming");

  // Treatments catalogue category filter
  const [treatmentCategory, setTreatmentCategory] = useState<TreatmentCategory>("all");

  // Treatment detail modal state
  const [inspectedTreatment, setInspectedTreatment] = useState<TreatmentService | null>(null);
  const [selectedPackOption, setSelectedPackOption] = useState<number>(1);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<number, boolean>>({});

  // Aftercare modal state
  const [aftercareAppt, setAftercareAppt] = useState<Appointment | null>(null);

  // Booking form states
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("consult");
  const [careTab, setCareTab] = useState<"doctor" | "kiosk" | "treatment">("doctor");
  const [selectedDoctorId, setSelectedDoctorId] = useState(DOCTORS[0].id);
  const [mode, setMode] = useState<string>("In person");
  const [notes, setNotes] = useState<string>("");

  const upcomingDays = useMemo(() => getUpcomingDays(7), []);
  const [selectedDate, setSelectedDate] = useState<string>(
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

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  // Load appointments on mount
  useEffect(() => {
    void loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const items = await listAppointments();
      setAppointments(items);
    } catch (err: any) {
      console.error("Failed to load appointments:", err);
      setListError(err?.message || "Could not load appointments. Please try again.");
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch real slots whenever selected date, careTab, or doctor changes
  useEffect(() => {
    if (activeTab !== "book") return;

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
  }, [selectedDate, careTab, selectedDoctorId, activeTab]);

  // Open treatment inspector sheet
  const handleOpenTreatmentSheet = (treatment: TreatmentService) => {
    setInspectedTreatment(treatment);
    setSelectedPackOption(treatment.packages[0] || 1);
    setScreeningAnswers({});
  };

  // Transition from treatment sheet to booking scheduler
  const handleProceedToBooking = (treatment: TreatmentService) => {
    setSelectedTreatmentId(treatment.id);
    if (treatment.cat === "clinic") {
      if (treatment.id === "kiosk") {
        setCareTab("kiosk");
        setMode("In person");
      } else {
        setCareTab("doctor");
      }
    } else {
      setCareTab("treatment");
      setMode("In person");
    }
    setInspectedTreatment(null);
    setActiveTab("book");
  };

  // Book appointment handler
  const handleBook = async () => {
    if (!selectedSlot) {
      toast.error(t("Please select an available time slot"));
      return;
    }

    setSubmitting(true);
    try {
      const isKiosk = careTab === "kiosk";
      const isTreatment = careTab === "treatment";
      const selectedDoc = DOCTORS.find((d) => d.id === selectedDoctorId) || DOCTORS[0];
      const matchedTreatment = TREATMENTS_CATALOGUE.find((x) => x.id === selectedTreatmentId);

      // Check if treatment requires doctor review or if any screening was flagged
      const anyScreeningFlagged = Object.values(screeningAnswers).some((ans) => ans === true);
      const needsReview = Boolean(matchedTreatment?.requiresDoctorSignOff || anyScreeningFlagged);

      let apptType = "Consultation";
      let bookingType = "doctor";
      let apptNotes = notes.trim();

      if (isKiosk) {
        apptType = "Screening";
        bookingType = "kiosk";
        apptNotes = apptNotes || "Kiosk Health Screening";
      } else if (isTreatment && matchedTreatment) {
        apptType = matchedTreatment.name;
        bookingType = "general";
        const packNote = selectedPackOption > 1 ? `Pack of ${selectedPackOption} (Session 1)` : "Single session";
        const signNote = needsReview ? " [Requires Doctor Sign-off]" : "";
        apptNotes = apptNotes ? `${matchedTreatment.name} · ${packNote}${signNote}: ${apptNotes}` : `${matchedTreatment.name} · ${packNote}${signNote}`;
      } else {
        apptNotes = apptNotes || `${apptType} (${mode})`;
      }

      await bookAppointment({
        userId: userId || undefined,
        patientId: patient?.patient_id ? String(patient.patient_id) : undefined,
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot,
        appointmentType: apptType,
        bookingType,
        mode: isKiosk ? "In person" : mode,
        centre: "Aaha Health Centre, Aundh, Pune",
        doctorId: isKiosk ? undefined : selectedDoc.id,
        doctorName: isKiosk ? undefined : selectedDoc.name,
        kioskId: isKiosk ? "Aaha Kiosk" : undefined,
        speciality: isKiosk ? "Kiosk Screening" : isTreatment ? (matchedTreatment?.name || "Clinical Treatment") : selectedDoc.speciality,
        notes: apptNotes,
      });

      if (needsReview) {
        toast.success(t("Booking submitted! Sent to supervising physician for clinical sign-off."));
      } else {
        toast.success(t("Appointment confirmed successfully! 🎉"));
      }

      setSelectedSlot(null);
      setNotes("");
      setActiveTab("visits");
      setListFilter("upcoming");
      await loadAppointments();
    } catch (err: any) {
      console.error("Booking error:", err);
      if (err?.status === 409 || err?.message?.toLowerCase().includes("already booked")) {
        toast.error(t("This slot was just booked by another patient. Please choose another time."));
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

  // Filter treatments catalogue by category
  const filteredTreatments = useMemo(() => {
    if (treatmentCategory === "all") return TREATMENTS_CATALOGUE;
    return TREATMENTS_CATALOGUE.filter((item) => item.cat === treatmentCategory);
  }, [treatmentCategory]);

  return (
    <Screen nav={true}>
      <div className="min-h-screen px-4 pb-28 pt-4 sm:px-6 max-w-lg mx-auto w-full">
        {/* 1. Header with AAHA Brand & Title */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center">
                <Icon name="healing" className="text-[18px]" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  {t("Aaha Care & Visits")}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {t("Aaha Health Centre, Aundh, Pune · 8:00 AM – 8:00 PM")}
                </p>
              </div>
            </div>

            {/* Quick Action Button */}
            {activeTab === "book" ? (
              <Btn
                variant="outline"
                size="sm"
                className="w-auto h-8 px-3 text-xs"
                onClick={() => setActiveTab("visits")}
                icon="event_available"
              >
                {t("My Visits")}
              </Btn>
            ) : (
              <Btn
                variant="primary"
                size="sm"
                className="w-auto h-8 px-3 text-xs"
                onClick={() => setActiveTab("book")}
                icon="add"
              >
                {t("Book Visit")}
              </Btn>
            )}
          </div>

          {/* Top 3-way Segmented Switcher: Visits | Treatments | Schedule */}
          <div className="h-11 p-1 rounded-2xl bg-muted/60 border border-border/80 grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("visits")}
              className={cn(
                "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "visits"
                  ? "bg-card text-foreground shadow-soft border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name="event_available" className="text-[15px]" />
              <span>{t("Visits")}</span>
              {upcomingAppointments.length > 0 && (
                <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                  {upcomingAppointments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("treatments")}
              className={cn(
                "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "treatments"
                  ? "bg-card text-foreground shadow-soft border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name="spa" className="text-[15px]" />
              <span>{t("Treatments")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("book")}
              className={cn(
                "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "book"
                  ? "bg-card text-foreground shadow-soft border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name="edit_calendar" className="text-[15px]" />
              <span>{t("Schedule")}</span>
            </button>
          </div>
        </header>

        {/* ─── TAB 1: VISITS (Upcoming & Past Sessions) ─── */}
        {activeTab === "visits" && (
          <div className="space-y-4">
            {/* Filter pills: Upcoming vs Past */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setListFilter("upcoming")}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-semibold transition-colors border",
                  listFilter === "upcoming"
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-soft"
                    : "bg-card text-muted-foreground border-border/80 hover:text-foreground",
                )}
              >
                {t("Upcoming")} ({upcomingAppointments.length})
              </button>
              <button
                type="button"
                onClick={() => setListFilter("past")}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-semibold transition-colors border",
                  listFilter === "past"
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-soft"
                    : "bg-card text-muted-foreground border-border/80 hover:text-foreground",
                )}
              >
                {t("Past & Cancelled")} ({pastAppointments.length})
              </button>
            </div>

            {/* Loading Skeleton */}
            {loadingList ? (
              <div className="space-y-3 pt-1">
                <div className="h-28 w-full animate-pulse rounded-2xl bg-muted/40" />
                <div className="h-28 w-full animate-pulse rounded-2xl bg-muted/40" />
              </div>
            ) : listError ? (
              <Card className="text-center p-6 border-destructive/40 space-y-2">
                <Icon name="error" className="text-2xl text-destructive mx-auto" />
                <p className="text-xs font-semibold text-destructive">{listError}</p>
                <Btn
                  onClick={loadAppointments}
                  size="sm"
                  variant="outline"
                  className="mt-2 w-auto mx-auto"
                >
                  {t("Retry")}
                </Btn>
              </Card>
            ) : displayedList.length === 0 ? (
              <Card className="p-8 text-center space-y-2 shadow-soft">
                <div className="size-12 rounded-full border border-border bg-muted/30 grid place-items-center mb-2 mx-auto text-muted-foreground">
                  <Icon
                    name={listFilter === "upcoming" ? "event_available" : "history"}
                    className="text-2xl"
                  />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {listFilter === "upcoming"
                    ? t("No upcoming visits booked")
                    : t("No past sessions on record")}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {listFilter === "upcoming"
                    ? t("Your next clinical treatment, doctor consult, or kiosk screening is one tap away.")
                    : t("Completed and cancelled appointments will appear here after your centre check-in.")}
                </p>
                {listFilter === "upcoming" && (
                  <Btn
                    onClick={() => setActiveTab("treatments")}
                    size="sm"
                    className="mt-4 w-auto mx-auto"
                    icon="add"
                  >
                    {t("Explore Treatments & Book")}
                  </Btn>
                )}
              </Card>
            ) : (
              /* Appointment List */
              <div className="space-y-3">
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

                  const apptDateObj = dateStr ? new Date(dateStr) : new Date();
                  const dayNum = Number.isNaN(apptDateObj.getTime()) ? "—" : apptDateObj.getDate();
                  const monthStr = Number.isNaN(apptDateObj.getTime())
                    ? "APT"
                    : apptDateObj.toLocaleDateString("en-IN", { month: "short" });

                  return (
                    <Card
                      key={appt.id || appt.appointment_id || appt._id}
                      className={cn(
                        "p-4 space-y-3 shadow-soft",
                        isCancelled && "opacity-60 border-dashed",
                      )}
                    >
                      {/* Top Row: Date Box + Title + Status */}
                      <div className="flex items-start gap-3.5">
                        <div className="size-14 rounded-2xl border border-border/80 bg-muted/40 flex flex-col items-center justify-center shrink-0">
                          <b className="text-xl font-bold text-foreground leading-none">{dayNum}</b>
                          <span className="text-[10px] font-mono uppercase text-muted-foreground mt-0.5">{monthStr}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {isKiosk
                                ? t("Aaha Health Kiosk Screening")
                                : t(appt.appointment_type || appt.doctor_name || "Clinical Visit")}
                            </h3>

                            {/* Status indicator */}
                            {isPending ? (
                              <Pill tone="amber" icon="pending">
                                {t("Awaiting Sign-off")}
                              </Pill>
                            ) : isCancelled ? (
                              <Pill tone="red" icon="cancel">
                                {t("Cancelled")}
                              </Pill>
                            ) : isCompleted ? (
                              <Pill tone="neutral" icon="done_all">
                                {t("Completed")}
                              </Pill>
                            ) : (
                              <Pill tone="green" icon="check_circle">
                                {t("Confirmed")}
                              </Pill>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {isKiosk
                              ? t("Full Vitals, ECG & AWIS Screening")
                              : t(appt.doctor_name || appt.speciality || "Aaha Clinical Care")}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-muted-foreground">
                            <span className="text-foreground font-semibold">{timeStr}</span>
                            <span>·</span>
                            <span>{t(appt.mode || "In person")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes / Speciality */}
                      {appt.notes && (
                        <div className="p-2.5 rounded-xl bg-muted/40 text-xs text-muted-foreground border border-border/60 leading-relaxed">
                          <span className="font-semibold text-foreground">{t("Notes")}:</span>{" "}
                          {appt.notes}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          {isKiosk ? t("Aaha Health Kiosk, Aundh") : t(appt.centre || "Aaha Health Centre, Pune")}
                        </span>

                        <div className="flex items-center gap-2">
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => setAftercareAppt(appt)}
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                              <Icon name="medical_services" className="text-[14px]" />
                              <span>{t("Aftercare")}</span>
                            </button>
                          )}

                          {!isCancelled && !isCompleted && (
                            <button
                              type="button"
                              onClick={() => setCancellingAppt(appt)}
                              className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 transition-colors"
                            >
                              <Icon name="cancel" className="text-[14px]" />
                              <span>{t("Cancel Visit")}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* ─── Care Team Card ─── */}
            <div className="mt-4 space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                {t("Your Centre Care Team")}
              </span>
              <Card className="p-0 overflow-hidden divide-y divide-border/40 shadow-soft">
                {[
                  {
                    initial: "M",
                    name: "Dr. Meera Joshi",
                    role: t("Supervising Physician · Women's Health & Longevity"),
                    action: () => {
                      setSelectedDoctorId("Dr. Meera Joshi");
                      setCareTab("doctor");
                      setActiveTab("book");
                    },
                  },
                  {
                    initial: "A",
                    name: "Dr. Anand Rao",
                    role: t("Consulting Physician · General Medicine & Chronic Care"),
                    action: () => {
                      setSelectedDoctorId("Dr. Anand Rao");
                      setCareTab("doctor");
                      setActiveTab("book");
                    },
                  },
                  {
                    initial: "T",
                    name: "Nurse Trupti",
                    role: t("Centre Nurse · Kiosk Screenings & Treatments"),
                    action: () => {
                      setCareTab("kiosk");
                      setActiveTab("book");
                    },
                  },
                  {
                    initial: "S",
                    name: "Aaha Clinical Support",
                    role: t("Care Coordinator · Scheduling & Diagnostic Sync"),
                    action: () => {
                      toast.info(t("Aaha care coordinators are available at the centre counter."));
                    },
                  },
                ].map((member) => (
                  <button
                    key={member.name}
                    type="button"
                    onClick={member.action}
                    className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    <span className="size-9 rounded-full bg-primary/10 text-primary font-bold text-xs grid place-items-center shrink-0">
                      {member.initial}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {member.role}
                      </div>
                    </div>
                    <Icon name="chevron_right" className="text-[16px] text-muted-foreground" />
                  </button>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ─── TAB 2: TREATMENTS & SERVICES CATALOGUE ─── */}
        {activeTab === "treatments" && (
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                {t("Centre Menu")}
              </span>
              <h2 className="text-base font-bold text-foreground mt-0.5">
                {t("Treatments at the Centre")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("Medical therapies administered in person at our Aundh centre under clinical oversight.")}
              </p>
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6">
              {TREATMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTreatmentCategory(cat.id)}
                  className={cn(
                    "h-8 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-colors border",
                    treatmentCategory === cat.id
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-soft"
                      : "bg-card text-muted-foreground border-border/80 hover:text-foreground",
                  )}
                >
                  {t(cat.label)}
                </button>
              ))}
            </div>

            {/* Treatment Cards */}
            <div className="space-y-3">
              {filteredTreatments.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => handleOpenTreatmentSheet(x)}
                  className="w-full text-left p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-colors shadow-soft flex items-center justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {x.name}
                      </span>
                      {x.requiresDoctorSignOff && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground shrink-0">
                          {t("Doctor Sign-off")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{x.duration}</div>
                    <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {x.summary}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-muted-foreground">
                      <span>{t("Options")}:</span>
                      {x.packages.map((n) => (
                        <span
                          key={n}
                          className="px-1.5 py-0.5 rounded border border-border bg-muted/30"
                        >
                          {n === 1 ? t("Single") : t(`${n} pack`)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Icon
                    name="chevron_right"
                    className="text-[18px] text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
                  />
                </button>
              ))}
            </div>

            {/* Clinical Notice on Packages */}
            <Card className="p-3.5 text-xs text-muted-foreground border-dashed space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Icon name="verified" className="text-[15px] text-primary" />
                <span>{t("Centre Treatment Protocol")}</span>
              </div>
              <p className="leading-relaxed m-0">
                {t(
                  "Every clinical therapy and IV infusion is reviewed against your latest blood markers and vital screening. Prepaid package balances are managed directly at the centre and deducted session-by-session upon nurse check-in.",
                )}
              </p>
            </Card>
          </div>
        )}

        {/* ─── TAB 3: BOOK VISIT (Real-time Slot Booking) ─── */}
        {activeTab === "book" && (
          <div className="space-y-5 pb-16">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                {t("Real-Time Scheduling")}
              </span>
              <h2 className="text-base font-bold text-foreground mt-0.5">
                {t("Schedule a Visit")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("Verify available appointments with our clinic server and secure your slot.")}
              </p>
            </div>

            {/* 1. Care Mode Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                {t("Select Care Type")}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "doctor" as const, label: "Doctor", icon: "stethoscope" },
                  { id: "kiosk" as const, label: "Kiosk", icon: "monitor_heart" },
                  { id: "treatment" as const, label: "Treatment", icon: "spa" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCareTab(item.id);
                      if (item.id === "kiosk" || item.id === "treatment") {
                        setMode("In person");
                      }
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all",
                      careTab === item.id
                        ? "bg-primary text-primary-foreground border-primary shadow-soft"
                        : "bg-card text-muted-foreground border-border/80 hover:text-foreground",
                    )}
                  >
                    <Icon name={item.icon} className="text-[20px]" />
                    <span className="text-xs font-bold">{t(item.label)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* If Treatment selected: Choose Treatment from Catalogue */}
            {careTab === "treatment" && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                  {t("Select Treatment")}
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6">
                  {TREATMENTS_CATALOGUE.filter((x) => x.cat !== "clinic").map((tr) => (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => setSelectedTreatmentId(tr.id)}
                      className={cn(
                        "h-9 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-colors border",
                        selectedTreatmentId === tr.id
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-soft"
                          : "bg-card text-muted-foreground border-border/80 hover:text-foreground",
                      )}
                    >
                      {tr.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* If Doctor selected: Mode & Doctor Picker */}
            {careTab === "doctor" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
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
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-soft"
                            : "bg-card text-foreground border-border/80 hover:border-primary/40",
                        )}
                      >
                        <Icon name={m.icon} className="text-[17px]" />
                        <span className="truncate">{t(m.label)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                    {t("Select Doctor")}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DOCTORS.map((doc) => {
                      const isSelected = selectedDoctorId === doc.id;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setSelectedDoctorId(doc.id)}
                          className={cn(
                            "p-3 rounded-2xl border text-left flex items-center gap-3 transition-all",
                            isSelected
                              ? "bg-primary/10 border-primary ring-1 ring-primary"
                              : "bg-card border-border/80 hover:border-border",
                          )}
                        >
                          <span className="size-10 rounded-full bg-primary text-primary-foreground font-bold text-sm grid place-items-center shrink-0">
                            {doc.initial}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-foreground truncate">
                              {doc.name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {doc.speciality}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* If Kiosk selected: Informational Card */}
            {careTab === "kiosk" && (
              <Card className="p-3.5 space-y-1.5 border-border/80 shadow-soft">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Icon name="monitor_heart" className="text-primary text-[18px]" />
                  <span>{t("Aaha Health Kiosk, Aundh, Pune")}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed m-0">
                  {t(
                    "Nurse-assisted 15-minute screening including blood pressure, ECG rhythm, BMI, body composition, and instant AWIS score calculation.",
                  )}
                </p>
              </Card>
            )}

            {/* 2. Date Selection (7-Day Strip) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block">
                {t("Select Date")}
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6">
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
                        "h-16 w-14 rounded-2xl border flex flex-col items-center justify-center shrink-0 transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-soft"
                          : "bg-card text-foreground border-border/80 hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[9px] font-mono uppercase tracking-wider",
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {index === 0 ? t("Today") : t(weekday)}
                      </span>
                      <span className="text-lg font-bold leading-none mt-1">
                        {dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Real Available Time Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  {t("Available Time Slots")}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {formatAppointmentDate(selectedDate)}
                </span>
              </div>

              {loadingSlots ? (
                <div className="p-8 rounded-2xl border border-border/80 bg-card text-center flex flex-col items-center justify-center gap-2">
                  <div className="size-5 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {t("Checking real-time slot availability…")}
                  </span>
                </div>
              ) : slotsError ? (
                <div className="p-4 rounded-2xl border border-destructive/40 bg-destructive/10 text-center text-xs text-destructive">
                  {slotsError}
                </div>
              ) : slotsList.length === 0 ? (
                <div className="p-6 rounded-2xl border border-border/80 bg-card text-center text-xs text-muted-foreground">
                  <Icon name="event_busy" className="text-2xl mb-1 text-muted-foreground" />
                  <p className="font-semibold text-foreground m-0">
                    {t("No available slots for this date")}
                  </p>
                  <p className="mt-1 mb-0">
                    {t("Please select another date from the strip above.")}
                  </p>
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
                          "h-11 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-soft"
                            : "bg-card text-foreground border-border/80 hover:border-primary/40",
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Notes / Symptoms (Optional) */}
            <div className="space-y-1.5">
              <label
                htmlFor="booking-notes"
                className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-1 block"
              >
                {t("Notes / Symptoms (Optional)")}
              </label>
              <input
                id="booking-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("e.g. Discussing fatigue, ferritin re-test, skin flaking")}
                className="h-11 w-full rounded-xl border border-border/80 bg-card px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
              />
            </div>

            {/* 5. Sticky Bottom Summary & Confirmation Bar */}
            <div className="fixed bottom-[74px] left-1/2 w-full max-w-md -translate-x-1/2 px-4 pb-2 pointer-events-none z-20">
              {selectedSlot ? (
                <div className="p-3.5 rounded-2xl bg-card border border-border shadow-lifted flex items-center justify-between gap-3 pointer-events-auto">
                  <div className="min-w-0 py-0.5">
                    <div className="text-xs font-bold text-foreground truncate">
                      {formatAppointmentDate(selectedDate)} · {selectedSlot}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {careTab === "doctor"
                        ? `${selectedDoctorId} (${mode})`
                        : careTab === "kiosk"
                          ? t("Kiosk Health Screening")
                          : (TREATMENTS_CATALOGUE.find((x) => x.id === selectedTreatmentId)?.name || "Clinical Treatment")}
                    </div>
                  </div>

                  <Btn
                    size="sm"
                    className="w-auto h-9 px-4 text-xs shrink-0"
                    onClick={handleBook}
                    disabled={submitting}
                    icon={submitting ? undefined : "check"}
                  >
                    {submitting ? t("Booking…") : t("Confirm Booking")}
                  </Btn>
                </div>
              ) : (
                <div className="h-11 px-4 rounded-2xl bg-card/90 backdrop-blur-xs border border-border/80 text-muted-foreground text-xs font-medium flex items-center justify-center shadow-md pointer-events-auto">
                  <Icon name="touch_app" className="text-[16px] mr-1.5 text-primary" />
                  <span>{t("Select an available slot above to confirm")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODAL 1: TREATMENT INSPECTION SHEET ─── */}
        {inspectedTreatment && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl bg-card border border-border p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {inspectedTreatment.cat.toUpperCase()} ·{" "}
                    {inspectedTreatment.requiresDoctorSignOff
                      ? t("DOCTOR SIGN-OFF REQUIRED")
                      : t("CENTRE PROTOCOL")}
                  </span>
                  <h2 className="text-xl font-bold text-foreground mt-1">
                    {inspectedTreatment.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {inspectedTreatment.duration}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedTreatment(null)}
                  className="size-8 rounded-full border border-border grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              </div>

              {/* Summary Description */}
              <p className="text-sm text-foreground leading-relaxed m-0">
                {inspectedTreatment.summary}
              </p>

              {/* Package selector */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  {t("Choose Sessions")}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {inspectedTreatment.packages.map((n) => {
                    const isSelected = selectedPackOption === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSelectedPackOption(n)}
                        className={cn(
                          "p-3 rounded-xl border text-center transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-soft"
                            : "bg-muted/30 text-foreground border-border/80 hover:border-border",
                        )}
                      >
                        <b className="text-xl font-bold block leading-none">{n}</b>
                        <span className="text-[10px] font-mono uppercase mt-1 block">
                          {n === 1 ? t("Single") : t("Pack")}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight m-0">
                  {t(
                    "Price confirmed by the centre at check-in. Multi-session packages are deducted session-by-session by your nurse.",
                  )}
                </p>
              </div>

              {/* Pre-Screening Questionnaire if present */}
              {inspectedTreatment.screeningQuestions && inspectedTreatment.screeningQuestions.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                      {t("Pre-Booking Safety Screening")}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {t("Safety protocol")}
                    </span>
                  </div>

                  <div className="divide-y divide-border/60">
                    {inspectedTreatment.screeningQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 py-2 text-xs">
                        <span className="text-foreground leading-snug">{q}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setScreeningAnswers((prev) => ({ ...prev, [idx]: true }))}
                            className={cn(
                              "h-7 px-2.5 rounded-lg border text-xs font-semibold transition-colors",
                              screeningAnswers[idx] === true
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {t("Yes")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setScreeningAnswers((prev) => ({ ...prev, [idx]: false }))}
                            className={cn(
                              "h-7 px-2.5 rounded-lg border text-xs font-semibold transition-colors",
                              screeningAnswers[idx] === false
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {t("No")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {Object.values(screeningAnswers).some((ans) => ans === true) && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs leading-relaxed">
                      <span className="font-bold">{t("Clinical Note")}:</span>{" "}
                      {t(
                        "You indicated 'Yes' to one or more questions. This session will be held for supervising physician review prior to confirmation.",
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Clinical Aftercare Preview */}
              {inspectedTreatment.aftercareNotes && (
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 text-xs text-muted-foreground flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground font-bold">
                    {t("Clinical Aftercare")}
                  </span>
                  <p className="m-0 leading-relaxed text-foreground">
                    {inspectedTreatment.aftercareNotes}
                  </p>
                </div>
              )}

              {/* Action: Book This Treatment */}
              <div className="pt-2">
                <Btn
                  onClick={() => handleProceedToBooking(inspectedTreatment)}
                  className="w-full"
                  icon="calendar_month"
                >
                  {inspectedTreatment.requiresDoctorSignOff ||
                  Object.values(screeningAnswers).some((ans) => ans === true)
                    ? t("Pick a Time, Then Send for Sign-off")
                    : t("Pick a Time & Schedule")}
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 2: CLINICAL AFTERCARE MODAL ─── */}
        {aftercareAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                    {t("Session Complete")}
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-1">
                    {aftercareAppt.appointment_type || aftercareAppt.doctor_name || t("Clinical Session")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatAppointmentDate(aftercareAppt.appointment_date || aftercareAppt.scheduled_for)} ·{" "}
                    {aftercareAppt.appointment_time || aftercareAppt.slot_label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAftercareAppt(null)}
                  className="size-7 rounded-full border border-border grid place-items-center text-muted-foreground hover:text-foreground"
                >
                  <Icon name="close" className="text-[15px]" />
                </button>
              </div>

              {/* Authoritative clinical aftercare */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-xs flex flex-col gap-2">
                <span className="font-bold text-foreground uppercase tracking-wider text-[10px] font-mono">
                  {t("Authoritative Aftercare Guidelines")}
                </span>
                <p className="text-foreground leading-relaxed m-0">
                  {TREATMENTS_CATALOGUE.find((x) => x.name === aftercareAppt.appointment_type)?.aftercareNotes ||
                    t(
                      "Drink plenty of water, rest adequately, and maintain your regular daily habits. Contact the centre nurse if you experience any unexpected sensitivity.",
                    )}
                </p>
              </div>

              <div className="flex justify-end">
                <Btn
                  onClick={() => setAftercareAppt(null)}
                  size="sm"
                  className="w-full"
                >
                  {t("Understood")}
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 3: CANCELLATION CONFIRMATION DIALOG ─── */}
        {cancellingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-card border border-border shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-rose-500">
                <span className="size-11 rounded-full bg-rose-500/10 grid place-items-center shrink-0">
                  <Icon name="warning" className="text-xl" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t("Cancel Appointment?")}
                  </h3>
                  <p className="text-xs text-muted-foreground">{t("This slot will be released.")}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 text-xs flex flex-col gap-1 border border-border">
                <span className="font-bold text-foreground">
                  {cancellingAppt.booking_type === "kiosk"
                    ? t("Aaha Health Kiosk Screening")
                    : t(cancellingAppt.appointment_type || cancellingAppt.doctor_name || "Doctor Consultation")}
                </span>
                <span className="text-muted-foreground font-mono">
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
                  className="flex-1 h-11 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted/40 transition-colors"
                >
                  {t("Keep Visit")}
                </button>
                <button
                  type="button"
                  disabled={cancelBusy}
                  onClick={handleConfirmCancel}
                  className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60 shadow-sm"
                >
                  {cancelBusy ? (
                    <>
                      <div className="size-3.5 rounded-full border-2 border-white border-r-transparent animate-spin" />
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
      </div>
    </Screen>
  );
}
