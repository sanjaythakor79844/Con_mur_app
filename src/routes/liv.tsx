import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import { toast as sonnerToast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { apiService } from "@/lib/api-service";
import { useOverview, bandLabel, bandTone } from "@/hooks/use-overview";
import {
  listAssessments,
  listReports,
  uploadBloodReport,
  getBloodReportFileBlob,
  deleteBloodReport,
  formatReportDate,
  parseAwisScore,
  listAppointments,
  bookAppointment,
  cancelAppointment,
  getAppointmentSlots,
  updateAppointment,
  listCarePlans,
  updateCarePlan,
  getPreferences,
  updatePreferences,
  listNotifications,
  type UserPreferences,
  type Notification,
  type Assessment,
  type Report,
  type Appointment,
  type CarePlan,
  type CarePlanItem,
} from "@/lib/aaha-api";
import { useI18n } from "@/lib/i18n";
import { getUserProfile } from "@/lib/user-profile";
import { NotificationBell } from "@/components/notification-bell";
import {
  LivMark,
  LivIcon,
  LivProgressRing,
  LivScope,
  LivCard,
  LivHeading,
  LivLabel,
  LivSubtext,
  LivButton,
  LivSegmented,
} from "@/components/liv";
import {
  BIOMARKERS,
  GROUPS,
  YEARS_CONTRIBUTORS,
  SYSTEM_SCORES,
  PRIORITIES,
  JOURNEY_TRACKS,
  CARE_PACKAGES,
  TREATMENTS,
  TAPE_MEASUREMENTS,
  THERAPIES,
  BADGE_DEFINITIONS,
  REPORT_CHAPTERS,
  DEFAULT_HABITS,
  TIME_SLOTS,
  getEcgPath,
  getMarkerById,
  getTrackById,
  getTrackForMarker,
  getTreatmentById,
  getNextStep,
  type Biomarker,
  type JourneyTrack,
} from "@/lib/liv-data";
import { extractLongevityPdfData, type ExtractedLongevityData } from "@/lib/pdf-parser";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { FileOpener } from "@capawesome-team/capacitor-file-opener";

export const Route = createFileRoute("/liv")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    view?:
      | "splash"
      | "signup"
      | "signin"
      | "welcome"
      | "main"
      | "marker"
      | "track"
      | "report"
      | "book"
      | "booked"
      | "analyzing";
    tab?: "home" | "markers" | "plan" | "care";
    marker?: string;
    track?: string;
    filter?: string;
    state?: "empty" | "full";
  } => {
    return {
      view: typeof search.view === "string" ? (search.view as any) : undefined,
      tab: typeof search.tab === "string" ? (search.tab as any) : undefined,
      marker: typeof search.marker === "string" ? search.marker : undefined,
      track: typeof search.track === "string" ? search.track : undefined,
      filter: typeof search.filter === "string" ? search.filter : undefined,
      state: typeof search.state === "string" ? (search.state as any) : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Liv Living Lab — Longevity, measured | Aaha Companion" },
      {
        name: "description",
        content:
          "Longevity, measured. Complete Liv app experience: AIWS score, 52 biomarkers, 90-day plan, care journeys, and clinical reports.",
      },
    ],
  }),
  component: LivAppScreen,
});

// ─── 4-Part Story Data (Matches prototype lines 493-502) ────────────────────────
const STORIES = [
  {
    h: "It starts at the Living Lab kiosk.",
    p: "One screening reads your blood, heart and body. Your longevity report arrives here by itself.",
    visual: "pulse",
  },
  {
    h: "Normal is not the same as optimal.",
    p: "Clinical ranges show where illness begins. Optimal ranges show where healthspan is built.",
    visual: "range",
  },
  {
    h: "One number to follow: your AIWS score.",
    p: "Blood, body, sleep and lifestyle in a single score out of 100.",
    visual: "ring",
  },
  {
    h: "Measure. Act. Re-measure.",
    p: "A 90-day plan, a care team and Liv by your side until your next kiosk visit.",
    visual: "path",
  },
];

interface AppointmentItem {
  id: number | string;
  t: string;
  w: string;
  d: Date;
  h: string;
  fixed?: boolean;
  status?: "pending" | "ok" | "cancelled" | "completed";
  past?: boolean;
  svc?: string;
  raw?: Appointment;
}

const VISIT_TYPES_MAP: Record<string, [string, string]> = {
  doc: ["Physician review", "Dr. A. Deshmukh · 20 min"],
  coach: ["Coach session", "Ritu S. · 30 min"],
  pod: ["Kiosk screening", "Living Lab kiosk at the centre · 30 min"],
  thx: ["Nutrition session", "Protein and iron-rich food plan · 30 min"],
  ther: [
    "Therapy session",
    "Sauna, light, HydraFacial, HBOT or drip · at the centre",
  ],
};

const LIV_PRESET_QUESTIONS: [string, string | (() => string)][] = [
  [
    "Why is my biological age 45.8?",
    "It is an estimate from nine blood biomarkers plus your age, with a margin of about two years. Blood sugar, ApoB, strength and two missing nutrients add roughly 3.8 years. All four can move.",
  ],
  [
    "What should I focus on first?",
    "Strength. Three 45-minute sessions a week with Coach Ritu, and protein at every meal. It is your biggest lever and the fastest to respond.",
  ],
  [
    "How do I lower my HbA1c?",
    "5.9% is the early-warning band. Walk for 10 minutes after meals, eat dinner earlier and protect a 7-hour night. Your Day-90 target is 5.7% or lower.",
  ],
  [
    "Is my thyroid okay?",
    "Yes. Your TSH is 2.4, inside the optimal 0.5 to 3.5 zone. Vitamin D and iron are the two gaps to refill.",
  ],
  [
    "When is my next appointment?",
    "Coach check-in with Ritu S. is on Thursday at 6:30 PM. Your Day-90 re-measure is on 19 Dec.",
  ],
];

export interface NormalizedReadings {
  hasReadings: boolean;
  checkinDate: string | null;
  formattedDate: string;
  sourceLabel: string;
  heartRate: {
    value: number | string | null;
    unit: string;
    flag?: "green" | "amber" | "red";
    status?: "o" | "b" | "p";
    delta?: string | null;
  };
  bloodPressure: {
    value: string | null;
    display: string;
    systolic?: number;
    diastolic?: number;
    unit: string;
    flag?: "green" | "amber" | "red";
    status?: "o" | "b" | "p";
    delta?: string | null;
  };
  ecg: {
    value: string | null;
    label?: string;
    flag?: "green" | "amber" | "red";
    status?: "o" | "b" | "p";
    intervals?: [string, string][];
  };
  spo2: {
    value: number | string | null;
    unit: string;
    flag?: "green" | "amber" | "red";
    status?: "o" | "b" | "p";
  };
  bodyScan: {
    hasScan: boolean;
    bmi: number | string | null;
    bodyFat: number | string | null;
    waist: number | string | null;
    weightKg: number | string | null;
    heightCm: number | string | null;
    posture: {
      hasPosture: boolean;
      score: number | null;
      allNormal: boolean;
      findings: [string, string, string][];
    };
  };
  fitness: {
    vo2: { value: number | string | null; unit: string; status?: "o" | "b" | "p" };
    hrv: { value: number | string | null; unit: string; status?: "o" | "b" | "p" };
    reactionTime: { value: number | string | null; unit: string; status?: "o" | "b" | "p" };
  };
  markersMap: Record<
    string,
    {
      value: string | number;
      unit?: string;
      flag?: "green" | "amber" | "red";
      status?: "o" | "b" | "p";
      label?: string;
      name?: string;
      isRecorded: boolean;
      prev?: string;
      when?: string;
      intervals?: [string, string][];
      findings?: [string, string, string][];
    }
  >;
}

export const LAB_TEST_TO_BIOMARKER_MAP: Record<string, string> = {
  // Hemoglobin & Hematology / CBC
  "hemoglobin": "hb",
  "haemoglobin": "hb",
  "hgb": "hb",
  "hb": "hb",
  "haemoglobin (hb)": "hb",
  "hemoglobin (hb)": "hb",
  "total hemoglobin": "hb",
  "blood hemoglobin": "hb",

  // Glucose & Metabolic
  "fasting glucose": "glu",
  "glucose": "glu",
  "fbs": "glu",
  "fasting blood sugar": "glu",
  "fasting blood glucose": "glu",
  "blood glucose": "glu",
  "plasma glucose - fasting": "glu",
  "glucose - fasting": "glu",
  "glucose fasting": "glu",
  "hba1c": "hba1c",
  "glycated hemoglobin": "hba1c",
  "glycated haemoglobin": "hba1c",
  "glycohemoglobin": "hba1c",
  "hemoglobin a1c": "hba1c",
  "haemoglobin a1c": "hba1c",
  "hba1c (glycated hemoglobin)": "hba1c",
  "fasting insulin": "ins",
  "insulin": "ins",
  "serum insulin": "ins",
  "insulin - fasting": "ins",

  // Lipids & Heart
  "apolipoprotein b (apob)": "apob",
  "apolipoprotein b": "apob",
  "apob": "apob",
  "apo-b": "apob",
  "apolipoprotein - b": "apob",
  "lipoprotein(a)": "lpa",
  "lipoprotein a": "lpa",
  "lpa": "lpa",
  "lp(a)": "lpa",
  "serum lipoprotein(a)": "lpa",
  "ldl cholesterol": "ldl",
  "ldl": "ldl",
  "direct ldl": "ldl",
  "direct ldl cholesterol": "ldl",
  "calculated ldl": "ldl",
  "hdl cholesterol": "hdl",
  "hdl": "hdl",
  "direct hdl": "hdl",
  "direct hdl cholesterol": "hdl",
  "triglycerides": "tg",
  "tg": "tg",
  "serum triglycerides": "tg",
  "triglyceride": "tg",
  "total cholesterol": "ldl",

  // Kidney & Renal
  "creatinine": "cre",
  "serum creatinine": "cre",
  "cre": "cre",
  "blood creatinine": "cre",
  "egfr": "egfr",
  "estimated glomerular filtration rate": "egfr",
  "estimated gfr": "egfr",

  // Liver & Protein (PhenoAge)
  "albumin": "alb",
  "serum albumin": "alb",
  "alb": "alb",
  "alkaline phosphatase": "alp",
  "alkaline phosphatase (alp)": "alp",
  "alp": "alp",
  "alt (sgpt)": "alt",
  "alt": "alt",
  "sgpt": "alt",
  "alanine aminotransferase": "alt",
  "alanine transaminase": "alt",
  "ast (sgot)": "ast",
  "ast": "ast",
  "sgot": "ast",
  "aspartate aminotransferase": "ast",
  "aspartate transaminase": "ast",

  // Hematology & Blood Cells (PhenoAge)
  "white blood cell count (wbc)": "wbc",
  "white blood cell count": "wbc",
  "white blood cells": "wbc",
  "wbc": "wbc",
  "total leukocyte count": "wbc",
  "total leucocyte count": "wbc",
  "tlc": "wbc",
  "lymphocytes (%)": "lym",
  "lymphocytes": "lym",
  "lymphocyte percentage": "lym",
  "lymphocyte %": "lym",
  "lymphocyte": "lym",
  "lym": "lym",
  "mean corpuscular volume (mcv)": "mcv",
  "mean corpuscular volume": "mcv",
  "mcv": "mcv",
  "red cell distribution width (rdw)": "rdw",
  "red cell distribution width": "rdw",
  "rdw": "rdw",
  "platelet count": "plt",
  "platelets": "plt",
  "plt": "plt",

  // Hormones & Nutrients
  "25-oh vitamin d": "vitd",
  "vitamin d": "vitd",
  "25-hydroxy vitamin d": "vitd",
  "vitamin d (25-oh)": "vitd",
  "vitamin d3": "vitd",
  "total 25-hydroxy vitamin d": "vitd",
  "vitamin d (total)": "vitd",
  "vitamin b12": "b12",
  "b12": "b12",
  "serum vitamin b12": "b12",
  "cyanocobalamin": "b12",
  "ferritin": "fer",
  "serum ferritin": "fer",
  "fer": "fer",
  "tsh": "tsh",
  "thyroid stimulating hormone": "tsh",
  "thyroid stimulating hormone (tsh)": "tsh",
  "serum tsh": "tsh",
  "ultrasensitive tsh": "tsh",
  "cortisol": "cort",
  "serum cortisol": "cort",
  "morning cortisol": "cort",
  "cort": "cort",

  // Inflammation
  "high-sensitivity crp (hs-crp)": "crp",
  "hs-crp": "crp",
  "crp": "crp",
  "high sensitivity c-reactive protein": "crp",
  "c-reactive protein": "crp",
  "hs crp": "crp",

  // Body, Vitals & Fitness
  "vo2": "vo2",
  "vo2 max": "vo2",
  "vo2max": "vo2",
  "hrv": "hrv",
  "heart rate variability": "hrv",
  "reaction time": "rt",
  "rt": "rt",
  "body fat": "bf",
  "body fat %": "bf",
  "body fat percentage": "bf",
  "bf": "bf",
  "bmi": "bmi",
  "body mass index": "bmi",
  "waist": "waist",
  "waist circumference": "waist",
  "visceral fat": "vf",
  "vf": "vf",
  "skeletal muscle mass": "smm",
  "smm": "smm",
  "grip strength": "grip",
  "grip": "grip",
  "bone density": "bone",
  "t-score": "bone",
  "resting heart rate": "hr",
  "heart rate": "hr",
  "pulse": "hr",
  "hr": "hr",
  "blood pressure": "bp",
  "bp": "bp",
  "spo2": "spo2",
  "oxygen saturation": "spo2",
  "ecg": "ecg",
  "ecg rhythm": "ecg",
  "posture": "posture",
  "posture score": "posture",
};

export function resolveBiomarkerId(rawName: string): string | null {
  if (!rawName) return null;
  const name = rawName.toLowerCase().trim();
  if (LAB_TEST_TO_BIOMARKER_MAP[name]) {
    return LAB_TEST_TO_BIOMARKER_MAP[name];
  }

  const normalized = name.replace(/[()[\]\-_,./]/g, " ").replace(/\s+/g, " ").trim();
  if (LAB_TEST_TO_BIOMARKER_MAP[normalized]) {
    return LAB_TEST_TO_BIOMARKER_MAP[normalized];
  }

  if (normalized.includes("thyroid stimulating hormone") || normalized.includes("tsh")) return "tsh";
  if (normalized.includes("hba1c") || normalized.includes("glycated hem") || normalized.includes("glycated haem")) return "hba1c";
  if (normalized.includes("fasting blood glucose") || normalized.includes("fasting glucose") || normalized.includes("fasting blood sugar") || normalized === "glucose" || normalized === "fbs") return "glu";
  if (normalized.includes("fasting insulin") || normalized.includes("serum insulin")) return "ins";
  if (normalized.includes("apolipoprotein b") || normalized.includes("apob") || normalized.includes("apo b")) return "apob";
  if (normalized.includes("lipoprotein a") || normalized.includes("lp a") || normalized.includes("lpa")) return "lpa";
  if (normalized.includes("ldl cholesterol") || normalized === "ldl" || normalized.includes("direct ldl")) return "ldl";
  if (normalized.includes("hdl cholesterol") || normalized === "hdl" || normalized.includes("direct hdl")) return "hdl";
  if (normalized.includes("triglyceride") || normalized === "tg") return "tg";
  if (normalized.includes("hs crp") || normalized.includes("high sensitivity crp") || normalized.includes("c reactive protein") || normalized === "crp") return "crp";
  if (normalized.includes("ferritin")) return "fer";
  if (normalized.includes("vitamin d") || normalized.includes("25 oh")) return "vitd";
  if (normalized.includes("vitamin b12") || normalized.includes("b12") || normalized.includes("cyanocobalamin")) return "b12";
  if (normalized.includes("hemoglobin") || normalized.includes("haemoglobin") || normalized === "hb" || normalized === "hgb") return "hb";
  if (normalized.includes("albumin") || normalized === "alb") return "alb";
  if (normalized.includes("alkaline phosphatase") || normalized === "alp") return "alp";
  if (normalized.includes("white blood cell") || normalized === "wbc" || normalized.includes("leukocyte") || normalized.includes("leucocyte")) return "wbc";
  if (normalized.includes("lymphocyte") || normalized === "lym") return "lym";
  if (normalized.includes("mean corpuscular volume") || normalized === "mcv") return "mcv";
  if (normalized.includes("red cell distribution width") || normalized === "rdw") return "rdw";
  if (normalized.includes("platelet") || normalized === "plt") return "plt";
  if (normalized.includes("creatinine") || normalized === "cre") return "cre";
  if (normalized.includes("egfr") || normalized.includes("filtration rate")) return "egfr";
  if (normalized.includes("sgpt") || normalized.includes("alanine aminotransferase") || normalized === "alt") return "alt";
  if (normalized.includes("sgot") || normalized.includes("aspartate aminotransferase") || normalized === "ast") return "ast";
  if (normalized.includes("cortisol")) return "cort";
  if (normalized.includes("vo2")) return "vo2";
  if (normalized.includes("hrv") || normalized.includes("heart rate variability")) return "hrv";
  if (normalized.includes("reaction time")) return "rt";
  if (normalized.includes("body fat")) return "bf";
  if (normalized.includes("posture")) return "posture";
  if (normalized.includes("blood pressure") || normalized === "bp") return "bp";
  if (normalized.includes("resting heart rate") || normalized.includes("heart rate") || normalized === "pulse") return "hr";

  return null;
}

export function normalizeAssessmentReadings(
  current: Assessment | null,
  previous?: Assessment | null,
): NormalizedReadings {
  if (!current) {
    return {
      hasReadings: false,
      checkinDate: null,
      formattedDate: "",
      sourceLabel: "Check-up",
      heartRate: { value: null, unit: "bpm", status: undefined, delta: null },
      bloodPressure: { value: null, display: "", unit: "mmHg", status: undefined, delta: null },
      ecg: { value: null, label: "", status: undefined, intervals: undefined },
      spo2: { value: null, unit: "%", status: undefined },
      bodyScan: {
        hasScan: false,
        bmi: null,
        bodyFat: null,
        waist: null,
        weightKg: null,
        heightCm: null,
        posture: { hasPosture: false, score: null, allNormal: false, findings: [] },
      },
      fitness: {
        vo2: { value: null, unit: "mL", status: undefined },
        hrv: { value: null, unit: "ms", status: undefined },
        reactionTime: { value: null, unit: "ms", status: undefined },
      },
      markersMap: {},
    };
  }

  const curReadings = (current.readings || {}) as Record<string, any>;
  const prevReadings = (previous?.readings || {}) as Record<string, any>;

  const getVal = (r: any) => {
    if (r === null || r === undefined) return null;
    if (typeof r === "object") return r.value ?? r.val ?? null;
    return r;
  };

  const getUnit = (r: any, defaultUnit = "") => {
    if (typeof r === "object" && r !== null && r.unit) return r.unit;
    return defaultUnit;
  };

  const getStatus = (r: any): "o" | "b" | "p" | undefined => {
    if (!r || typeof r !== "object") return undefined;
    if (r.flag === "green") return "o";
    if (r.flag === "amber") return "b";
    if (r.flag === "red") return "p";
    return undefined;
  };

  // Heart Rate
  let curHrVal: number | string | null = null;
  let hrFlag: string | undefined = undefined;
  if (curReadings.hr || curReadings.heart_rate || curReadings.pulse) {
    const raw = curReadings.hr || curReadings.heart_rate || curReadings.pulse;
    curHrVal = getVal(raw);
    hrFlag = typeof raw === "object" ? raw.flag : undefined;
  } else if (curReadings.bp?.pulse) {
    curHrVal = curReadings.bp.pulse;
  } else if (curReadings.spo2?.pulse) {
    curHrVal = curReadings.spo2.pulse;
  } else if (curReadings.ecg?._ecg_values?.hr) {
    curHrVal = curReadings.ecg._ecg_values.hr;
  }

  let prevHrVal: number | null = null;
  if (prevReadings.hr || prevReadings.heart_rate || prevReadings.pulse) {
    const p = getVal(prevReadings.hr || prevReadings.heart_rate || prevReadings.pulse);
    if (p != null) prevHrVal = parseFloat(String(p));
  } else if (prevReadings.bp?.pulse) {
    prevHrVal = parseFloat(String(prevReadings.bp.pulse));
  } else if (prevReadings.spo2?.pulse) {
    prevHrVal = parseFloat(String(prevReadings.spo2.pulse));
  } else if (prevReadings.ecg?._ecg_values?.hr) {
    prevHrVal = parseFloat(String(prevReadings.ecg._ecg_values.hr));
  }

  let hrDelta: string | null = null;
  if (curHrVal != null && prevHrVal != null && !isNaN(prevHrVal)) {
    const diff = Math.round(parseFloat(String(curHrVal)) - prevHrVal);
    hrDelta = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "0";
  }

  // Blood Pressure
  const rawBp = curReadings.bp || curReadings.blood_pressure;
  let bpDisplay = "";
  let bpSystolic: number | undefined;
  let bpDiastolic: number | undefined;
  let bpUnit = "mmHg";
  let bpFlag: string | undefined = undefined;

  if (rawBp) {
    if (typeof rawBp === "object") {
      bpSystolic = rawBp.systolic;
      bpDiastolic = rawBp.diastolic;
      bpUnit = rawBp.unit || "mmHg";
      bpFlag = rawBp.flag;
      if (rawBp.value) {
        bpDisplay = String(rawBp.value).replace(/\s*\/\s*/, " / ");
      } else if (rawBp.systolic && rawBp.diastolic) {
        bpDisplay = `${rawBp.systolic} / ${rawBp.diastolic}`;
      }
    } else {
      bpDisplay = String(rawBp).replace(/\s*\/\s*/, " / ");
    }
  }

  let prevBpDisplay: string | null = null;
  const rawPrevBp = prevReadings.bp || prevReadings.blood_pressure;
  if (rawPrevBp) {
    if (typeof rawPrevBp === "object" && rawPrevBp.value) {
      prevBpDisplay = String(rawPrevBp.value).replace(/\s*\/\s*/, " / ");
    } else if (typeof rawPrevBp === "object" && rawPrevBp.systolic && rawPrevBp.diastolic) {
      prevBpDisplay = `${rawPrevBp.systolic} / ${rawPrevBp.diastolic}`;
    } else if (typeof rawPrevBp === "string" || typeof rawPrevBp === "number") {
      prevBpDisplay = String(rawPrevBp).replace(/\s*\/\s*/, " / ");
    }
  }

  // ECG
  const rawEcg = curReadings.ecg;
  let ecgVal: string | null = null;
  let ecgLabel: string | undefined = undefined;
  let ecgFlag: "green" | "amber" | "red" | undefined = undefined;
  let ecgIntervals: [string, string][] | undefined = undefined;

  if (rawEcg) {
    if (typeof rawEcg === "object") {
      ecgVal = rawEcg.value || (rawEcg.flag === "green" ? "Normal rhythm" : "Rhythm assessed");
      ecgLabel = rawEcg.label;
      ecgFlag = rawEcg.flag;
      if (rawEcg._ecg_values) {
        const ev = rawEcg._ecg_values;
        ecgIntervals = [
          [String(ev.hr ?? "—"), "bpm"],
          [String(ev.pr_ms ?? "—"), "PR ms"],
          [String(ev.qrs_ms ?? "—"), "QRS ms"],
          [String(ev.qtc_bz_ms ?? ev.qt_ms ?? "—"), "QTc ms"],
        ];
      }
    } else {
      ecgVal = String(rawEcg);
    }
  }

  // SpO2
  const rawSpo2 = curReadings.spo2;
  const spo2Val = getVal(rawSpo2);
  const spo2Unit = getUnit(rawSpo2, "%");
  const spo2Status = getStatus(rawSpo2);

  // Body scan / weight / posture
  const rawWeight = curReadings.weight;
  const scan = typeof rawWeight === "object" && rawWeight?._scan ? rawWeight._scan : {};
  const bmiVal = scan.bmi ?? getVal(curReadings.bmi) ?? (rawWeight?.unit === "BMI" ? rawWeight.value : null);
  const bodyFatVal = scan.body_fat_pct ?? getVal(curReadings.body_fat) ?? getVal(curReadings.bf);
  const waistVal = scan.waist_cm ?? getVal(curReadings.waist);
  const weightKgVal = scan.weight_kg ?? rawWeight?.weight_kg ?? (rawWeight?.unit === "kg" ? rawWeight.value : null);
  const heightCmVal = scan.height_cm;

  // Posture
  let postureHas = false;
  let postureScore: number | null = null;
  let postureNormal = false;
  const postureFindings: [string, string, string][] = [];

  if (scan.posture) {
    postureHas = true;
    postureNormal = Boolean(scan.posture.all_normal);
    postureScore = postureNormal ? 100 : (scan.posture.score ?? 72);
    if (scan.posture.head_centered === false) {
      postureFindings.push(["p", "Forward head", `${Math.abs(scan.posture.head_offset || 10)}° from plumb line`]);
    }
    if (scan.posture.shoulder_level === false) {
      postureFindings.push(["b", "Shoulder level", `${scan.posture.shoulder_tilt_deg || 1.5}° tilt`]);
    }
    if (scan.posture.hip_level === false) {
      postureFindings.push(["b", "Pelvic tilt", `${scan.posture.hip_tilt_deg || 1}° tilt`]);
    }
    if (scan.posture.spine_aligned === false) {
      postureFindings.push(["b", "Spinal lean", `${scan.posture.spinal_lean || 0.5} lean`]);
    }
    if (postureNormal && postureFindings.length === 0) {
      postureFindings.push(["o", "Posture alignment", "Head, shoulders, spine and hips aligned"]);
    }
  } else if (curReadings.posture) {
    postureHas = true;
    const pVal = getVal(curReadings.posture);
    postureScore = typeof pVal === "number" ? pVal : parseInt(String(pVal), 10) || null;
    postureNormal = postureScore !== null && postureScore >= 80;
  }

  // Fitness
  const vo2Val = getVal(curReadings.vo2 || curReadings.vo2_max);
  const hrvVal = getVal(curReadings.hrv);
  const rtVal = getVal(curReadings.rt || curReadings.reaction_time);

  // Markers Map
  const markersMap: Record<string, any> = {};

  const addMarker = (aliasIds: string[], rawObj: any, defaultUnit = "") => {
    if (!rawObj) return;
    const val = getVal(rawObj);
    if (val === null || val === undefined || val === "" || val === "Not available" || val === "N/A") return;
    const u = getUnit(rawObj, defaultUnit);
    const st = getStatus(rawObj);
    const lbl = typeof rawObj === "object" ? rawObj.label : undefined;
    const nm = typeof rawObj === "object" ? rawObj.name : undefined;

    let pVal: string | undefined = undefined;
    for (const aId of aliasIds) {
      if (prevReadings[aId]) {
        const pv = getVal(prevReadings[aId]);
        if (pv != null) {
          pVal = String(pv);
          break;
        }
      }
    }

    const payload = {
      value: val,
      unit: u,
      status: st,
      label: lbl,
      name: nm,
      isRecorded: true,
      prev: pVal,
      when: pVal && previous?.created_at ? formatReportDate(previous.created_at) : undefined,
    };

    for (const aId of aliasIds) {
      markersMap[aId] = payload;
    }
  };

  addMarker(["bp", "blood_pressure"], rawBp, "mmHg");
  if (curHrVal != null) {
    markersMap["hr"] = {
      value: curHrVal,
      unit: "bpm",
      status: hrFlag === "green" ? "o" : hrFlag === "amber" ? "b" : hrFlag === "red" ? "p" : "o",
      isRecorded: true,
      prev: prevHrVal != null ? String(prevHrVal) : undefined,
      when: prevHrVal != null && previous?.created_at ? formatReportDate(previous.created_at) : undefined,
    };
  }
  if (ecgVal != null) {
    markersMap["ecg"] = {
      value: ecgVal,
      unit: "lead-I",
      status: ecgFlag === "green" ? "o" : ecgFlag === "amber" ? "b" : ecgFlag === "red" ? "p" : "o",
      label: ecgLabel,
      isRecorded: true,
      intervals: ecgIntervals,
    };
  }
  if (spo2Val != null) {
    markersMap["spo2"] = {
      value: spo2Val,
      unit: "%",
      status: spo2Status || "o",
      isRecorded: true,
    };
  }
  if (bmiVal != null) {
    markersMap["bmi"] = {
      value: bmiVal,
      unit: "",
      status: typeof rawWeight === "object" && rawWeight.flag ? (rawWeight.flag === "green" ? "o" : rawWeight.flag === "amber" ? "b" : "p") : "b",
      isRecorded: true,
    };
  }
  if (bodyFatVal != null) {
    markersMap["bf"] = {
      value: bodyFatVal,
      unit: "%",
      status: "b",
      isRecorded: true,
    };
  }
  if (waistVal != null) {
    markersMap["waist"] = {
      value: waistVal,
      unit: "cm",
      status: "b",
      isRecorded: true,
    };
  }
  if (postureHas) {
    markersMap["posture"] = {
      value: postureScore ?? (postureNormal ? 100 : 72),
      unit: "/ 100",
      status: postureNormal ? "o" : "p",
      isRecorded: true,
      findings: postureFindings,
    };
  }
  addMarker(["fer", "ferritin"], curReadings.ferritin || curReadings.fer, "ng/mL");
  addMarker(["hb", "haemoglobin", "hemoglobin", "hgb"], curReadings.haemoglobin || curReadings.hemoglobin || curReadings.hgb || curReadings.hb, "g/dL");
  addMarker(["glu", "glucose", "fbs"], curReadings.glucose || curReadings.glu || curReadings.fbs, "mg/dL");
  addMarker(["cbc"], curReadings.cbc, "");
  addMarker(["hba1c"], curReadings.hba1c, "%");
  addMarker(["apob"], curReadings.apob, "mg/dL");
  addMarker(["ldl", "cholesterol"], curReadings.ldl || curReadings.cholesterol, "mg/dL");
  addMarker(["hdl"], curReadings.hdl, "mg/dL");
  addMarker(["tg", "triglycerides"], curReadings.triglycerides || curReadings.tg, "mg/dL");
  addMarker(["crp", "hs_crp"], curReadings.crp || curReadings.hs_crp, "mg/L");
  addMarker(["alt", "sgpt"], curReadings.alt || curReadings.sgpt, "U/L");
  addMarker(["ast", "sgot"], curReadings.ast || curReadings.sgot, "U/L");
  addMarker(["cre", "creatinine"], curReadings.creatinine || curReadings.cre, "mg/dL");
  addMarker(["vitd", "vitamin_d"], curReadings.vitd || curReadings.vitamin_d, "ng/mL");
  addMarker(["b12", "vitamin_b12"], curReadings.b12 || curReadings.vitamin_b12, "pg/mL");
  addMarker(["tsh"], curReadings.tsh, "µIU/mL");
  addMarker(["cort", "cortisol"], curReadings.cort || curReadings.cortisol, "µg/dL");
  addMarker(["vo2", "vo2_max"], curReadings.vo2 || curReadings.vo2_max, "mL/kg/min");
  addMarker(["hrv"], curReadings.hrv, "ms");
  addMarker(["rt", "reaction_time"], curReadings.rt || curReadings.reaction_time, "ms");
  
  // Missing markers identified in audit - these were in BIOMARKERS template but not extracted from API
  addMarker(["ins", "insulin", "fasting_insulin"], curReadings.insulin || curReadings.ins || curReadings.fasting_insulin, "µIU/mL");
  addMarker(["vf", "visceral_fat"], scan.visceral_fat ?? curReadings.visceral_fat ?? curReadings.vf, "level");
  addMarker(["smm", "skeletal_muscle_mass"], scan.skeletal_muscle_mass ?? curReadings.skeletal_muscle_mass ?? curReadings.smm, "kg");
  addMarker(["grip", "grip_strength"], curReadings.grip_strength || curReadings.grip, "kg");
  addMarker(["bone", "bone_density", "t_score"], curReadings.bone_density || curReadings.t_score || curReadings.bone, "DXA");
  addMarker(["lpa", "lipoprotein_a"], curReadings.lipoprotein_a || curReadings.lpa, "mg/dL");
  addMarker(["sleep", "sleep_duration"], curReadings.sleep_duration || curReadings.sleep, "h");
  addMarker(["cog", "cognitive", "cognitive_screen"], curReadings.cognitive_screen || curReadings.cognitive || curReadings.cog, "");

  return {
    hasReadings: Object.keys(curReadings).length > 0,
    checkinDate: current.created_at,
    formattedDate: formatReportDate(current.created_at),
    sourceLabel: current.source === "kiosk" ? (current.kiosk_id ? `Aaha Kiosk #${current.kiosk_id}` : "Aaha Health Kiosk") : "Check-up",
    heartRate: {
      value: curHrVal,
      unit: "bpm",
      status: hrFlag === "green" ? "o" : hrFlag === "amber" ? "b" : hrFlag === "red" ? "p" : "o",
      delta: hrDelta,
    },
    bloodPressure: {
      value: bpDisplay || null,
      display: bpDisplay,
      systolic: bpSystolic,
      diastolic: bpDiastolic,
      unit: bpUnit,
      status: bpFlag === "green" ? "o" : bpFlag === "amber" ? "b" : bpFlag === "red" ? "p" : (bpDisplay ? "b" : undefined),
      delta: prevBpDisplay ? `prev ${prevBpDisplay}` : null,
    },
    ecg: {
      value: ecgVal,
      label: ecgLabel,
      flag: ecgFlag,
      status: ecgFlag === "green" ? "o" : ecgFlag === "amber" ? "b" : ecgFlag === "red" ? "p" : undefined,
      intervals: ecgIntervals,
    },
    spo2: {
      value: spo2Val,
      unit: spo2Unit,
      status: spo2Status,
    },
    bodyScan: {
      hasScan: bmiVal != null || bodyFatVal != null || waistVal != null || postureHas,
      bmi: bmiVal,
      bodyFat: bodyFatVal,
      waist: waistVal,
      weightKg: weightKgVal,
      heightCm: heightCmVal,
      posture: {
        hasPosture: postureHas,
        score: postureScore,
        allNormal: postureNormal,
        findings: postureFindings,
      },
    },
    fitness: {
      vo2: { value: vo2Val, unit: "mL", status: vo2Val ? "b" : undefined },
      hrv: { value: hrvVal, unit: "ms", status: hrvVal ? "o" : undefined },
      reactionTime: { value: rtVal, unit: "ms", status: rtVal ? "o" : undefined },
    },
    markersMap,
  };
}

export function LivAppScreen() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, user, patient, loading: authLoading, isUnlinked } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Navigation & Screen View State
  const [currentView, setCurrentView] = useState<
    | "splash"
    | "signup"
    | "signin"
    | "welcome"
    | "main"
    | "marker"
    | "track"
    | "report"
    | "book"
    | "booked"
    | "analyzing"
  >(() => {
    if (search.view) {
      if ((search.view as string) === "story") return "signup";
      return search.view;
    }
    return "splash";
  });

  const [activeTab, setActiveTab] = useState<"home" | "markers" | "plan" | "care">(
    search.tab || "home",
  );
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>(search.marker || "hba1c");
  const [selectedTrackId, setSelectedTrackId] = useState<string>(search.track || "hm");
  const [markerFilter, setMarkerFilter] = useState<string>(search.filter || "all");
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [appTheme, setAppTheme] = useState<"dark" | "light">("dark");
  const [openPri, setOpenPri] = useState<number | null>(null);

  const qc = useQueryClient();

  // Load real patient profile from clinical backend
  const profileQuery = useQuery({
    queryKey: ["my-profile", session?.uid],
    queryFn: () => apiService.getMyProfile(),
    enabled: Boolean(session),
    retry: (failureCount, error: any) => {
      // 404 indicates user has not yet been linked to a clinical patient record
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const isProfile404 = (profileQuery.error as any)?.status === 404;
  const isProfileError = profileQuery.isError && !isProfile404;
  const isUnlinkedPatient = Boolean(isUnlinked || isProfile404);
  const activePatient = profileQuery.data?.patient || patient;

  // Fetch real clinical assessment reports from GET /api/v2/reports/me
  const assessmentsQuery = useQuery({
    queryKey: ["assessments", session?.uid],
    queryFn: () => listAssessments(),
    enabled: Boolean(session),
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  const assessments = assessmentsQuery.data || [];
  const latestAssessment = assessments[0] || null;
  const isAssessmentsLoading = assessmentsQuery.isLoading;
  const isAssessments404 = (assessmentsQuery.error as any)?.status === 404 || (assessmentsQuery.error as any)?.isUnlinked;
  const isAssessmentsError = assessmentsQuery.isError && !isAssessments404;

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const activeAssessment = assessments.find((a) => a.id === selectedAssessmentId) || latestAssessment;

  const sampleAssessment: Assessment = useMemo(() => ({
    id: "sample-kiosk-report",
    patient_id: "LL-PNE-0247",
    created_at: "2026-09-18T09:00:00Z",
    source: "kiosk" as any,
    score: 69,
    band: "optimal",
    summary: "A good base, with four things to move. Reviewed and signed by Dr. A. Deshmukh on 18 Sep.",
    complaint: "General longevity check-up and metabolic baseline",
    readings: {
      blood_pressure: { value: "118/76", unit: "mmHg" },
      heart_rate: { value: 68, unit: "bpm" },
      hba1c: { value: 5.9, unit: "%" },
      apob: { value: 102, unit: "mg/dL" },
      vitamin_d: { value: 16, unit: "ng/mL" },
      ferritin: { value: 18, unit: "ng/mL" },
      vo2_max: { value: 28.4, unit: "mL/kg/min" },
      grip_strength: { value: 24, unit: "kg" },
    },
    suspected_conditions: [],
    answers: {},
    report: {},
    recommendations: [
      { title: "Strength Training", priority: "high", reason: "Three 45-minute sessions a week with Coach Ritu" },
      { title: "Vitamin D Replacement", priority: "high", reason: "Physician-led replacement dose" },
      { title: "Post-Meal Walks", priority: "medium", reason: "10-minute walks to lower blood sugar spike" },
    ],
    report_pdf_url: undefined,
  }), []);

  const effectiveAssessment = activeAssessment || sampleAssessment;

  // Longevity Report PDF Data Extraction (all pages)
  const longevityPdfQuery = useQuery<ExtractedLongevityData | null>({
    queryKey: ["longevity-pdf-data", effectiveAssessment?.id, effectiveAssessment?.report_pdf_url],
    queryFn: async () => {
      if (!effectiveAssessment?.report_pdf_url) return null;
      return extractLongevityPdfData(
        effectiveAssessment.report_pdf_url,
        activePatient?.full_name || undefined,
      );
    },
    enabled: Boolean(effectiveAssessment?.report_pdf_url),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const extractedPdfData: ExtractedLongevityData | null = longevityPdfQuery.data || null;

  // Verified Biological Age resolution: raw report data takes priority, then extracted PDF data
  const verifiedBiologicalAge = useMemo(() => {
    const rawBio =
      effectiveAssessment?._raw?.report_data?.biological_age ??
      effectiveAssessment?._raw?.prediction?.biological_age ??
      effectiveAssessment?._raw?.biological_age;
    if (typeof rawBio === "number" && !isNaN(rawBio)) return rawBio;
    if (extractedPdfData?.biologicalAge != null && !isNaN(extractedPdfData.biologicalAge)) {
      return extractedPdfData.biologicalAge;
    }
    return null;
  }, [effectiveAssessment, extractedPdfData]);

  const verifiedChronologicalAge = useMemo(() => {
    const rawCal =
      effectiveAssessment?._raw?.report_data?.calendar_age ??
      effectiveAssessment?._raw?.report_data?.baseline_readings?.ecg?._ecg_values?.age ??
      activePatient?.age;
    if (typeof rawCal === "number" && !isNaN(rawCal)) return rawCal;
    if (extractedPdfData?.chronologicalAge != null && !isNaN(extractedPdfData.chronologicalAge)) {
      return extractedPdfData.chronologicalAge;
    }
    return 32;
  }, [effectiveAssessment, activePatient, extractedPdfData]);

  const verifiedBiologicalAgeDiff = useMemo(() => {
    if (verifiedBiologicalAge != null && verifiedChronologicalAge != null) {
      return Number((verifiedBiologicalAge - verifiedChronologicalAge).toFixed(1));
    }
    if (extractedPdfData?.biologicalAgeDiff != null) {
      return extractedPdfData.biologicalAgeDiff;
    }
    return null;
  }, [verifiedBiologicalAge, verifiedChronologicalAge, extractedPdfData]);


  // Fetch patient uploaded documents from GET /api/v2/blood-reports/me
  const uploadsQuery = useQuery({
    queryKey: ["my-uploads", session?.uid],
    queryFn: () => listReports(),
    enabled: Boolean(session),
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  const uploadedReports = uploadsQuery.data || [];
  const totalReportCount = assessments.length + uploadedReports.length;

  // Real backend preferences integration from GET /api/v2/preferences/me
  const preferencesQuery = useQuery({
    queryKey: ["preferences", session?.uid],
    queryFn: () => getPreferences(),
    enabled: Boolean(session),
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Real backend notifications stream from GET /api/v2/notifications/me
  const notificationsQuery = useQuery({
    queryKey: ["notifications", session?.uid],
    queryFn: () => listNotifications(),
    enabled: Boolean(session),
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Mutation to persist patient preferences to PUT/PATCH /api/v2/preferences/me
  const updatePreferencesMutation = useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => updatePreferences(patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["preferences", session?.uid] });
    },
    onError: (err: any) => {
      console.warn("Could not save preferences to server:", err);
      showToast("Could not sync setting to server. Local setting applied.");
    },
  });

  // Fetch real patient appointments from GET /api/v2/appointments/me
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", session?.uid],
    queryFn: () => listAppointments(),
    enabled: Boolean(session),
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  const realAppointments: AppointmentItem[] = useMemo(() => {
    if (!session || !appointmentsQuery.data) return [];
    return appointmentsQuery.data
      .filter((a) => a.status !== "cancelled")
      .map((a) => {
        let dateObj: Date;
        if (a.appointment_date) {
          const parts = a.appointment_date.split("-").map((n) => parseInt(n, 10));
          if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            dateObj = new Date(a.appointment_date);
          }
        } else {
          dateObj = new Date(a.created_at || Date.now());
        }

        const isPast = Boolean(
          a.status === "completed" ||
          (dateObj.getTime() < Date.now() - 864e5 && a.status !== "pending"),
        );

        return {
          id: a._id || a.id || a.appointment_id || String(Math.random()),
          t: a.appointment_type || (a.booking_type === "kiosk" ? "Kiosk screening" : "Physician review"),
          w: a.doctor_name
            ? `${a.doctor_name} · ${a.mode || "In person"}`
            : `${a.centre || "Aaha Health Centre"} · ${a.mode || "In person"}`,
          d: dateObj,
          h: a.appointment_time || a.slot_label || "10:00 AM",
          status: a.status === "pending" ? "pending" : "ok",
          past: isPast,
          svc: a.notes?.startsWith("svc:") ? a.notes.slice(4) : undefined,
          raw: a,
        };
      });
  }, [session, appointmentsQuery.data]);

  const previousAssessment = assessments[1] || null;
  const normalizedReadings = useMemo(
    () => normalizeAssessmentReadings(latestAssessment, previousAssessment),
    [latestAssessment, previousAssessment],
  );

  const displayBiomarkers = useMemo(() => {
    if (!session) {
      return BIOMARKERS.map((m) => ({ ...m, isRecorded: true }));
    }

    const { markersMap } = normalizedReadings;
    const mergedMarkersMap: Record<string, any> = { ...markersMap };

    // Tag vitals with source kiosk
    for (const entry of Object.values(mergedMarkersMap)) {
      if (entry && typeof entry === "object") {
        entry.source = "kiosk";
        entry.sourceName = latestAssessment?.kiosk_id
          ? `Aaha Kiosk #${latestAssessment.kiosk_id}`
          : "Aaha Health Kiosk";
        entry.when = latestAssessment?.created_at
          ? formatReportDate(latestAssessment.created_at)
          : undefined;
      }
    }

    // Merge extracted biomarkers from uploaded reports
    const sortedUploads = [...uploadedReports].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const report of sortedUploads) {
      if (Array.isArray(report.extracted_values)) {
        for (const ev of report.extracted_values as any[]) {
          if (!ev || !ev.test_name || ev.value === undefined || ev.value === null) continue;
          const bioId = resolveBiomarkerId(String(ev.test_name));
          if (bioId) {
            const rawStatus = String(ev.status || "").toLowerCase();
            const status: "o" | "b" | "p" =
              rawStatus.includes("high") || rawStatus.includes("low") || rawStatus.includes("alert")
                ? "p"
                : rawStatus.includes("borderline")
                ? "b"
                : "o";

            mergedMarkersMap[bioId] = {
              value: ev.value,
              unit: ev.unit || "",
              status,
              label: ev.reference_range ? `${ev.status || (status === "p" ? "Abnormal" : "Normal")} (${ev.reference_range})` : (ev.status || (status === "p" ? "Abnormal" : "Normal")),
              reference_range: ev.reference_range,
              isRecorded: true,
              source: "uploaded",
              sourceName: report.file_name || report.title || "Laboratory Report",
              when: report.created_at ? formatReportDate(report.created_at) : undefined,
            };
          }
        }
      }
    }

    // Merge extracted measurements from Kiosk Longevity PDF
    if (extractedPdfData?.measurements) {
      for (const m of Object.values(extractedPdfData.measurements)) {
        if (!m || m.value === undefined || m.value === null) continue;
        const bioId = resolveBiomarkerId(m.id) || resolveBiomarkerId(m.name);
        if (bioId && (!mergedMarkersMap[bioId] || !mergedMarkersMap[bioId].isRecorded)) {
          const rawStatus = String(m.status || "").toLowerCase();
          const status: "o" | "b" | "p" =
            rawStatus.includes("p") || rawStatus.includes("high") || rawStatus.includes("low") || rawStatus.includes("alert") || rawStatus.includes("abnormal")
              ? "p"
              : rawStatus.includes("b") || rawStatus.includes("borderline")
              ? "b"
              : "o";

          const refRange = m.optimalRange || m.clinicalRange;
          mergedMarkersMap[bioId] = {
            value: m.value,
            unit: m.unit || "",
            status,
            label: refRange ? `${status === "p" ? "Abnormal" : "Optimal"} (${refRange})` : "Optimal",
            reference_range: refRange,
            isRecorded: true,
            source: "kiosk_pdf",
            sourceName: `AAHA Longevity Report (p. ${m.sourcePage})`,
            when: extractedPdfData.reportDate || (latestAssessment?.created_at ? formatReportDate(latestAssessment.created_at) : undefined),
          };
        }
      }
    }

    return BIOMARKERS.map((template) => {
      const match = mergedMarkersMap[template.id];
      if (match && match.isRecorded) {
        return {
          ...template,
          v: String(match.value),
          u: match.unit || template.u,
          s: match.status || (template.s as "o" | "b" | "p"),
          prev: match.prev,
          when: match.when,
          isRecorded: true,
          label: match.label,
          source: match.source,
          sourceName: match.sourceName,
          reference_range: match.reference_range,
          opt: match.reference_range || template.opt,
          iv: match.intervals || template.iv,
          find: match.findings || template.find,
        };
      }
      return {
        ...template,
        v: "—",
        s: undefined as unknown as "o" | "b" | "p",
        prev: undefined,
        when: undefined,
        isRecorded: false,
        source: undefined,
        sourceName: undefined,
        reference_range: undefined,
      };
    });
  }, [session, latestAssessment, normalizedReadings, uploadedReports, extractedPdfData]);

  const recordedPriorityMarkers = useMemo(() => {
    return displayBiomarkers.filter((m) => m.s === "p" && (!session || m.isRecorded));
  }, [displayBiomarkers, session]);

  const uploadedLabValues = useMemo(() => {
    if (!session || (!uploadedReports.length && !extractedPdfData?.measurements)) return [];
    const values: Array<{
      test_name: string;
      value: string | number;
      unit: string;
      reference_range: string;
      status: string;
      source: string;
      when?: string;
    }> = [];
    const seen = new Set<string>();

    for (const rep of uploadedReports) {
      if (Array.isArray(rep.extracted_values)) {
        for (const ev of rep.extracted_values as any[]) {
          if (!ev || !ev.test_name || ev.value == null) continue;
          const k = String(ev.test_name).toLowerCase().trim();
          if (!seen.has(k)) {
            seen.add(k);
            values.push({
              test_name: String(ev.test_name),
              value: ev.value,
              unit: ev.unit || "",
              reference_range: ev.reference_range || "",
              status: ev.status || "Normal",
              source: rep.file_name || rep.title || "Laboratory Report",
              when: rep.created_at ? formatReportDate(rep.created_at) : undefined,
            });
          }
        }
      }
    }

    if (extractedPdfData?.measurements) {
      for (const m of Object.values(extractedPdfData.measurements)) {
        if (!m || !m.name || m.value == null) continue;
        const k = String(m.name).toLowerCase().trim();
        if (!seen.has(k)) {
          seen.add(k);
          values.push({
            test_name: String(m.name),
            value: m.value,
            unit: m.unit || "",
            reference_range: m.optimalRange || m.clinicalRange || "",
            status: m.status === "p" ? "Abnormal" : m.status === "b" ? "Borderline" : "Optimal",
            source: `AAHA Longevity Report (p. ${m.sourcePage})`,
            when: extractedPdfData.reportDate || (latestAssessment?.created_at ? formatReportDate(latestAssessment.created_at) : undefined),
          });
        }
      }
    }

    return values;
  }, [session, uploadedReports, extractedPdfData, latestAssessment]);

  // Nine Canonical PhenoAge Biomarkers (Levine et al., 2018)
  const phenoAgePanel = useMemo(() => {
    const canonicalList = [
      { id: "alb", name: "Albumin", unit: "g/dL", optimal: "4.0 – 5.0", ref: "3.5 – 5.2" },
      { id: "cre", name: "Creatinine", unit: "mg/dL", optimal: "0.7 – 1.2", ref: "0.7 – 1.3" },
      { id: "glu", name: "Fasting Glucose", unit: "mg/dL", optimal: "70 – 99", ref: "70 – 100" },
      { id: "crp", name: "C-Reactive Protein (hs-CRP)", unit: "mg/L", optimal: "< 1.0", ref: "< 3.0" },
      { id: "lym", name: "Lymphocytes", unit: "%", optimal: "25 – 40", ref: "20 – 40" },
      { id: "mcv", name: "Mean Corpuscular Volume (MCV)", unit: "fL", optimal: "82 – 98", ref: "80 – 100" },
      { id: "rdw", name: "Red Cell Dist. Width (RDW)", unit: "%", optimal: "11.5 – 14.5", ref: "11.5 – 15.0" },
      { id: "alp", name: "Alkaline Phosphatase (ALP)", unit: "U/L", optimal: "44 – 115", ref: "40 – 130" },
      { id: "wbc", name: "White Blood Cell Count (WBC)", unit: "10^3/µL", optimal: "4.0 – 10.0", ref: "4.0 – 11.0" },
    ];

    return canonicalList.map((c) => {
      const match = displayBiomarkers.find((b) => b.id === c.id);
      if (match && match.isRecorded && match.v !== "—" && match.v !== "--") {
        return {
          ...c,
          value: match.v,
          unit: match.u || c.unit,
          status: match.s === "o" ? "Optimal" : match.s === "b" ? "Borderline" : "Attention",
          source: match.sourceName || "Clinical Report",
          isRecorded: true,
        };
      }
      return {
        ...c,
        value: "—",
        status: "Pending",
        source: "Requires blood panel",
        isRecorded: false,
      };
    });
  }, [displayBiomarkers]);


  // Countdown animation for biological age (prototype-matching)
  useEffect(() => {
    if (!verifiedBiologicalAge || typeof verifiedBiologicalAge !== "number") return;
    
    const bioAgeElements = document.querySelectorAll<HTMLElement>('[data-count]');
    if (bioAgeElements.length === 0) return;
    
    bioAgeElements.forEach((el) => {
      const targetValue = parseFloat(el.getAttribute('data-count') || '0');
      if (targetValue === 0 || isNaN(targetValue)) return;
      
      const decimalPlaces = (el.getAttribute('data-count')?.split('.')[1] || '').length;
      let startTime: number | null = null;
      
      // Check for reduced motion preference
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = targetValue.toFixed(decimalPlaces);
        return;
      }
      
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min(1, (currentTime - startTime) / 1400);
        const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        el.textContent = (targetValue * eased).toFixed(decimalPlaces);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      el.textContent = (0).toFixed(decimalPlaces);
      requestAnimationFrame(animate);
    });
  }, [verifiedBiologicalAge, currentView, activeTab]);

  // User & Patient State
  const existingProfile = getUserProfile();
  const [fullName, setFullName] = useState(
    activePatient?.full_name || existingProfile?.firstName
      ? `${existingProfile?.firstName || ""} ${existingProfile?.lastName || ""}`.trim()
      : "Kaveri Bhosle",
  );
  const [phoneNumber, setPhoneNumber] = useState(
    activePatient?.mobile_number?.replace("+91", "").trim() ||
      existingProfile?.phoneNumber?.replace("+91", "").trim() ||
      "98765 43210",
  );
  const [email, setEmail] = useState("you@example.com");
  const [age, setAge] = useState(activePatient?.age ? String(activePatient.age) : "42");
  const [sex, setSex] = useState<"Female" | "Male" | "Other">("Female");
  const [consentGiven, setConsentGiven] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Masked phone number helper matching prototype line 630
  const maskPhone = (ph?: string) => {
    const p = (ph || phoneNumber || "9876543210").replace(/\D/g, "") || "9876543210";
    return `+91 ${p.slice(0, 2)}•••• ••${p.slice(-2)}`;
  };

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [editName, setEditName] = useState(fullName);
  const [editAge, setEditAge] = useState(age);
  const [editGender, setEditGender] = useState(sex);

  // Auth State
  const [authMode, setAuthMode] = useState<"otp" | "google">("otp");
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const [busy, setBusy] = useState(false);
  const [otpErrorShake, setOtpErrorShake] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update profile demographic state when real activePatient resolves
  useEffect(() => {
    if (activePatient?.full_name) {
      setFullName(activePatient.full_name);
    } else if (user?.name) {
      setFullName(user.name);
    }
    if (activePatient?.mobile_number) {
      setPhoneNumber(activePatient.mobile_number.replace("+91", "").trim());
    } else if (session?.phoneNumber) {
      setPhoneNumber(session.phoneNumber.replace("+91", "").trim());
    }
    if (activePatient?.age) {
      setAge(String(activePatient.age));
    }
    if (activePatient?.gender) {
      const g = activePatient.gender.toLowerCase();
      if (g === "female" || g === "f") setSex("Female");
      else if (g === "male" || g === "m") setSex("Male");
      else setSex("Other");
    }
  }, [activePatient, user, session]);

  // Sync edit form inputs when profile sheet opens
  useEffect(() => {
    if (activeSheet === "profile") {
      setEditName(fullName);
      setEditAge(age);
      setEditGender(sex);
    }
  }, [activeSheet, fullName, age, sex]);

  // Session restoration without blocking prototype preview navigation
  useEffect(() => {
    if (authLoading) return;
    if (session && (currentView === "signin" || currentView === "signup")) {
      setCurrentView("main");
    }
  }, [session, authLoading, currentView]);

  // Advance splash screen automatically after 3000ms OR when user explicitly taps / touches screen
  const advanceSplash = () => {
    if (currentView === "splash") {
      setCurrentView(session ? "main" : "signup");
    }
  };

  useEffect(() => {
    if (currentView !== "splash") return;
    const timer = setTimeout(() => {
      advanceSplash();
    }, 3000);

    const handleTap = () => {
      clearTimeout(timer);
      advanceSplash();
    };
    window.addEventListener("pointerdown", handleTap);
    window.addEventListener("click", handleTap);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", handleTap);
      window.removeEventListener("click", handleTap);
    };
  }, [currentView, session]);


  // Track protected views when strict authentication enforcement is required
  const protectedViews: string[] = ["settings"];
  const isProtectedView = protectedViews.includes(currentView);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  // Story Carousel State
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);

  // App Core State - full interactive prototype report by default, or empty if requested
  const [demoHasReport, setDemoHasReport] = useState<boolean>(() => {
    if (search.state === "empty") return false;
    return true;
  });
  const hasReport = session ? (totalReportCount > 0 ? true : demoHasReport) : demoHasReport;
  const setHasReport = setDemoHasReport;

  const [kioskFound, setKioskFound] = useState(true);
  const [analysisSource, setAnalysisSource] = useState<"kiosk" | "upload">("kiosk");
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [analysisFileName, setAnalysisFileName] = useState<string>("Sample lab report");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedBiomarkerCount, setUploadedBiomarkerCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const getAssessmentSourceLabel = (a?: Assessment | null) => {
    if (!a) return "Longevity Report";
    if (a.source === "kiosk") {
      return "Longevity Report";
    }
    if (a.source === "consumer_app") {
      return "Longevity Report";
    }
    return "Longevity Report";
  };

  const handlePdfAction = async (
    targetAssessment: Assessment | null,
    action: "view" | "download" = "view",
    isRetry = false,
  ) => {
    if (!targetAssessment) {
      showToast("No clinical report selected.");
      return;
    }

    let rawPath = targetAssessment.report_pdf_url || "";
    // Protect against exposing internal storage paths without signing
    if (typeof rawPath === "string" && rawPath.startsWith("gs://")) {
      rawPath = "";
    }

    if (!rawPath || !rawPath.startsWith("http")) {
      showToast("PDF report is not available for this record.");
      return;
    }

    setIsPdfLoading(true);
    showToast(action === "download" ? "Downloading report PDF..." : "Opening signed report...");

    // Android-native PDF handling
    if (Capacitor.isNativePlatform()) {
      try {
        // Fetch PDF blob
        const res = await fetch(rawPath);
        if (res.status === 403 || res.status === 401) {
          if (!isRetry) {
            showToast("Refreshing secure report link...");
            await qc.invalidateQueries({ queryKey: ["assessments", session?.uid] });
            const freshAssessments = await listAssessments();
            const freshRecord = freshAssessments.find((item) => String(item.id) === String(targetAssessment.id));
            if (
              freshRecord?.report_pdf_url &&
              freshRecord.report_pdf_url !== rawPath &&
              freshRecord.report_pdf_url.startsWith("http")
            ) {
              return handlePdfAction(freshRecord, action, true);
            }
          }
          showToast("PDF link has expired. Please try again.");
          setIsPdfLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load file (${res.status})`);
        }

        const blob = await res.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Generate filename
        const baseName = targetAssessment.kiosk_id
          ? `Aaha_Kiosk_Report_${targetAssessment.kiosk_id}`
          : `Aaha_Health_Report_${targetAssessment.id || "Assessment"}`;
        const fileName = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;

        // Save to device
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        setIsPdfLoading(false);

        // Open the PDF with native app
        try {
          await FileOpener.openFile({
            path: savedFile.uri,
            mimeType: 'application/pdf',
          });
          
          if (action === "download") {
            showToast("PDF downloaded successfully.");
          } else {
            showToast("Opening PDF...");
          }
        } catch (openError: any) {
          console.error("FileOpener error:", openError);
          showToast("PDF saved. Please check your downloads.");
        }

      } catch (error: any) {
        console.error("Android PDF error:", error);
        setIsPdfLoading(false);
        
        // Fallback: try proxy
        try {
          const proxyRes = await fetch(`/api/proxy-pdf?url=${encodeURIComponent(rawPath)}`);
          if (proxyRes.ok) {
            const blob = await proxyRes.blob();
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            const baseName = targetAssessment.kiosk_id
              ? `Aaha_Kiosk_Report_${targetAssessment.kiosk_id}`
              : `Aaha_Health_Report_${targetAssessment.id || "Assessment"}`;
            const fileName = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;

            const savedFile = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache,
            });

            await FileOpener.openFile({
              path: savedFile.uri,
              mimeType: 'application/pdf',
            });

            showToast(action === "download" ? "PDF downloaded." : "Opening PDF...");
            return;
          }
        } catch (proxyError) {
          console.error("Proxy fallback failed:", proxyError);
        }

        showToast("Could not open PDF. Please try again.");
      }
      return;
    }

    // Web browser PDF handling (existing implementation)
    try {
      // Direct fetch WITHOUT Authorization header so GCS signed URL signatures match
      const res = await fetch(rawPath);
      if (res.status === 403 || res.status === 401) {
        if (!isRetry) {
          showToast("Refreshing secure report link...");
          await qc.invalidateQueries({ queryKey: ["assessments", session?.uid] });
          const freshAssessments = await listAssessments();
          const freshRecord = freshAssessments.find((item) => String(item.id) === String(targetAssessment.id));
          if (
            freshRecord?.report_pdf_url &&
            freshRecord.report_pdf_url !== rawPath &&
            freshRecord.report_pdf_url.startsWith("http")
          ) {
            return handlePdfAction(freshRecord, action, true);
          }
        }
        showToast("PDF link has expired. Please try again in a few moments.");
        setIsPdfLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load file (${res.status})`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setIsPdfLoading(false);

      if (action === "download") {
        const a = document.createElement("a");
        a.href = objectUrl;
        const baseName = targetAssessment.kiosk_id
          ? `Aaha_Kiosk_Report_${targetAssessment.kiosk_id}`
          : `Aaha_Health_Report_${targetAssessment.id || "Assessment"}`;
        a.download = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        showToast("PDF download initiated.");
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      // First try via our internal proxy to bypass browser GCS CORS
      try {
        const proxyRes = await fetch(`/api/proxy-pdf?url=${encodeURIComponent(rawPath)}`);
        if (proxyRes.ok) {
          const blob = await proxyRes.blob();
          const objectUrl = URL.createObjectURL(blob);
          setIsPdfLoading(false);
          if (action === "download") {
            const a = document.createElement("a");
            a.href = objectUrl;
            const baseName = targetAssessment.kiosk_id
              ? `Aaha_Kiosk_Report_${targetAssessment.kiosk_id}`
              : `Aaha_Health_Report_${targetAssessment.id || "Assessment"}`;
            a.download = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
            showToast("PDF download initiated.");
            return;
          } else {
            window.open(objectUrl, "_blank", "noopener,noreferrer");
            return;
          }
        }
      } catch {
        // Fallback below
      }

      setIsPdfLoading(false);
      // Final fallback for CORS or direct browser navigation without Authorization header
      if (action === "view") {
        window.open(rawPath, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = rawPath;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.download = "Aaha_Health_Report.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  const handleFetchKioskReports = async () => {
    showToast("Checking clinical records...");
    try {
      await qc.invalidateQueries({ queryKey: ["assessments", session?.uid] });
      const res = await assessmentsQuery.refetch();
      if (res.data && res.data.length > 0) {
        showToast(`Found ${res.data.length} report(s).`);
      } else {
        showToast("No screening reports found for this account.");
      }
    } catch {
      showToast("Could not contact the clinical server.");
    }
  };

  // Plan Habits & Points
  const [pts, setPts] = useState<number>(340);
  const [habitsDone, setHabitsDone] = useState<Record<string, boolean>>({});
  const [weeklyProgress, setWeeklyProgress] = useState<Record<string, number>>({
    str: 2,
    walk: 4,
    sup: 5,
    br: 3,
  });
  const [addedActions, setAddedActions] = useState<Record<string, boolean>>({});
  const [earnedBadges, setEarnedBadges] = useState<Record<string, boolean>>({
    first_session: true,
    streak_7: true,
    vitd_start: true,
    sensor_week: true,
    sessions_12: false,
    day_90: false,
  });
  const [requestedPackages, setRequestedPackages] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Appointments
  const [appointments, setAppointments] = useState<AppointmentItem[]>([
    {
      id: 1,
      t: "Coach check-in",
      w: "Ritu S. · video call",
      d: new Date(2026, 9, 29),
      h: "6:30 PM",
    },
    {
      id: 2,
      t: "Day-90 re-measure",
      w: "Living Lab kiosk · Dr. A. Deshmukh",
      d: new Date(2026, 11, 19),
      h: "9:00 AM",
      fixed: true,
    },
    {
      id: 3,
      t: "HydraFacial",
      w: "The Edit · session 1 of 3 · logged by Trupti",
      d: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 8),
      h: "4:00 PM",
      past: true,
      svc: "hf",
    },
  ]);
  const [isBooking, setIsBooking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [latestBookedAppt, setLatestBookedAppt] = useState<AppointmentItem | null>(null);

  const displayedAppointments = useMemo(() => {
    if (session) {
      return realAppointments;
    }
    return appointments;
  }, [session, realAppointments, appointments]);

  const [treatmentCategory, setTreatmentCategory] = useState<string>("skin");
  const [treatmentPacks, setTreatmentPacks] = useState<Record<string, { total: number; left: number }>>({
    hf: { total: 3, left: 2 },
  });
  const [treatmentScreening, setTreatmentScreening] = useState<Record<string, Record<number, boolean>>>({});
  const [bookingForm, setBookingForm] = useState<{
    type: string | null;
    svc?: string | null;
    pack?: number | null;
    day: number | null;
    slot: string | null;
    replace?: string | number | null;
  }>({ type: null, day: null, slot: null, replace: null });

  // Reset scroll on view or tab transition
  useEffect(() => {
    const scrollEls = document.querySelectorAll("#phone .scroll");
    scrollEls.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [currentView, activeTab]);

  // Chat Input & Report State
  const [chatInput, setChatInput] = useState("");
  const [activeReportChapter, setActiveReportChapter] = useState(0);

  // Computed Values
  const firstName = useMemo(() => fullName.trim().split(/\s+/)[0] || "Kaveri", [fullName]);
  const formattedDate = useMemo(() => {
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
  }, []);

  const greeting = useMemo(() => {
    const currentHour = new Date().getHours();
    return `${currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening"}, ${firstName}`;
  }, [firstName]);

  const [planLen, setPlanLen] = useState<number>(90);

  // Fetch real patient care plan from GET /api/v2/care-plan
  const carePlansQuery = useQuery({
    queryKey: ["carePlans", session?.uid],
    queryFn: () => listCarePlans(),
    enabled: Boolean(session),
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  const carePlans = carePlansQuery.data || [];
  const isCarePlansLoading = carePlansQuery.isLoading;
  const activeCarePlan = useMemo(() => {
    return carePlans.find((cp) => cp.status === "approved") || carePlans[0] || null;
  }, [carePlans]);

  // Real AI Chat Integration with AAHA /api/chat backend
  const chatReportContext = useMemo(() => {
    const parts: string[] = [];
    if (activePatient?.full_name || fullName) {
      parts.push(`Patient: ${activePatient?.full_name || fullName}, Age: ${age || "Not specified"}, Gender: ${sex || "Not specified"}`);
    }
    if (activeAssessment) {
      const score = parseAwisScore(activeAssessment.score);
      parts.push(
        `Latest Assessment (${activeAssessment.created_at ? formatReportDate(activeAssessment.created_at) : "recent"}): ` +
        `AWIS Score: ${score != null ? score : activeAssessment.score || "N/A"}/100, ` +
        `Risk Band: ${activeAssessment.band || "N/A"}${activeAssessment.summary ? `, Summary: ${activeAssessment.summary}` : ""}`
      );
      if (activeAssessment.readings && typeof activeAssessment.readings === "object") {
        const rList = Object.entries(activeAssessment.readings)
          .slice(0, 15)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        if (rList) parts.push(`Vitals & Readings: ${rList}`);
      }
    }
    if (activeCarePlan) {
      parts.push(
        `Active Care Plan: ${activeCarePlan.consultation_summary || "Personalized Health Plan"}, ` +
        `Duration: ${activeCarePlan.follow_up?.duration_days || 90} days, Doctor: ${activeCarePlan.approved_by || "Care Team"}`
      );
    }
    return parts.join("\n");
  }, [activePatient, fullName, age, sex, activeAssessment, activeCarePlan]);

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
        body: { language: "en", reportContext: chatReportContext },
      }),
    [session?.token, chatReportContext],
  );

  const {
    messages: aiMessages,
    sendMessage: sendAiMessage,
    status: aiStatus,
  } = useChat({
    transport: chatTransport,
    onError: (error) => {
      sonnerToast.error("Liv could not reply just now", {
        description: error.message || "Please check your connection or try again in a moment.",
      });
    },
  });

  const chatBusy = aiStatus === "submitted" || aiStatus === "streaming";
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Derive chat display items mapping AI messages and live typing/streaming state
  const chatDisplayItems = useMemo(() => {
    const items: { me?: boolean; t: string; wait?: boolean }[] = [];
    for (const m of aiMessages) {
      let text = "";
      if (Array.isArray(m.parts) && m.parts.length > 0) {
        text = m.parts
          .map((p) => (p.type === "text" && typeof (p as any).text === "string" ? (p as any).text : ""))
          .join("");
      } else if (typeof (m as any).content === "string") {
        text = (m as any).content;
      }
      if (m.role === "user") {
        items.push({ me: true, t: text });
      } else if (m.role === "assistant") {
        items.push({ me: false, t: text });
      }
    }
    if (aiStatus === "submitted") {
      items.push({ me: false, t: "", wait: true });
    } else if (aiStatus === "error") {
      const lastMsg = aiMessages[aiMessages.length - 1];
      if (!lastMsg || lastMsg.role === "user") {
        items.push({
          me: false,
          t: "I'm having trouble connecting to the health companion right now. Please check your connection and try again.",
        });
      }
    }
    return items;
  }, [aiMessages, aiStatus]);

  // Auto-scroll chat log when messages or typing indicators arrive
  useEffect(() => {
    if (activeSheet === "liv" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatDisplayItems, activeSheet]);

  const [isUpdatingPlan, setIsUpdatingPlan] = useState<boolean>(false);

  const effectivePlanLen = useMemo(() => {
    if (session && activeCarePlan?.follow_up?.duration_days) {
      return activeCarePlan.follow_up.duration_days;
    }
    return planLen;
  }, [session, activeCarePlan, planLen]);

  const prescriberDoctor = useMemo(() => {
    if (session && activeCarePlan?.approved_by) {
      return activeCarePlan.approved_by;
    }
    if (extractedPdfData?.doctorSignOff?.doctorName) {
      return extractedPdfData.doctorSignOff.doctorName;
    }
    return "Dr. Deshmukh";
  }, [session, activeCarePlan, extractedPdfData]);

  const programmeTitle = useMemo(() => {
    if (session && activeCarePlan?.consultation_summary) {
      return activeCarePlan.consultation_summary;
    }
    if (extractedPdfData) {
      return "Longevity Baseline & Health Optimisation";
    }
    return "Metabolic Reset";
  }, [session, activeCarePlan, extractedPdfData]);


  const displayHabits = useMemo<[string, string, string][]>(() => {
    if (!session) return DEFAULT_HABITS;

    // 1. If a doctor-prescribed active care plan exists, prioritize it
    if (activeCarePlan) {
      const items: [string, string, string][] = [];
      if (activeCarePlan.lifestyle_management && activeCarePlan.lifestyle_management.length > 0) {
        activeCarePlan.lifestyle_management.forEach((l: any, idx: number) => {
          items.push([`life_${idx}`, l.title || `Lifestyle Goal ${idx + 1}`, l.detail || "Doctor-prescribed lifestyle goal"]);
        });
      }
      if (activeCarePlan.nutrition && activeCarePlan.nutrition.length > 0) {
        activeCarePlan.nutrition.forEach((n: any, idx: number) => {
          items.push([`nutr_${idx}`, n.title || `Nutrition Goal ${idx + 1}`, n.detail || "Doctor-approved nutrition target"]);
        });
      }
      if (activeCarePlan.medication && activeCarePlan.medication.length > 0) {
        activeCarePlan.medication.forEach((m: any, idx: number) => {
          const desc = `${m.dosage || ""} · ${m.frequency || "Daily"}${m.notes ? ` (${m.notes})` : ""}`.trim();
          items.push([`med_${idx}`, m.name || `Medication ${idx + 1}`, desc || "Prescribed medication"]);
        });
      }
      if (activeCarePlan.physical_activity && activeCarePlan.physical_activity.length > 0) {
        activeCarePlan.physical_activity.forEach((p: any, idx: number) => {
          items.push([`act_${idx}`, p.title || `Physical Activity ${idx + 1}`, p.detail || "Physical activity target"]);
        });
      }
      if (items.length > 0) return items;
    }

    // 2. If patient completed a kiosk screening, use its clinical therapy & nutrition recommendations
    if (latestAssessment) {
      const kioskItems: [string, string, string][] = [];
      if (Array.isArray(latestAssessment.therapy_plan) && latestAssessment.therapy_plan.length > 0) {
        latestAssessment.therapy_plan.forEach((tp: string, idx: number) => {
          kioskItems.push([`kiosk_tp_${idx}`, tp, "From your kiosk health assessment"]);
        });
      }
      if (Array.isArray(latestAssessment.nutrition_plans) && latestAssessment.nutrition_plans.length > 0) {
        latestAssessment.nutrition_plans.forEach((np: any, idx: number) => {
          const title = np.title || "Nutrition Plan";
          const detail = Array.isArray(np.points) ? np.points.slice(0, 2).join("; ") : "From your kiosk health assessment";
          kioskItems.push([`kiosk_np_${idx}`, title, detail]);
        });
      }
      if (kioskItems.length > 0) return kioskItems;
    }

    return DEFAULT_HABITS;
  }, [session, activeCarePlan, latestAssessment]);

  // Sync habitsDone with activeCarePlan lifestyle items if available
  useEffect(() => {
    if (activeCarePlan?.lifestyle_management) {
      setHabitsDone((prev) => {
        const next = { ...prev };
        activeCarePlan.lifestyle_management?.forEach((l: any, idx: number) => {
          if (typeof l.done === "boolean") {
            next[`life_${idx}`] = l.done;
          }
        });
        return next;
      });
    }
  }, [activeCarePlan]);

  const [consentSettings, setConsentSettings] = useState<{
    capture: boolean;
    share: boolean;
    remind: boolean;
  }>({
    capture: true,
    share: true,
    remind: true,
  });

  // Sync initial preferences from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("aaha.theme") || localStorage.getItem("liv.theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        setAppTheme(savedTheme);
      }
      const savedCapture = localStorage.getItem("liv.consent.capture");
      const savedShare = localStorage.getItem("liv.consent.share");
      const savedRemind = localStorage.getItem("liv.consent.remind");
      if (savedCapture !== null || savedShare !== null || savedRemind !== null) {
        setConsentSettings((prev) => ({
          capture: savedCapture !== null ? savedCapture === "true" : prev.capture,
          share: savedShare !== null ? savedShare === "true" : prev.share,
          remind: savedRemind !== null ? savedRemind === "true" : prev.remind,
        }));
      }
    }
  }, []);

  // Reconcile preferences with verified backend data
  useEffect(() => {
    if (preferencesQuery.data) {
      const p = preferencesQuery.data;
      if (p.theme === "dark" || p.theme === "light") {
        setAppTheme(p.theme);
      }
      setConsentSettings((prev) => ({
        ...prev,
        share: typeof p.data_sharing_consent === "boolean" ? p.data_sharing_consent : prev.share,
        remind: typeof p.appointment_reminders === "boolean" ? p.appointment_reminders : prev.remind,
      }));
    }
  }, [preferencesQuery.data]);

  const handleThemeChange = (newTheme: "dark" | "light") => {
    if (updatePreferencesMutation.isPending) return;
    setAppTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("aaha.theme", newTheme);
      localStorage.setItem("liv.theme", newTheme);
    }
    if (session) {
      updatePreferencesMutation.mutate({ theme: newTheme });
    }
  };

  const handleConsentToggle = (id: "capture" | "share" | "remind") => {
    if (updatePreferencesMutation.isPending) return;
    const nextVal = !consentSettings[id];
    setConsentSettings((prev) => ({ ...prev, [id]: nextVal }));

    if (typeof window !== "undefined") {
      localStorage.setItem(`liv.consent.${id}`, String(nextVal));
    }

    if (id === "share") {
      if (!nextVal) {
        showToast("Sharing with doctors is off. Reports stay with you.");
      } else {
        showToast("Sharing with doctors is on.");
      }
      if (session) {
        updatePreferencesMutation.mutate({ data_sharing_consent: nextVal });
      }
    } else if (id === "remind") {
      if (!nextVal) {
        showToast("Reminders turned off.");
      } else {
        showToast("Reminders turned on.");
      }
      if (session) {
        updatePreferencesMutation.mutate({ appointment_reminders: nextVal });
      }
    } else if (id === "capture") {
      if (!nextVal) {
        showToast("Kiosk capture paused. Live measurements will not be recorded.");
      } else {
        showToast("Kiosk capture active.");
      }
    }
  };

  // Fix hydration error: calculate dayNumber in client-side effect to avoid Date.now() mismatch
  const planStart = new Date(2026, 8, 18);
  const [dayNumber, setDayNumber] = useState(1); // Safe default for SSR
  
  useEffect(() => {
    // Calculate day number only on client side
    const calculated = Math.max(1, Math.min(effectivePlanLen, Math.floor((Date.now() - planStart.getTime()) / 864e5) + 1));
    setDayNumber(calculated);
  }, [effectivePlanLen]);
  
  const currentWeek = Math.max(1, Math.min(12, Math.ceil(dayNumber / 7)));
  const nextStepAction = useMemo(() => {
    return getNextStep(currentWeek, {});
  }, [currentWeek]);
  const streak = 6;

  const planPhases = useMemo(() => {
    return effectivePlanLen <= 90
      ? ([[14, "Begin"], [56, "Build"], [effectivePlanLen, "Prove it"]] as [number, string][])
      : ([[14, "Begin"], [56, "Build"], [90, "Prove it"], [Math.round(effectivePlanLen * 0.75), "Consolidate"], [effectivePlanLen, "Prove it again"]] as [number, string][]);
  }, [effectivePlanLen]);

  const planLevel = useMemo(() => {
    for (let i = 0; i < planPhases.length; i++) {
      if (dayNumber <= planPhases[i][0]) return [i + 1, planPhases[i][1]] as [number, string];
    }
    return [planPhases.length, planPhases[planPhases.length - 1][1]] as [number, string];
  }, [dayNumber, planPhases]);

  const milestones = useMemo(() => {
    const list: [string, number, boolean][] = [
      ["Begin", 1, 1 <= dayNumber],
      ["First strength session", 15, 15 <= dayNumber],
      ["Day-30 bloods", 30, 30 <= dayNumber],
      ["12 sessions", 56, 56 <= dayNumber],
      ["Day-90 re-test", 90, 90 <= dayNumber],
    ];
    if (effectivePlanLen > 90) {
      list.push(
        ["Day-120 review", 120, 120 <= dayNumber],
        ["24 sessions", Math.round(effectivePlanLen * 0.8), Math.round(effectivePlanLen * 0.8) <= dayNumber],
        [`Day-${effectivePlanLen} re-test`, effectivePlanLen, effectivePlanLen <= dayNumber]
      );
    }
    return list;
  }, [dayNumber, effectivePlanLen]);

  const retestDateObj = useMemo(() => {
    return effectivePlanLen === 90 ? new Date(2026, 11, 19) : new Date(2026, 8, 18 + effectivePlanLen);
  }, [effectivePlanLen]);
  const retestDateStr = useMemo(() => {
    return retestDateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }, [retestDateObj]);

  // Note: Splash screen advances exclusively on user tap/touch

  // Story video progress timer
  useEffect(() => {
    if (currentView !== "signup" || storyPaused) return;
    const interval = setTimeout(() => {
      setStoryIndex((prev) => (prev + 1) % STORIES.length);
    }, 5200);
    return () => clearTimeout(interval);
  }, [currentView, storyIndex, storyPaused]);

  // Analysis handling: runs 4-part animated checkmarks matching prototype line 660
  useEffect(() => {
    if (currentView !== "analyzing") return;
    if (analysisSource === "upload" && uploadingFile) {
      // Direct file upload is handling its own step progression and query invalidation
      return;
    }

    let curStep = 0;
    const interval = setInterval(() => {
      curStep++;
      if (curStep <= 3) {
        setAnalysisStep(curStep);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDemoHasReport(true);
          setCurrentView("main");
          setActiveTab("home");
          showToast(analysisSource === "kiosk" ? "Longevity report fetched. Your score is ready." : "Report added. Your score is ready.");
          if (session) {
            void qc.invalidateQueries({ queryKey: ["assessments", session.uid] });
            void qc.invalidateQueries({ queryKey: ["my-uploads", session.uid] });
            void assessmentsQuery.refetch();
          }
        }, 500);
      }
    }, 850);
    return () => clearInterval(interval);
  }, [currentView, session, analysisSource, uploadingFile]);

  // Countdown timer for OTP
  useEffect(() => {
    if (!otpSent || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  const startAnalysis = (source: "kiosk" | "upload" = "kiosk", fileName?: string) => {
    setAnalysisSource(source);
    if (fileName) setAnalysisFileName(fileName);
    setAnalysisStep(0);
    setCurrentView("analyzing");
  };

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // Reset so same file can be re-selected if needed

    if (uploadingFile) return;

    // Validate size (Maximum file size: 10 MB per specification)
    const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast("That file is larger than 10 MB. Please choose a file up to 10 MB.");
      return;
    }

    // Validate supported formats: JPG, JPEG, PNG, PDF
    const ALLOWED_MIMES = ["image/jpeg", "image/png", "application/pdf"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const isAllowedExt = [".jpg", ".jpeg", ".png", ".pdf"].includes(ext);
    if (!isAllowedExt || (file.type && !ALLOWED_MIMES.includes(file.type))) {
      showToast("Supported formats: JPG, JPEG, PNG, PDF.");
      return;
    }

    if (!session) {
      setCurrentView("signin");
      showToast("Please sign in with your mobile number to upload your blood report.");
      return;
    }

    // Authenticated upload flow
    setUploadingFile(true);
    setAnalysisSource("upload");
    setAnalysisFileName(file.name);
    setAnalysisStep(0); // "Reading your report"
    setUploadedBiomarkerCount(null);
    setCurrentView("analyzing");

    try {
      // POST to https://aaha-api-sdrsnwzwka-el.a.run.app/api/v2/blood-reports
      const res = await uploadBloodReport(file);
      const bloodReport = res.blood_report;
      const status = bloodReport?.status;
      const validationNote = bloodReport?.validation_note;
      const paramsRead = bloodReport?.parameters_read ?? bloodReport?.parameters?.length ?? 0;

      if (paramsRead > 0) {
        setUploadedBiomarkerCount(paramsRead);
      }

      setAnalysisStep(1); // "Finding your biomarkers"

      // Invalidate queries to refresh upload history
      setAnalysisStep(2); // "Comparing with optimal ranges"
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-uploads", session.uid] }),
        qc.invalidateQueries({ queryKey: ["reports"] }),
      ]);

      // If upload response indicates report.stage === "final" and report.updated === true, refresh existing reports API
      if (res.report?.stage === "final" && res.report?.updated === true) {
        await qc.invalidateQueries({ queryKey: ["assessments", session.uid] });
        await assessmentsQuery.refetch();
      }

      setAnalysisStep(3); // "Building your score and plan"

      setTimeout(() => {
        setHasReport(true);
        setCurrentView("main");
        setActiveTab("home");
        setUploadingFile(false);
        setActiveSheet("report");

        // Status handling:
        // Important: Whenever blood_report.validation_note is present, display its exact text to the patient. Do not replace it with a generic message.
        if (status === "valid") {
          const msg = validationNote || (paramsRead > 0 ? `Blood report processed. ${paramsRead} biomarkers identified.` : "Blood report processed successfully.");
          showToast(msg);
        } else if (status === "review") {
          const msg = validationNote
            ? `${validationNote} A clearer report or review may be needed.`
            : "Blood report uploaded. A clearer report or review may be needed.";
          showToast(msg);
        } else if (status === "invalid") {
          const msg = validationNote
            ? `${validationNote} Please upload a valid, recent, readable laboratory report.`
            : "Invalid laboratory report. Please upload a valid, recent, readable laboratory report.";
          showToast(msg);
        } else if (status === "pending") {
          const msg = validationNote || "Blood report saved. Reading did not finish. Please check back shortly.";
          showToast(msg);
        } else {
          showToast(validationNote || "Blood report uploaded.");
        }
      }, 700);
    } catch (err: any) {
      console.error("[Liv Blood Report Upload] Error:", err);
      setCurrentView("main");
      setUploadingFile(false);

      if (err.status === 401) {
        setCurrentView("signin");
        showToast("Your session has expired. Please sign in again.");
      } else if (err.status === 404) {
        setCurrentView("signup");
        showToast("Please complete signup to create your profile before uploading a blood report.");
      } else if (err.status === 429) {
        showToast("Upload limit reached. Please wait a moment before trying again.");
      } else if (err.status === 400) {
        showToast(err.message || "Invalid blood report. Please verify your file and try again.");
      } else if (err.status === 500 || err.status === 503) {
        showToast("Server is temporarily unavailable. Please try again shortly.");
      } else if (err.isTimeout) {
        showToast(err.message || "Upload request timed out after 100 seconds. Please check your upload history before trying again.");
      } else {
        const isConnError =
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("NetworkError") ||
          err.message?.includes("ERR_CONNECTION_CLOSED");
        if (isConnError) {
          showToast("Connection lost after sending file. Please check your upload history before trying again.");
        } else {
          showToast(err.message || "Upload failed. Please check your connection and try again.");
        }
      }
    }
  };

  const handleSubmitSignup = (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const ph = phoneNumber.replace(/\D/g, "");
    const ag = parseInt(age, 10);

    if (fullName.trim().length < 2) errors.name = "Enter your full name";
    if (ph.length !== 10) errors.phone = "Enter a 10-digit mobile number";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errors.email = "Enter an email like name@example.com";
    if (isNaN(ag) || ag < 18 || ag > 110) errors.age = "18 or older";
    if (!consentGiven) errors.ok = "Tick the box to continue";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setBusy(true);
    setStoryPaused(true);
    setTimeout(() => {
      setBusy(false);
      setCurrentView("welcome");
    }, 900);
  };

  const getOrCreateRecaptcha = () => {
    if (typeof window === "undefined") return null;
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch {
        // ignore
      }
      (window as any).recaptchaVerifier = null;
    }

    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }

    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        sonnerToast.error("Security verification expired. Please try again.");
      },
    });

    (window as any).recaptchaVerifier = verifier;
    return verifier;
  };

  const handleSendOtp = async () => {
    if (busy) return;
    const ph = phoneNumber.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(ph)) {
      setFormErrors({ phone: "Enter a valid 10-digit mobile number" });
      setAuthError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    setFormErrors({});
    setAuthError(null);
    setBusy(true);

    try {
      const verifier = getOrCreateRecaptcha();
      if (!verifier) {
        throw new Error("Could not initialize security verification");
      }

      const formattedPhone = "+91" + ph;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setCountdown(30);
      setOtpDigits(["", "", "", "", "", ""]);
      sonnerToast.success("Verification code sent!", {
        description: `Code sent to ${formattedPhone}`,
      });
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      console.error("Firebase OTP Send Error:", err?.code || err?.message);
      if (typeof window !== "undefined" && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }

      let userMsg = "Couldn't send verification code. Please check connection and try again.";
      if (err?.code === "auth/invalid-phone-number") {
        userMsg = "Please enter a valid 10-digit mobile number.";
      } else if (err?.code === "auth/too-many-requests") {
        userMsg = "Too many attempts. Please wait a few minutes and try again.";
      } else if (err?.code === "auth/captcha-check-failed") {
        userMsg = "Security verification failed. Please try again.";
      } else if (err?.code === "auth/invalid-app-credential") {
        userMsg = "Phone authentication configuration error.";
      }

      setAuthError(userMsg);
      sonnerToast.error(userMsg);
    } finally {
      setBusy(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = "";
      setOtpDigits(nextDigits);
      return;
    }

    // Handle full OTP paste (e.g. copied from SMS)
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split("");
      const nextDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        if (pasted[i]) nextDigits[i] = pasted[i];
      }
      setOtpDigits(nextDigits);
      const nextIndex = Math.min(pasted.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = clean.slice(-1);
    setOtpDigits(nextDigits);
    if (clean && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    if (busy) return;
    const entered = otpDigits.join("");
    if (entered.length !== 6) {
      setOtpErrorShake(true);
      setTimeout(() => setOtpErrorShake(false), 500);
      setAuthError("Enter the 6-digit code sent by SMS");
      sonnerToast.error("Please enter the complete 6-digit code");
      return;
    }

    if (!confirmationResult) {
      setAuthError("Please request an OTP first.");
      sonnerToast.error("Please request an OTP first");
      return;
    }

    setBusy(true);
    setAuthError(null);

    try {
      const result = await confirmationResult.confirm(entered);
      const token = await result.user.getIdToken();

      localStorage.removeItem("aaha_demo_session");
      apiService.setToken(token);

      sonnerToast.success("Signed in successfully");
      setCurrentView("main");
      setActiveTab("home");
    } catch (err: any) {
      console.error("Firebase OTP Verification Error:", err?.code || err?.message);
      setOtpErrorShake(true);
      setTimeout(() => setOtpErrorShake(false), 500);

      let userMsg = "Verification failed. Please check the code and try again.";
      if (err?.code === "auth/invalid-verification-code") {
        userMsg = "The verification code is incorrect. Please check and try again.";
      } else if (err?.code === "auth/code-expired") {
        userMsg = "The verification code has expired. Please request a new code.";
      } else if (err?.code === "auth/too-many-requests") {
        userMsg = "Too many failed attempts. Please wait a moment.";
      }

      setAuthError(userMsg);
      sonnerToast.error(userMsg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      localStorage.removeItem("aaha_demo_session");
      apiService.setToken(token);
      sonnerToast.success("Signed in with Google");
      setCurrentView("main");
      setActiveTab("home");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        console.error("Google sign in error:", err);
        setAuthError("Google sign-in failed. Please try mobile OTP.");
        sonnerToast.error("Google sign-in failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      localStorage.removeItem("aaha_demo_session");
      localStorage.removeItem("liv_has_report");
      await signOut(auth);
      apiService.setToken(null);
      setActiveSheet(null);
      setCurrentView("signin");
      setOtpSent(false);
      setConfirmationResult(null);
      setOtpDigits(["", "", "", "", "", ""]);
      setAuthError(null);
      sonnerToast.success("Signed out successfully");
    } catch (err: any) {
      console.error("Sign out error:", err);
      sonnerToast.error("Error signing out");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (profileSaving) return;

    const trimmedName = editName.trim();
    if (trimmedName.length < 2) {
      sonnerToast.error("Please enter a valid full name (at least 2 characters).");
      return;
    }

    const parsedAge = parseInt(editAge, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      sonnerToast.error("Please enter a valid age between 1 and 120.");
      return;
    }

    if (!editGender) {
      sonnerToast.error("Please select your gender.");
      return;
    }

    setProfileSaving(true);
    try {
      if (activePatient?.patient_id && !isUnlinkedPatient) {
        // Update existing patient profile via PUT /api/v2/patients/me
        await apiService.updateMyProfile({
          full_name: trimmedName,
          age: parsedAge,
          gender: editGender.toLowerCase(),
        });
        sonnerToast.success("Profile updated successfully");
      } else {
        // First-time patient profile registration via POST /api/v2/patients
        const phoneToUse = session?.phoneNumber || (phoneNumber ? "+91" + phoneNumber.replace(/\D/g, "") : "");
        await apiService.createPatient({
          full_name: trimmedName,
          mobile_number: phoneToUse,
          age: parsedAge,
          gender: editGender.toLowerCase(),
        });
        sonnerToast.success("Profile created and linked to your account");
      }

      setFullName(trimmedName);
      setAge(String(parsedAge));
      setSex(editGender);
      setIsEditingProfile(false);
      void qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err: any) {
      console.error("Profile save error:", err);
      sonnerToast.error(err?.message || "Could not save profile to server. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAction = (actStr: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const parts = actStr.split(":");
    const cmd = parts[0];
    const val = parts[1];

    if (cmd === "marker") {
      setSelectedMarkerId(val);
      setCurrentView("marker");
    } else if (cmd === "track") {
      setSelectedTrackId(val);
      setCurrentView("track");
    } else if (cmd === "tab") {
      setActiveTab(val as any);
      if (currentView !== "main") setCurrentView("main");
      setActiveSheet(null);
    } else if (cmd === "to") {
      setCurrentView(val as any);
    } else if (cmd === "sheet") {
      setActiveSheet(parts.slice(1).join(":"));
    } else if (cmd === "filter") {
      setMarkerFilter(val);
      setActiveTab("markers");
    } else if (cmd === "cat") {
      setTreatmentCategory(val);
    } else if (cmd === "habit") {
      if (isUpdatingPlan) return;
      const nextVal = !habitsDone[val];
      setHabitsDone((prev) => ({ ...prev, [val]: nextVal }));

      const planId = activeCarePlan?._id || activeCarePlan?.id;
      if (session && planId && val.startsWith("life_")) {
        const lifeIdx = parseInt(val.replace("life_", ""), 10);
        if (!isNaN(lifeIdx) && activeCarePlan.lifestyle_management) {
          const updatedLife = [...activeCarePlan.lifestyle_management];
          if (updatedLife[lifeIdx]) {
            updatedLife[lifeIdx] = {
              ...updatedLife[lifeIdx],
              done: nextVal,
            } as any;
            setIsUpdatingPlan(true);
            updateCarePlan(String(planId), { lifestyle_management: updatedLife })
              .then(() => {
                qc.invalidateQueries({ queryKey: ["carePlans", session.uid] });
                showToast("Care plan habit progress saved to server");
              })
              .catch((err) => {
                setHabitsDone((prev) => ({ ...prev, [val]: !nextVal }));
                showToast(err.message || "Failed to save habit progress. Please try again.");
              })
              .finally(() => {
                setIsUpdatingPlan(false);
              });
          }
        }
      }
    } else if (cmd === "wk") {
      const habitKey = parts[1];
      const targetCount = parseInt(parts[2], 10);
      setWeeklyProgress((prev) => ({
        ...prev,
        [habitKey]: prev[habitKey] === targetCount ? targetCount - 1 : targetCount,
      }));
    } else if (cmd === "add") {
      const key = `${parts[1]}:${parts[2]}`;
      setAddedActions((prev) => ({ ...prev, [key]: !prev[key] }));
      showToast(addedActions[key] ? "Removed from plan" : "Added to today's plan");
    } else if (cmd === "newbook") {
      setBookingForm({ type: val || null, day: null, slot: null });
      setCurrentView("book");
    } else if (cmd === "stepbook") {
      const key = `${parts[1]}:${parts[2]}`;
      const track = getTrackById(parts[1]);
      const stepIdx = parseInt(parts[2], 10);
      const step = track?.steps[stepIdx];
      setBookingForm({
        type: step?.cta ? (step.cta[1].startsWith("svc:") ? "ther" : step.cta[1]) : "coach",
        day: 2,
        slot: "10:30 AM",
      });
      setCurrentView("book");
    } else if (cmd === "pkgreq") {
      setRequestedPackages((prev) => ({ ...prev, [val]: true }));
      showToast("Requested. The centre will call you.");
    } else if (cmd === "askliv") {
      setActiveSheet("liv");
      const marker = getMarkerById(val);
      if (marker) {
        askLiv(`Tell me about my ${marker.n} of ${marker.v} ${marker.u}`, marker.m);
      }
    } else if (cmd === "fetch") {
      setAnalysisSource("kiosk");
      setAnalysisStep(0);
      setCurrentView("analyzing");
    } else if (cmd === "say") {
      showToast(parts.slice(1).join(":"));
    }
  };

  const askLiv = (q: string, _legacyAns?: string | (() => string)) => {
    const text = q.trim();
    if (!text || chatBusy) return;
    void sendAiMessage({ text });
  };

  const sendCustomChat = () => {
    if (!chatInput.trim() || chatBusy) return;
    const text = chatInput.trim();
    setChatInput("");
    askLiv(text);
  };

  // Mathematical Zone Proportional Range Bar
  const renderRangeBar = (m: Biomarker & { isRecorded?: boolean }) => {
    if (m.nobar || !m.z || m.min == null || m.max == null) return null;
    const span = m.max - m.min;
    let prev = m.min;
    const cleanNum = parseFloat(String(m.v).replace(/[^0-9.-]/g, ""));
    const hasValidNum = m.isRecorded !== false && !isNaN(cleanNum) && m.v !== "—" && m.v !== "--";
    const l = hasValidNum ? Math.max(3, Math.min(97, ((cleanNum - m.min) / span) * 100)) : null;

    return (
      <div className="rb" aria-hidden="true">
        {m.z.map(([bound, zone], idx) => {
          const ratio = Math.max(0.01, (bound - prev) / span).toFixed(3);
          prev = bound;
          return (
            <i
              key={idx}
              className={`z${zone}`}
              style={{ flex: ratio }}
            />
          );
        })}
        {l !== null && <b style={{ left: `${l.toFixed(1)}%` }} />}
      </div>
    );
  };

  const renderHeader = (title: string, sub?: string) => {
    const subtitle = sub || formattedDate;
    return (
      <div className="hd">
        <div>
          <span className="k">{subtitle}</span>
          <h1 className="h1" style={{ marginTop: "6px" }}>{title}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <NotificationBell
            onNotificationClick={() => {
              // Refresh assessments and reports when notification is clicked
              queryClient.invalidateQueries({ queryKey: ["assessments"] });
              queryClient.invalidateQueries({ queryKey: ["reports"] });
            }}
          />
          <button
            type="button"
            className="icb"
            onClick={() => setActiveSheet("profile")}
            aria-label="Profile and settings"
          >
            <LivIcon name="user" size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderEcgGrid = (w: number, h: number) => {
    const vLines: React.ReactNode[] = [];
    for (let x = 0; x <= w; x += 6) {
      vLines.push(
        <line
          key={`vx-${x}`}
          className={x % 30 === 0 ? "maj" : ""}
          x1={x}
          y1={0}
          x2={x}
          y2={h}
        />
      );
    }
    const hLines: React.ReactNode[] = [];
    for (let y = 0; y <= h; y += 6) {
      hLines.push(
        <line
          key={`hy-${y}`}
          className={y % 30 === 0 ? "maj" : ""}
          x1={0}
          y1={y}
          x2={w}
          y2={y}
        />
      );
    }
    return <g className="grid">{vLines}{hLines}</g>;
  };

  const renderEcgStrip = (mini = false) => {
    const w = mini ? 180 : 360;
    const h = mini ? 44 : 110;
    const beats = mini ? 3 : 5;
    return (
      <div className="strip">
        {!mini && (
          <div className="lbl">
            <span className="live" />
            <span className="k">Lead I · 25 mm/s · 30 s</span>
          </div>
        )}
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          aria-label="ECG trace, regular sinus rhythm"
        >
          {renderEcgGrid(w, h)}
          <path
            className={`tr${mini ? " mini" : ""}`}
            d={getEcgPath(w, h, beats, mini ? 0.55 : 1)}
          />
          {!mini && <circle className="beat" cx={w - 14} cy={h * 0.62} r={3} />}
        </svg>
      </div>
    );
  };

  const renderPostureFigure = (big = false) => (
    <svg viewBox="0 0 150 230" aria-label="Posture figure, front view">
      <line className="plumb" x1={75} y1={8} x2={75} y2={222} />
      <g className="body">
        <circle cx={79} cy={30} r={15} />
        <path d="M60 52h38l10 8 6 50-10 2-5-36v50l4 90h-12l-6-80-6 80H67l4-90V76l-5 36-10-2 6-50z" />
      </g>
      <line className="ln ok" x1={49} y1={58} x2={107} y2={58} />
      <line className="ln" x1={49} y1={56} x2={107} y2={61} />
      <circle className="dot" cx={49} cy={56} r={2.5} />
      <circle className="dot" cx={107} cy={61} r={2.5} />
      <line className="ln ok" x1={58} y1={126} x2={98} y2={126} />
      <line className="ln" x1={58} y1={127.5} x2={98} y2={124.5} />
      <circle className="dot" cx={79} cy={30} r={2.5} />
      <line className="ln" x1={75} y1={52} x2={79} y2={30} />
      {big && (
        <>
          <text className="ang" x={86} y={22}>12°</text>
          <text className="ang" x={110} y={66}>1.5 cm</text>
          <text className="ang" x={101} y={121}>tilt</text>
        </>
      )}
    </svg>
  );

  const renderDelta = (m?: Biomarker | null) => {
    if (!m || !m.prev) return null;
    if (m.nobar) return <span className="d same">same as last</span>;
    const a = parseFloat(m.v);
    const b = parseFloat(m.prev);
    const dd = a - b;
    if (Math.abs(dd) < 0.05) return <span className="d same">unchanged</span>;
    const good = ["hr", "bmi", "bp", "waist", "bf"].includes(m.id) ? dd < 0 : dd > 0;
    const uFirst = m.u ? m.u.split(" ")[0] : "";
    return (
      <span className={`d ${dd < 0 ? "dn" : "up"}`}>
        {dd > 0 ? "+" : ""}{Math.round(dd * 10) / 10}{m.id === "bp" ? "" : ` ${uFirst}`}{good ? " · better" : ""}
      </span>
    );
  };

  const renderEegSvg = (k: number) => {
    const w = 200;
    const h = 30;
    let p = "M0 15";
    let x = 0;
    while (x < w) {
      x += k === 1 ? 6 : k === 2 ? 9 : 2.5;
      p += ` L${x} ${15 + (k === 3 ? (Math.sin(x) * 8) : Math.sin(x / (k === 1 ? 3 : 5)) * (k === 1 ? 7 : 9))}`;
    }
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={p} />
      </svg>
    );
  };

  const selectedMarker = useMemo(() => {
    const found = displayBiomarkers.find((m) => m.id === selectedMarkerId);
    return found || displayBiomarkers[0] || BIOMARKERS[0];
  }, [displayBiomarkers, selectedMarkerId]);
  const selectedTrack = useMemo(() => getTrackById(selectedTrackId) || JOURNEY_TRACKS[0], [selectedTrackId]);

  const bookingDays = useMemo(() => {
    const list: Date[] = [];
    const now = new Date();
    for (let i = 1; i <= 7; i++) {
      list.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
    }
    return list;
  }, []);

  const selectedBookingDateStr = useMemo(() => {
    if (bookingForm.day == null) return "";
    const d = bookingDays[bookingForm.day];
    if (!d) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [bookingForm.day, bookingDays]);

  const slotsQuery = useQuery({
    queryKey: ["appointment-slots", selectedBookingDateStr, bookingForm.type],
    queryFn: async () => {
      if (!selectedBookingDateStr) return { slots: [] };
      const doctorId =
        bookingForm.type === "doc"
          ? "Dr. A. Deshmukh"
          : bookingForm.type === "coach"
            ? "Ritu S."
            : undefined;
      const kioskId = bookingForm.type === "pod" ? "Aaha Kiosk" : undefined;
      return getAppointmentSlots(selectedBookingDateStr, doctorId, kioskId);
    },
    enabled: currentView === "book" && bookingForm.day != null && Boolean(selectedBookingDateStr),
    staleTime: 30000,
  });

  const availableSlots = useMemo(() => {
    if (slotsQuery.data?.slots && Array.isArray(slotsQuery.data.slots) && slotsQuery.data.slots.length > 0) {
      return slotsQuery.data.slots;
    }
    return TIME_SLOTS;
  }, [slotsQuery.data?.slots]);

  return (
    <LivScope theme={appTheme} className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[var(--page,#EDEDE8)] text-[var(--page-text,#0B0B0C)]">
      <div id="recaptcha-container" />

      {/* ─── Mobile App Stage (Centered on desktop, full bleed on mobile) ─── */}
      <div className="shell">
        <main className="stagewrap">
          <div className="phone liv-scope" id="phone" data-app={appTheme}>
            <div id="app" className="app-root enter" key={`${currentView}-${activeTab}`}>
              {/* ─── 1. SPLASH SCREEN (Advances ONLY on user tap) ─── */}
              {currentView === "splash" && (
                <button
                  type="button"
                  className="splash cursor-pointer"
                  id="splash"
                  onClick={advanceSplash}
                  onPointerDown={advanceSplash}
                  onTouchStart={advanceSplash}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Liv. Tap to continue"
                >
                  <LivMark size={128} />
                  <span className="wm">Liv</span>
                  <span className="tag">Longevity, measured.</span>
                </button>
              )}


              {/* ─── 2. SIGN UP WITH EMBEDDED STORY VIDEO HOLDER ─── */}
              {currentView === "signup" && (
                <form
                  className="scroll"
                  id="signup"
                  noValidate
                  onSubmit={handleSubmitSignup}
                >
                  {/* Story video holder (Matches prototype lines 521-526) */}
                  <div className={`story ${storyPaused ? "paused" : ""}`} role="group" aria-label="What Liv is, in four short stories">
                    <div className="sbars">
                      {STORIES.map((_, i) => (
                        <i key={i} className={i < storyIndex ? "done" : i === storyIndex ? "on" : ""} />
                      ))}
                    </div>
                    <div className="stop">
                      <div className="who">
                        <LivMark size={22} />
                        <span>Liv</span> <span id="scount">{storyIndex + 1}/4</span>
                      </div>
                      <button
                        type="button"
                        id="spbtn"
                        onClick={() => setStoryPaused((p) => !p)}
                        aria-label={storyPaused ? "Play story" : "Pause story"}
                      >
                        <LivIcon name={storyPaused ? "play" : "pause"} size={18} />
                      </button>
                    </div>

                    <div id="sslot">
                      <svg className="sv" viewBox="0 0 92 92" fill="none" aria-hidden="true">
                        {STORIES[storyIndex].visual === "pulse" && (
                          <>
                            <circle className="pulse" cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="1.2" />
                            <circle className="pulse d2" cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="1.2" />
                            <circle cx="46" cy="46" r="6" fill="currentColor" />
                          </>
                        )}
                        {STORIES[storyIndex].visual === "range" && (
                          <>
                            <path d="M6 46h30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                            <path d="M42 46h20" stroke="currentColor" strokeWidth="5" strokeDasharray="2 4" />
                            <path d="M68 46h18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
                            <g className="slide">
                              <circle cx="62" cy="46" r="8" fill="var(--liv-surf)" stroke="currentColor" strokeWidth="2" />
                              <circle cx="62" cy="46" r="3" fill="currentColor" />
                            </g>
                          </>
                        )}
                        {STORIES[storyIndex].visual === "ring" && (
                          <>
                            <circle cx="46" cy="46" r="36" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                            <circle className="ringdraw" cx="46" cy="46" r="36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" transform="rotate(-90 46 46)" />
                            <text x="46" y="56" textAnchor="middle" fill="currentColor" fontFamily="Cormorant Garamond,Georgia,serif" fontSize="30" fontWeight="500">69</text>
                          </>
                        )}
                        {STORIES[storyIndex].visual === "path" && (
                          <>
                            <path d="M13 60 46 38 79 60" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 4" />
                            <circle cx="13" cy="60" r="3" fill="currentColor" />
                            <circle cx="46" cy="38" r="3" fill="currentColor" />
                            <circle cx="79" cy="60" r="3" fill="currentColor" />
                            <circle className="hop" cx="13" cy="60" r="9" stroke="currentColor" strokeWidth="1.6" />
                          </>
                        )}
                      </svg>
                      <div className="sbody">
                        <h2>{STORIES[storyIndex].h}</h2>
                        <p>{STORIES[storyIndex].p}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="snav l"
                      onClick={() => setStoryIndex((p) => (p - 1 + STORIES.length) % STORIES.length)}
                      aria-label="Previous story"
                    />
                    <button
                      type="button"
                      className="snav r"
                      onClick={() => setStoryIndex((p) => (p + 1) % STORIES.length)}
                      aria-label="Next story"
                    />
                    <span className="shint">Tap to skip</span>
                  </div>

                  <div>
                    <h1 className="h1">Create your account</h1>
                    <p className="sub" style={{ marginTop: "6px" }}>Four details. Under a minute.</p>
                  </div>

                  <div className="field">
                    <label htmlFor="f-name">Full name</label>
                    <input
                      className={`inp ${formErrors.name ? "bad" : ""}`}
                      id="f-name"
                      type="text"
                      placeholder="Kaveri Bhosle"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    {formErrors.name && <span className="err">{formErrors.name}</span>}
                  </div>

                  <div className="field">
                    <label htmlFor="f-phone">Mobile number</label>
                    <div className="pre">
                      <span>+91</span>
                      <input
                        className={`inp ${formErrors.phone ? "bad" : ""}`}
                        id="f-phone"
                        type="tel"
                        placeholder="98765 43210"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      />
                    </div>
                    {formErrors.phone && <span className="err">{formErrors.phone}</span>}
                  </div>

                  <div className="field">
                    <label htmlFor="f-email">Email address</label>
                    <input
                      className={`inp ${formErrors.email ? "bad" : ""}`}
                      id="f-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {formErrors.email && <span className="err">{formErrors.email}</span>}
                  </div>

                  <div className="two">
                    <div className="field">
                      <label htmlFor="f-age">Age</label>
                      <input
                        className={`inp ${formErrors.age ? "bad" : ""}`}
                        id="f-age"
                        type="text"
                        placeholder="42"
                        inputMode="numeric"
                        maxLength={3}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                      />
                      {formErrors.age && <span className="err">{formErrors.age}</span>}
                    </div>

                    <div className="field">
                      <label>Sex</label>
                      <div className="seg" role="group">
                        <span
                          className="thumb"
                          style={{
                            width: "calc((100% - 8px) / 3)",
                            transform: `translateX(${sex === "Female" ? "0%" : sex === "Male" ? "100%" : "200%"})`,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSex("Female")}
                          aria-pressed={sex === "Female"}
                        >
                          Female
                        </button>
                        <button
                          type="button"
                          onClick={() => setSex("Male")}
                          aria-pressed={sex === "Male"}
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => setSex("Other")}
                          aria-pressed={sex === "Other"}
                        >
                          Other
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="consent"
                    onClick={() => setConsentGiven((c) => !c)}
                    role="checkbox"
                    aria-checked={consentGiven}
                  >
                    <span className={`box ${consentGiven ? "on" : ""}`} id="okbox">
                      <LivIcon name="check" size={14} strokeWidth={2.4} />
                    </span>
                    <span>
                      I agree to my health data being stored in India and used to build my report. I can export or erase it at any time.
                    </span>
                  </button>
                  {formErrors.ok && <span className="err">{formErrors.ok}</span>}

                  <button className="btn" type="submit" disabled={busy}>
                    {busy ? (
                      <>
                        <span className="spin"></span>Creating your account
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>

                  <button
                    type="button"
                    className="link"
                    onClick={() => setCurrentView("signin")}
                  >
                    Already a member? <b>Sign in</b>
                  </button>
                </form>
              )}

              {/* ─── 3. WELCOME (ACCOUNT CREATED) ─── */}
              {currentView === "welcome" && (
                <div className="welcome">
                  <span className="tick">
                    <svg className="ring2" width="96" height="96" viewBox="0 0 96 96">
                      <circle className="r2" cx="48" cy="48" r="46" />
                    </svg>
                    <span className="ck">
                      <LivIcon name="check" size={34} strokeWidth={1.8} />
                    </span>
                  </span>

                  <div>
                    <span className="k">Account created</span>
                    <h1 className="h1" style={{ marginTop: "10px" }}>You're in, {firstName}.</h1>
                    <p className="sub" style={{ marginTop: "10px", font: "italic 400 17px/1.4 var(--serif)" }}>
                      Your longevity story starts with one visit. Everything after that lives here.
                    </p>
                  </div>

                  <div className="aiws">
                    <LivProgressRing size={44} strokeWidth={4} progress={0.69} onBg={true}>
                      <span className="unit" style={{ fontSize: "9.5px" }}>AIWS</span>
                    </LivProgressRing>
                    <div>
                      <span className="k">Active Integrated Wellness Score</span>
                      <p>
                        One number out of 100 for your whole body. Your well-being benchmark, and the first thing you will see once your report arrives.
                      </p>
                    </div>
                  </div>

                  <div className="next">
                    <div>
                      <b>1</b>
                      <span>
                        Sign in with your number
                        <small>A 4-digit code by SMS, or Google.</small>
                      </span>
                    </div>
                    <div>
                      <b>2</b>
                      <span>
                        We find your kiosk screening
                        <small>Your longevity report arrives in the app by itself.</small>
                      </span>
                    </div>
                    <div>
                      <b>3</b>
                      <span>
                        Your AIWS score, and your plan
                        <small>Three priorities, daily steps, your care team.</small>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => setCurrentView("signin")}
                  >
                    Continue to sign in
                  </button>
                </div>
              )}

              {/* ─── 4. SIGN IN SCREEN ─── */}
              {currentView === "signin" && (
                <div className="scroll">
                  <div className="illo">
                    <LivMark size={104} />
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <h1 className="h1">Welcome back</h1>
                    <p className="sub" style={{ marginTop: "6px" }}>
                      Sign in to see your score and your plan.
                    </p>
                  </div>

                  <div className="seg" role="group">
                    <span
                      className="thumb"
                      style={{
                        width: "calc((100% - 8px) / 2)",
                        transform: `translateX(${authMode === "otp" ? "0%" : "100%"})`,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setAuthMode("otp")}
                      aria-pressed={authMode === "otp"}
                    >
                      Mobile OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("google")}
                      aria-pressed={authMode === "google"}
                    >
                      Google
                    </button>
                  </div>

                  <div id="authpanel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {authMode === "google" ? (
                      <>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleGoogleSignIn}
                          disabled={busy}
                        >
                          {busy ? (
                            <>
                              <span className="spin"></span>Connecting to Google
                            </>
                          ) : (
                            <>
                              <span className="gmark">G</span>Continue with Google
                            </>
                          )}
                        </button>
                        <p className="sub" style={{ textAlign: "center" }}>
                          We read only your name and email address.
                        </p>
                      </>
                    ) : !otpSent ? (
                      <>
                        <div className="field">
                          <label htmlFor="f-si-phone">Mobile number</label>
                          <div className="pre">
                            <span>+91</span>
                            <input
                              className={`inp ${formErrors.phone ? "bad" : ""}`}
                              id="f-si-phone"
                              type="tel"
                              placeholder="98765 43210"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              maxLength={10}
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            />
                          </div>
                          {formErrors.phone && <span className="err">{formErrors.phone}</span>}
                        </div>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleSendOtp}
                          disabled={busy}
                        >
                          {busy ? (
                            <>
                              <span className="spin"></span>Sending code
                            </>
                          ) : (
                            "Send code"
                          )}
                        </button>
                        <p className="sub" style={{ textAlign: "center" }}>
                          We send a 6-digit code by SMS to confirm it is you.
                        </p>
                        {authError && (
                          <p className="sub" style={{ textAlign: "center", color: "var(--liv-red, #EF4444)" }}>
                            {authError}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="hd">
                          <p className="sub">
                            Code sent to{" "}
                            <b style={{ color: "var(--text)" }}>
                              +91 {phoneNumber.slice(0, 2)}•••• ••{phoneNumber.slice(-2)}
                            </b>
                          </p>
                          <button
                            type="button"
                            className="link"
                            style={{ padding: "4px" }}
                            onClick={() => {
                              setOtpSent(false);
                              setAuthError(null);
                            }}
                          >
                            <b>Change</b>
                          </button>
                        </div>

                        <div className={`otp grid-cols-6 ${otpErrorShake ? "shake" : ""}`} id="otp">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <input
                              key={i}
                              id={`otp${i}`}
                              ref={(el) => {
                                otpRefs.current[i] = el;
                              }}
                              inputMode="numeric"
                              maxLength={1}
                              autoComplete={i === 0 ? "one-time-code" : "off"}
                              aria-label={`Digit ${i + 1}`}
                              value={otpDigits[i] || ""}
                              onChange={(e) => handleDigitChange(i, e.target.value)}
                              onKeyDown={(e) => handleDigitKeyDown(i, e)}
                            />
                          ))}
                        </div>

                        {authError && (
                          <p className="sub" style={{ textAlign: "center", color: "var(--liv-red, #EF4444)" }}>
                            {authError}
                          </p>
                        )}

                        <button
                          type="button"
                          className="btn"
                          onClick={handleVerifyOtp}
                          disabled={busy}
                        >
                          {busy ? (
                            <>
                              <span className="spin"></span>Verifying
                            </>
                          ) : (
                            "Verify and continue"
                          )}
                        </button>

                        <p className="sub" style={{ textAlign: "center" }} id="resend">
                          {countdown > 0 ? (
                            `Resend code in 0:${countdown < 10 ? "0" : ""}${countdown}`
                          ) : (
                            <button
                              type="button"
                              className="link"
                              style={{ padding: 0 }}
                              onClick={handleSendOtp}
                              disabled={busy}
                            >
                              <b>Resend code</b>
                            </button>
                          )}
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    className="link"
                    onClick={() => setCurrentView("signup")}
                  >
                    New here? <b>Create an account</b>
                  </button>
                </div>
              )}

              {/* ─── 5. ANALYZING / FETCHING ANIMATION ─── */}
              {currentView === "analyzing" && (
                <div className="center">
                  <LivMark size={88} />
                  <div>
                    <h1 className="h1">
                      {analysisSource === "kiosk" ? "Fetching your report" : "One moment"}
                    </h1>
                    <p className="sub" style={{ marginTop: "8px" }}>
                      {analysisSource === "kiosk"
                        ? "Living Lab kiosk · Aundh, Pune"
                        : analysisFileName}
                    </p>
                  </div>
                  <div className="steps" style={{ maxWidth: "270px", marginTop: "10px" }}>
                    {[
                      analysisSource === "kiosk" ? "Connecting to the Living Lab kiosk" : "Reading your report",
                      analysisSource === "kiosk" ? "Finding your screening" : "Finding your biomarkers",
                      analysisSource === "kiosk" ? "Fetching your longevity report" : "Comparing with optimal ranges",
                      "Building your score and plan",
                    ].map((stepText, idx) => {
                      const isDone = analysisStep > idx;
                      const isCurrent = analysisStep === idx;
                      return (
                        <div
                          key={idx}
                          className={`step ${isDone ? "done" : isCurrent ? "on" : ""}`}
                        >
                          <span className={`box ${isDone ? "on" : ""}`}>
                            <LivIcon name="check" size={14} strokeWidth={2.4} />
                          </span>
                          <span>
                            {idx === 1 && isDone
                              ? analysisSource === "kiosk"
                                ? "Screening of 18 Sep found"
                                : uploadedBiomarkerCount != null
                                  ? (uploadedBiomarkerCount > 0 ? `${uploadedBiomarkerCount} biomarkers found` : "Document processed")
                                  : (!session ? `${BIOMARKERS.length} biomarkers found` : "Biomarkers parsed from document")
                              : idx === 2 && isDone && analysisSource === "kiosk"
                                ? `${BIOMARKERS.length} biomarkers received`
                                : stepText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── 6. MAIN APP TABS SHELL ─── */}
              {currentView === "main" && (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {/* TAB: HOME - WAITING FOR KIOSK REPORT */}
                  {activeTab === "home" && !hasReport && (
                    <div className="scroll">
                      {renderHeader(greeting)}

                      {/* Kiosk Card (Matches prototype lines 627-633) */}
                      <div className={`card ${kioskFound ? "inv" : "empty"}`} id="kiosk" aria-live="polite">
                        {!kioskFound ? (
                          <>
                            <span className="spin" style={{ width: 24, height: 24 }} />
                            <div>
                              <h2 className="h2">Checking the Living Lab kiosk</h2>
                              <p className="sub" style={{ marginTop: "8px" }}>
                                Looking for a screening linked to {maskPhone(phoneNumber)}.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="k">Longevity report ready</span>
                            <h2 className="h2">Your kiosk screening from 18 Sep is waiting</h2>
                            <p className="sub">
                              Living Lab kiosk · Aundh, Pune<br />
                              52 biomarkers · reviewed by Dr. A. Deshmukh
                            </p>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleAction("fetch")}
                            >
                              <LivIcon name="down" size={20} />
                              Get my longevity report
                            </button>
                          </>
                        )}
                      </div>

                      <span className="k" style={{ marginTop: "6px" }}>
                        Other ways to start
                      </span>
                      <button
                        type="button"
                        className="opt"
                        onClick={() => setActiveSheet("upload")}
                      >
                        <LivIcon name="up" size={22} />
                        <div>
                          <div className="h3">Upload a lab report</div>
                          <div className="sub">A photo or PDF from any lab</div>
                        </div>
                        <LivIcon name="chev" size={16} />
                      </button>
                      <button
                        type="button"
                        className="opt"
                        onClick={() => {
                          setBookingForm({ type: "pod", day: null, slot: null });
                          setCurrentView("book");
                        }}
                      >
                        <LivIcon name="cal" size={22} />
                        <div>
                          <div className="h3">Book a kiosk screening</div>
                          <div className="sub">Blood, heart and body in one visit</div>
                        </div>
                        <LivIcon name="chev" size={16} />
                      </button>

                      <div className="card">
                        <span className="k">What your report gives you</span>
                        {[
                          ["AIWS score", "One number out of 100 for your whole body"],
                          ["Biological age", "How old your body is, and what is adding years"],
                          ["A 90-day plan", "Three priorities, daily steps and your next appointment"],
                        ].map(([t, desc]) => (
                          <div key={t} className="hd" style={{ justifyContent: "flex-start", gap: 12 }}>
                            <span className="box on" style={{ borderRadius: "11px" }}>
                              <LivIcon name="check" size={14} strokeWidth={2.4} />
                            </span>
                            <div>
                              <div className="h3">{t}</div>
                              <div className="sub">{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ height: 56, flexShrink: 0 }} />
                    </div>
                  )}

                  {/* TAB: HOME - FULL REPORT FETCHED (Quiet Home - 4 Cards) */}
                  {activeTab === "home" && hasReport && (
                    <div className="scroll">
                      {renderHeader(greeting)}

                      {/* Hero Card (Matches prototype lines 1450-1456) */}
                      <div className="card inv hero">
                        <div className="top">
                          <div className="ring" style={{ width: 104, height: 104 }}>
                            <svg width={104} height={104} viewBox="0 0 104 104" fill="none">
                              <circle className="tr" cx={52} cy={52} r={48.5} strokeWidth={7} />
                              <circle
                                className="ar"
                                cx={52}
                                cy={52}
                                r={48.5}
                                strokeWidth={7}
                                strokeLinecap="round"
                                strokeDasharray="304.7"
                                strokeDashoffset={
                                  304.7 *
                                  (1 -
                                    (latestAssessment && typeof latestAssessment.score === "number" && latestAssessment.score > 0
                                      ? Math.min(1, Math.max(0, latestAssessment.score / 100))
                                      : 0))
                                }
                              />
                            </svg>
                            <div className="mid">
                              <span className="num" style={{ fontSize: 42 }} data-count={latestAssessment && typeof latestAssessment.score === "number" && latestAssessment.score > 0 ? latestAssessment.score : 0}>
                                {latestAssessment && typeof latestAssessment.score === "number" && latestAssessment.score > 0
                                  ? Math.round(latestAssessment.score)
                                  : "—"}
                              </span>
                              <div className="unit" style={{ marginTop: 3 }}>AIWS</div>
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className="k">Biological age</span>
                            <div>
                              {verifiedBiologicalAge != null ? (
                                <>
                                  <span className="num" style={{ fontSize: 40 }} data-count={verifiedBiologicalAge}>
                                    {String(verifiedBiologicalAge)}
                                  </span>{" "}
                                  <span className="unit">
                                    vs {verifiedChronologicalAge}
                                  </span>
                                </>
                              ) : (
                                <span className="num" style={{ fontSize: 24, opacity: 0.6 }}>
                                  Not yet calculated
                                </span>
                              )}
                            </div>
                            <span className="sub">
                              {verifiedBiologicalAge != null && verifiedBiologicalAgeDiff != null
                                ? `${Math.abs(verifiedBiologicalAgeDiff)} years ${verifiedBiologicalAgeDiff < 0 ? "younger" : "older"} than calendar age (${verifiedChronologicalAge}). Calculated from 9 blood biomarkers.`
                                : verifiedBiologicalAge != null
                                ? "Calculated from your clinical biomarkers."
                                : session && latestAssessment
                                ? "Kiosk assessment recorded. Biological age requires comprehensive biomarker panel."
                                : "Four movable things. All in your plan."}
                            </span>
                          </div>
                        </div>

                        <div className="facts">
                          <div>
                            <span className="k">Programme</span>
                            <div>
                              <span className="num">{dayNumber}</span>{" "}
                              <span className="unit">/ {effectivePlanLen} · level {planLevel[0]}</span>
                            </div>
                          </div>
                          <div>
                            <span className="k">Streak</span>
                            <div>
                              <span className="num" id="streak">6</span>{" "}
                              <span className="unit">days</span>
                            </div>
                          </div>
                        </div>

                        {/* Rewards XP Bar */}
                        <div className="xp">
                          <div className="bar">
                            <i style={{ width: `${pts % 100}%` }} />
                          </div>
                          <div className="row">
                            <span>{pts} pts</span>
                            <span>{100 - (pts % 100)} to the next reward</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="link"
                          onClick={() => {
                            if (latestAssessment) setSelectedAssessmentId(latestAssessment.id);
                            setCurrentView("report");
                          }}
                        >
                          Signed {latestAssessment?.created_at ? formatReportDate(latestAssessment.created_at) : "18 Sep"} · <b>Read your longevity report</b>
                        </button>
                      </div>

                      {/* Three Things Today Card */}
                      {(!session || (session && (activeCarePlan || latestAssessment))) && displayHabits.length > 0 && (
                        <div className="card" id="today">
                          <div className="hd">
                            <span className="h3">Three things today</span>
                            <span className="unit" id="tcount">
                              {displayHabits.slice(0, 3).filter(([id]) => habitsDone[id]).length} of {Math.min(3, displayHabits.length)} done
                            </span>
                          </div>
                          <div className="prog">
                            <i style={{ width: `${displayHabits.length > 0 ? (displayHabits.slice(0, 3).filter(([id]) => habitsDone[id]).length / Math.min(3, displayHabits.length)) * 100 : 0}%` }} />
                          </div>
                          <div>
                            {displayHabits.slice(0, 3).map(([id, title, desc]) => {
                              const isDone = !!habitsDone[id];
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  className={`habit ${isDone ? "done" : ""}`}
                                  onClick={(e) => handleAction(`habit:${id}`, e)}
                                  role="checkbox"
                                  aria-checked={isDone}
                                >
                                  <span className={`box ${isDone ? "on" : ""}`}>
                                    <LivIcon name="check" size={15} strokeWidth={2.4} />
                                  </span>
                                  <span className="t">
                                    {title}
                                    <small>{desc}</small>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Up Next Card */}
                      <div className="card upnext">
                        <span className="k">Up next</span>
                        {displayedAppointments.length > 0 && (
                          <button
                            type="button"
                            className="quiet"
                            style={{ borderTop: "none", paddingTop: 0 }}
                            onClick={() => setActiveTab("care")}
                          >
                            <span className="t">
                              {displayedAppointments[0].t}
                              <small>
                                {displayedAppointments[0].d.toLocaleDateString(undefined, { weekday: "short" })}{" "}
                                {displayedAppointments[0].d.getDate()}{" "}
                                {displayedAppointments[0].d.toLocaleDateString(undefined, { month: "short" })} ·{" "}
                                {displayedAppointments[0].h} · in{" "}
                                {Math.ceil((displayedAppointments[0].d.getTime() - Date.now()) / 864e5)} days
                              </small>
                            </span>
                            <LivIcon name="chev" size={18} />
                          </button>
                        )}
                        {nextStepAction ? (
                          <button
                            type="button"
                            className="quiet"
                            onClick={() => handleAction(`stepbook:${nextStepAction.key}`)}
                          >
                            <span className="t">
                              {nextStepAction.s.t}
                              <small>{nextStepAction.t.n} · {nextStepAction.s.when}</small>
                            </span>
                            <span className="btn sm">{nextStepAction.s.cta?.[0] || "Book a session"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="quiet"
                            onClick={() => handleAction("stepbook:hm:0")}
                          >
                            <span className="t">
                              Physician review
                              <small>Hormonal and metabolic · Week 1</small>
                            </span>
                            <span className="btn sm">Book a session</span>
                          </button>
                        )}
                      </div>

                      {/* Last Check-In Card with 4 Mini Vitals */}
                      <div className="card">
                        <div className="hd">
                          <span className="h3">Last check-in</span>
                          <button
                            type="button"
                            className="link"
                            style={{ padding: 0 }}
                            onClick={() => setActiveTab("markers")}
                          >
                            <b>{latestAssessment?.created_at ? formatReportDate(latestAssessment.created_at) : "6 Oct"}</b>
                          </button>
                        </div>
                        <div className="mini4">
                          <button type="button" onClick={() => handleAction("marker:hr")}>
                            <span className="k">Heart rate</span>
                            <span className="num" style={{ display: "block", marginTop: 4 }}>
                              {normalizedReadings.heartRate.value != null ? normalizedReadings.heartRate.value : (session ? "—" : "68")}
                            </span>
                            <span className="d">{normalizedReadings.heartRate.unit}</span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:bp")}>
                            <span className="k">BP</span>
                            <span className="num" style={{ display: "block", marginTop: 4 }}>
                              {normalizedReadings.bloodPressure.display ? normalizedReadings.bloodPressure.display : (session ? "—" : "122 / 81")}
                            </span>
                            <span className="d">{normalizedReadings.bloodPressure.unit}</span>
                          </button>
                          <button type="button" onClick={() => handleAction("marker:posture")}>
                            <span className="k">Posture</span>
                            <span className="num" style={{ display: "block", marginTop: 4 }}>
                              {normalizedReadings.bodyScan.posture.score ?? (normalizedReadings.bodyScan.posture.allNormal ? "100" : session ? "—" : "72")}
                            </span>
                            <span className="d">{session ? "/ 100" : "/"}</span>
                          </button>
                          <button type="button" onClick={() => handleAction(session && normalizedReadings.markersMap.spo2?.isRecorded ? "marker:spo2" : "marker:cort")}>
                            <span className="k">
                              {session && normalizedReadings.markersMap.spo2?.isRecorded ? "SpO2" : "Cortisol"}
                            </span>
                            <span className="num" style={{ display: "block", marginTop: 4 }}>
                              {session
                                ? (normalizedReadings.markersMap.spo2?.value ?? normalizedReadings.markersMap.cort?.value ?? "—")
                                : "18.2"}
                            </span>
                            <span className="d">
                              {session
                                ? (normalizedReadings.markersMap.spo2?.unit ?? normalizedReadings.markersMap.cort?.unit ?? "%")
                                : "µg/dL"}
                            </span>
                          </button>
                        </div>
                        <button
                          type="button"
                          className="quiet"
                          onClick={() => {
                            setActiveTab("markers");
                            setMarkerFilter("p");
                          }}
                        >
                          <span className="t">
                            {recordedPriorityMarkers.length > 0
                              ? `${recordedPriorityMarkers.length} priority markers`
                              : session
                              ? "All recorded markers optimal"
                              : `${BIOMARKERS.filter((m) => m.s === "p").length} priority markers`}
                            <small>
                              {session && recordedPriorityMarkers.length > 0
                                ? recordedPriorityMarkers.map((m) => m.n).slice(0, 4).join(", ")
                                : "ApoB, ferritin, vitamin D, grip, muscle and more"}
                            </small>
                          </span>
                          <LivIcon name="chev" size={18} />
                        </button>
                      </div>

                      <div style={{ height: "52px", flexShrink: 0 }} />
                    </div>
                  )}

                  {/* TAB: MARKERS */}
                  {activeTab === "markers" && !hasReport && (
                    <div className="scroll">
                      {renderHeader("Biomarkers", "No report yet")}
                      <div className="card empty">
                        <div>
                          <h2 className="h2">Your biomarkers appear here</h2>
                          <p className="sub" style={{ marginTop: "8px" }}>
                            Fetch your longevity report from the Living Lab kiosk and this page fills in within a few seconds.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleAction("fetch")}
                        >
                          <LivIcon name="down" size={20} />
                          Get my longevity report
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setActiveSheet("upload")}
                        >
                          Upload a lab report
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === "markers" && hasReport && (
                    <div className="scroll">
                      {renderHeader(
                        "Biomarkers",
                        session && latestAssessment
                          ? `Assessed ${formatReportDate(latestAssessment.created_at)} · ${getAssessmentSourceLabel(latestAssessment)}`
                          : session
                          ? "No assessments recorded"
                          : "Assessed 18 Sep 2026",
                      )}

                      <div className="chips">
                        {[
                          ["all", "All", displayBiomarkers.length],
                          ...(session
                            ? [["recorded", "Recorded", displayBiomarkers.filter((m) => m.isRecorded).length]]
                            : []),
                          [
                            "p",
                            "Priority",
                            displayBiomarkers.filter((m) => m.s === "p" && (!session || m.isRecorded)).length,
                          ],
                          [
                            "b",
                            "Borderline",
                            displayBiomarkers.filter((m) => m.s === "b" && (!session || m.isRecorded)).length,
                          ],
                          [
                            "o",
                            "Optimal",
                            displayBiomarkers.filter((m) => m.s === "o" && (!session || m.isRecorded)).length,
                          ],
                        ].map(([key, label, count]) => (
                          <button
                            key={key as string}
                            type="button"
                            className={`chip ${markerFilter === key ? "on" : ""}`}
                            onClick={() => setMarkerFilter(key as string)}
                            aria-pressed={markerFilter === key}
                          >
                            {label} {count}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="card appt"
                        onClick={() => {
                          if (latestAssessment) setSelectedAssessmentId(latestAssessment.id);
                          setCurrentView("report");
                        }}
                      >
                        <LivIcon name="file" size={24} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="h3 block">Clinical Report</span>
                          <span className="sub block">
                            {getAssessmentSourceLabel(latestAssessment)} ·{" "}
                            {latestAssessment?.created_at ? formatReportDate(latestAssessment.created_at) : "Recent"}
                          </span>
                        </span>
                        <LivIcon name="chev" size={18} />
                      </button>

                      {/* Empty state when patient has no assessments yet */}
                      {session && !isAssessmentsLoading && assessments.length === 0 && (
                        <div className="card empty" id="vitals" aria-live="polite">
                          <span className="k">No Vitals or Biomarkers Recorded</span>
                          <h2 className="h2">Your health readings will appear here</h2>
                          <p className="sub" style={{ marginTop: "8px" }}>
                            Complete a screening at an Aaha Health Kiosk or undergo a guided check-up to see your real measured vitals, body composition and blood biomarkers.
                          </p>
                          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => void handleFetchKioskReports()}
                              style={{ fontSize: "13px", padding: "8px 14px" }}
                            >
                              <LivIcon name="redo" size={16} />
                              Check for updates
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => {
                                setBookingForm({ type: "pod", day: null, slot: null });
                                setCurrentView("book");
                              }}
                              style={{ fontSize: "13px", padding: "8px 14px" }}
                            >
                              Book a kiosk screening
                            </button>
                          </div>
                        </div>
                      )}

                      {/* From your check-in */}
                      {(!session || hasReport) && (
                        <>
                          <span className="k" style={{ marginTop: "6px" }}>
                            {latestAssessment?.created_at
                              ? `From your check-in · ${formatReportDate(latestAssessment.created_at)}`
                              : "From your last check-in · 6 Oct"}
                          </span>

                          <div className="card" id="vitals">
                            <div className="hd">
                              <span className="h3">Kiosk vitals</span>
                              <span className="unit">
                                {latestAssessment?.created_at
                                  ? `Check-in ${formatReportDate(latestAssessment.created_at)}`
                                  : "Check-in 6 Oct · next 15 Oct"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAction("marker:ecg")}
                              style={{ background: "none", border: "none", padding: 0, textAlign: "left", color: "inherit", width: "100%" }}
                            >
                              {renderEcgStrip(false)}
                            </button>
                            {normalizedReadings.ecg.value && (
                              <div style={{ padding: "4px 0 2px" }}>
                                <span className="sub">
                                  {normalizedReadings.ecg.value}
                                  {normalizedReadings.ecg.label ? ` · ${normalizedReadings.ecg.label}` : ""}
                                </span>
                              </div>
                            )}
                            <div className="vit">
                              <button type="button" onClick={() => handleAction("marker:hr")}>
                                <span className="k">Heart rate</span>
                                <span>
                                  {normalizedReadings.heartRate.value != null ? (
                                    <>
                                      <span className="num">{normalizedReadings.heartRate.value}</span>{" "}
                                      <span className="unit">bpm</span>
                                    </>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 14, opacity: 0.5 }}>Not recorded</span>
                                  ) : (
                                    <>
                                      <span className="num">68</span>{" "}
                                      <span className="unit">bpm</span>
                                    </>
                                  )}
                                </span>
                                {normalizedReadings.heartRate.delta ? (
                                  <span className={`d ${normalizedReadings.heartRate.delta.startsWith("-") ? "dn" : "up"}`}>
                                    {normalizedReadings.heartRate.delta} bpm
                                  </span>
                                ) : !session ? (
                                  renderDelta(getMarkerById("hr"))
                                ) : null}
                              </button>
                              <button type="button" onClick={() => handleAction("marker:bp")}>
                                <span className="k">Blood pressure</span>
                                <span>
                                  {normalizedReadings.bloodPressure.display ? (
                                    <>
                                      <span className="num">{normalizedReadings.bloodPressure.display}</span>{" "}
                                      <span className="unit">mmHg</span>
                                    </>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 14, opacity: 0.5 }}>Not recorded</span>
                                  ) : (
                                    <>
                                      <span className="num">122 / 81</span>{" "}
                                      <span className="unit">mmHg</span>
                                    </>
                                  )}
                                </span>
                                {normalizedReadings.bloodPressure.delta ? (
                                  <span className="d same">{normalizedReadings.bloodPressure.delta}</span>
                                ) : !session ? (
                                  renderDelta(getMarkerById("bp"))
                                ) : null}
                              </button>
                            </div>
                          </div>

                          <div className="card" id="bodyscan">
                            <div className="hd">
                              <span className="h3">Body scan</span>
                              <span className="unit">
                                {latestAssessment?.source === "kiosk" ? "Smart camera" : "Check-up"} ·{" "}
                                {latestAssessment?.created_at ? formatReportDate(latestAssessment.created_at) : "6 Oct"}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="fig"
                              onClick={() => handleAction("marker:posture")}
                              style={{ background: "none", border: "none", padding: 0, textAlign: "left", color: "inherit" }}
                            >
                              {renderPostureFigure(false)}
                              <span>
                                <span className="k">Posture</span>
                                <span style={{ display: "block", marginTop: 4 }}>
                                  {normalizedReadings.bodyScan.posture.score != null || normalizedReadings.bodyScan.posture.allNormal ? (
                                    <>
                                      <span className="num" style={{ fontSize: 36 }}>
                                        {normalizedReadings.bodyScan.posture.score ??
                                          (normalizedReadings.bodyScan.posture.allNormal ? "100" : "72")}
                                      </span>{" "}
                                      <span className="unit">/ 100</span>
                                    </>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 16, opacity: 0.5 }}>Not scanned</span>
                                  ) : (
                                    <>
                                      <span className="num" style={{ fontSize: 36 }}>72</span>{" "}
                                      <span className="unit">/ 100</span>
                                    </>
                                  )}
                                </span>
                                {normalizedReadings.bodyScan.posture.allNormal ? (
                                  <span className="d up">Optimal alignment</span>
                                ) : !session ? (
                                  renderDelta(getMarkerById("posture"))
                                ) : null}
                                <span className="sub" style={{ display: "block", marginTop: 6 }}>
                                  {normalizedReadings.bodyScan.posture.hasPosture
                                    ? normalizedReadings.bodyScan.posture.findings.map((f) => f[1]).join(", ") || "Tap for findings"
                                    : session
                                    ? "Posture scan not recorded in this check-up"
                                    : "Forward head, right shoulder low. Tap for the findings."}
                                </span>
                              </span>
                            </button>
                            <div className="scan">
                              <button type="button" onClick={() => handleAction("marker:bmi")}>
                                <span className="k">BMI</span>
                                <span style={{ display: "block", marginTop: 4 }}>
                                  {normalizedReadings.bodyScan.bmi != null ? (
                                    <span className="num">{normalizedReadings.bodyScan.bmi}</span>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 13, opacity: 0.5 }}>Not measured</span>
                                  ) : (
                                    <span className="num">26.4</span>
                                  )}
                                </span>
                                {!session && normalizedReadings.bodyScan.bmi != null && renderDelta(getMarkerById("bmi"))}
                              </button>
                              <button type="button" onClick={() => handleAction("marker:bf")}>
                                <span className="k">Body fat</span>
                                <span style={{ display: "block", marginTop: 4 }}>
                                  {normalizedReadings.bodyScan.bodyFat != null ? (
                                    <>
                                      <span className="num">{normalizedReadings.bodyScan.bodyFat}</span>{" "}
                                      <span className="unit">%</span>
                                    </>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 13, opacity: 0.5 }}>Not measured</span>
                                  ) : (
                                    <>
                                      <span className="num">36.2</span>{" "}
                                      <span className="unit">%</span>
                                    </>
                                  )}
                                </span>
                                {!session && normalizedReadings.bodyScan.bodyFat != null && renderDelta(getMarkerById("bf"))}
                              </button>
                              <button type="button" onClick={() => handleAction("marker:waist")}>
                                <span className="k">Waist</span>
                                <span style={{ display: "block", marginTop: 4 }}>
                                  {normalizedReadings.bodyScan.waist != null ? (
                                    <>
                                      <span className="num">{normalizedReadings.bodyScan.waist}</span>{" "}
                                      <span className="unit">cm</span>
                                    </>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 13, opacity: 0.5 }}>Not measured</span>
                                  ) : (
                                    <>
                                      <span className="num">88</span>{" "}
                                      <span className="unit">cm</span>
                                    </>
                                  )}
                                </span>
                                {!session && normalizedReadings.bodyScan.waist != null && renderDelta(getMarkerById("waist"))}
                              </button>
                            </div>
                          </div>

                          <div className="card">
                            <div className="hd">
                              <span className="h3">Fitness, recovery, brain</span>
                              <span className="unit">
                                {session ? "Targeted vital markers" : "One easy marker each"}
                              </span>
                            </div>
                            <div className="fit">
                              <button type="button" onClick={() => handleAction("marker:vo2")}>
                                <span className="k">VO₂max</span>
                                <span style={{ display: "block", marginTop: 4 }}>
                                  {normalizedReadings.fitness.vo2.value != null ? (
                                    <>
                                      <span className="num">{normalizedReadings.fitness.vo2.value}</span>{" "}
                                      <span className="unit">{normalizedReadings.fitness.vo2.unit}</span>
                                    </>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 13, opacity: 0.5 }}>Not measured</span>
                                  ) : (
                                    <>
                                      <span className="num">28.4</span>{" "}
                                      <span className="unit">{normalizedReadings.fitness.vo2.unit}</span>
                                    </>
                                  )}
                                </span>
                                <span className="d">
                                  {session
                                    ? (normalizedReadings.fitness.vo2.value ? "Measured" : "Not recorded")
                                    : "Priority"}
                                </span>
                              </button>
                              <button type="button" onClick={() => handleAction("marker:hrv")}>
                                <span className="k">HRV</span>
                                <span style={{ display: "block", marginTop: 4 }}>
                                  {normalizedReadings.fitness.hrv.value != null ? (
                                    <>
                                      <span className="num">{normalizedReadings.fitness.hrv.value}</span>{" "}
                                      <span className="unit">{normalizedReadings.fitness.hrv.unit}</span>
                                    </>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 13, opacity: 0.5 }}>Not measured</span>
                                  ) : (
                                    <>
                                      <span className="num">38</span>{" "}
                                      <span className="unit">{normalizedReadings.fitness.hrv.unit}</span>
                                    </>
                                  )}
                                </span>
                                <span className="d">
                                  {session
                                    ? (normalizedReadings.fitness.hrv.value ? "Measured" : "Not recorded")
                                    : "+3"}
                                </span>
                              </button>
                              <button type="button" onClick={() => handleAction("marker:rt")}>
                                <span className="k">Reaction time</span>
                                <span style={{ display: "block", marginTop: 4 }}>
                                  {normalizedReadings.fitness.reactionTime.value != null ? (
                                    <>
                                      <span className="num">{normalizedReadings.fitness.reactionTime.value}</span>{" "}
                                      <span className="unit">{normalizedReadings.fitness.reactionTime.unit}</span>
                                    </>
                                  ) : session ? (
                                    <span className="num" style={{ fontSize: 13, opacity: 0.5 }}>Not measured</span>
                                  ) : (
                                    <>
                                      <span className="num">312</span>{" "}
                                      <span className="unit">{normalizedReadings.fitness.reactionTime.unit}</span>
                                    </>
                                  )}
                                </span>
                                <span className="d">
                                  {session
                                    ? (normalizedReadings.fitness.reactionTime.value ? "Measured" : "Not recorded")
                                    : "-6"}
                                </span>
                              </button>
                            </div>
                          </div>

                          {GROUPS.map((g) => {
                            const ms = displayBiomarkers.filter(
                              (m) =>
                                m.g === g.id &&
                                (markerFilter === "all" ||
                                  (markerFilter === "recorded" && m.isRecorded) ||
                                  m.s === markerFilter),
                            );
                            if (!ms.length) return null;
                            return (
                              <div key={g.id}>
                                <span className="k" style={{ marginTop: "6px" }}>{g.name}</span>
                                <div className="card grp">
                                  {ms.map((m) => (
                                    <button
                                      key={m.id}
                                      type="button"
                                      className="mrow"
                                      onClick={() => handleAction(`marker:${m.id}`)}
                                    >
                                      <span className="top">
                                        <span className="n">{m.n}</span>
                                        <span className="v">{m.v}</span>
                                        <span className="unit">{m.u.split(" · ")[0]}</span>
                                      </span>
                                      {renderRangeBar(m)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setActiveSheet("upload")}
                        style={{ marginTop: "6px" }}
                      >
                        <LivIcon name="up" size={18} />
                        Add another report
                      </button>

                      <div style={{ height: "52px", flexShrink: 0 }} />
                    </div>
                  )}

                  {/* TAB: PLAN */}
                  {activeTab === "plan" && (
                    <div className="scroll">
                      {!hasReport || (session && !isCarePlansLoading && !activeCarePlan && !latestAssessment) ? (
                        <>
                          {renderHeader("Your plan", "No report yet")}
                          <div className="card empty">
                            <div>
                              <h2 className="h2">Your plan is built from your report</h2>
                              <p className="sub" style={{ marginTop: "8px" }}>
                                Fetch your longevity report from the Living Lab kiosk and this page fills in within a few seconds.
                              </p>
                            </div>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleAction("fetch")}
                            >
                              <LivIcon name="down" size={20} />
                              Get my longevity report
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => setActiveSheet("upload")}
                            >
                              Upload a lab report
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {renderHeader(`Your ${effectivePlanLen} days`, `Day ${dayNumber} of ${effectivePlanLen} · re-test in ${effectivePlanLen - dayNumber} days`)}

                          {/* Care plan card */}
                          <div className="card inv">
                            <div className="hd">
                              <div>
                                <span className="k">Care plan · from {prescriberDoctor} · {effectivePlanLen} days</span>
                                <div className="h3" style={{ fontSize: "17px", marginTop: "4px" }}>
                                  Level {planLevel[0]} of {planPhases.length} · {planLevel[1]}
                                </div>
                              </div>
                              <span className="pts" style={{ color: "var(--inv-fg)" }}>
                                {activeCarePlan?.status ? activeCarePlan.status.toUpperCase() : `${pts} pts`}
                              </span>
                            </div>
                            <div className="lvl">
                              <LivProgressRing size={64} strokeWidth={5} progress={dayNumber / effectivePlanLen} onBg={false}>
                                <span className="unit" style={{ color: "var(--inv-fg)" }}>
                                  {dayNumber}<small style={{ color: "var(--inv-muted)" }}>/{effectivePlanLen}</small>
                                </span>
                              </LivProgressRing>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "14px" }}>
                                  {programmeTitle}, {Math.round(effectivePlanLen / 7)} weeks. {milestones.filter((m) => m[2]).length} of {milestones.length} milestones reached.
                                </div>
                                <div className="sub" style={{ marginTop: "3px" }}>
                                  Points come from today's steps and sessions logged at the centre.
                                </div>
                              </div>
                            </div>

                            {/* Rewards XP Bar on Care Plan (Matches prototype carePlanX) */}
                            <div className="xp">
                              <div className="bar">
                                <i style={{ width: `${pts % 100}%` }} />
                              </div>
                              <div className="row">
                                <span>{pts} pts</span>
                                <span>{100 - (pts % 100)} to the next reward</span>
                              </div>
                            </div>

                            <div
                              className="path"
                              style={{
                                gridTemplateColumns: `repeat(${milestones.length}, ${milestones.length > 5 ? "76px" : "1fr"})`,
                                overflowX: "auto",
                                scrollbarWidth: "none",
                                margin: "0 -18px",
                                padding: "0 18px",
                              }}
                            >
                              {milestones.map(([lbl, , done], idx) => {
                                const isNow = !done && (idx === 0 || milestones[idx - 1][2]);
                                return (
                                  <div key={idx} className={`ms ${done ? "done" : isNow ? "now" : ""}`}>
                                    <span className="nd">
                                      <LivIcon name="check" size={13} strokeWidth={3} />
                                    </span>
                                    <span>{lbl}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* This week weekly habit rhythm */}
                          <div className="card pw">
                            <div className="hd">
                              <span className="h3">This week</span>
                              <span className="unit">Week 4 · tap each time you do it</span>
                            </div>
                            {[
                              { k: "str", n: "Strength session", s: "3 a week with Coach Ritu", t: 3 },
                              { k: "walk", n: "Walk after dinner", s: "10 minutes, most days", t: 7 },
                              { k: "sup", n: "Vitamin D and iron", s: "Every day, as prescribed", t: 7 },
                              { k: "br", n: "Coherence breathing", s: "10 minutes with Liv", t: 5 },
                            ].map((w) => {
                              const count = weeklyProgress[w.k] || 0;
                              return (
                                <div key={w.k}>
                                  <div className="hd">
                                    <span>
                                      <span style={{ fontSize: "14.5px", fontWeight: 500 }}>{w.n}</span>
                                      <span className="sub" style={{ display: "block" }}>
                                        {w.s} {count >= w.t ? "· done for the week" : ""}
                                      </span>
                                    </span>
                                    <span className="unit">{count}/{w.t}</span>
                                  </div>
                                  <div style={{ marginTop: "8px" }} className="wk">
                                    {Array.from({ length: w.t }).map((_, i) => (
                                      <button
                                        key={i}
                                        type="button"
                                        className={count > i ? "on" : ""}
                                        onClick={(e) => handleAction(`wk:${w.k}:${i + 1}`, e)}
                                        aria-pressed={count > i}
                                        aria-label={`${i + 1} of ${w.t}`}
                                      >
                                        <LivIcon name="check" size={12} strokeWidth={3} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Today habits */}
                          <div className="card" id="today">
                            <div className="hd">
                              <span className="h3">Today</span>
                              <span className="unit" id="tcount">
                                {displayHabits.filter(([id]) => habitsDone[id]).length} of {displayHabits.length} done
                              </span>
                            </div>
                            <div className="prog">
                              <i style={{ width: `${displayHabits.length > 0 ? (displayHabits.filter(([id]) => habitsDone[id]).length / displayHabits.length) * 100 : 0}%` }} />
                            </div>
                            <div>
                              {displayHabits.map(([id, title, desc]) => {
                                const isDone = !!habitsDone[id];
                                return (
                                  <button
                                    key={id}
                                    type="button"
                                    className={`habit ${isDone ? "done" : ""}`}
                                    onClick={(e) => handleAction(`habit:${id}`, e)}
                                  >
                                    <span className={`box ${isDone ? "on" : ""}`}>
                                      <LivIcon name="check" size={15} strokeWidth={2.4} />
                                    </span>
                                    <span className="t">
                                      {title}
                                      <small>{desc}</small>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                      {/* Badges row */}
                      <div className="card">
                        <div className="hd">
                          <span className="h3">Badges</span>
                          <span className="unit">4 of 6</span>
                        </div>
                        <div className="badges">
                          {Object.entries(BADGE_DEFINITIONS).map(([key, [title, desc]]) => {
                            const isUnlocked = !!earnedBadges[key];
                            return (
                              <div
                                key={key}
                                className={`bd ${isUnlocked ? "" : "lock"}`}
                              >
                                <span className="ico">
                                  <LivIcon name={isUnlocked ? "check" : "flame"} size={16} strokeWidth={2.4} />
                                </span>
                                <b>{title}</b>
                                <small>{desc}</small>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Your three journeys */}
                      <span className="k" style={{ marginTop: "6px" }}>Your three journeys</span>
                      {JOURNEY_TRACKS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="card trow"
                          onClick={() => handleAction(`track:${t.id}`)}
                        >
                          <LivProgressRing size={50} strokeWidth={4} progress={0.5} onBg={true}>
                            <span className="unit" style={{ fontSize: "11px" }}>3/7</span>
                          </LivProgressRing>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span className="h3 block">{t.n}</span>
                            <span className="sub block">{t.short}</span>
                          </span>
                          <LivIcon name="chev" size={18} />
                        </button>
                      ))}

                      {/* Why these three accordion */}
                      <span className="k" style={{ marginTop: "6px" }}>Why these three</span>
                      {PRIORITIES.map((p, idx) => {
                        const isOpen = openPri === idx;
                        return (
                          <div key={idx} className={`card pri ${isOpen ? "open" : ""}`}>
                            <button
                              type="button"
                              onClick={() => setOpenPri(isOpen ? null : idx)}
                              aria-expanded={isOpen}
                            >
                              <span className="no">{idx + 1}</span>
                              <span className="h3" style={{ flex: 1 }}>{p.t}</span>
                              <span className="chev"><LivIcon name="chev" size={18} /></span>
                            </button>
                            <div className="more">
                              <div>
                                <div className="in">
                                  <div>
                                    <span className="k">The signal</span>
                                    <p style={{ margin: "4px 0 0" }}>{p.sig}</p>
                                  </div>
                                  <div>
                                    <span className="k">Your move</span>
                                    <p style={{ margin: "4px 0 0" }}>{p.move}</p>
                                  </div>
                                  <div>
                                    <span className="k">Day-{effectivePlanLen} target</span>
                                    <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{p.tar}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Wearable trends */}
                      <div className="card">
                        <span className="k">Wearable trends</span>
                        <div>
                          <div className="trk">
                            <div>
                              <div className="h3">Sleep</div>
                              <div className="sub">14-day average · target 7 h or more</div>
                            </div>
                            <button
                              type="button"
                              className="link"
                              style={{ padding: 0 }}
                              onClick={() => handleAction("marker:sleep")}
                            >
                              <span className="num" style={{ fontSize: "24px", color: "var(--text)" }}>6 h 10</span>
                            </button>
                          </div>
                          <div className="trk">
                            <div>
                              <div className="h3">HRV</div>
                              <div className="sub">14-day average · optimal above 45</div>
                            </div>
                            <button
                              type="button"
                              className="link"
                              style={{ padding: 0 }}
                              onClick={() => handleAction("marker:hrv")}
                            >
                              <span className="num" style={{ fontSize: "24px", color: "var(--text)" }}>38</span> <span className="unit">ms</span>
                            </button>
                          </div>
                        </div>
                      </div>
                        </>
                      )}

                      <div style={{ height: "52px", flexShrink: 0 }} />
                    </div>
                  )}

                  {/* TAB: CARE */}
                  {activeTab === "care" && (
                    <div className="scroll">
                      {renderHeader("Care", "Your visits, treatments and team")}

                      <span className="k">Upcoming</span>
                      {displayedAppointments.filter((a) => !a.past).length > 0 ? (
                        displayedAppointments.filter((a) => !a.past).map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className="card appt"
                            onClick={() => handleAction(`sheet:appt:${a.id}`)}
                          >
                            <span className="date">
                              <b>{a.d.getDate()}</b>
                              <span>{a.d.toLocaleDateString(undefined, { month: "short" })}</span>
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span className="h3 block">{a.t}</span>
                              <span className="sub block">{a.w}</span>
                              <span className="sub block">
                                {a.d.toLocaleDateString(undefined, { weekday: "short" })} · {a.h} · in {Math.ceil((a.d.getTime() - Date.now()) / 864e5)} days
                              </span>
                              {a.status && (
                                <span style={{ display: "block", marginTop: "5px" }}>
                                  {a.status === "pending" ? (
                                    <span className="stat-pill wait"><i />Awaiting Dr. Deshmukh's sign-off</span>
                                  ) : (
                                    <span className="stat-pill ok"><i />Approved by Dr. Deshmukh</span>
                                  )}
                                </span>
                              )}
                            </span>
                            <LivIcon name="chev" size={18} />
                          </button>
                        ))
                      ) : (
                        <div className="card empty">
                          <p className="sub">No visits booked. Your next step is one tap away.</p>
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => handleAction("newbook")}
                      >
                        <LivIcon name="cal" size={18} />
                        Book a visit
                      </button>

                      {hasReport && (
                        <>
                          <div className="sec">
                            <span className="k">Recommended by Dr. Deshmukh</span>
                            <span className="unit">From your report</span>
                          </div>
                          {TREATMENTS.filter((x) => x.rec).map((x) => (
                            <button
                              key={x.id}
                              type="button"
                              className="svc"
                              onClick={() => handleAction(`sheet:svc:${x.id}`)}
                            >
                              <div>
                                <div className="h3">{x.n}</div>
                                <div className="sub">{x.d}{x.sign ? " · doctor sign-off" : ""}</div>
                                <div className="why"><b>Why:</b> {x.rec}</div>
                                {treatmentPacks[x.id] && (
                                  <div className="sub" style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className="left">
                                      {Array.from({ length: treatmentPacks[x.id].total }).map((_, i) => (
                                        <i key={i} className={i < treatmentPacks[x.id].left ? "on" : ""} />
                                      ))}
                                    </span>
                                    {treatmentPacks[x.id].left} of {treatmentPacks[x.id].total} sessions left
                                  </div>
                                )}
                              </div>
                              <LivIcon name="chev" size={16} />
                            </button>
                          ))}
                        </>
                      )}

                      <span className="k" style={{ marginTop: "8px" }}>Treatments at the centre</span>
                      <div className="chips">
                        {[
                          ["skin", "Skin"],
                          ["hair", "Hair"],
                          ["iv", "IV drips"],
                        ].map(([cId, cLbl]) => (
                          <button
                            key={cId}
                            type="button"
                            className={`chip ${treatmentCategory === cId ? "on" : ""}`}
                            onClick={() => setTreatmentCategory(cId)}
                            aria-pressed={treatmentCategory === cId}
                          >
                            {cLbl}
                          </button>
                        ))}
                      </div>
                      {TREATMENTS.filter((x) => x.cat === treatmentCategory).map((x) => (
                        <button
                          key={x.id}
                          type="button"
                          className="svc"
                          onClick={() => handleAction(`sheet:svc:${x.id}`)}
                        >
                          <div>
                            <div className="h3">{x.n}</div>
                            <div className="sub">{x.d}{x.sign ? " · doctor sign-off" : ""}</div>
                            {treatmentPacks[x.id] && (
                              <div className="sub" style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="left">
                                  {Array.from({ length: treatmentPacks[x.id].total }).map((_, i) => (
                                    <i key={i} className={i < treatmentPacks[x.id].left ? "on" : ""} />
                                  ))}
                                </span>
                                {treatmentPacks[x.id].left} of {treatmentPacks[x.id].total} sessions left
                              </div>
                            )}
                          </div>
                          <LivIcon name="chev" size={16} />
                        </button>
                      ))}

                      {hasReport && (
                        <>
                          <span className="k" style={{ marginTop: "8px" }}>Care packages from your report</span>
                          {JOURNEY_TRACKS.map((t, idx) => {
                            const pkg = CARE_PACKAGES[t.id];
                            return (
                              <button
                                key={t.id}
                                type="button"
                                className="opt"
                                onClick={() => handleAction(`sheet:pkg:${t.id}`)}
                              >
                                <div>
                                  <div className="h3">{pkg.n}</div>
                                  <div className="sub">{pkg.f} · {pkg.len}</div>
                                </div>
                                {requestedPackages[t.id] ? (
                                  <span className="pill b">Requested</span>
                                ) : idx === 0 ? (
                                  <span className="pill p">Start here</span>
                                ) : (
                                  <LivIcon name="chev" size={16} />
                                )}
                              </button>
                            );
                          })}
                        </>
                      )}

                      {displayedAppointments.filter((a) => a.past).length > 0 && (
                        <>
                          <span className="k" style={{ marginTop: "8px" }}>Past sessions</span>
                          {displayedAppointments.filter((a) => a.past).map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              className="card appt"
                              onClick={() => handleAction(`sheet:after:${a.id}`)}
                            >
                              <span className="date">
                                <b>{a.d.getDate()}</b>
                                <span>{a.d.toLocaleDateString(undefined, { month: "short" })}</span>
                              </span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span className="h3 block">{a.t}</span>
                                <span className="sub block">{a.w}</span>
                                <span className="sub block">
                                  {a.d.toLocaleDateString(undefined, { weekday: "short" })} · {a.h}
                                </span>
                              </span>
                              <LivIcon name="chev" size={18} />
                            </button>
                          ))}
                        </>
                      )}

                      <span className="k" style={{ marginTop: "8px" }}>Your care team</span>
                      <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                        {[
                          ["Dr. A. Deshmukh", "Supervising physician · signs every report and drip", "newbook:doc"],
                          ["Ritu S.", "Longevity coach · fortnightly check-ins", "newbook:coach"],
                          ["Trupti", "Nurse · runs your kiosk and treatment sessions", "say:Trupti logs each session you take at the centre."],
                          ["Liv", "AI companion · English, Hindi or Marathi, any time", "sheet:liv"],
                        ].map(([docName, subDesc, actKey]) => (
                          <button
                            key={docName}
                            type="button"
                            className="habit"
                            onClick={() => handleAction(actKey)}
                          >
                            <span className="box on" style={{ font: "600 12px var(--sans)" }}>
                              {docName.replace("Dr. ", "").charAt(0)}
                            </span>
                            <span className="t">
                              {docName}
                              <small>{subDesc}</small>
                            </span>
                            <LivIcon name="chev" size={16} />
                          </button>
                        ))}
                      </div>

                      <p className="sub" style={{ textAlign: "center", marginTop: "4px" }}>
                        Aaroogya AI Centre for Women's Wellness
                        <br />
                        Aundh, Pune · open 8 AM to 8 PM
                      </p>

                      <div style={{ height: "52px", flexShrink: 0 }} />
                    </div>
                  )}

                  {/* FAB - Ask Liv button */}
                  {hasReport && (
                    <button
                      type="button"
                      className="fab"
                      onClick={() => setActiveSheet("liv")}
                    >
                      <LivIcon name="spark" size={20} />
                      Ask Liv
                    </button>
                  )}

                  {/* Bottom Nav Bar (Matches prototype lines 141-147: repeat 4, 1fr) */}
                  <nav className="nav" aria-label="Main">
                    {[
                      ["home", "Home", "home"],
                      ["markers", "Markers", "drop"],
                      ["plan", "Plan", "plan"],
                      ["care", "Care", "cal"],
                    ].map(([tabKey, label, iconName]) => (
                      <button
                        key={tabKey}
                        type="button"
                        className={`tab ${activeTab === tabKey ? "on" : ""}`}
                        onClick={() => {
                          setActiveTab(tabKey as any);
                          if (tabKey === "markers") setMarkerFilter("all");
                        }}
                        aria-current={activeTab === tabKey ? "page" : "false"}
                      >
                        <LivIcon name={iconName as any} size={22} />
                        {label}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* ─── 7. SINGLE MARKER DETAIL SCREEN ─── */}
              {currentView === "marker" && (
                <div className="scroll">
                  <div className="hd">
                    <button
                      type="button"
                      className="icb"
                      onClick={() => setCurrentView("main")}
                      aria-label="Back"
                    >
                      <LivIcon name="back" size={20} />
                    </button>
                    <span className="k">{GROUPS.find((g) => g.id === selectedMarker.g)?.name || "Biomarker"}</span>
                    <span style={{ width: "44px" }} />
                  </div>

                  <div>
                    <h1 className="h1">{selectedMarker.n}</h1>
                    <div className="hd" style={{ marginTop: "14px", alignItems: "flex-end" }}>
                      <span>
                        <span className="num" style={{ fontSize: "68px" }}>{selectedMarker.v}</span>{" "}
                        <span className="unit">{selectedMarker.u}</span>
                      </span>
                      {selectedMarker.isRecorded && selectedMarker.s ? (
                        <span className={`pill ${selectedMarker.s}`}>
                          {selectedMarker.s === "p" ? "▲ Priority" : selectedMarker.s === "b" ? "◆ Borderline" : "● Optimal"}
                        </span>
                      ) : (
                        <span className="pill" style={{ opacity: 0.7, background: "rgba(0,0,0,0.06)" }}>
                          Not recorded in this check-up
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ECG intervals or Posture details */}
                  {selectedMarker.id === "ecg" && selectedMarker.iv && (
                    <div className="card">
                      {renderEcgStrip(false)}
                      <div className="iv">
                        {selectedMarker.iv.map(([ivVal, ivLbl]: [string, string], i: number) => (
                          <div key={i}>
                            <b>{ivVal}</b>
                            <span>{ivLbl}</span>
                          </div>
                        ))}
                      </div>
                      <p className="sub">
                        {selectedMarker.label || "Regular rhythm · read by clinical practitioner"}
                      </p>
                    </div>
                  )}

                  {selectedMarker.id === "posture" && (
                    <div className="card">
                      <div className="fig">
                        {renderPostureFigure(true)}
                        <div className="find">
                          {(selectedMarker.find || [
                            ["p", "Forward head", "12° from the plumb line · target under 8°"],
                            ["b", "Shoulder level", "right 1.5 cm lower than left"],
                            ["b", "Pelvic tilt", "mild anterior tilt"],
                            ["o", "Knee alignment", "neutral, both sides"],
                          ]).map((f: [string, string, string], i: number) => (
                            <div key={i}>
                              <i className={f[0]} />
                              <span><b>{f[1]}</b><br />{f[2]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="sub">Front view from the kiosk smart camera. Dashed is level; solid is you.</p>
                    </div>
                  )}

                  {selectedMarker.eeg && (
                    <div className="card eeg">
                      <span className="k">Brainwaves in three states</span>
                      {selectedMarker.eeg.map((e, i) => (
                        <div key={i}>
                          <div className="r">
                            <b>{e[0]}</b>
                            <span className="unit">{e[1]}</span>
                          </div>
                          {renderEegSvg(e[3])}
                          <span className="sub">{e[2]}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!selectedMarker.nobar && (
                    <div className="card">
                      {renderRangeBar(selectedMarker)}
                      <div className="rbl">
                        <span>Longevity-optimal {selectedMarker.opt}</span>
                        <span>Clinical {selectedMarker.clin}</span>
                      </div>
                      <p className="sub" style={{ fontSize: "12px" }}>
                        {selectedMarker.isRecorded !== false
                          ? "Solid is optimal, hatched is borderline, faint is priority. The clinical range is where illness begins. The optimal range is where healthspan is built."
                          : "Reference ranges for clinical guidance. This marker was not measured in your recent visit."}
                      </p>
                    </div>
                  )}

                  {selectedMarker.prev && (
                    <div className="card" style={{ gap: "6px" }}>
                      <div className="hd">
                        <span className="k">Since last check-in</span>
                        <span className="unit">
                          {selectedMarker.when ? `${selectedMarker.when} → ` : ""}
                          {latestAssessment?.created_at ? formatReportDate(latestAssessment.created_at) : "Recent"}
                        </span>
                      </div>
                      <div className="cmp">
                        <span><span className="num">{selectedMarker.prev}</span></span>
                        <span className="arrow" />
                        <span><span className="num">{selectedMarker.v}</span> {renderDelta(selectedMarker)}</span>
                      </div>
                      <p className="sub">Taken by your clinical nurse at your check-in.</p>
                    </div>
                  )}

                  <div className="card">
                    <span className="k">What it means</span>
                    <p style={{ margin: 0, font: "400 20px/1.3 var(--serif)" }}>{selectedMarker.m}</p>
                  </div>

                  <div className="card">
                    <div className="hd">
                      <span className="k">{selectedMarker.s === "o" ? "How to protect it" : "How to move it"}</span>
                    </div>
                    <div>
                      {selectedMarker.a.length ? (
                        selectedMarker.a.map((t, idx) => {
                          const actionKey = `${selectedMarker.id}:${idx}`;
                          const isAdded = !!addedActions[actionKey];
                          return (
                            <div key={idx} className="act">
                              <p>{t}</p>
                              <button
                                type="button"
                                className={`add ${isAdded ? "on" : ""}`}
                                onClick={() => handleAction(`add:${selectedMarker.id}:${idx}`)}
                                aria-pressed={isAdded}
                              >
                                {isAdded ? "Added" : "Add to plan"}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="sub">Nothing to do here. We re-measure it at your next visit.</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="card trow"
                    onClick={() => handleAction(`track:${getTrackForMarker(selectedMarker).id}`)}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="k">Part of your journey</span>
                      <span className="h3" style={{ display: "block", marginTop: "5px" }}>
                        {getTrackForMarker(selectedMarker).n}
                      </span>
                    </span>
                    <LivIcon name="chev" size={18} />
                  </button>

                  <div className="split">
                    <div className="card stat">
                      <span className="k">Day-{planLen} target</span>
                      <span className="num" style={{ fontSize: "28px" }}>{selectedMarker.t || "Hold"}</span>
                    </div>
                    <div className="card stat">
                      <span className="k">Re-test</span>
                      <span className="num" style={{ fontSize: "28px" }}>{retestDateStr}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setBookingForm({ type: "doc", day: null, slot: null });
                      setCurrentView("book");
                    }}
                  >
                    Book a review with Dr. Deshmukh
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => handleAction(`askliv:${selectedMarker.id}`)}
                  >
                    <LivIcon name="spark" size={18} />
                    Ask Liv about this
                  </button>
                </div>
              )}

              {/* ─── 8. JOURNEY TRACK SCREEN ─── */}
              {currentView === "track" && (
                <div className="scroll">
                  <div className="hd">
                    <button
                      type="button"
                      className="icb"
                      onClick={() => setCurrentView("main")}
                      aria-label="Back"
                    >
                      <LivIcon name="back" size={20} />
                    </button>
                    <span className="k">Journey · 3 of {selectedTrack.steps.length} steps done</span>
                    <span style={{ width: "44px" }} />
                  </div>

                  <div>
                    <h1 className="h1">{selectedTrack.n}</h1>
                    <p className="sub" style={{ marginTop: "10px", fontSize: "14.5px" }}>
                      {selectedTrack.find}
                    </p>
                  </div>

                  <div className="prog">
                    <i style={{ width: "42%" }} />
                  </div>

                  <span className="k" style={{ marginTop: "4px" }}>What your report shows</span>
                  <div className="mk">
                    {selectedTrack.mk.map((id) => {
                      const m = getMarkerById(id);
                      if (!m) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleAction(`marker:${id}`)}
                        >
                          {m.n} <b>{m.v}</b> <i>{m.s === "p" ? "▲" : m.s === "b" ? "◆" : "●"}</i>
                        </button>
                      );
                    })}
                  </div>

                  <div className="card">
                    <span className="k">Daily guidelines</span>
                    <div>
                      {selectedTrack.guide.map((g, i) => (
                        <div key={i} className="gl">
                          <b>{i + 1}</b>
                          <span>{g}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <span className="k" style={{ marginTop: "4px" }}>Your journey to Day {planLen}</span>
                  <div className="card">
                    <div className="tl">
                      {selectedTrack.steps.map((s, i) => {
                        const isDone = i < 2;
                        const isNow = i === 2;
                        return (
                          <div key={i} className={`ts ${isDone ? "done" : isNow ? "now" : "up"}`}>
                            <span className="nd">
                              {isDone && <LivIcon name="check" size={14} strokeWidth={2.4} />}
                            </span>
                            <div className="bd">
                              <span className="meta">
                                <span className="k">{s.when}</span>
                                <span className="tagx">{s.tag}</span>
                              </span>
                              <span className="h3">{s.t}</span>
                              <span className="sub">{s.d}</span>
                              {isNow && s.cta && (
                                <span className="acts">
                                  <button
                                    type="button"
                                    className="btn sm"
                                    onClick={() => handleAction(`stepbook:${selectedTrack.id}:${i}`)}
                                  >
                                    {s.cta[0]}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn sm ghost"
                                    onClick={() => showToast(`Marked "${s.t}" done`)}
                                  >
                                    Mark done
                                  </button>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card">
                    <span className="k">Target on Day {planLen}</span>
                    <p style={{ margin: 0, font: "500 21px/1.25 var(--serif)", fontVariantNumeric: "lining-nums" }}>
                      {selectedTrack.goal}
                    </p>
                  </div>

                  <span className="k" style={{ marginTop: "4px" }}>The care package for this journey</span>
                  <button
                    type="button"
                    className="card trow"
                    onClick={() => handleAction(`sheet:pkg:${selectedTrack.id}`)}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="h3 block" style={{ fontSize: "16px" }}>{CARE_PACKAGES[selectedTrack.id]?.n}</span>
                      <span className="sub block">
                        {CARE_PACKAGES[selectedTrack.id]?.inc.length} inclusions · {CARE_PACKAGES[selectedTrack.id]?.len}
                      </span>
                    </span>
                    <LivIcon name="chev" size={18} />
                  </button>
                </div>
              )}

              {/* ─── 9. CLINICAL REPORT VIEWER (17 PROTOTYPE SLIDES) ─── */}
              {currentView === "report" && (() => {
                const REPORT_CHAPTER_TITLES = [
                  "Cover",
                  "Welcome",
                  "How we read you",
                  "Your headline",
                  "Your plan, distilled",
                  "The full picture",
                  "Heart and arteries",
                  "Metabolic health",
                  "Strength, body and bone",
                  "Inflammation, liver and kidney",
                  "Hormones and nutrients",
                  "Senses and breath",
                  "Your brain, recorded",
                  "Mind, sleep and recovery",
                  "Treatment journey",
                  `Your next ${effectivePlanLen} days`,
                  "Fine print and sign-off",
                ];

                // System scores calculated from real biomarkers
                const REPORT_SYSCH = GROUPS.map((sys) => {
                  const systemMarkers = displayBiomarkers.filter((m) => m.g === sys.id && m.isRecorded);
                  const hasData = systemMarkers.length > 0;
                  
                  // Calculate score from recorded markers if available
                  let calculatedScore: number | null = null;
                  if (hasData) {
                    const optimalCount = systemMarkers.filter(m => m.s === "o").length;
                    const totalCount = systemMarkers.length;
                    calculatedScore = totalCount > 0 ? Math.round((optimalCount / totalCount) * 100) : null;
                  }
                  
                  // Use system-specific descriptions
                  const descriptions: Record<string, string> = {
                    heart: "Cardiovascular health markers including blood pressure, ApoB, and heart rhythm.",
                    met: "Metabolic markers including glucose, HbA1c, and insulin sensitivity.",
                    body: "Physical fitness including strength, body composition, and bone health.",
                    inf: "Inflammatory markers, liver enzymes, and kidney function.",
                    hor: "Hormones including thyroid, cortisol, and essential nutrients.",
                    sense: "Sensory and respiratory function markers.",
                    brain: "Neurological health and cognitive function indicators.",
                    mind: "Mental health, sleep quality, and recovery metrics.",
                  };
                  
                  return {
                    id: sys.id,
                    title: sys.name,
                    score: calculatedScore,
                    sub: descriptions[sys.id] || sys.name,
                  };
                });

                // Build targets from real measurements
                const REPORT_TARGETS: [string, string, string][] = [];
                
                // Biological age (only if available)
                if (verifiedBiologicalAge != null) {
                  REPORT_TARGETS.push([
                    "Biological age",
                    String(verifiedBiologicalAge),
                    `≤ ${verifiedChronologicalAge ? (verifiedChronologicalAge + 3).toFixed(1) : "45.0"}`
                  ]);
                }
                
                // Add real biomarker targets if recorded
                const hba1cMarker = displayBiomarkers.find(m => m.id === "hba1c");
                if (hba1cMarker?.isRecorded && hba1cMarker.v !== "—" && hba1cMarker.v !== "--") {
                  REPORT_TARGETS.push(["HbA1c", hba1cMarker.v, "≤ 5.7%"]);
                }
                
                const apobMarker = displayBiomarkers.find(m => m.id === "apob");
                if (apobMarker?.isRecorded && apobMarker.v !== "—" && apobMarker.v !== "--") {
                  REPORT_TARGETS.push(["ApoB", apobMarker.v, "< 90"]);
                }
                
                const gripMarker = displayBiomarkers.find(m => m.id === "grip");
                if (gripMarker?.isRecorded && gripMarker.v !== "—" && gripMarker.v !== "--") {
                  REPORT_TARGETS.push(["Grip strength", `${gripMarker.v} ${gripMarker.u}`, "27 kg"]);
                }
                
                const vitdMarker = displayBiomarkers.find(m => m.id === "vitd");
                if (vitdMarker?.isRecorded && vitdMarker.v !== "—" && vitdMarker.v !== "--") {
                  REPORT_TARGETS.push(["Vitamin D", vitdMarker.v, "> 40"]);
                }
                
                const waistMarker = displayBiomarkers.find(m => m.id === "waist");
                if (waistMarker?.isRecorded && waistMarker.v !== "—" && waistMarker.v !== "--") {
                  REPORT_TARGETS.push(["Waist", `${waistMarker.v} ${waistMarker.u}`, "≤ 85 cm"]);
                }
                
                const hrvMarker = displayBiomarkers.find(m => m.id === "hrv");
                if (hrvMarker?.isRecorded && hrvMarker.v !== "—" && hrvMarker.v !== "--") {
                  REPORT_TARGETS.push(["RMSSD (vagal tone)", `${hrvMarker.v} ${hrvMarker.u}`, "> 35 ms"]);
                }
                
                const cortMarker = displayBiomarkers.find(m => m.id === "cort");
                if (cortMarker?.isRecorded && cortMarker.v !== "—" && cortMarker.v !== "--") {
                  REPORT_TARGETS.push(["Morning cortisol", cortMarker.v, "< 16"]);
                }

                const trajectoryPts: [string, number | null][] = verifiedBiologicalAge != null
                  ? [
                      ["Today", verifiedBiologicalAge],
                      ["Day 90", +(verifiedBiologicalAge - 0.8).toFixed(1)],
                      ["6 mo", +(verifiedBiologicalAge - 1.4).toFixed(1)],
                      ["9 mo", +(verifiedBiologicalAge - 1.9).toFixed(1)],
                      ["12 mo", +(verifiedBiologicalAge - 2.3).toFixed(1)],
                    ]
                  : [
                      ["Today", null],
                      ["Day 90", null],
                      ["6 mo", null],
                      ["9 mo", null],
                      ["12 mo", null],
                    ];
                const trajectoryBase = trajectoryPts[0][1];
                const trajectoryDiff = trajectoryBase != null && trajectoryPts[4][1] != null 
                  ? (trajectoryBase - trajectoryPts[4][1]) || 2.3 
                  : 2.3;
                const xyTrajectory = trajectoryPts.map((p, i) => [
                  18 + i * 68.5,
                  p[1] != null && trajectoryBase != null ? 22 + ((trajectoryBase - p[1]) / trajectoryDiff) * 46 : 22,
                ]);

                return (
                  <div className="flex-1 flex flex-col min-h-0 relative">
                    <div className={`rhead ${activeReportChapter === 0 || activeReportChapter === 16 ? "dark" : ""}`} id="rhead">
                      <button
                        type="button"
                        className="icb"
                        onClick={() => setCurrentView("main")}
                        aria-label="Back"
                      >
                        <LivIcon name="back" size={20} />
                      </button>
                      <span className="ttl" id="rttl">
                        {REPORT_CHAPTER_TITLES[activeReportChapter] || "Report"} · {activeReportChapter + 1} of 17
                      </span>
                      <button
                        type="button"
                        className="icb"
                        onClick={() => handlePdfAction(effectiveAssessment, "download")}
                        aria-label="Download PDF"
                        title={effectiveAssessment?.report_pdf_url ? "Download Signed PDF" : "PDF unavailable"}
                      >
                        <LivIcon name="down" size={18} />
                      </button>
                    </div>

                    <div
                      className="scroll rpt"
                      id="rpt"
                      onScroll={(e) => {
                        const target = e.currentTarget;
                        const idx = Math.min(16, Math.max(0, Math.round(target.scrollTop / target.clientHeight)));
                        setActiveReportChapter(idx);
                      }}
                    >
                      {/* Slide 1: Cover */}
                      <section className="ch inv" style={{ alignItems: "center", textAlign: "center" }}>
                        <LivMark size={80} />
                        <div>
                          <span className="k">The Living Lab · by Aaroogya AI</span>
                          <h1 className="h1" style={{ marginTop: "12px" }}>Your Longevity Report</h1>
                        </div>
                        <div>
                          <span className="k">Biological age</span>
                          <div className="big" data-count={verifiedBiologicalAge ?? 0}>
                            {verifiedBiologicalAge != null ? verifiedBiologicalAge : "Not in report"}
                          </div>
                        </div>
                        <div
                          className="facts"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                            width: "100%",
                            textAlign: "left",
                            paddingTop: "14px",
                            borderTop: "1px solid var(--inv-line)",
                          }}
                        >
                          <div>
                            <span className="k">Prepared for</span>
                            <br />
                            {fullName}
                          </div>
                          <div>
                            <span className="k">Assessment date</span>
                            <br />
                            {effectiveAssessment.created_at ? formatReportDate(effectiveAssessment.created_at) : "18 September 2026"}
                          </div>
                          <div>
                            <span className="k">Centre</span>
                            <br />
                            Aaroogya AI Centre for Women's Wellness · Aundh, Pune
                          </div>
                          <div>
                            <span className="k">Member ID</span>
                            <br />
                            {effectiveAssessment.patient_id ? `LL-PNE-0${effectiveAssessment.patient_id}` : "LL-PNE-0247"}
                          </div>
                        </div>
                        <span className="sub" style={{ fontStyle: "italic" }}>
                          Innovating Wellness. Elevating Human Well-being.
                        </span>

                        {effectiveAssessment.report_pdf_url ? (
                          <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap", justifyContent: "center" }}>
                            <button
                              type="button"
                              className="btn"
                              style={{ padding: "8px 16px", fontSize: "14px" }}
                              onClick={() => handlePdfAction(effectiveAssessment, "download")}
                            >
                              <LivIcon name="down" size={16} />
                              Download PDF
                            </button>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          className="expl"
                          onClick={() => {
                            setActiveSheet("liv");
                            askLiv(
                              "Walk me through my clinical report",
                              `Take a breath. This report was recorded on ${effectiveAssessment.created_at ? formatReportDate(effectiveAssessment.created_at) : "recent date"}${effectiveAssessment.score ? ` with an AWIS score of ${effectiveAssessment.score}` : ""}. I can explain the readings and risk evaluation in plain words.`,
                            );
                          }}
                        >
                          <LivIcon name="spark" size={16} />
                          Liv, walk me through this
                        </button>
                      </section>

                      {/* Slide 2: Welcome */}
                      <section className="ch">
                        <span className="k">Welcome</span>
                        <h1 className="h1">{fullName.split(" ")[0]}, this is the beginning of your longevity story.</h1>
                        <p className="lead">
                          In one visit, your kiosk captured 300+ measurements and listened to 100+ data points in your own words. This report turns all of it into one clear picture, and one clear plan.
                        </p>
                        <div className="card" style={{ gap: "8px" }}>
                          <span className="k">How to read this report</span>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <span className="pill o">Optimal</span>
                            <span className="sub">In the longevity-optimal zone. Protect it.</span>
                          </div>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <span className="pill b">Watch</span>
                            <span className="sub">Fine clinically, but drifting. Early, easy wins live here.</span>
                          </div>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <span className="pill p">Priority</span>
                            <span className="sub">Your biggest opportunities, each paired with a plan.</span>
                          </div>
                        </div>
                        <div className="card inv" style={{ gap: "6px" }}>
                          <span className="k">Three promises</span>
                          <p style={{ margin: 0, fontSize: "14px" }}>
                            Nothing alarming without a next step. Estimates, honestly labelled. Your data stays yours: consent-first, stored in India, deletable on request.
                          </p>
                        </div>
                        <span className="sub">
                          Your care team: {prescriberDoctor}, supervising physician · Ritu S., longevity coach · Liv, your AI companion.
                        </span>
                      </section>

                      {/* Slide 3: How we read you */}
                      <section className="ch">
                        <span className="k">How we read you</span>
                        <h1 className="h1">One visit. Your whole body, listened to.</h1>
                        <div className="fig">
                          {renderPostureFigure(false)}
                          <div className="find">
                            <div><i className="o" /><span><b>Brain and nervous system</b><br />EEG in 3 states · reaction · focus</span></div>
                            <div><i className="o" /><span><b>Eyes and ears</b><br />acuity · pressure · retina · audiometry</span></div>
                            <div><i className="o" /><span><b>Heart and arteries</b><br />ApoB · BP · ECG rhythm</span></div>
                            <div><i className="o" /><span><b>Lungs and breath</b><br />spirometry · lung age</span></div>
                            <div><i className="o" /><span><b>Blood and metabolic</b><br />60+ markers · HbA1c · insulin</span></div>
                            <div><i className="o" /><span><b>Body and strength</b><br />grip · VO₂max · posture · composition</span></div>
                          </div>
                        </div>
                        <div className="phases" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                          <span>1 · Listen</span>
                          <span>2 · Measure</span>
                          <span>3 · Analyse</span>
                          <span className="on">4 · Act</span>
                          <span>5 · Re-measure</span>
                        </div>
                      </section>

                      {/* Slide 4: Your headline */}
                      <section className="ch">
                        <span className="k">Your headline</span>
                        <h1 className="h1">
                          {verifiedBiologicalAge != null 
                            ? `Your body is ${verifiedBiologicalAge} years old. You get to change that.`
                            : "Your longevity journey begins here."}
                        </h1>
                        <div className="split">
                          <div>
                            <span className="k">Vitality score</span>
                            <div>
                              <span className="num" style={{ fontSize: "40px" }}>
                                {typeof effectiveAssessment.score === "number" && effectiveAssessment.score > 0
                                  ? Math.round(effectiveAssessment.score)
                                  : "—"}
                              </span>{" "}
                              <span className="unit">/ 100</span>
                            </div>
                          </div>
                          <div>
                            <span className="k">Your opportunity</span>
                            <div>
                              <span className="num" style={{ fontSize: "40px" }}>
                                {verifiedBiologicalAgeDiff != null
                                  ? `${verifiedBiologicalAgeDiff > 0 ? "+" : ""}${verifiedBiologicalAgeDiff}`
                                  : "+3.8"}
                              </span>{" "}
                              <span className="unit">years</span>
                            </div>
                          </div>
                        </div>
                        <span className="k">What's adding, and subtracting, years</span>
                        <div>
                          {YEARS_CONTRIBUTORS.map((y, idx) => (
                            <div key={idx} className="yr" style={{ padding: "8px 0" }}>
                              <span className="n" style={{ fontSize: "14px" }}>
                                {y[0]}
                                {y[1] > 0 && (
                                  <i style={{ "--w": `${Math.min(100, Math.round((y[1] / 1.4) * 100))}%`, marginTop: "5px" } as any} />
                                )}
                              </span>
                              <span className="v" style={{ fontSize: "18px" }}>
                                {y[1] > 0 ? "+" : "−"}{Math.abs(y[1]).toFixed(1)} y
                              </span>
                            </div>
                          ))}
                        </div>
                        <span className="sub">
                          <b>The honest summary:</b> nothing here is alarming, and nothing here is fixed. The gap comes from four movable things. A very good position at {verifiedChronologicalAge}.
                        </span>
                      </section>

                      {/* Slide 5: Your plan, distilled */}
                      <section className="ch">
                        <span className="k">Your plan, distilled</span>
                        <h1 className="h1">Three priorities. Ninety days. Everything else follows.</h1>
                        <div>
                          {PRIORITIES.map((p, i) => (
                            <div key={i} className="prio">
                              <span className="num">{i + 1}</span>
                              <div>
                                <div className="h3" style={{ fontSize: "16px" }}>{p.t}</div>
                                <p className="sub" style={{ marginTop: "4px" }}>
                                  <b style={{ color: "var(--text)" }}>The signal</b> · {p.sig}
                                </p>
                                <p className="sub" style={{ marginTop: "4px" }}>
                                  <b style={{ color: "var(--text)" }}>Your move</b> · {p.move}
                                </p>
                                <p className="sub" style={{ marginTop: "4px" }}>
                                  <b style={{ color: "var(--text)" }}>Day-90 target</b> · {p.tar}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Slide 6: The full picture */}
                      <section className="ch">
                        <span className="k">The full picture</span>
                        <h1 className="h1">Eight systems, one glance.</h1>
                        <div className="sysg">
                          {REPORT_SYSCH.map((c, i) => (
                            <button
                              key={c.id}
                              type="button"
                              className={c.id === "body" ? "top" : ""}
                              onClick={() => {
                                const rptEl = document.getElementById("rpt");
                                if (rptEl && rptEl.children[i + 6]) {
                                  (rptEl.children[i + 6] as HTMLElement).scrollIntoView({ behavior: "smooth" });
                                }
                              }}
                              style={{ textAlign: "left", font: "inherit", color: "inherit" }}
                            >
                              <span className="num">{c.score != null ? c.score : "—"}</span>
                              <small>
                                {c.title}
                                {c.id === "body" ? " · your biggest lever" : c.id === "inf" ? " · your quiet superpower" : ""}
                              </small>
                            </button>
                          ))}
                        </div>
                        <div className="split">
                          <div>
                            <span className="k">Protect</span>
                            <p className="sub" style={{ marginTop: "4px" }}>
                              Liver and kidneys, thyroid, bones, low Lp(a), sharp cognition, non-smoker.
                            </p>
                          </div>
                          <div>
                            <span className="k">Build</span>
                            <p className="sub" style={{ marginTop: "4px" }}>
                              Muscle, grip and cardio fitness, early blood-sugar drift, ApoB, vitamin D and iron, a protected 7-hour night.
                            </p>
                          </div>
                        </div>
                      </section>

                      {/* Slides 7–14: The Eight Individual System Slides */}
                      {REPORT_SYSCH.map((sys) => {
                        const ms = displayBiomarkers.filter((m) => m.g === sys.id && !m.eeg);

                        return (
                          <section key={sys.id} className="ch">
                            <div className="hd" style={{ alignItems: "flex-start" }}>
                              <span className="k">System detail · {sys.title}</span>
                              <span className="num" style={{ fontSize: "26px" }}>
                                {sys.score != null ? sys.score : "—"}
                                <small className="unit">/100</small>
                              </span>
                            </div>
                            <h1 className="h1" style={{ fontSize: "26px" }}>{sys.sub}</h1>

                            <div>
                              {ms.map((m) => (
                                <div key={m.id} className="prow">
                                  <span className="n">
                                    {m.n}
                                    <small>{m.nobar ? m.opt : `Optimal ${m.opt} · clinical ${m.clin}`}</small>
                                  </span>
                                  <span className="v">
                                    {m.v} <small>{m.u.split(" · ")[0].split(" ")[0]}</small>
                                  </span>
                                  <span className={`pill ${m.s}`}>
                                    {m.s === "o" ? "Optimal" : m.s === "b" ? "Watch" : "Priority"}
                                  </span>
                                  {!m.nobar && renderRangeBar(m)}
                                </div>
                              ))}
                            </div>

                            {/* System Specific Visualizations */}
                            {sys.id === "heart" && (
                              <div className="card" style={{ marginTop: "10px" }}>
                                <span className="k">Lead-I ECG rhythm strip</span>
                                {renderEcgStrip(false)}
                                <div className="iv">
                                  <div><b>68</b><span>bpm</span></div>
                                  <div><b>152</b><span>PR ms</span></div>
                                  <div><b>88</b><span>QRS ms</span></div>
                                  <div><b>398</b><span>QTc ms</span></div>
                                </div>
                              </div>
                            )}

                            {sys.id === "body" && (
                              <div className="card" style={{ gap: "10px", marginTop: "10px" }}>
                                <span className="k">Body measurements · your tape-measure truth</span>
                                <div className="tape">
                                  {TAPE_MEASUREMENTS.map((t, idx) => (
                                    <div key={idx}>
                                      {t[0]}
                                      <b>{t[1]}</b>
                                      target {t[2]}
                                    </div>
                                  ))}
                                </div>
                                <span className="sub">We hold you to the protective South Asian cut-offs, not the lenient ones.</span>
                              </div>
                            )}

                            {sys.id === "brain" && (
                              <div className="card eeg" style={{ marginTop: "10px" }}>
                                <span className="k">Brainwaves in three states</span>
                                {[
                                  ["Resting, eyes open", "12–15 Hz beta", "Alert, scanning, active focus", 1],
                                  ["Eyes closed alpha", "8–11 Hz alpha", "Calm baseline, prompt alpha rhythm", 2],
                                  ["Cognitive challenge", "18–24 Hz beta", "Sharp engagement, no slowing", 3],
                                ].map((e, idx) => (
                                  <div key={idx}>
                                    <div className="r">
                                      <b>{e[0]}</b>
                                      <span className="unit">{e[1]}</span>
                                    </div>
                                    {renderEegSvg(e[3] as number)}
                                    <span className="sub">{e[2]}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {sys.id === "mind" && (
                              <div className="card" style={{ gap: "6px", marginTop: "10px" }}>
                                <span className="k">What you told Liv, and how it shaped this report</span>
                                <p style={{ margin: 0, font: "400 15px/1.45 var(--serif)" }}>
                                  Afternoon energy dips, a love of dance, a vegetarian kitchen, desks past 7 PM, and your mother's type-2 diabetes. Every detail shaped the iron and vitamin-D checks, the post-dinner walks, the dance-friendly cardio plan, and a metabolic plan that takes family history seriously, early.
                                </p>
                              </div>
                            )}
                          </section>
                        );
                      })}

                      {/* Slide 15: Treatment journey */}
                      <section className="ch">
                        <span className="k">Your treatment journey</span>
                        <h1 className="h1">Measure. Train. Recover. Re-measure, and prove it.</h1>
                        <div>
                          {THERAPIES.map((t, idx) => (
                            <div key={idx} className="prow">
                              <span className="n">
                                {t[0]}
                                <small>{t[1]}</small>
                              </span>
                              <span className="unit" style={{ gridColumn: "2/-1", textAlign: "right" }}>
                                {t[2]}
                              </span>
                            </div>
                          ))}
                        </div>
                        <span className="sub">
                          Every therapy serves one of your three priorities, is physician-prescribed where it matters, and is re-measured at Day 90. ESTABLISHED means decades of evidence; EMERGING means promising science we track honestly.
                        </span>
                      </section>

                      {/* Slide 16: Your next 90 days */}
                      <section className="ch">
                        <span className="k">Your next {effectivePlanLen} days</span>
                        <h1 className="h1">The plan, week by week.</h1>
                        <div>
                          {[
                            [
                              "Weeks 1 to 2 · Begin",
                              "Vitamin D and iron start · first 3 strength sessions · glucose sensor fitted · lights-out 11 PM",
                            ],
                            [
                              "Weeks 3 to 8 · Build",
                              "Strength 3×/week · 10-minute post-meal walks · protein 1.4 g/kg · fortnightly coach check-ins",
                            ],
                            [
                              "Weeks 9 to 12 · Prove it",
                              `Day-90 re-test ${retestDateStr} · re-measure HbA1c, insulin, ApoB, D, ferritin, grip, body composition`,
                            ],
                          ].map((w, idx) => (
                            <div key={idx} className="prow">
                              <span className="n">
                                <b>{w[0]}</b>
                                <small style={{ fontFamily: "inherit", fontSize: "12.5px", whiteSpace: "normal" }}>
                                  {w[1]}
                                </small>
                              </span>
                            </div>
                          ))}
                        </div>

                        <span className="k" style={{ marginTop: "10px" }}>Your targets on one line</span>
                        {REPORT_TARGETS.length > 0 ? (
                          <table className="tt">
                            <tbody>
                              <tr>
                                <td className="k" style={{ border: "none" }}>Measure</td>
                                <td className="k" style={{ border: "none" }}>Today</td>
                                <td className="k" style={{ border: "none" }}>Day 90</td>
                              </tr>
                              {REPORT_TARGETS.map((r, idx) => (
                                <tr key={idx}>
                                  <td>{r[0]}</td>
                                  <td>{r[1]}</td>
                                  <td>{r[2]}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="sub" style={{ marginTop: "8px" }}>
                            Specific targets will be available once your clinical measurements are recorded.
                          </p>
                        )}

                        <span className="k" style={{ marginTop: "10px" }}>Your projected trajectory</span>
                        {trajectoryBase != null ? (
                          <svg
                            viewBox="0 0 310 104"
                            width="100%"
                            fill="none"
                            role="img"
                            aria-label="Projected biological age falling over twelve months"
                          >
                            <polyline
                              points={xyTrajectory.map((p) => `${p[0]},${typeof p[1] === 'number' ? p[1].toFixed(1) : '0'}`).join(" ")}
                              stroke="var(--text)"
                              strokeWidth="1.6"
                            />
                            {xyTrajectory.map((p, i) => (
                              <g key={i}>
                                <circle cx={p[0]} cy={typeof p[1] === 'number' ? p[1].toFixed(1) : '0'} r="3.5" fill="var(--text)" />
                                <text
                                  x={p[0]}
                                  y={typeof p[1] === 'number' ? (p[1] - 9).toFixed(1) : '0'}
                                textAnchor="middle"
                                fill="var(--text)"
                                fontFamily="DM Mono,monospace"
                                fontSize="10"
                              >
                                {(trajectoryPts[i][1] as number).toFixed(1)}
                              </text>
                              <text
                                x={p[0]}
                                y="98"
                                textAnchor="middle"
                                fill="var(--muted)"
                                fontFamily="DM Mono,monospace"
                                fontSize="9"
                              >
                                {trajectoryPts[i][0]}
                              </text>
                            </g>
                          ))}
                        </svg>
                        ) : (
                          <p className="sub" style={{ marginTop: "8px" }}>
                            Trajectory projection will be available once your baseline biological age is measured.
                          </p>
                        )}
                      </section>

                      {/* Slide 17: Fine print and sign-off */}
                      <section className="ch inv">
                        <span className="k">Methods, rights and sign-off</span>
                        <h1 className="h1">The fine print, in plain language.</h1>
                        <p className="sub">
                          <b style={{ color: "var(--inv-fg)" }}>How your numbers were made:</b> biological age from a PhenoAge-class model on nine routine biomarkers, ±2 years. System scores weight each marker against longevity-optimal ranges for your age and sex. NABL labs, validated body composition, 14-day wearable averages.
                        </p>
                        <p className="sub">
                          <b style={{ color: "var(--inv-fg)" }}>Your data, your rules:</b> processed with consent under the DPDP Act 2023, stored encrypted in India, ABDM-ready, never sold. Access, correct, export or erase at any time.
                        </p>
                        <div className="sig" style={{ marginTop: "6px" }}>{prescriberDoctor}</div>
                        <span className="sub">
                          MBBS, MD (Medicine) · reviewed and signed {effectiveAssessment.created_at ? formatReportDate(effectiveAssessment.created_at) : "18 Sep 2026"}
                        </span>
                        <h1 className="h1" style={{ fontSize: "26px", marginTop: "8px" }}>
                          Your next chapter is already booked: {retestDateStr}, 9:00 AM.
                        </h1>
                        <p className="lead" style={{ fontStyle: "italic" }}>
                          We'll measure again, and watch the gap close.
                        </p>

                        {/* Live PDF Open/Download Actions */}
                        {effectiveAssessment.report_pdf_url && (
                          <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn"
                              style={{ background: "var(--inv-fg)", borderColor: "var(--inv-fg)", color: "var(--inv)" }}
                              onClick={() => handlePdfAction(effectiveAssessment, "download")}
                            >
                              <LivIcon name="down" size={18} />
                              Download PDF
                            </button>
                          </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14, width: "100%" }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ background: "var(--inv-fg)", borderColor: "var(--inv-fg)", color: "var(--inv)" }}
                            onClick={() => {
                              setActiveTab("plan");
                              setCurrentView("main");
                            }}
                          >
                            Open my care plan
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ color: "var(--inv-fg)", borderColor: "var(--inv-line)" }}
                            onClick={() => setCurrentView("main")}
                          >
                            Back to dashboard
                          </button>
                        </div>
                      </section>
                    </div>

                    {/* Vertical Dot Indicator for all 17 Slides */}
                    <div className="dotsv" id="rdots">
                      {REPORT_CHAPTER_TITLES.map((title, i) => (
                        <button
                          key={i}
                          type="button"
                          className={activeReportChapter === i ? "on" : ""}
                          onClick={() => {
                            const rptEl = document.getElementById("rpt");
                            if (rptEl && rptEl.children[i]) {
                              (rptEl.children[i] as HTMLElement).scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          aria-label={`Slide ${i + 1}: ${title}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ─── 10. BOOKING SCREEN ─── */}
              {currentView === "book" && (() => {
                const isSvc = bookingForm.type === "svc" && Boolean(bookingForm.svc);
                const svcItem = isSvc && bookingForm.svc ? getTreatmentById(bookingForm.svc) : null;
                const ans = isSvc && bookingForm.svc ? treatmentScreening[bookingForm.svc] || {} : {};
                const flag = svcItem ? Boolean(svcItem.sign || (svcItem.scr && svcItem.scr.some((_, i) => ans[i] === true))) : false;
                const ready = Boolean(bookingForm.type && bookingForm.day != null && bookingForm.slot);

                return (
                  <div className="scroll">
                    <div className="hd">
                      <button
                        type="button"
                        className="icb"
                        onClick={() => setCurrentView("main")}
                        aria-label="Back"
                      >
                        <LivIcon name="back" size={20} />
                      </button>
                      <span className="k">
                        Step {ready ? 3 : 2} of 3
                      </span>
                      <span style={{ width: "44px" }} />
                    </div>

                    <h1 className="h1">{isSvc ? "Pick a time" : "Book a visit"}</h1>

                    {isSvc && svcItem ? (
                      <div className="card inv" style={{ gap: "4px" }}>
                        <span className="k">{bookingForm.pack === 1 ? "Single session" : `Pack of ${bookingForm.pack}`}</span>
                        <span className="h3" style={{ fontSize: "17px" }}>{svcItem.n}</span>
                        <span className="sub">{svcItem.d}</span>
                      </div>
                    ) : (
                      Object.entries(VISIT_TYPES_MAP).map(([key, [title, subtitle]]) => (
                        <button
                          key={key}
                          type="button"
                          className={`opt ${bookingForm.type === key ? "on" : ""}`}
                          onClick={() => setBookingForm((prev) => ({ ...prev, type: key }))}
                          aria-pressed={bookingForm.type === key}
                        >
                          <div>
                            <div className="h3">{title}</div>
                            <div className="sub">{subtitle}</div>
                          </div>
                          <span className={`box ${bookingForm.type === key ? "on" : ""}`} style={{ borderRadius: "11px" }}>
                            <LivIcon name="check" size={14} strokeWidth={2.4} />
                          </span>
                        </button>
                      ))
                    )}

                    {bookingForm.type && (
                      <>
                        <span className="k" style={{ marginTop: "6px" }}>Pick a day</span>
                        <div className="chips">
                          {bookingDays.map((d, i) => (
                            <button
                              key={i}
                              type="button"
                              className={`chip ${bookingForm.day === i ? "on" : ""}`}
                              onClick={() => setBookingForm((prev) => ({ ...prev, day: i }))}
                              aria-pressed={bookingForm.day === i}
                            >
                              {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {bookingForm.type && bookingForm.day != null && (
                      <>
                        <span className="k" style={{ marginTop: "6px" }}>Pick a time</span>
                        <div className="slots">
                          {availableSlots.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={`chip ${bookingForm.slot === s ? "on" : ""}`}
                              onClick={() => setBookingForm((prev) => ({ ...prev, slot: s }))}
                              aria-pressed={bookingForm.slot === s}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {flag && (
                      <p className="sub" style={{ fontSize: "12.5px" }}>
                        This booking is held until Dr. Deshmukh signs it off. You will be told in the app.
                      </p>
                    )}

                    <div style={{ flex: 1 }} />
                    <button
                      type="button"
                      className="btn"
                      disabled={!ready || isBooking}
                      onClick={async () => {
                        if (!ready || isBooking) return;
                        setIsBooking(true);
                        try {
                          const selectedDay = bookingDays[bookingForm.day!];
                          const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`;
                          const slotStr = bookingForm.slot!;

                          if (session) {
                            if (bookingForm.replace) {
                              // Verified backend Rescheduling via PATCH /api/v2/appointments/:id
                              await updateAppointment(String(bookingForm.replace), {
                                appointment_date: dateStr,
                                appointment_time: slotStr,
                              });
                              showToast("Visit rescheduled successfully");
                            } else if (isSvc && svcItem) {
                              const packCount = bookingForm.pack || 1;
                              await bookAppointment({
                                userId: session.uid,
                                patientId: activePatient?.patient_id ? String(activePatient.patient_id) : session.uid,
                                appointmentDate: dateStr,
                                appointmentTime: slotStr,
                                appointmentType: svcItem.n,
                                bookingType: "general",
                                mode: "In person",
                                centre: "Aaha Health Centre, Aundh, Pune",
                                notes: `svc:${svcItem.id}`,
                              });
                              if (packCount > 1) {
                                setTreatmentPacks((prev) => {
                                  const cur = prev[svcItem.id] || { total: 0, left: 0 };
                                  return {
                                    ...prev,
                                    [svcItem.id]: { total: cur.total + packCount, left: cur.left + packCount },
                                  };
                                });
                              }
                              showToast("Appointment booked successfully!");
                            } else {
                              const vType = bookingForm.type!;
                              const isKiosk = vType === "pod";
                              const isDoc = vType === "doc";
                              const isCoach = vType === "coach";
                              const typeInfo = VISIT_TYPES_MAP[vType] || ["Consultation", "20 min"];

                              await bookAppointment({
                                userId: session.uid,
                                patientId: activePatient?.patient_id ? String(activePatient.patient_id) : session.uid,
                                appointmentDate: dateStr,
                                appointmentTime: slotStr,
                                appointmentType: typeInfo[0],
                                bookingType: isKiosk ? "kiosk" : isDoc || isCoach ? "doctor" : "general",
                                mode: isKiosk ? "In person" : "In person",
                                centre: "Aaha Health Centre, Aundh, Pune",
                                doctorId: isDoc ? "Dr. A. Deshmukh" : isCoach ? "Ritu S." : undefined,
                                doctorName: isDoc ? "Dr. A. Deshmukh" : isCoach ? "Ritu S." : undefined,
                                kioskId: isKiosk ? "Aaha Kiosk" : undefined,
                                notes: `${typeInfo[0]} (${typeInfo[1]})`,
                              });
                              showToast("Appointment booked successfully!");
                            }

                            await qc.invalidateQueries({ queryKey: ["appointments", session.uid] });
                            await qc.invalidateQueries({ queryKey: ["appointment-slots"] });
                            await appointmentsQuery.refetch();

                            setLatestBookedAppt({
                              id: String(Date.now()),
                              t: isSvc && svcItem ? svcItem.n : VISIT_TYPES_MAP[bookingForm.type || "doc"]?.[0] || "Visit",
                              w: isSvc && svcItem ? (bookingForm.pack && bookingForm.pack > 1 ? `Pack of ${bookingForm.pack} · session 1` : "Single session") : VISIT_TYPES_MAP[bookingForm.type || "doc"]?.[1] || "",
                              d: selectedDay,
                              h: slotStr,
                              status: flag ? "pending" : "ok",
                            });
                            setCurrentView("booked");
                          } else {
                            if (isSvc && svcItem) {
                              const packCount = bookingForm.pack || 1;
                              if (packCount > 1) {
                                setTreatmentPacks((prev) => {
                                  const cur = prev[svcItem.id] || { total: 0, left: 0 };
                                  return {
                                    ...prev,
                                    [svcItem.id]: { total: cur.total + packCount, left: cur.left + packCount },
                                  };
                                });
                              }
                              const newAppt: AppointmentItem = {
                                id: Date.now(),
                                t: svcItem.n,
                                w: (packCount > 1 ? `Pack of ${packCount} · session 1` : "Single session") + " · " + (svcItem.d.split(" · ")[1] || "45 min"),
                                d: bookingDays[bookingForm.day!],
                                h: bookingForm.slot!,
                                svc: svcItem.id,
                                status: flag ? "pending" : "ok",
                              };
                              setAppointments((prev) => [newAppt, ...prev]);
                              setLatestBookedAppt(newAppt);
                              setCurrentView("booked");
                              if (flag) {
                                setTimeout(() => {
                                  setAppointments((prev) =>
                                    prev.map((a) => (a.id === newAppt.id ? { ...a, status: "ok" } : a))
                                  );
                                  showToast(
                                    `Dr. Deshmukh approved your ${newAppt.t}. See you on ${newAppt.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}.`
                                  );
                                }, 6000);
                              }
                            } else {
                              const newAppt: AppointmentItem = {
                                id: Date.now(),
                                t: VISIT_TYPES_MAP[bookingForm.type!][0],
                                w: VISIT_TYPES_MAP[bookingForm.type!][1],
                                d: bookingDays[bookingForm.day!],
                                h: bookingForm.slot!,
                              };
                              setAppointments((prev) => [newAppt, ...prev]);
                              setLatestBookedAppt(newAppt);
                              setCurrentView("booked");
                            }
                          }
                        } catch (err: any) {
                          console.error("Booking error:", err);
                          if (err?.status === 409 || err?.message?.toLowerCase().includes("already booked")) {
                            showToast("This slot was just booked by another patient. Please choose another time.");
                            await qc.invalidateQueries({ queryKey: ["appointment-slots"] });
                          } else {
                            showToast(err?.message || "Failed to book appointment. Please try again.");
                          }
                        } finally {
                          setIsBooking(false);
                        }
                      }}
                    >
                      {isBooking
                        ? "Booking visit..."
                        : ready
                        ? `${bookingForm.replace ? "Confirm reschedule · " : flag ? "Send for sign-off · " : "Confirm · "}${bookingDays[bookingForm.day!].toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${bookingForm.slot}`
                        : !bookingForm.type
                        ? "Choose a visit type"
                        : "Pick a day and time"}
                    </button>
                  </div>
                );
              })()}

              {/* ─── 11. BOOKED CONFIRMATION SCREEN ─── */}
              {currentView === "booked" && (() => {
                const latest = latestBookedAppt || (displayedAppointments.length > 0 ? displayedAppointments[0] : appointments[0]);
                const isPending = latest?.status === "pending";

                if (isPending) {
                  return (
                    <div className="center">
                      <div className="done-mark" style={{ background: "none", border: "1.5px solid var(--liv-text, #F5F5F1)", color: "var(--liv-text, #F5F5F1)" }}>
                        <span className="spin" style={{ width: "28px", height: "28px" }} />
                      </div>
                      <div>
                        <h1 className="h1">Sent for sign-off</h1>
                        <p className="sub" style={{ marginTop: "10px" }}>
                          {latest.t}
                          <br />
                          {latest.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at {latest.h}
                        </p>
                      </div>
                      <p className="sub">
                        Dr. Deshmukh reviews it against your labs. Usually within a day. The demo answers in a few seconds.
                      </p>
                      <button
                        type="button"
                        className="btn"
                        style={{ marginTop: "8px" }}
                        onClick={() => {
                          setActiveTab("care");
                          setCurrentView("main");
                        }}
                      >
                        See my visits
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          setActiveTab("home");
                          setCurrentView("main");
                        }}
                      >
                        Back to Home
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="center">
                    <div className="done-mark">
                      <LivIcon name="check" size={40} strokeWidth={2} />
                    </div>
                    <div>
                      <h1 className="h1">Visit booked</h1>
                      <p className="sub" style={{ marginTop: "10px" }}>
                        {latest?.t}
                        <br />
                        {latest?.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at {latest?.h}
                        <br />
                        {latest?.w}
                      </p>
                    </div>
                    <p className="sub">Liv will remind you the day before.</p>
                    <button
                      type="button"
                      className="btn"
                      style={{ marginTop: "8px" }}
                      onClick={() => {
                        setActiveTab("care");
                        setCurrentView("main");
                      }}
                    >
                      See my visits
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setActiveTab("home");
                        setCurrentView("main");
                      }}
                    >
                      Back to Home
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* ─── SHEETS & DIALOG OVERLAYS ─── */}
            {activeSheet && (
              <div className="scrim" onClick={() => setActiveSheet(null)}>
                <div
                  className="sheet"
                  role="dialog"
                  aria-modal="true"
                  style={activeSheet === "liv" ? { height: "88%" } : undefined}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="grab" />

                  {/* SHEET: ASK LIV CHAT */}
                  {activeSheet === "liv" && (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="hd" style={{ padding: "14px 20px 0" }}>
                        <div>
                          <span className="k">Your AI companion</span>
                          <h2 className="h2" style={{ marginTop: "4px" }}>Liv</h2>
                        </div>
                        <button
                          type="button"
                          className="icb"
                          onClick={() => setActiveSheet(null)}
                          aria-label="Close"
                        >
                          <LivIcon name="x" size={18} />
                        </button>
                      </div>

                      <div className="scroll flex-1 min-h-[260px]" ref={chatScrollRef} style={{ gap: "10px" }}>
                        <div className="bub liv">
                          Hi {firstName}. Ask me about your results, your plan or your next visit.
                        </div>
                        {chatDisplayItems.map((msg, i) => (
                          <div key={i} className={`bub ${msg.me ? "me" : "liv"}`}>
                            {msg.wait ? (
                              <span className="typing">
                                <i /><i /><i />
                              </span>
                            ) : (
                              msg.t
                            )}
                          </div>
                        ))}

                        {chatDisplayItems.length === 0 && (
                          <div className="sugs" style={{ marginTop: "6px" }}>
                            {LIV_PRESET_QUESTIONS.map(([q], idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="chip"
                                onClick={() => askLiv(q)}
                                disabled={chatBusy}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "8px", padding: "10px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--line)" }}>
                        <input
                          className="inp"
                          placeholder="Ask about your health"
                          aria-label="Message Liv"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              sendCustomChat();
                            }
                          }}
                          disabled={chatBusy}
                        />
                        <button
                          type="button"
                          className="icb"
                          onClick={sendCustomChat}
                          aria-label="Send"
                          disabled={chatBusy || !chatInput.trim()}
                          style={{ width: "52px", height: "52px", borderRadius: "26px", opacity: chatBusy || !chatInput.trim() ? 0.6 : 1 }}
                        >
                          <LivIcon name="send" size={20} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SHEET: BIOLOGICAL AGE EXPLANATION & TRAJECTORY SVG */}
                  {activeSheet === "age" && (
                    <div className="scroll">
                      <div>
                        <span className="k">Biological age · calendar age {verifiedChronologicalAge}</span>
                        <h2 className="h2" style={{ marginTop: "8px" }}>
                          {verifiedBiologicalAge != null
                            ? `Your body is ${verifiedBiologicalAge} years old. You get to ${verifiedBiologicalAgeDiff && verifiedBiologicalAgeDiff < 0 ? "protect" : "change"} that.`
                            : (session && latestAssessment ? "Kiosk assessment recorded. Biological age requires comprehensive biomarker panel." : "Your body is 45.8 years old. You get to change that.")}
                        </h2>
                        <p className="sub" style={{ marginTop: "6px" }}>
                          {verifiedBiologicalAge != null && verifiedBiologicalAgeDiff != null
                            ? `${Math.abs(verifiedBiologicalAgeDiff)} years ${verifiedBiologicalAgeDiff < 0 ? "younger" : "older"} than calendar age (${verifiedChronologicalAge}). Calculated from nine blood biomarkers (PhenoAge model, Levine et al., 2018).`
                            : "An estimate from nine blood biomarkers, with a margin of about two years."}
                        </p>
                      </div>

                      {/* Nine PhenoAge Biomarkers Breakdown */}
                      <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                        <span className="k">Nine PhenoAge Biomarkers (Levine et al., 2018)</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                          {phenoAgePanel.map((pm) => (
                            <div
                              key={pm.id}
                              className="card"
                              style={{
                                padding: "10px 14px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: "14px", fontWeight: 600 }}>{pm.name}</div>
                                <div className="sub" style={{ fontSize: "12px", marginTop: "2px" }}>
                                  Ref: {pm.ref} {pm.unit} · Optimal: {pm.optimal} {pm.unit}
                                </div>
                                <div className="sub" style={{ fontSize: "11px", color: "var(--muted)" }}>
                                  Source: {pm.source}
                                </div>
                              </div>
                              <div style={{ textAlign: "right", marginLeft: "12px" }}>
                                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
                                  {pm.value} <span style={{ fontSize: "12px", fontWeight: 400 }}>{pm.unit}</span>
                                </div>
                                <span
                                  className={`pill ${pm.status === "Optimal" ? "o" : pm.status === "Borderline" ? "b" : pm.status === "Pending" ? "p" : "o"}`}
                                  style={{ marginTop: "4px", display: "inline-block" }}
                                >
                                  {pm.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <span className="k">What adds and subtracts years</span>
                      <div className="bars">
                        {YEARS_CONTRIBUTORS.map(([yName, yVal], i) => (
                          <div key={yName} className="bar">
                            <span>{yName}</span>
                            <span>
                              <i
                                className={yVal < 0 ? "neg" : ""}
                                style={{
                                  width: `${Math.max(6, (Math.abs(yVal) / 1.4) * 100)}%`,
                                  animationDelay: `${i * 50}ms`,
                                }}
                              />
                            </span>
                            <span>{yVal > 0 ? `+${yVal.toFixed(1)} y` : `${yVal.toFixed(1)} y`}</span>
                          </div>
                        ))}
                      </div>

                      <span className="k" style={{ marginTop: "6px" }}>Projected with your plan</span>
                      <svg
                        viewBox="0 0 310 104"
                        width="100%"
                        fill="none"
                        role="img"
                        aria-label="Projected biological age falling from 45.8 today to 43.5 in twelve months"
                      >
                        <polyline
                          points="18,22.0 86.5,38.0 155.0,50.0 223.5,60.0 292,68.0"
                          stroke="var(--text)"
                          strokeWidth="1.6"
                        />
                        {[
                          [18, 22.0, "Today", "45.8"],
                          [86.5, 38.0, "Day 90", "45.0"],
                          [155.0, 50.0, "6 mo", "44.4"],
                          [223.5, 60.0, "9 mo", "43.9"],
                          [292, 68.0, "12 mo", "43.5"],
                        ].map(([cx, cy, label, val], i) => (
                          <g key={i}>
                            <circle cx={cx as number} cy={cy as number} r="3.5" fill="var(--text)" />
                            <text
                              x={cx as number}
                              y={(cy as number) - 9}
                              textAnchor="middle"
                              fill="var(--text)"
                              fontFamily="DM Mono,monospace"
                              fontSize="10"
                            >
                              {val as string}
                            </text>
                            <text
                              x={cx as number}
                              y="98"
                              textAnchor="middle"
                              fill="var(--muted)"
                              fontFamily="DM Mono,monospace"
                              fontSize="9"
                            >
                              {label as string}
                            </text>
                          </g>
                        ))}
                      </svg>
                      <p className="sub" style={{ fontSize: "12px" }}>
                        Projection based on members with a similar starting profile who completed two programme cycles.
                      </p>
                    </div>
                  )}

                  {/* SHEET: AIWS SCORE EXPLANATION */}
                  {activeSheet === "score" && (
                    <div className="scroll">
                      <div>
                        <span className="k">AIWS score · 69 of 100</span>
                        <h2 className="h2" style={{ marginTop: "8px" }}>Eight systems, one number</h2>
                        <p className="sub" style={{ marginTop: "6px" }}>
                          Each system is scored against longevity-optimal ranges for women aged 40 to 44. 100 means every marker is optimal.
                        </p>
                      </div>

                      <div className="bars">
                        {SYSTEM_SCORES.map(([sName, sScore], i) => (
                          <div key={sName} className="bar">
                            <span>{sName}</span>
                            <span>
                              <i style={{ width: `${sScore}%`, animationDelay: `${i * 50}ms` }} />
                            </span>
                            <span>{sScore}</span>
                          </div>
                        ))}
                      </div>

                      <p className="sub">
                        Members on the programme typically gain 6 to 10 points in the first 90 days.
                      </p>

                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setActiveSheet(null);
                          setCurrentView("report");
                        }}
                      >
                        View my longevity report
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          setActiveSheet(null);
                          setActiveTab("plan");
                        }}
                      >
                        See my 90-day plan
                      </button>
                    </div>
                  )}

                  {/* SHEET: UPLOAD BLOOD REPORT */}
                  {activeSheet === "upload" && (
                    <div className="scroll">
                      <div>
                        <h2 className="h2">Add a report</h2>
                        <p className="sub" style={{ marginTop: "6px" }}>
                          Synchronize your kiosk screening or add external laboratory results.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="opt"
                        onClick={() => {
                          setActiveSheet(null);
                          void handleFetchKioskReports();
                        }}
                      >
                        <LivIcon name="down" size={22} />
                        <div>
                          <div className="h3">Fetch from the Living Lab kiosk</div>
                          <div className="sub">Check backend for new screening reports</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="opt"
                        disabled={uploadingFile}
                        onClick={() => {
                          setActiveSheet(null);
                          fileInputRef.current?.click();
                        }}
                      >
                        <LivIcon name="cam" size={22} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="h3">Upload blood report</div>
                          <div className="sub">Complete laboratory report · PDF, JPG, PNG up to 10 MB</div>
                        </div>
                        <LivIcon name="chev" size={16} />
                      </button>

                      <Link
                        to="/assessment"
                        className="opt"
                        onClick={() => setActiveSheet(null)}
                      >
                        <LivIcon name="spark" size={22} />
                        <div>
                          <div className="h3">Guided Health Check-up</div>
                          <div className="sub">Complete 5-minute online evaluation</div>
                        </div>
                        <LivIcon name="chev" size={16} />
                      </Link>

                      {uploadedReports.length > 0 && (
                        <button
                          type="button"
                          className="opt"
                          onClick={() => setActiveSheet("report")}
                        >
                          <LivIcon name="file" size={22} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="h3">View uploaded reports ({uploadedReports.length})</div>
                            <div className="sub">See past uploads, validation notes and extracted biomarkers</div>
                          </div>
                          <LivIcon name="chev" size={16} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* SHEET: REPORT DETAILS & HISTORY */}
                  {activeSheet === "report" && (
                    <div className="scroll">
                      <div>
                        <span className="k">YOUR RECORD</span>
                        <h2 className="h2" style={{ marginTop: "8px" }}>
                          Every report, dated.
                        </h2>
                        <p className="sub" style={{ marginTop: "6px" }}>
                          One Longevity Report for every pod session signed by your physician before it reaches you. View it here, keep the PDF.
                        </p>
                      </div>

                      {/* LATEST Report Card - like screenshot */}
                      {assessments.length > 0 && (
                        <div style={{ marginTop: "16px" }}>
                          <div style={{ fontSize: "12px", textTransform: "uppercase", opacity: 0.7, marginBottom: "10px", letterSpacing: "0.5px" }}>
                            LATEST
                          </div>
                        </div>
                      )}

                      {/* 1. Longevity Reports */}
                      {assessments.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                          {assessments.map((a) => {
                            const isSelected = activeAssessment?.id === a.id;
                            const sLabel = getAssessmentSourceLabel(a);
                            const dateStr = a.created_at ? formatReportDate(a.created_at) : "Recent";
                            const hasScore = typeof a.score === "number" && a.score > 0;
                            const score = hasScore ? Math.round(a.score) : null;
                            const biologicalAge = a.biological_age || score;
                            
                            // Calculate day number from plan start
                            const planStart = new Date(2026, 8, 18); // Sept 18, 2026
                            const reportDate = a.created_at ? new Date(a.created_at) : new Date();
                            const dayNumber = Math.max(1, Math.floor((reportDate.getTime() - planStart.getTime()) / 864e5) + 1);
                            
                            return (
                              <div
                                key={a.id}
                                className={`card ${isSelected ? "inv" : ""}`}
                                style={{ cursor: "pointer", padding: "16px 18px" }}
                                onClick={() => {
                                  setSelectedAssessmentId(a.id);
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "4px" }}>
                                      {dateStr.toUpperCase()} · DAY {dayNumber}
                                    </div>
                                    <b style={{ fontSize: "16px", display: "block", marginBottom: "2px" }}>{sLabel}</b>
                                    {biologicalAge && (
                                      <div style={{ fontSize: "13px", opacity: 0.8, marginTop: "6px" }}>
                                        <span style={{ fontSize: "32px", fontWeight: 700, lineHeight: 1 }}>{biologicalAge}</span>
                                        <span className="unit" style={{ fontSize: "13px", marginLeft: "4px" }}>years</span>
                                      </div>
                                    )}
                                    <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "6px" }}>
                                      Signed · Dr. A. Deshmukh
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    {hasScore && (
                                      <div>
                                        <span style={{ fontSize: "20px", fontWeight: 700 }}>{score}</span>
                                        <span className="unit" style={{ marginLeft: "2px", fontSize: "11px" }}>AWIS</span>
                                      </div>
                                    )}
                                    {a.band && (
                                      <div style={{ fontSize: "11px", fontWeight: 600, marginTop: "4px", color: isSelected ? "var(--inv-fg)" : "#10B981" }}>
                                        {bandLabel(a)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
                                  <button
                                    type="button"
                                    className="btn"
                                    style={{ fontSize: "13px", padding: "8px 16px", flex: 1 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAssessmentId(a.id);
                                      setActiveSheet(null);
                                      setCurrentView("report");
                                    }}
                                  >
                                    View
                                  </button>
                                  {a.report_pdf_url ? (
                                    <button
                                      type="button"
                                      className="btn sec"
                                      style={{ fontSize: "13px", padding: "8px 16px", flex: 1 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePdfAction(a, "download");
                                      }}
                                    >
                                      Download
                                    </button>
                                  ) : (
                                    <span className="sub" style={{ fontSize: "11px", fontStyle: "italic", flex: 1, textAlign: "center" }}>
                                      PDF unavailable
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Patient Uploaded Medical Documents */}
                      {uploadedReports.length > 0 && (
                        <div style={{ marginTop: assessments.length > 0 ? "16px" : "12px" }}>
                          <span className="k" style={{ display: "block", marginBottom: "8px" }}>
                            Uploaded Documents ({uploadedReports.length})
                          </span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {uploadedReports.map((u) => {
                              const dateStr = u.created_at ? formatReportDate(u.created_at) : "Recent";
                              const hasExtracted = Array.isArray(u.extracted_values) && u.extracted_values.length > 0;
                              return (
                                <div
                                  key={u.id}
                                  className="card"
                                  style={{ padding: "14px 16px" }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                      <b style={{ fontSize: "15px" }}>{u.title}</b>
                                      <div className="sub" style={{ fontSize: "12px", marginTop: "2px" }}>
                                        {dateStr} · {u.category || "Blood Report"}
                                      </div>
                                      {Boolean((u.metadata as any)?.validation_note) && (
                                        <p
                                          className="sub"
                                          style={{
                                            fontSize: "12px",
                                            marginTop: "4px",
                                            color: (u.metadata as any)?.status === "invalid" ? "var(--liv-alert, #ef4444)" : "var(--liv-text)",
                                          }}
                                        >
                                          {(u.metadata as any).validation_note}
                                        </p>
                                      )}
                                      {hasExtracted && (
                                        <p className="sub" style={{ fontSize: "12px", marginTop: "4px", color: "var(--liv-text)" }}>
                                          {u.extracted_values?.length} biomarker parameter(s) identified
                                        </p>
                                      )}
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <span
                                        className={`pill ${
                                          (u.metadata as any)?.status === "invalid"
                                            ? "p"
                                            : (u.metadata as any)?.status === "review"
                                            ? "b"
                                            : (u.metadata as any)?.status === "valid"
                                            ? "o"
                                            : "b"
                                        }`}
                                        style={{ fontSize: "10px" }}
                                      >
                                        {u.status_label || "Completed"}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", gap: "14px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                    {hasExtracted && (
                                      <button
                                        type="button"
                                        className="link"
                                        style={{ fontSize: "13px", padding: 0 }}
                                        onClick={() => setExpandedReportId(expandedReportId === u.id ? null : u.id)}
                                      >
                                        <b>{expandedReportId === u.id ? "Hide extracted results ↑" : `View ${u.extracted_values?.length} results ↓`}</b>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="link"
                                      style={{ fontSize: "13px", padding: 0 }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          showToast("Opening report file...");
                                          const blob = await getBloodReportFileBlob(u.id);
                                          
                                          // Android-native file handling
                                          if (Capacitor.isNativePlatform()) {
                                            const reader = new FileReader();
                                            const base64Data = await new Promise<string>((resolve, reject) => {
                                              reader.onloadend = () => {
                                                const base64 = (reader.result as string).split(',')[1];
                                                resolve(base64);
                                              };
                                              reader.onerror = reject;
                                              reader.readAsDataURL(blob);
                                            });

                                            const fileName = `Blood_Report_${u.id}_${Date.now()}.pdf`;
                                            const savedFile = await Filesystem.writeFile({
                                              path: fileName,
                                              data: base64Data,
                                              directory: Directory.Cache,
                                            });

                                            await FileOpener.openFile({
                                              path: savedFile.uri,
                                              mimeType: blob.type || 'application/pdf',
                                            });
                                            showToast("Opening file...");
                                          } else {
                                            // Web browser handling
                                            const blobUrl = URL.createObjectURL(blob);
                                            window.open(blobUrl, "_blank", "noopener");
                                          }
                                        } catch (err: any) {
                                          showToast("Could not open file: " + (err.message || "Please try again"));
                                        }
                                      }}
                                    >
                                      <b>View file &rarr;</b>
                                    </button>
                                    <button
                                      type="button"
                                      className="link"
                                      style={{ fontSize: "12px", padding: 0, opacity: 0.65 }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!window.confirm(`Delete "${u.title}"?`)) return;
                                        try {
                                          await deleteBloodReport(u.id);
                                          showToast("Report deleted.");
                                          if (session) {
                                            await qc.invalidateQueries({ queryKey: ["my-uploads", session.uid] });
                                          }
                                        } catch (err: any) {
                                          showToast("Failed to delete report: " + (err.message || "Please try again"));
                                        }
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>

                                  {/* Expandable test readings breakdown */}
                                  {expandedReportId === u.id && hasExtracted && (
                                    <div style={{ marginTop: "12px", borderTop: "1px solid var(--liv-border)", paddingTop: "10px" }}>
                                      {(u.analysis as any)?.summary && (
                                        <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", marginBottom: "10px" }}>
                                          <span className="sub" style={{ fontSize: "12px", lineHeight: "1.4", display: "block" }}>
                                            {(u.analysis as any).summary}
                                          </span>
                                        </div>
                                      )}
                                      <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {(u.extracted_values as any[]).map((val: any, idx: number) => {
                                          const isOutOfRange = val.status === "Low" || val.status === "High";
                                          return (
                                            <div
                                              key={idx}
                                              style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "6px 8px",
                                                background: isOutOfRange ? "rgba(239, 68, 68, 0.08)" : "transparent",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                              }}
                                            >
                                              <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
                                                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                  {val.test_name}
                                                </div>
                                                <div className="sub" style={{ fontSize: "11px" }}>
                                                  Ref: {val.reference_range || "--"}
                                                </div>
                                              </div>
                                              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                <span style={{ fontWeight: 700 }}>
                                                  {val.value} {val.unit}
                                                </span>
                                                <span
                                                  className={`pill ${isOutOfRange ? "p" : "o"}`}
                                                  style={{ fontSize: "10px", marginLeft: "6px", padding: "1px 6px" }}
                                                >
                                                  {val.status}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {totalReportCount === 0 && (
                        <div className="card empty" style={{ marginTop: "12px" }}>
                          <p className="sub">
                            Visit an Aaha Health Kiosk or upload a laboratory report to have your health documents synchronized here.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn"
                        style={{ marginTop: "14px" }}
                        onClick={async () => {
                          showToast("Checking backend for newer reports...");
                          await Promise.all([
                            assessmentsQuery.refetch(),
                            uploadsQuery.refetch(),
                            appointmentsQuery.refetch(),
                            carePlansQuery.refetch(),
                          ]);
                          showToast("Reports refreshed from server.");
                        }}
                      >
                        <LivIcon name="redo" size={18} />
                        Check backend for newer reports
                      </button>

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setActiveSheet(null)}
                      >
                        Close
                      </button>
                    </div>
                  )}

                  {/* SHEET: PROFILE & SETTINGS */}
                  {activeSheet === "profile" && (
                    <div className="scroll">
                      <div className="hd" style={{ justifyContent: "flex-start", gap: "14px" }}>
                        <span className="date" style={{ width: "56px", height: "56px", borderRadius: "28px" }}>
                          <b>{firstName.charAt(0).toUpperCase()}</b>
                        </span>
                        <div>
                          <h2 className="h2">{fullName}</h2>
                          <p className="sub" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {activePatient?.patient_id ? (
                              <span style={{ color: "#10B981", fontWeight: 600 }}>
                                Clinical ID: #{activePatient.patient_id} · Verified
                              </span>
                            ) : isUnlinkedPatient ? (
                              <span style={{ color: "#F59E0B", fontWeight: 600 }}>
                                Mobile Verified · Kiosk Link Pending
                              </span>
                            ) : isProfileError ? (
                              <span style={{ color: "#EF4444" }}>Could not load profile from server</span>
                            ) : profileQuery.isLoading ? (
                              <span>Checking clinical records...</span>
                            ) : (
                              <span>Member · Connected</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Clinical Identity & Demographics Card */}
                      <div className="card" style={{ gap: "10px", padding: "16px 18px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="k" style={{ margin: 0 }}>Clinical Demographics</span>
                          <button
                            type="button"
                            className="link"
                            style={{ fontSize: "12px", padding: "0 4px" }}
                            onClick={() => setIsEditingProfile((prev) => !prev)}
                          >
                            <b>{isEditingProfile ? "Cancel" : isUnlinkedPatient ? "Complete Profile" : "Edit"}</b>
                          </button>
                        </div>

                        {!isEditingProfile ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
                            <div>
                              <small style={{ color: "var(--liv-sub)", fontSize: "11px", textTransform: "uppercase" }}>Mobile Number</small>
                              <p style={{ margin: "2px 0 0", fontWeight: 600, fontSize: "14px" }}>
                                {activePatient?.mobile_number || (session?.phoneNumber ? session.phoneNumber : "+91 " + phoneNumber)}
                              </p>
                            </div>
                            <div>
                              <small style={{ color: "var(--liv-sub)", fontSize: "11px", textTransform: "uppercase" }}>Age / Sex</small>
                              <p style={{ margin: "2px 0 0", fontWeight: 600, fontSize: "14px" }}>
                                {activePatient?.age ? `${activePatient.age} yrs` : age ? `${age} yrs` : "Not specified"} · {sex || "Not specified"}
                              </p>
                            </div>
                            <div>
                              <small style={{ color: "var(--liv-sub)", fontSize: "11px", textTransform: "uppercase" }}>Health Centre</small>
                              <p style={{ margin: "2px 0 0", fontWeight: 500, fontSize: "13px" }}>Aaha Aundh, Pune</p>
                            </div>
                            <div>
                              <small style={{ color: "var(--liv-sub)", fontSize: "11px", textTransform: "uppercase" }}>Link Status</small>
                              <p style={{ margin: "2px 0 0", fontWeight: 500, fontSize: "13px", color: activePatient?.patient_id ? "#10B981" : "#F59E0B" }}>
                                {activePatient?.patient_id ? "Linked Patient" : "Sync Pending"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "6px" }}>
                            <div className="field">
                              <label htmlFor="edit-name">Full name</label>
                              <input
                                id="edit-name"
                                className="inp"
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter full name"
                              />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                              <div className="field">
                                <label htmlFor="edit-age">Age</label>
                                <input
                                  id="edit-age"
                                  className="inp"
                                  type="number"
                                  min={1}
                                  max={120}
                                  value={editAge}
                                  onChange={(e) => setEditAge(e.target.value)}
                                  placeholder="Age"
                                />
                              </div>
                              <div className="field">
                                <label>Sex</label>
                                <div className="seg" role="group">
                                  <span
                                    className="thumb"
                                    style={{
                                      width: "calc((100% - 8px) / 3)",
                                      transform: `translateX(${editGender === "Female" ? "0%" : editGender === "Male" ? "100%" : "200%"})`,
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditGender("Female")}
                                    aria-pressed={editGender === "Female"}
                                  >
                                    Female
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditGender("Male")}
                                    aria-pressed={editGender === "Male"}
                                  >
                                    Male
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditGender("Other")}
                                    aria-pressed={editGender === "Other"}
                                  >
                                    Other
                                  </button>
                                </div>
                              </div>
                            </div>
                            <button type="submit" className="btn" disabled={profileSaving} style={{ marginTop: "4px" }}>
                              {profileSaving ? "Saving..." : activePatient?.patient_id ? "Update Profile" : "Save Profile"}
                            </button>
                          </form>
                        )}
                      </div>

                      <div className="field">
                        <label>Appearance</label>
                        <div className="seg" role="group">
                          <span
                            className="thumb"
                            style={{
                              width: "calc((100% - 8px) / 2)",
                              transform: `translateX(${appTheme === "dark" ? "0%" : "100%"})`,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleThemeChange("dark")}
                            aria-pressed={appTheme === "dark"}
                            disabled={updatePreferencesMutation.isPending}
                          >
                            Black
                          </button>
                          <button
                            type="button"
                            onClick={() => handleThemeChange("light")}
                            aria-pressed={appTheme === "light"}
                            disabled={updatePreferencesMutation.isPending}
                          >
                            White
                          </button>
                        </div>
                      </div>

                      <div className="field">
                        <label>Programme length · set by the doctor (demo)</label>
                        <div className="seg" role="group">
                          <span
                            className="thumb"
                            style={{
                              width: "calc((100% - 8px) / 3)",
                              transform: `translateX(${planLen === 90 ? "0%" : planLen === 160 ? "100%" : "200%"})`,
                            }}
                          />
                          {[
                            [90, "90 days"],
                            [160, "160 days"],
                            [180, "180 days"],
                          ].map(([len, lbl]) => (
                            <button
                              key={len}
                              type="button"
                              onClick={() => {
                                const n = len as number;
                                setPlanLen(n);
                                const planId = activeCarePlan?._id || activeCarePlan?.id;
                                if (session && planId) {
                                  updateCarePlan(String(planId), {
                                    follow_up: { ...(activeCarePlan.follow_up || {}), duration_days: n },
                                  })
                                    .then(() => {
                                      qc.invalidateQueries({ queryKey: ["carePlans", session.uid] });
                                    })
                                    .catch(() => {});
                                }
                                setAppointments((prev) =>
                                  prev.map((a) => (a.fixed ? { ...a, t: `Day-${n} re-measure`, d: n === 90 ? new Date(2026, 11, 19) : new Date(2026, 8, 18 + n) } : a))
                                );
                                showToast(`Programme set to ${n} days by the doctor. Levels and milestones re-flowed.`);
                              }}
                              aria-pressed={effectivePlanLen === len}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>

                      <span className="k">Your consent</span>
                      <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                        {[
                          {
                            id: "capture" as const,
                            title: "Capture at the kiosk",
                            desc: "Measurements and what you tell Liv",
                          },
                          {
                            id: "share" as const,
                            title: "Share with Dr. Deshmukh",
                            desc: "Reports reach a doctor only with this on",
                          },
                          {
                            id: "remind" as const,
                            title: "Reminders",
                            desc: "Appointments, re-tests and aftercare",
                          },
                        ].map((c) => {
                          const isChecked = consentSettings[c.id];
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className="sw"
                              role="switch"
                              aria-checked={isChecked}
                              onClick={() => handleConsentToggle(c.id)}
                              disabled={updatePreferencesMutation.isPending}
                            >
                              <span className="t">
                                {c.title}
                                <small>{c.desc}</small>
                              </span>
                              <span className={`tog ${isChecked ? "on" : ""}`} />
                            </button>
                          );
                        })}
                      </div>

                      <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                        <button
                          type="button"
                          className="habit"
                          onClick={() => setActiveSheet("report")}
                        >
                          <LivIcon name="file" size={20} />
                          <span className="t">
                            Longevity Journey
                            <small>{totalReportCount > 0 ? `${totalReportCount} report(s) on file` : "View clinical and blood reports"}</small>
                          </span>
                          <LivIcon name="chev" size={16} />
                        </button>

                        <button
                          type="button"
                          className="habit"
                          onClick={() => setActiveSheet("report")}
                        >
                          <LivIcon name="share" size={20} />
                          <span className="t">Share my report with a doctor</span>
                          <LivIcon name="chev" size={16} />
                        </button>

                        <button
                          type="button"
                          className="habit"
                          onClick={() =>
                            showToast("Your data is stored in India. Export or deletion is confirmed by SMS.")
                          }
                        >
                          <LivIcon name="shield" size={20} />
                          <span className="t">Export or delete my data</span>
                          <LivIcon name="chev" size={16} />
                        </button>

                        <button
                          type="button"
                          className="habit"
                          onClick={() => {
                            setHasReport(false);
                            if (typeof window !== "undefined") {
                              localStorage.removeItem("liv_has_report");
                            }
                            setActiveSheet(null);
                            setCurrentView("splash");
                          }}
                        >
                          <LivIcon name="redo" size={20} />
                          <span className="t">Restart the demo</span>
                          <LivIcon name="chev" size={16} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={handleSignOut}
                        disabled={busy}
                      >
                        {busy ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  )}

                  {/* SHEET: APPOINTMENT DETAILS */}
                  {activeSheet?.startsWith("appt:") && (() => {
                    const rawApptId = activeSheet.split(":")[1];
                    const appt = displayedAppointments.find((a) => String(a.id) === String(rawApptId)) || displayedAppointments[0] || appointments[0];
                    return (
                      <div className="scroll">
                        <div>
                          <span className="k">in {Math.ceil((appt.d.getTime() - Date.now()) / 864e5)} days</span>
                          <h2 className="h2" style={{ marginTop: "8px" }}>{appt.t}</h2>
                          <p className="sub" style={{ marginTop: "6px" }}>
                            {appt.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at {appt.h}
                            <br />
                            {appt.w}
                          </p>
                        </div>

                        {appt.fixed ? (
                          <p className="sub">
                            Re-measured that day: HbA1c, insulin, ApoB, hs-CRP, vitamin D, ferritin, grip and body composition.
                          </p>
                        ) : null}

                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            const replaceId = appt.raw?._id || appt.raw?.id || appt.id;
                            const vType = appt.raw?.booking_type === "kiosk" ? "pod" : "coach";
                            setActiveSheet(null);
                            setBookingForm({
                              type: vType,
                              day: null,
                              slot: null,
                              replace: replaceId,
                            });
                            setCurrentView("book");
                          }}
                        >
                          Reschedule
                        </button>
                        {!appt.fixed && (
                          <button
                            type="button"
                            className="btn ghost"
                            disabled={isCancelling}
                            onClick={async () => {
                              if (isCancelling) return;
                              setIsCancelling(true);
                              try {
                                if (session && appt.raw?._id) {
                                  await cancelAppointment(String(appt.raw._id));
                                  await qc.invalidateQueries({ queryKey: ["appointments", session.uid] });
                                  await qc.invalidateQueries({ queryKey: ["appointment-slots"] });
                                  await appointmentsQuery.refetch();
                                } else {
                                  setAppointments((prev) => prev.filter((a) => String(a.id) !== String(appt.id)));
                                }
                                setActiveSheet(null);
                                showToast("Appointment cancelled");
                              } catch (err: any) {
                                console.error("Cancellation error:", err);
                                showToast(err?.message || "Could not cancel appointment. Please try again.");
                              } finally {
                                setIsCancelling(false);
                              }
                            }}
                          >
                            {isCancelling ? "Cancelling..." : "Cancel this visit"}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* SHEET: CARE PACKAGE DETAILS */}
                  {activeSheet?.startsWith("pkg:") && (() => {
                    const pkgId = activeSheet.split(":")[1];
                    const pkg = CARE_PACKAGES[pkgId];
                    const trkItem = getTrackById(pkgId);
                    const isReq = !!requestedPackages[pkgId];
                    if (!pkg || !trkItem) return null;
                    return (
                      <div className="scroll">
                        <div>
                          <span className="k">Care package · {pkg.len}</span>
                          <h2 className="h2" style={{ marginTop: "8px" }}>{pkg.n}</h2>
                          <p className="sub" style={{ marginTop: "6px" }}>
                            {pkg.f}. Built from your {trkItem.n.toLowerCase()} journey.
                          </p>
                        </div>

                        <div className="card" style={{ gap: 0, padding: "6px 18px" }}>
                          {pkg.inc.map((item, idx) => (
                            <div key={idx} className="gl">
                              <span className="box on">
                                <LivIcon name="check" size={12} strokeWidth={2.6} />
                              </span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>

                        <p className="sub" style={{ fontSize: "12.5px" }}>
                          Every therapy is physician-screened first, and drips are given only against your labs. The centre shares the price when you request.
                        </p>

                        <button
                          type="button"
                          className="btn"
                          disabled={isReq}
                          onClick={() => {
                            setRequestedPackages((prev) => ({ ...prev, [pkgId]: true }));
                            showToast("Requested. The centre will call you.");
                          }}
                        >
                          {isReq ? "Requested. The centre will call you" : "Request this package"}
                        </button>

                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setActiveSheet(null);
                            setSelectedTrackId(pkgId);
                            setCurrentView("track");
                          }}
                        >
                          See the journey
                        </button>
                      </div>
                    );
                  })()}

                  {/* SHEET: TREATMENT SERVICE DETAILS */}
                  {activeSheet?.startsWith("svc:") && (() => {
                    const svcId = activeSheet.split(":")[1];
                    const x = getTreatmentById(svcId);
                    if (!x) return null;
                    const pk = treatmentPacks[svcId];
                    const selPack = bookingForm.svc === svcId ? bookingForm.pack : (x.packs[0] || 1);
                    const ans = treatmentScreening[svcId] || {};
                    const allAnswered = !x.scr || x.scr.every((_, i) => ans[i] !== undefined);
                    const flag = x.scr && x.scr.some((_, i) => ans[i] === true);
                    const catName = x.cat === "skin" ? "Skin" : x.cat === "hair" ? "Hair" : "IV drips";

                    return (
                      <div className="scroll">
                        <div>
                          <span className="k">{catName}{x.sign ? " · doctor sign-off" : ""}</span>
                          <h2 className="h2" style={{ marginTop: "8px" }}>{x.n}</h2>
                          <p className="sub" style={{ marginTop: "6px" }}>{x.d}</p>
                        </div>
                        <p style={{ margin: 0, font: "400 17px/1.4 var(--serif)" }}>{x.s}</p>
                        {x.rec && (
                          <div className="card inv" style={{ gap: "6px" }}>
                            <span className="k">Why Dr. Deshmukh recommends it</span>
                            <p style={{ margin: 0, fontSize: "14px" }}>{x.rec}</p>
                          </div>
                        )}
                        {pk && (
                          <div className="card" style={{ gap: "8px" }}>
                            <div className="hd">
                              <span className="h3">Your pack</span>
                              <span className="unit">{pk.left} of {pk.total} left</span>
                            </div>
                            <span className="left">
                              {Array.from({ length: pk.total }).map((_, i) => (
                                <i key={i} className={i < pk.left ? "on" : ""} style={{ flex: 1 }} />
                              ))}
                            </span>
                            <p className="sub">A session is deducted when the centre logs it.</p>
                          </div>
                        )}
                        <span className="k">{pk ? "Add more sessions" : "Choose sessions"}</span>
                        <div className="packs">
                          {x.packs.map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`pack ${selPack === n ? "on" : ""}`}
                              onClick={() => setBookingForm((prev) => ({ ...prev, svc: svcId, pack: n }))}
                            >
                              <b>{n}</b>
                              <span>{n === 1 ? "single" : "pack"}</span>
                            </button>
                          ))}
                        </div>
                        <p className="sub" style={{ fontSize: "12.5px" }}>
                          Price set by the centre, shown at checkout. Packs are deducted one session at a time.
                        </p>
                        {x.scr && (
                          <div className="card" style={{ gap: "4px" }}>
                            <span className="k">Before you book</span>
                            <div>
                              {x.scr.map((q, i) => (
                                <div key={i} className="qa">
                                  <span>{q}</span>
                                  <span className="yn">
                                    <button
                                      type="button"
                                      className={ans[i] === true ? "on" : ""}
                                      onClick={() =>
                                        setTreatmentScreening((prev) => ({
                                          ...prev,
                                          [svcId]: { ...(prev[svcId] || {}), [i]: true },
                                        }))
                                      }
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      className={ans[i] === false ? "on" : ""}
                                      onClick={() =>
                                        setTreatmentScreening((prev) => ({
                                          ...prev,
                                          [svcId]: { ...(prev[svcId] || {}), [i]: false },
                                        }))
                                      }
                                    >
                                      No
                                    </button>
                                  </span>
                                </div>
                              ))}
                            </div>
                            {flag && (
                              <p className="sub" style={{ fontSize: "12.5px" }}>
                                A yes here goes to Dr. Deshmukh before the session is confirmed.
                              </p>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn"
                          disabled={!selPack || !allAnswered}
                          onClick={() => {
                            setActiveSheet(null);
                            setBookingForm((prev) => ({
                              ...prev,
                              type: "svc",
                              svc: svcId,
                              pack: selPack || 1,
                              day: null,
                              slot: null,
                            }));
                            setCurrentView("book");
                          }}
                        >
                          {!selPack
                            ? "Choose sessions"
                            : !allAnswered
                            ? "Answer the questions above"
                            : x.sign || flag
                            ? "Pick a time, then send for sign-off"
                            : "Pick a time"}
                        </button>
                      </div>
                    );
                  })()}

                  {/* SHEET: PAST LOGGED SESSION AFTERCARE */}
                  {activeSheet?.startsWith("after:") && (() => {
                    const rawApptId = activeSheet.split(":")[1];
                    const appt = displayedAppointments.find((a) => String(a.id) === String(rawApptId)) || displayedAppointments[0] || appointments[0];
                    const x = appt?.svc ? getTreatmentById(appt.svc) : null;
                    return (
                      <div className="scroll">
                        <div>
                          <span className="k">Session logged · {appt.d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                          <h2 className="h2" style={{ marginTop: "8px" }}>{appt.t}</h2>
                          <p className="sub" style={{ marginTop: "6px" }}>{appt.w}</p>
                        </div>
                        <div className="card" style={{ gap: 0, padding: "4px 18px" }}>
                          {[
                            ["Protocol", "The Edit · step 2 strength"],
                            ["Duration", "42 min"],
                            ["Observations", "Mild redness on the cheeks, settled in 10 min"],
                            ["Pack", "Session 1 of 3 deducted"],
                          ].map(([lbl, val], idx) => (
                            <div key={idx} className="trk" style={{ alignItems: "flex-start" }}>
                              <span className="k" style={{ paddingTop: "3px" }}>{lbl}</span>
                              <span style={{ textAlign: "right", fontSize: "14px" }}>{val}</span>
                            </div>
                          ))}
                        </div>
                        {x?.care && (
                          <div className="card inv" style={{ gap: "6px" }}>
                            <span className="k">Aftercare</span>
                            <p style={{ margin: 0, fontSize: "14px" }}>{x.care}</p>
                          </div>
                        )}
                        {appt.svc && (
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleAction(`sheet:svc:${appt.svc}`)}
                          >
                            Book the next session
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ─── TOAST NOTIFICATION ─── */}
            {toastMessage && (
              <div className="toast" role="status">
                <span>{toastMessage}</span>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Hidden native file input for direct document uploads & camera capture */}
            <input
              type="file"
              id="filein"
              ref={fileInputRef}
              accept="application/pdf,image/jpeg,image/png,.jpg,.jpeg,.png,.pdf"
              hidden
              disabled={uploadingFile}
              onChange={handleDirectFileUpload}
            />
          </div>
        </main>
      </div>
    </LivScope>
  );
}
