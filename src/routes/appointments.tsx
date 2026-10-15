import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Icon, Screen } from "@/components/aaha";
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
import {
  LivScope,
  LivCard,
  LivHeading,
  LivLabel,
  LivNumber,
  LivUnit,
  LivSubtext,
  LivPill,
  LivButton,
  LivMark,
} from "@/components/liv";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Care, Treatments & Booking | Aaha Companion & Liv" },
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
    duration: "Growth-factor concentrate · 60 min",
    summary:
      "Autologous growth factors isolated from your own blood and micro-administered to follicular zones. Typically 3 sessions, 4 weeks apart.",
    packages: [1, 3],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_HAIR,
    aftercareNotes:
      "No hair wash for 24 hours. Refrain from hair oil, chemical colouring, or heat styling for 3 days.",
    appointmentType: "GFC Hair Therapy",
    defaultMode: "In person",
  },
  {
    id: "prp",
    cat: "hair",
    name: "PRP Hair Regeneration",
    duration: "Platelet-rich plasma · 60 min",
    summary:
      "Concentrated platelets injected into thinning scalp regions to stimulate dormant hair follicles and microvascular circulation.",
    packages: [1, 3],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_HAIR,
    aftercareNotes:
      "No hair wash for 24 hours. Mild local scalp tenderness for 12 to 24 hours is normal.",
    appointmentType: "PRP Hair Therapy",
    defaultMode: "In person",
  },
  {
    id: "iv1",
    cat: "iv",
    name: "Ultimate Glow Drip",
    duration: "Glutathione & Vitamin C · 45 min",
    summary:
      "Intravenous antioxidant infusion for systemic detoxification, cellular repair, and skin tone illumination.",
    packages: [1, 4],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes:
      "Drink at least 1.5 litres of water for the rest of the day. Eat a balanced meal.",
    appointmentType: "Ultimate Glow Drip",
    defaultMode: "In person",
  },
  {
    id: "iv2",
    cat: "iv",
    name: "Anti-Ageing NAD+ Drip",
    duration: "NAD+ & Cellular Co-factors · 60 min",
    summary:
      "Cellular energy support, DNA repair pathway activation, and mitochondrial renewal for active longevity programmes.",
    packages: [1, 4],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes:
      "Rest for the evening. Mild transient flushing during the infusion is completely normal.",
    appointmentType: "Anti-Ageing Drip",
    defaultMode: "In person",
  },
  {
    id: "iv3",
    cat: "iv",
    name: "Anti-Hairfall Drip",
    duration: "Biotin, Zinc & B-Complex · 45 min",
    summary:
      "Follicular nutrient replenishment infusion designed to complement oral iron and vitamin D repletion.",
    packages: [1, 4],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes: "Drink plenty of water. Normal diet and sleep schedule.",
    appointmentType: "Anti-Hairfall Drip",
    defaultMode: "In person",
  },
  {
    id: "iv4",
    cat: "iv",
    name: "Weight Management Drip",
    duration: "L-Carnitine & B-Vitamins · 45 min",
    summary:
      "Mitochondrial fatty-acid shuttle support administered alongside your personalized nutrition and resistance plan.",
    packages: [1, 4],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes: "Take a relaxed 10-minute walk after the drip. Eat a protein-forward dinner.",
    appointmentType: "Weight Management Drip",
    defaultMode: "In person",
  },
  {
    id: "iv5",
    cat: "iv",
    name: "Metabolic & Hormonal Health Drip",
    duration: "Physician-Prescribed Infusion · 60 min",
    summary:
      "Prescribed strictly against verified laboratory results (HbA1c, fasting insulin, and thyroid status).",
    packages: [1, 4],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes:
      "Drink water throughout the evening. Log your evening glucose if wearing a sensor.",
    appointmentType: "Metabolic & Hormonal Drip",
    defaultMode: "In person",
  },
  {
    id: "iv6",
    cat: "iv",
    name: "Ultimate Recovery & Rejuvenation Drip",
    duration: "Multivitamins & Amino Acids · 60 min",
    summary:
      "Electrolyte, amino acid, and multivitamin replenishment tailored for athletic training blocks or fatigued weeks.",
    packages: [1, 4],
    requiresDoctorSignOff: true,
    screeningQuestions: SCR_IV,
    aftercareNotes: "Rest this evening. Stay well hydrated.",
    appointmentType: "Recovery & Rejuvenation Drip",
    defaultMode: "In person",
  },
  {
    id: "consult",
    cat: "clinic",
    name: "Doctor Consultation",
    duration: "Clinical Review & Plan · 30 min",
    summary:
      "Comprehensive consultation with an Aaha physician in person at our centre or via encrypted video link.",
    packages: [1],
    requiresDoctorSignOff: false,
    aftercareNotes: "Follow your prescribed longevity care plan and upload follow-up laboratory markers.",
    appointmentType: "Consultation",
    defaultMode: "In person",
  },
  {
    id: "kiosk",
    cat: "clinic",
    name: "Kiosk Health Screening",
    duration: "Nurse-Guided Screening · 15 min",
    summary:
      "Full vital measurements: blood pressure, lead-I ECG, body composition, blood sugar, and immediate AWIS score calculation.",
    packages: [1],
    requiresDoctorSignOff: false,
    aftercareNotes:
      "Your measured vitals and calculated AWIS score sync directly to your health app profile.",
    appointmentType: "Screening",
    defaultMode: "In person",
  },
];

/* ─── Helpers ─── */
function getUpcomingDays(count = 7): Date[] {
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
  const { t } = useI18n();
  return (
    <RequireAuth message={t("Sign in to book and manage your Aaha clinical care and visits.")}>
      <AppointmentsPage />
    </RequireAuth>
  );
}

function AppointmentsPage() {
  const { t } = useI18n();
  const { userId, patient } = useAuth();

  // Navigation segment: "visits" | "treatments" | "book"
  const [activeTab, setActiveTab] = useState<"visits" | "treatments" | "book">("visits");

  // Visits sub-filter: "upcoming" | "past"
  const [listFilter, setListFilter] = useState<"upcoming" | "past">("upcoming");

  // Treatments catalogue category filter
  const [treatmentCategory, setTreatmentCategory] = useState<TreatmentCategory>("all");

  // Treatment detail drawer/modal state
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

  // Filter treatments catalogue by category
  const filteredTreatments = useMemo(() => {
    if (treatmentCategory === "all") return TREATMENTS_CATALOGUE;
    return TREATMENTS_CATALOGUE.filter((item) => item.cat === treatmentCategory);
  }, [treatmentCategory]);

  return (
    <Screen nav={true}>
      <LivScope theme="dark" className="min-h-screen">
        {/* 1. Header with Liv Brand & Title */}
        <header className="px-5 pt-6 pb-2 sm:px-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LivMark size={24} />
              <span className="liv-wm text-[12px] tracking-[0.3em]">Liv Care</span>
            </div>

            {/* Quick Action Button */}
            {activeTab === "book" ? (
              <button
                type="button"
                onClick={() => setActiveTab("visits")}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--liv-line2)] bg-[var(--liv-surf)] text-[var(--liv-text)] text-xs font-semibold hover:border-[var(--liv-text)] transition-colors"
              >
                <Icon name="event_available" className="text-[15px]" />
                <span>{t("My Visits")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("book")}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] text-xs font-bold transition-transform active:scale-95"
              >
                <Icon name="add" className="text-[16px]" />
                <span>{t("Book Visit")}</span>
              </button>
            )}
          </div>

          <div>
            <LivLabel className="block">{t("Clinical Wellness & Visits")}</LivLabel>
            <LivHeading level={1} className="mt-0.5 text-2xl font-serif">
              {t("Care & Treatments")}
            </LivHeading>
            <LivSubtext className="mt-0.5 text-xs text-[var(--liv-muted)]">
              {t("Aaha Health Centre, Aundh, Pune · 8:00 AM – 8:00 PM")}
            </LivSubtext>
          </div>

          {/* Top 3-way Segmented Switcher: Visits | Treatments | Book */}
          <div className="h-11 p-1 mt-4 rounded-2xl bg-[var(--liv-surf)] border border-[var(--liv-line)] grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("visits")}
              className={cn(
                "rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                activeTab === "visits"
                  ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] shadow-xs"
                  : "text-[var(--liv-muted)] hover:text-[var(--liv-text)]",
              )}
            >
              <Icon name="event_available" className="text-[15px]" />
              <span>{t("Visits")}</span>
              {upcomingAppointments.length > 0 && (
                <span className="size-4 rounded-full bg-[var(--liv-inv-fg)] text-[var(--liv-inv)] text-[10px] font-bold grid place-items-center">
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
                  ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] shadow-xs"
                  : "text-[var(--liv-muted)] hover:text-[var(--liv-text)]",
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
                  ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] shadow-xs"
                  : "text-[var(--liv-muted)] hover:text-[var(--liv-text)]",
              )}
            >
              <Icon name="edit_calendar" className="text-[15px]" />
              <span>{t("Schedule")}</span>
            </button>
          </div>
        </header>

        {/* ─── TAB 1: VISITS (Upcoming & Past Sessions) ─── */}
        {activeTab === "visits" && (
          <div className="px-5 pb-24 sm:px-6 flex flex-col gap-5 pt-2">
            {/* Filter pills: Upcoming vs Past */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setListFilter("upcoming")}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-semibold transition-colors border",
                  listFilter === "upcoming"
                    ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] border-[var(--liv-inv)] font-bold"
                    : "bg-[var(--liv-surf)] text-[var(--liv-muted)] border-[var(--liv-line)] hover:text-[var(--liv-text)]",
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
                    ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] border-[var(--liv-inv)] font-bold"
                    : "bg-[var(--liv-surf)] text-[var(--liv-muted)] border-[var(--liv-line)] hover:text-[var(--liv-text)]",
                )}
              >
                {t("Past & Cancelled")} ({pastAppointments.length})
              </button>
            </div>

            {/* Loading Skeleton */}
            {loadingList ? (
              <div className="space-y-3 pt-1">
                <div className="h-28 w-full animate-pulse rounded-2xl bg-[var(--liv-surf)]" />
                <div className="h-28 w-full animate-pulse rounded-2xl bg-[var(--liv-surf)]" />
              </div>
            ) : listError ? (
              <LivCard variant="default" className="text-center p-6 border-destructive/40">
                <Icon name="error" className="text-2xl text-destructive mx-auto mb-2" />
                <p className="text-xs font-semibold text-destructive">{listError}</p>
                <LivButton
                  onClick={loadAppointments}
                  size="sm"
                  variant="ghost"
                  className="mt-3 mx-auto w-auto"
                >
                  {t("Retry")}
                </LivButton>
              </LivCard>
            ) : displayedList.length === 0 ? (
              /* Empty state */
              <LivCard variant="empty">
                <div className="size-12 rounded-full border border-[var(--liv-line2)] grid place-items-center mb-2 text-[var(--liv-muted)]">
                  <Icon
                    name={listFilter === "upcoming" ? "event_available" : "history"}
                    className="text-2xl"
                  />
                </div>
                <h3 className="text-sm font-semibold text-[var(--liv-text)]">
                  {listFilter === "upcoming"
                    ? t("No upcoming visits booked")
                    : t("No past sessions on record")}
                </h3>
                <LivSubtext className="text-xs text-[var(--liv-muted)] max-w-xs text-center mt-1">
                  {listFilter === "upcoming"
                    ? t("Your next clinical treatment, doctor consult, or kiosk screening is one tap away.")
                    : t("Completed and cancelled appointments will appear here after your centre check-in.")}
                </LivSubtext>
                {listFilter === "upcoming" && (
                  <LivButton
                    onClick={() => setActiveTab("treatments")}
                    size="sm"
                    className="mt-4"
                    icon={<Icon name="add" className="text-[16px]" />}
                  >
                    {t("Explore Treatments & Book")}
                  </LivButton>
                )}
              </LivCard>
            ) : (
              /* Appointment List */
              <div className="flex flex-col gap-3">
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

                  // Parse date into day and month
                  const apptDateObj = dateStr ? new Date(dateStr) : new Date();
                  const dayNum = Number.isNaN(apptDateObj.getTime()) ? "—" : apptDateObj.getDate();
                  const monthStr = Number.isNaN(apptDateObj.getTime())
                    ? "APT"
                    : apptDateObj.toLocaleDateString("en-IN", { month: "short" });

                  return (
                    <LivCard
                      key={appt.id || appt.appointment_id || appt._id}
                      className={cn(
                        "p-4 flex flex-col gap-3",
                        isCancelled && "opacity-60 border-dashed",
                      )}
                    >
                      {/* Top Row: Date Box + Title + Status */}
                      <div className="flex items-start gap-3.5">
                        {/* Liv Date Badge */}
                        <div className="liv-date">
                          <b>{dayNum}</b>
                          <span>{monthStr}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-[var(--liv-text)] truncate">
                              {isKiosk
                                ? t("Aaha Health Kiosk Screening")
                                : t(appt.appointment_type || appt.doctor_name || "Clinical Visit")}
                            </h3>

                            {/* Status indicator */}
                            {isPending ? (
                              <span className="liv-stat-pill wait shrink-0">
                                <i />
                                <span>{t("Awaiting Sign-off")}</span>
                              </span>
                            ) : isCancelled ? (
                              <LivPill tone="priority" className="shrink-0 text-[10px]">
                                {t("Cancelled")}
                              </LivPill>
                            ) : isCompleted ? (
                              <LivPill tone="optimal" className="shrink-0 text-[10px]">
                                {t("Completed")}
                              </LivPill>
                            ) : (
                              <span className="liv-stat-pill ok shrink-0">
                                <i />
                                <span>{t("Confirmed")}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[var(--liv-muted)] mt-0.5 truncate">
                            {isKiosk
                              ? t("Full Vitals, ECG & AWIS Screening")
                              : t(appt.doctor_name || appt.speciality || "Aaha Clinical Care")}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-[var(--liv-muted)]">
                            <span className="text-[var(--liv-text)] font-semibold">{timeStr}</span>
                            <span>·</span>
                            <span>{t(appt.mode || "In person")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes / Speciality */}
                      {appt.notes && (
                        <div className="p-2.5 rounded-xl bg-[var(--liv-surf2)] text-xs text-[var(--liv-muted)] border border-[var(--liv-line2)] leading-relaxed">
                          <span className="font-semibold text-[var(--liv-text)]">{t("Notes")}:</span>{" "}
                          {appt.notes}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--liv-line)] text-xs">
                        <span className="text-[11px] text-[var(--liv-muted)]">
                          {isKiosk ? t("Living Lab Kiosk, Aundh") : t(appt.centre || "Aaha Health Centre, Pune")}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Aftercare CTA if completed */}
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => setAftercareAppt(appt)}
                              className="text-xs font-semibold text-[var(--liv-text)] hover:underline flex items-center gap-1"
                            >
                              <Icon name="medical_services" className="text-[14px]" />
                              <span>{t("Aftercare")}</span>
                            </button>
                          )}

                          {/* Cancel CTA if active upcoming */}
                          {!isCancelled && !isCompleted && (
                            <button
                              type="button"
                              onClick={() => setCancellingAppt(appt)}
                              className="text-xs font-semibold text-rose-500 hover:text-rose-400 hover:underline flex items-center gap-1 transition-colors"
                            >
                              <Icon name="cancel" className="text-[14px]" />
                              <span>{t("Cancel Visit")}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </LivCard>
                  );
                })}
              </div>
            )}

            {/* ─── Care Team Card (from Liv Prototype) ─── */}
            <div className="mt-4 flex flex-col gap-2">
              <LivLabel>{t("Your Centre Care Team")}</LivLabel>
              <LivCard className="p-0 overflow-hidden divide-y divide-[var(--liv-line)]">
                {[
                  {
                    initial: "M",
                    name: "Dr. Meera Joshi",
                    role: "Supervising Physician · Women's Health & Longevity",
                    action: () => {
                      setSelectedDoctorId("Dr. Meera Joshi");
                      setCareTab("doctor");
                      setActiveTab("book");
                    },
                  },
                  {
                    initial: "R",
                    name: "Coach Ritu S.",
                    role: "Longevity Coach · Habits & Fortnightly Check-ins",
                    action: () => {
                      toast.info(t("Coach check-ins are scheduled fortnightly with your care plan."));
                    },
                  },
                  {
                    initial: "T",
                    name: "Nurse Trupti",
                    role: "Centre Nurse · Kiosk Screenings & Treatment Sessions",
                    action: () => {
                      setCareTab("kiosk");
                      setActiveTab("book");
                    },
                  },
                  {
                    initial: "L",
                    name: "Liv",
                    role: "AI Health Companion · 24/7 Questions & Explanations",
                    action: () => {
                      toast.info(t("You can chat with Liv in the Aaha tab at any time."));
                    },
                  },
                ].map((member) => (
                  <button
                    key={member.name}
                    type="button"
                    onClick={member.action}
                    className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-[var(--liv-surf2)] transition-colors"
                  >
                    <span className="size-9 rounded-full bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] font-bold text-xs grid place-items-center shrink-0">
                      {member.initial}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[var(--liv-text)] truncate">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-[var(--liv-muted)] truncate">
                        {member.role}
                      </div>
                    </div>
                    <Icon name="chevron_right" className="text-[16px] text-[var(--liv-muted)]" />
                  </button>
                ))}
              </LivCard>
            </div>
          </div>
        )}

        {/* ─── TAB 2: TREATMENTS & SERVICES CATALOGUE ─── */}
        {activeTab === "treatments" && (
          <div className="px-5 pb-24 sm:px-6 flex flex-col gap-4 pt-2">
            <div>
              <LivLabel>{t("Centre Menu")}</LivLabel>
              <h2 className="text-lg font-serif font-bold text-[var(--liv-text)]">
                {t("Treatments at the Centre")}
              </h2>
              <LivSubtext className="text-xs text-[var(--liv-muted)]">
                {t("Medical therapies administered in person at our Aundh centre under clinical oversight.")}
              </LivSubtext>
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
              {TREATMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTreatmentCategory(cat.id)}
                  className={cn(
                    "h-8 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-colors border",
                    treatmentCategory === cat.id
                      ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] border-[var(--liv-inv)] font-bold"
                      : "bg-[var(--liv-surf)] text-[var(--liv-muted)] border-[var(--liv-line)] hover:text-[var(--liv-text)]",
                  )}
                >
                  {t(cat.label)}
                </button>
              ))}
            </div>

            {/* Treatment Cards */}
            <div className="flex flex-col gap-3">
              {filteredTreatments.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => handleOpenTreatmentSheet(x)}
                  className="liv-svc group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--liv-text)]">
                        {x.name}
                      </span>
                      {x.requiresDoctorSignOff && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--liv-line2)] text-[var(--liv-muted)]">
                          {t("Doctor Sign-off")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--liv-muted)] mt-0.5">{x.duration}</div>
                    <div className="text-xs text-[var(--liv-muted)] mt-1.5 line-clamp-2 leading-relaxed">
                      {x.summary}
                    </div>
                    {/* Package chips indicator */}
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-[var(--liv-muted)]">
                      <span>{t("Options")}:</span>
                      {x.packages.map((n) => (
                        <span
                          key={n}
                          className="px-1.5 py-0.2 rounded border border-[var(--liv-line2)] bg-[var(--liv-surf2)]"
                        >
                          {n === 1 ? t("Single") : t(`${n} pack`)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Icon
                    name="chevron_right"
                    className="text-[18px] text-[var(--liv-muted)] group-hover:translate-x-0.5 transition-transform"
                  />
                </button>
              ))}
            </div>

            {/* Clinical Notice on Packages */}
            <LivCard variant="default" className="p-3.5 text-xs text-[var(--liv-muted)] border-dashed">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--liv-text)] mb-1">
                <Icon name="verified" className="text-[15px]" />
                <span>{t("Centre Treatment Protocol")}</span>
              </div>
              <p className="leading-relaxed m-0">
                {t(
                  "Every clinical therapy and IV infusion is reviewed against your latest blood markers and vital screening. Prepaid package balances are managed directly at the centre and deducted session-by-session upon nurse check-in.",
                )}
              </p>
            </LivCard>
          </div>
        )}

        {/* ─── TAB 3: BOOK VISIT (Real-time Slot Booking) ─── */}
        {activeTab === "book" && (
          <div className="px-5 pb-36 sm:px-6 flex flex-col gap-5 pt-2">
            <div>
              <LivLabel>{t("Real-Time Scheduling")}</LivLabel>
              <h2 className="text-lg font-serif font-bold text-[var(--liv-text)]">
                {t("Schedule a Visit")}
              </h2>
              <LivSubtext className="text-xs text-[var(--liv-muted)]">
                {t("Verify available appointments with our clinic server and secure your slot.")}
              </LivSubtext>
            </div>

            {/* 1. Care Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <LivLabel className="px-1">{t("Select Care Type")}</LivLabel>
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
                        ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] border-[var(--liv-inv)] shadow-sm"
                        : "bg-[var(--liv-surf)] text-[var(--liv-muted)] border-[var(--liv-line)] hover:border-[var(--liv-text)]",
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
              <div className="flex flex-col gap-1.5">
                <LivLabel className="px-1">{t("Select Treatment")}</LivLabel>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
                  {TREATMENTS_CATALOGUE.filter((x) => x.cat !== "clinic").map((tr) => (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => setSelectedTreatmentId(tr.id)}
                      className={cn(
                        "h-9 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-colors border",
                        selectedTreatmentId === tr.id
                          ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] border-[var(--liv-inv)] font-bold"
                          : "bg-[var(--liv-surf)] text-[var(--liv-muted)] border-[var(--liv-line)] hover:text-[var(--liv-text)]",
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
              <div className="flex flex-col gap-4">
                {/* Consultation Mode */}
                <div className="flex flex-col gap-1.5">
                  <LivLabel className="px-1">{t("Consultation Mode")}</LivLabel>
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
                            ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] border-[var(--liv-inv)] font-bold shadow-xs"
                            : "bg-[var(--liv-surf)] text-[var(--liv-text)] border-[var(--liv-line)] hover:border-[var(--liv-text)]",
                        )}
                      >
                        <Icon name={m.icon} className="text-[17px]" />
                        <span className="truncate">{t(m.label)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Doctor Picker */}
                <div className="flex flex-col gap-1.5">
                  <LivLabel className="px-1">{t("Select Doctor")}</LivLabel>
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
                              ? "bg-[var(--liv-surf2)] border-[var(--liv-text)] ring-1 ring-[var(--liv-text)]"
                              : "bg-[var(--liv-surf)] border-[var(--liv-line)] hover:border-[var(--liv-line2)]",
                          )}
                        >
                          <span className="size-10 rounded-full bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] font-bold text-sm grid place-items-center shrink-0">
                            {doc.initial}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[var(--liv-text)] truncate">
                              {doc.name}
                            </h4>
                            <p className="text-[11px] text-[var(--liv-muted)] truncate">
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
              <LivCard variant="default" className="p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--liv-text)]">
                  <Icon name="monitor_heart" className="text-teal-400 text-[18px]" />
                  <span>{t("Aaha Health Kiosk, Aundh, Pune")}</span>
                </div>
                <p className="text-xs text-[var(--liv-muted)] leading-relaxed m-0">
                  {t(
                    "Nurse-assisted 15-minute screening including blood pressure, ECG rhythm, BMI, body composition, and instant AWIS score calculation.",
                  )}
                </p>
              </LivCard>
            )}

            {/* 2. Date Selection (7-Day Strip) */}
            <div className="flex flex-col gap-1.5">
              <LivLabel className="px-1">{t("Select Date")}</LivLabel>
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
                        "h-16 w-14 rounded-2xl border flex flex-col items-center justify-center shrink-0 transition-all",
                        isSelected
                          ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] border-[var(--liv-inv)] shadow-sm"
                          : "bg-[var(--liv-surf)] text-[var(--liv-text)] border-[var(--liv-line)] hover:border-[var(--liv-text)]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[9px] font-mono uppercase tracking-wider",
                          isSelected ? "text-[var(--liv-inv-muted)]" : "text-[var(--liv-muted)]",
                        )}
                      >
                        {index === 0 ? t("Today") : t(weekday)}
                      </span>
                      <span className="text-lg font-serif font-bold leading-none mt-1">
                        {dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Real Available Time Slots */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <LivLabel>{t("Available Time Slots")}</LivLabel>
                <span className="text-[11px] font-mono text-[var(--liv-muted)]">
                  {formatAppointmentDate(selectedDate)}
                </span>
              </div>

              {loadingSlots ? (
                <div className="p-8 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] text-center flex flex-col items-center justify-center gap-2">
                  <div className="size-5 rounded-full border-2 border-[var(--liv-text)] border-r-transparent animate-spin" />
                  <span className="text-xs text-[var(--liv-muted)] font-medium">
                    {t("Checking real-time slot availability…")}
                  </span>
                </div>
              ) : slotsError ? (
                <div className="p-4 rounded-2xl border border-destructive/40 bg-destructive/10 text-center text-xs text-destructive">
                  {slotsError}
                </div>
              ) : slotsList.length === 0 ? (
                <div className="p-6 rounded-2xl border border-[var(--liv-line)] bg-[var(--liv-surf)] text-center text-xs text-[var(--liv-muted)]">
                  <Icon name="event_busy" className="text-2xl mb-1 text-[var(--liv-muted)]" />
                  <p className="font-semibold text-[var(--liv-text)] m-0">
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
                            ? "bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] border-[var(--liv-inv)] shadow-xs"
                            : "bg-[var(--liv-surf)] text-[var(--liv-text)] border-[var(--liv-line)] hover:border-[var(--liv-text)]",
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
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="booking-notes"
                className="text-[11px] font-mono uppercase tracking-wider text-[var(--liv-muted)] px-1"
              >
                {t("Notes / Symptoms (Optional)")}
              </label>
              <input
                id="booking-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("e.g. Discussing fatigue, ferritin re-test, skin flaking")}
                className="h-11 rounded-xl border border-[var(--liv-line)] bg-[var(--liv-surf)] px-3.5 text-xs text-[var(--liv-text)] placeholder:text-[var(--liv-muted)]/60 outline-none focus:border-[var(--liv-text)]"
              />
            </div>

            {/* 5. Sticky Bottom Summary & Confirmation Bar */}
            <div className="fixed bottom-[74px] left-1/2 w-full max-w-md -translate-x-1/2 px-4 pb-2 pointer-events-none z-20">
              {selectedSlot ? (
                <div className="p-3.5 rounded-2xl bg-[var(--liv-inv)] text-[var(--liv-inv-fg)] shadow-xl flex items-center justify-between gap-3 pointer-events-auto border border-[var(--liv-inv-line)]">
                  <div className="min-w-0 py-0.5">
                    <div className="text-xs font-bold truncate">
                      {formatAppointmentDate(selectedDate)} · {selectedSlot}
                    </div>
                    <div className="text-[11px] text-[var(--liv-inv-muted)] truncate">
                      {careTab === "doctor"
                        ? `${selectedDoctorId} (${mode})`
                        : careTab === "kiosk"
                          ? t("Kiosk Health Screening")
                          : (TREATMENTS_CATALOGUE.find((x) => x.id === selectedTreatmentId)?.name || "Clinical Treatment")}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBook}
                    disabled={submitting}
                    className="h-10 px-5 rounded-xl bg-[var(--liv-bg)] text-[var(--liv-text)] font-bold text-xs shrink-0 flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60 shadow-sm border border-[var(--liv-line)]"
                  >
                    {submitting ? (
                      <>
                        <div className="size-3.5 rounded-full border-2 border-[var(--liv-text)] border-r-transparent animate-spin" />
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
                <div className="h-11 px-4 rounded-2xl bg-[var(--liv-surf)] border border-[var(--liv-line)] text-[var(--liv-muted)] text-xs font-medium flex items-center justify-center shadow-md pointer-events-auto">
                  <Icon name="touch_app" className="text-[15px] mr-1.5 text-[var(--liv-text)]" />
                  <span>{t("Select an available slot above to confirm")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODAL 1: TREATMENT INSPECTION SHEET ─── */}
        {inspectedTreatment && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-[32px] sm:rounded-3xl bg-[var(--liv-bg)] border border-[var(--liv-line)] p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--liv-muted)]">
                    {inspectedTreatment.cat.toUpperCase()} ·{" "}
                    {inspectedTreatment.requiresDoctorSignOff
                      ? t("DOCTOR SIGN-OFF REQUIRED")
                      : t("CENTRE PROTOCOL")}
                  </span>
                  <h2 className="text-xl font-serif font-bold text-[var(--liv-text)] mt-1">
                    {inspectedTreatment.name}
                  </h2>
                  <p className="text-xs text-[var(--liv-muted)] mt-0.5">
                    {inspectedTreatment.duration}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedTreatment(null)}
                  className="size-8 rounded-full border border-[var(--liv-line2)] grid place-items-center text-[var(--liv-muted)] hover:text-[var(--liv-text)] transition-colors"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              </div>

              {/* Summary Description */}
              <p className="text-sm text-[var(--liv-text)] leading-relaxed m-0 font-serif">
                {inspectedTreatment.summary}
              </p>

              {/* Package selector */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--liv-line)]">
                <LivLabel>{t("Choose Sessions")}</LivLabel>
                <div className="liv-packs">
                  {inspectedTreatment.packages.map((n) => {
                    const isSelected = selectedPackOption === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSelectedPackOption(n)}
                        className={cn("liv-pack", isSelected && "on")}
                      >
                        <b>{n}</b>
                        <span>{n === 1 ? t("Single") : t("Pack")}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[var(--liv-muted)] leading-tight m-0">
                  {t(
                    "Price confirmed by the centre at check-in. Multi-session packages are deducted session-by-session by your nurse.",
                  )}
                </p>
              </div>

              {/* Pre-Screening Questionnaire if present */}
              {inspectedTreatment.screeningQuestions && inspectedTreatment.screeningQuestions.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--liv-line)]">
                  <div className="flex items-center justify-between">
                    <LivLabel>{t("Pre-Booking Safety Screening")}</LivLabel>
                    <span className="text-[10px] font-mono text-[var(--liv-muted)]">
                      {t("Safety protocol")}
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--liv-line)]">
                    {inspectedTreatment.screeningQuestions.map((q, idx) => (
                      <div key={idx} className="liv-qa">
                        <span className="text-xs text-[var(--liv-text)] leading-snug">{q}</span>
                        <div className="liv-yn">
                          <button
                            type="button"
                            onClick={() => setScreeningAnswers((prev) => ({ ...prev, [idx]: true }))}
                            className={cn(screeningAnswers[idx] === true && "on")}
                          >
                            {t("Yes")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setScreeningAnswers((prev) => ({ ...prev, [idx]: false }))}
                            className={cn(screeningAnswers[idx] === false && "on")}
                          >
                            {t("No")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {Object.values(screeningAnswers).some((ans) => ans === true) && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
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
                <div className="p-3.5 rounded-2xl bg-[var(--liv-surf)] border border-[var(--liv-line)] text-xs text-[var(--liv-muted)] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--liv-text)] font-bold">
                    {t("Clinical Aftercare")}
                  </span>
                  <p className="m-0 leading-relaxed text-[var(--liv-text)]">
                    {inspectedTreatment.aftercareNotes}
                  </p>
                </div>
              )}

              {/* Action: Book This Treatment */}
              <div className="pt-2">
                <LivButton
                  onClick={() => handleProceedToBooking(inspectedTreatment)}
                  className="w-full"
                  icon={<Icon name="calendar_month" className="text-[18px]" />}
                >
                  {inspectedTreatment.requiresDoctorSignOff ||
                  Object.values(screeningAnswers).some((ans) => ans === true)
                    ? t("Pick a Time, Then Send for Sign-off")
                    : t("Pick a Time & Schedule")}
                </LivButton>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 2: CLINICAL AFTERCARE MODAL ─── */}
        {aftercareAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-[var(--liv-bg)] border border-[var(--liv-line)] shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <LivLabel>{t("Session Complete")}</LivLabel>
                  <h3 className="text-base font-serif font-bold text-[var(--liv-text)] mt-1">
                    {aftercareAppt.appointment_type || aftercareAppt.doctor_name || t("Clinical Session")}
                  </h3>
                  <p className="text-xs text-[var(--liv-muted)]">
                    {formatAppointmentDate(aftercareAppt.appointment_date || aftercareAppt.scheduled_for)} ·{" "}
                    {aftercareAppt.appointment_time || aftercareAppt.slot_label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAftercareAppt(null)}
                  className="size-7 rounded-full border border-[var(--liv-line2)] grid place-items-center text-[var(--liv-muted)]"
                >
                  <Icon name="close" className="text-[15px]" />
                </button>
              </div>

              {/* Authoritative clinical aftercare */}
              <div className="p-4 rounded-2xl bg-[var(--liv-surf)] border border-[var(--liv-line)] text-xs flex flex-col gap-2">
                <span className="font-bold text-[var(--liv-text)] uppercase tracking-wider text-[10px] font-mono">
                  {t("Authoritative Aftercare Guidelines")}
                </span>
                <p className="text-[var(--liv-text)] leading-relaxed m-0">
                  {TREATMENTS_CATALOGUE.find((x) => x.name === aftercareAppt.appointment_type)?.aftercareNotes ||
                    t(
                      "Drink plenty of water, rest adequately, and maintain your regular daily habits. Contact the centre nurse if you experience any unexpected sensitivity.",
                    )}
                </p>
              </div>

              <div className="flex justify-end">
                <LivButton
                  onClick={() => setAftercareAppt(null)}
                  size="sm"
                  className="w-full"
                >
                  {t("Understood")}
                </LivButton>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL 3: CANCELLATION CONFIRMATION DIALOG ─── */}
        {cancellingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-[var(--liv-bg)] border border-[var(--liv-line)] shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-rose-400">
                <span className="size-11 rounded-full bg-rose-500/10 grid place-items-center shrink-0">
                  <Icon name="warning" className="text-xl" />
                </span>
                <div>
                  <h3 className="text-base font-serif font-bold text-[var(--liv-text)]">
                    {t("Cancel Appointment?")}
                  </h3>
                  <p className="text-xs text-[var(--liv-muted)]">{t("This slot will be released.")}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--liv-surf)] text-xs flex flex-col gap-1 border border-[var(--liv-line)]">
                <span className="font-bold text-[var(--liv-text)]">
                  {cancellingAppt.booking_type === "kiosk"
                    ? t("Aaha Health Kiosk Screening")
                    : t(cancellingAppt.appointment_type || cancellingAppt.doctor_name || "Doctor Consultation")}
                </span>
                <span className="text-[var(--liv-muted)] font-mono">
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
                  className="flex-1 h-11 rounded-xl border border-[var(--liv-line2)] bg-[var(--liv-surf)] text-[var(--liv-text)] text-xs font-bold hover:bg-[var(--liv-surf2)] transition-colors"
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
      </LivScope>
    </Screen>
  );
}
