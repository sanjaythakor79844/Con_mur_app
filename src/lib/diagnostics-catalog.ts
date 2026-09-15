// Extensible catalogue of kiosk devices, rapid tests and laboratory investigations.
// Add a new entry here and it automatically appears in the UI and the final report.

import type { Reading } from "./ambika-engine";

export type TestCategory = "essential" | "rapid" | "lab";

export type TestDef = {
  id: string;
  name: string;
  category: TestCategory;
  unit: string;
  /** "number" = single value, "bp" = systolic/diastolic, "choice" = pick one, "derived" = calculated */
  kind: "number" | "bp" | "choice" | "derived";
  refText: string;
  choices?: Array<{ value: string; label: string; flag: Reading["flag"] }>;
  ref?: { low?: number; amberLow?: number; high?: number; amberHigh?: number };
  min?: number;
  max?: number;
  hint?: string;
  /** Conditions that make this rapid/lab test relevant. Empty = always suggested. */
  conditions?: string[];
};

export const ESSENTIAL_TESTS: TestDef[] = [
  {
    id: "height",
    name: "Height",
    category: "essential",
    unit: "cm",
    kind: "number",
    refText: "Used for BMI",
    min: 60,
    max: 230,
  },
  {
    id: "weight",
    name: "Weight",
    category: "essential",
    unit: "kg",
    kind: "number",
    refText: "Used for BMI",
    min: 15,
    max: 250,
  },
  {
    id: "bmi",
    name: "BMI",
    category: "essential",
    unit: "kg/m²",
    kind: "derived",
    refText: "18.5 – 24.9 healthy",
    ref: { low: 18.5, amberLow: 16, high: 24.9, amberHigh: 29.9 },
  },
  {
    id: "bp",
    name: "Blood pressure",
    category: "essential",
    unit: "mmHg",
    kind: "bp",
    refText: "Below 120/80 ideal",
    hint: "Systolic / diastolic",
  },
  {
    id: "spo2",
    name: "Pulse oximeter (SpO₂)",
    category: "essential",
    unit: "%",
    kind: "number",
    refText: "95 – 100 %",
    ref: { low: 95, amberLow: 92 },
    min: 50,
    max: 100,
  },
  {
    id: "ecg",
    name: "ECG",
    category: "essential",
    unit: "",
    kind: "choice",
    refText: "Normal sinus rhythm",
    choices: [
      { value: "Normal sinus rhythm", label: "Normal", flag: "green" },
      { value: "Minor variation noted", label: "Minor variation", flag: "amber" },
      { value: "Abnormal — needs review", label: "Abnormal", flag: "red" },
    ],
  },
];

export const RAPID_TESTS: TestDef[] = [
  {
    id: "glucose",
    name: "Blood glucose (fasting)",
    category: "rapid",
    unit: "mg/dL",
    kind: "number",
    refText: "70 – 99 mg/dL",
    ref: { low: 70, amberLow: 55, high: 99, amberHigh: 125 },
    min: 20,
    max: 700,
    conditions: ["metabolic", "pcos", "hypertension"],
  },
  {
    id: "hba1c",
    name: "HbA1c",
    category: "rapid",
    unit: "%",
    kind: "number",
    refText: "Below 5.7 %",
    ref: { high: 5.7, amberHigh: 6.4 },
    min: 3,
    max: 20,
    conditions: ["metabolic", "pcos"],
  },
  {
    id: "haemoglobin",
    name: "Haemoglobin",
    category: "rapid",
    unit: "g/dL",
    kind: "number",
    refText: "12 – 15 g/dL (women)",
    ref: { low: 12, amberLow: 11, high: 16.5 },
    min: 2,
    max: 25,
    conditions: ["anaemia", "amenorrhea", "endometriosis"],
  },
  {
    id: "lipid",
    name: "Lipid profile (total cholesterol)",
    category: "rapid",
    unit: "mg/dL",
    kind: "number",
    refText: "Below 200 mg/dL",
    ref: { high: 200, amberHigh: 239 },
    min: 50,
    max: 600,
    conditions: ["metabolic", "hypertension", "pcos", "thyroid"],
  },
];

export const LAB_TESTS: TestDef[] = [
  { id: "tsh", name: "TSH", category: "lab", unit: "mIU/L", kind: "number", refText: "0.4 – 4.0 mIU/L", ref: { low: 0.4, amberLow: 0.1, high: 4.0, amberHigh: 6.0 }, conditions: ["thyroid", "pcos", "amenorrhea"] },
  { id: "t3", name: "T3", category: "lab", unit: "ng/dL", kind: "number", refText: "80 – 200 ng/dL", ref: { low: 80, high: 200 }, conditions: ["thyroid"] },
  { id: "t4", name: "T4", category: "lab", unit: "µg/dL", kind: "number", refText: "5 – 12 µg/dL", ref: { low: 5, high: 12 }, conditions: ["thyroid"] },
  { id: "lh_fsh", name: "LH / FSH ratio", category: "lab", unit: "ratio", kind: "number", refText: "Below 2", ref: { high: 2, amberHigh: 3 }, conditions: ["pcos", "amenorrhea"] },
  { id: "testosterone", name: "Testosterone (total)", category: "lab", unit: "ng/dL", kind: "number", refText: "15 – 50 ng/dL (women)", ref: { high: 50, amberHigh: 80 }, conditions: ["pcos"] },
  { id: "dheas", name: "DHEAS", category: "lab", unit: "µg/dL", kind: "number", refText: "35 – 430 µg/dL", ref: { high: 430, amberHigh: 600 }, conditions: ["pcos"] },
  { id: "amh", name: "AMH", category: "lab", unit: "ng/mL", kind: "number", refText: "1 – 4 ng/mL", ref: { low: 1, high: 4, amberHigh: 6.8 }, conditions: ["pcos", "amenorrhea"] },
  { id: "ferritin", name: "Ferritin", category: "lab", unit: "ng/mL", kind: "number", refText: "30 – 200 ng/mL", ref: { low: 30, amberLow: 15, high: 200 }, conditions: ["anaemia", "endometriosis"] },
  { id: "vitamin_d", name: "Vitamin D", category: "lab", unit: "ng/mL", kind: "number", refText: "30 – 100 ng/mL", ref: { low: 30, amberLow: 20 }, conditions: [] },
  { id: "vitamin_b12", name: "Vitamin B12", category: "lab", unit: "pg/mL", kind: "number", refText: "200 – 900 pg/mL", ref: { low: 200, amberLow: 150 }, conditions: ["anaemia"] },
  { id: "cbc", name: "CBC (total WBC)", category: "lab", unit: "cells/µL", kind: "number", refText: "4,000 – 11,000 cells/µL", ref: { low: 4000, high: 11000 }, conditions: ["anaemia"] },
  { id: "lft", name: "LFT (SGPT/ALT)", category: "lab", unit: "U/L", kind: "number", refText: "Below 40 U/L", ref: { high: 40, amberHigh: 60 }, conditions: ["metabolic"] },
  { id: "kft", name: "KFT (creatinine)", category: "lab", unit: "mg/dL", kind: "number", refText: "0.6 – 1.1 mg/dL", ref: { low: 0.6, high: 1.1, amberHigh: 1.4 }, conditions: ["hypertension", "metabolic"] },
  { id: "insulin", name: "Fasting insulin", category: "lab", unit: "µIU/mL", kind: "number", refText: "2 – 20 µIU/mL", ref: { high: 20, amberHigh: 28 }, conditions: ["pcos", "metabolic"] },
  { id: "crp", name: "CRP", category: "lab", unit: "mg/L", kind: "number", refText: "Below 5 mg/L", ref: { high: 5, amberHigh: 10 }, conditions: ["endometriosis"] },
  { id: "esr", name: "ESR", category: "lab", unit: "mm/hr", kind: "number", refText: "Below 20 mm/hr", ref: { high: 20, amberHigh: 40 }, conditions: ["endometriosis", "anaemia"] },
  { id: "prolactin", name: "Prolactin", category: "lab", unit: "ng/mL", kind: "number", refText: "Below 25 ng/mL", ref: { high: 25, amberHigh: 50 }, conditions: ["amenorrhea", "pcos"] },
];

export const ALL_TESTS: TestDef[] = [...ESSENTIAL_TESTS, ...RAPID_TESTS, ...LAB_TESTS];

export const testById = (id: string) => ALL_TESTS.find((t) => t.id === id);

/** Rapid / lab tests worth offering for the detected conditions (always keeps a sensible baseline). */
export function recommendedTests(category: "rapid" | "lab", conditions: string[]): TestDef[] {
  const pool = category === "rapid" ? RAPID_TESTS : LAB_TESTS;
  const matched = pool.filter((t) => !t.conditions?.length || t.conditions.some((c) => conditions.includes(c)));
  return matched.length ? matched : pool.slice(0, 4);
}

export const calcBmi = (heightCm: number, weightKg: number) =>
  Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;

function gradeNumber(def: TestDef, value: number): { flag: Reading["flag"]; label: string } {
  const ref = def.ref;
  if (!ref) return { flag: "green", label: "Recorded" };
  if (ref.low !== undefined && value < ref.low) {
    const amber = ref.amberLow !== undefined && value >= ref.amberLow;
    return { flag: amber ? "amber" : "red", label: amber ? "Slightly low" : "Low" };
  }
  if (ref.high !== undefined && value > ref.high) {
    const amber = ref.amberHigh !== undefined && value <= ref.amberHigh;
    return { flag: amber ? "amber" : "red", label: amber ? "Slightly high" : "High" };
  }
  return { flag: "green", label: "Normal" };
}

function gradeBp(systolic: number, diastolic: number): { flag: Reading["flag"]; label: string } {
  if (systolic >= 140 || diastolic >= 90) return { flag: "red", label: "High blood pressure" };
  if (systolic >= 130 || diastolic >= 85) return { flag: "amber", label: "Slightly high" };
  if (systolic < 90 || diastolic < 60) return { flag: "amber", label: "Low" };
  return { flag: "green", label: "Normal" };
}

/** Turn a manually entered value into a Reading for the consolidated report. */
export function makeReading(def: TestDef, raw: { value?: number; systolic?: number; diastolic?: number; choice?: string }): Reading {
  const base = {
    device_id: def.id,
    name: def.name,
    unit: def.unit,
    source: "manual" as const,
    category: def.category,
    ref_text: def.refText,
    status: "recorded" as const,
  };

  if (def.kind === "bp") {
    const s = raw.systolic ?? 0;
    const d = raw.diastolic ?? 0;
    const g = gradeBp(s, d);
    return { ...base, value: `${s}/${d}`, ...g };
  }
  if (def.kind === "choice") {
    const choice = def.choices?.find((c) => c.value === raw.choice);
    return { ...base, value: raw.choice ?? "", flag: choice?.flag ?? "green", label: choice?.label ?? "Recorded" };
  }
  const value = Number(raw.value);
  return { ...base, value, ...gradeNumber(def, value) };
}

export function pendingReading(def: TestDef): Reading {
  return {
    device_id: def.id,
    name: def.name,
    unit: def.unit,
    value: "Pending",
    label: "Awaiting report",
    flag: "amber",
    source: "pending",
    category: def.category,
    ref_text: def.refText,
    status: "pending",
  };
}

/** Validate a manual entry. Returns an error message, or null when valid. */
export function validateEntry(def: TestDef, raw: { value?: string; systolic?: string; diastolic?: string; choice?: string }): string | null {
  if (def.kind === "choice") return raw.choice ? null : "Please choose a result";
  if (def.kind === "bp") {
    const s = Number(raw.systolic);
    const d = Number(raw.diastolic);
    if (!Number.isFinite(s) || !Number.isFinite(d)) return "Enter both systolic and diastolic";
    if (s < 60 || s > 260) return "Systolic should be between 60 and 260";
    if (d < 30 || d > 180) return "Diastolic should be between 30 and 180";
    if (d >= s) return "Diastolic must be lower than systolic";
    return null;
  }
  const v = Number(raw.value);
  if (!raw.value?.trim() || !Number.isFinite(v)) return "Enter a number";
  if (def.min !== undefined && v < def.min) return `Should be at least ${def.min} ${def.unit}`;
  if (def.max !== undefined && v > def.max) return `Should be under ${def.max} ${def.unit}`;
  return null;
}
