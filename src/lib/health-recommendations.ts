// Symptom-driven test recommendations, lifestyle / nutrition / hormonal guidance
// and the executive summary used by the AWIS health report.
// Pure functions — safe on both the server route and the browser.

import { isRecordedReading, type Reading } from "./ambika-engine";
import { ALL_TESTS, ESSENTIAL_TESTS, LAB_TESTS, RAPID_TESTS, type TestDef } from "./diagnostics-catalog";
import { CONDITION_DISPLAY } from "./ambika-data";

export type TestSuggestion = {
  id: string;
  name: string;
  category: "essential" | "rapid" | "lab";
  reason: string;
  /** true when the value is already recorded in this session */
  recorded: boolean;
};

export type TestPlan = {
  essential: TestSuggestion[];
  recommended: TestSuggestion[];
  optional: TestSuggestion[];
};

export type Guidance = {
  lifestyle: string[];
  nutrition: string[];
  hormonal: string[];
  preventive: string[];
  followUp: string[];
};

export type ExecutiveSummary = {
  headline: string;
  overall: string;
  majorFindings: string[];
  positives: string[];
  concerns: string[];
  symptomAnalysis: string[];
  riskFactors: string[];
};

export type ScoreBreakdown = { label: string; points: number; detail: string }[];

const displayName = (id: string) => CONDITION_DISPLAY[id] ?? id.charAt(0).toUpperCase() + id.slice(1);

/* ── Symptom keywords → why a test matters ───────────────────────────── */

const REASONS: Record<string, string> = {
  thyroid: "your thyroid symptoms",
  pcos: "your cycle and hormonal symptoms",
  anaemia: "your tiredness and low-iron symptoms",
  hypertension: "your blood-pressure symptoms",
  endometriosis: "your pelvic pain pattern",
  metabolic: "your sugar-related symptoms",
  amenorrhea: "your missed periods",
  breast: "the breast changes you described",
  general: "a complete baseline picture",
};

const reasonFor = (def: TestDef, conditions: string[], readings: Record<string, Reading>) => {
  const existing = readings[def.id];
  if (existing && isRecordedReading(existing)) {
    const value = `${existing.value}${existing.unit ? ` ${existing.unit}` : ""}`;
    return existing.flag === "green"
      ? `Already recorded at ${value} — within range, no repeat needed now`
      : `Recorded at ${value} (${existing.label.toLowerCase()}) — repeat after 8 weeks`;
  }
  const match = (def.conditions ?? []).find((c) => conditions.includes(c));
  if (match) return `Suggested because of ${REASONS[match] ?? displayName(match)}`;
  if (def.category === "essential") return "Part of every Aaha screening";
  return "Useful baseline check for overall health";
};

const toSuggestion = (def: TestDef, conditions: string[], readings: Record<string, Reading>): TestSuggestion => ({
  id: def.id,
  name: def.name,
  category: def.category,
  reason: reasonFor(def, conditions, readings),
  recorded: Boolean(readings[def.id] && isRecordedReading(readings[def.id])),
});

/**
 * Splits every test into Essential (always done), Recommended (matches the
 * detected conditions) and Optional / advanced (broader work-up).
 */
export function buildTestPlan(conditions: string[], readings: Record<string, Reading>): TestPlan {
  const matches = (def: TestDef) => (def.conditions ?? []).some((c) => conditions.includes(c));
  const recordedFlag = (id: string) => {
    const r = readings[id];
    return r && isRecordedReading(r) ? r.flag : null;
  };

  const essential = ESSENTIAL_TESTS.filter((t) => t.kind !== "derived").map((t) =>
    toSuggestion(t, conditions, readings),
  );

  const pool = [...RAPID_TESTS, ...LAB_TESTS];
  // A test with a normal recorded value is no longer "recommended" — it moves to
  // optional so the plan never asks for a test that was already done and is fine.
  const recommended = pool
    .filter((t) => (matches(t) || recordedFlag(t.id) !== null) && recordedFlag(t.id) !== "green")
    .map((t) => toSuggestion(t, conditions, readings));
  const optional = pool
    .filter((t) => !recommended.some((s) => s.id === t.id))
    .map((t) => toSuggestion(t, conditions, readings));

  return {
    essential,
    recommended,
    // Keep every already-recorded test visible, then top up to eight.
    optional: [
      ...optional.filter((s) => s.recorded),
      ...optional.filter((s) => !s.recorded),
    ].slice(0, 8),
  };
}


/* ── Lifestyle, nutrition and hormonal guidance ──────────────────────── */

const BASE: Guidance = {
  lifestyle: [
    "Aim for 7–8 hours of sleep with a steady bedtime — hormones settle with routine",
    "Move your body 30 minutes a day: a brisk walk counts",
    "Take three slow-breathing breaks a day to bring stress hormones down",
  ],
  nutrition: [
    "Build every meal around protein, vegetables and a whole grain",
    "Drink 2–3 litres of water through the day",
    "Keep refined sugar and fried food to occasional treats",
  ],
  hormonal: ["Track your cycle in a simple diary so changes are easy to spot"],
  preventive: [
    "Repeat your key blood tests every 6 months",
    "Keep every report in the app so trends stay visible",
  ],
  followUp: ["Bring this report to your next visit at an Aaha Health Centre"],
};

const BY_CONDITION: Record<string, Partial<Guidance>> = {
  thyroid: {
    nutrition: ["Include iodised salt, dairy, eggs and nuts", "Space calcium and iron 4 hours from thyroid medicine"],
    hormonal: ["Recheck TSH with free T3 and T4 after 8 weeks", "Track weight, energy and cold sensitivity weekly"],
    lifestyle: ["Gentle strength work twice a week helps a slow metabolism"],
  },
  pcos: {
    nutrition: [
      "Choose low-glycaemic grains — millets, oats, brown rice",
      "Pair every carbohydrate with protein to steady insulin",
    ],
    hormonal: [
      "Test LH/FSH, testosterone and fasting insulin on day 2–5 of your cycle",
      "A 5–7% weight change often restores regular cycles",
    ],
    lifestyle: ["Combine walking with resistance training 4 days a week"],
  },
  anaemia: {
    nutrition: [
      "Iron-rich foods daily: dates, jaggery, spinach, rajma, liver if you eat it",
      "Add vitamin C (lemon, amla) with iron meals; keep tea and coffee an hour away",
    ],
    hormonal: ["If periods are heavy, note the number of pads a day for your doctor"],
    preventive: ["Recheck haemoglobin and ferritin after 8–12 weeks of treatment"],
  },
  hypertension: {
    nutrition: ["Keep salt under 5 g a day and avoid pickles, papad and packaged snacks"],
    lifestyle: ["Check your blood pressure twice a week at the same time of day"],
    preventive: ["Kidney function and lipid profile once a year"],
  },
  metabolic: {
    nutrition: ["Half the plate vegetables, a quarter protein, a quarter grain", "Stop eating 3 hours before bed"],
    preventive: ["HbA1c every 3 months until it settles"],
    lifestyle: ["A 10-minute walk after each meal lowers post-meal sugar"],
  },
  endometriosis: {
    lifestyle: ["Heat therapy and gentle yoga ease pelvic pain days", "Note pain scores each cycle day"],
    nutrition: ["Anti-inflammatory foods: omega-3, turmeric, plenty of vegetables"],
  },
  amenorrhea: {
    hormonal: ["Prolactin, TSH, LH/FSH and AMH together explain most missed cycles"],
    lifestyle: ["Avoid very low-calorie dieting and over-exercise — both stop periods"],
  },
  breast: {
    preventive: ["Monthly self-examination a week after your period", "Clinical breast examination at your next visit"],
  },
};

const merge = (base: string[], extra?: string[]) => Array.from(new Set([...(extra ?? []), ...base])).slice(0, 6);

export function buildGuidance(conditions: string[], awis: number, readings: Record<string, Reading>): Guidance {
  const out: Guidance = { ...BASE };
  for (const c of conditions) {
    const add = BY_CONDITION[c];
    if (!add) continue;
    out.lifestyle = merge(out.lifestyle, add.lifestyle);
    out.nutrition = merge(out.nutrition, add.nutrition);
    out.hormonal = merge(out.hormonal, add.hormonal);
    out.preventive = merge(out.preventive, add.preventive);
    out.followUp = merge(out.followUp, add.followUp);
  }

  const bmi = readings.bmi;
  if (bmi && isRecordedReading(bmi) && bmi.flag !== "green") {
    out.lifestyle = merge(out.lifestyle, [`Your BMI is ${bmi.value} — a gradual change of 0.5 kg a week is the safest pace`]);
  }

  // Vitamin D advice always follows the recorded value, never a fixed sentence.
  const vitD = readings.vitamin_d;
  if (vitD && isRecordedReading(vitD)) {
    const value = `${vitD.value}${vitD.unit ? ` ${vitD.unit}` : ""}`;
    if (vitD.flag === "green") {
      out.nutrition = merge(out.nutrition, [
        `Your vitamin D is ${value} — keep 15–20 minutes of morning sun and your current diet going`,
      ]);
      out.preventive = merge(out.preventive, ["Recheck vitamin D once a year"]);
    } else {
      out.nutrition = merge(out.nutrition, [
        `Your vitamin D is ${value} (${vitD.label.toLowerCase()}) — add fortified milk, eggs and 15–20 minutes of morning sun daily`,
      ]);
      out.preventive = merge(out.preventive, [
        vitD.flag === "red"
          ? "Ask your doctor about a vitamin D correction course, then recheck after 8–12 weeks"
          : "Recheck vitamin D after 12 weeks of sun and diet changes",
      ]);
    }
  } else if (!readings.vitamin_d || !isRecordedReading(readings.vitamin_d)) {
    out.preventive = merge(out.preventive, [
      "Get vitamin D tested — low levels are common and easy to correct",
    ]);
  }


  if (awis >= 12) {
    out.followUp = merge(out.followUp, ["Book a doctor review within 2–3 days", "Recheck all flagged values after 4 weeks"]);
  } else if (awis >= 6) {
    out.followUp = merge(out.followUp, ["Book a doctor review within 2 weeks", "Recheck flagged values after 8 weeks"]);
  } else {
    out.followUp = merge(out.followUp, ["A routine review in 6 months keeps you on track"]);
  }

  return out;
}

/* ── Score breakdown + executive summary ─────────────────────────────── */

export function buildScoreBreakdown(symptomCount: number, red: number, amber: number): ScoreBreakdown {
  return [
    {
      label: "Reported symptoms",
      points: Math.round(symptomCount * 1.2 * 10) / 10,
      detail: `${symptomCount} symptom${symptomCount === 1 ? "" : "s"} you confirmed`,
    },
    { label: "Values outside range", points: red * 4, detail: `${red} reading${red === 1 ? "" : "s"} clearly out of range` },
    { label: "Borderline values", points: amber * 2, detail: `${amber} reading${amber === 1 ? "" : "s"} slightly off` },
  ];
}

export function buildExecutiveSummary(input: {
  conditions: string[];
  awis: number;
  bandLabel: string;
  bandDescription: string;
  recorded: Reading[];
  pending: Reading[];
  symptoms: string[];
}): ExecutiveSummary {
  const { conditions, awis, bandLabel, bandDescription, recorded, pending, symptoms } = input;
  const abnormal = recorded.filter((r) => r.flag !== "green");
  const normal = recorded.filter((r) => r.flag === "green");
  const primary = displayName(conditions[0] ?? "general");

  const value = (r: Reading) => `${r.value}${r.unit ? ` ${r.unit}` : ""}`;

  return {
    headline: `${bandLabel} · AWIS ${awis}/20`,
    overall: [
      `Taking your symptoms and ${recorded.length} recorded value${recorded.length === 1 ? "" : "s"} together, the picture points most towards ${primary}.`,
      bandDescription,
      pending.length ? `${pending.length} investigation${pending.length === 1 ? " is" : "s are"} still pending, so this report will sharpen once you add them.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    majorFindings: abnormal.length
      ? abnormal.map((r) => `${r.name} is ${r.label.toLowerCase()} at ${value(r)}${r.ref_text ? ` (reference ${r.ref_text})` : ""}`)
      : ["No value you shared falls outside its reference range"],
    positives: [
      ...normal.slice(0, 5).map((r) => `${r.name} is within range at ${value(r)}`),
      ...(symptoms.length <= 2 ? ["Your symptom load is limited, which is reassuring"] : []),
    ],
    concerns: [
      ...abnormal.filter((r) => r.flag === "red").map((r) => `${r.name} needs a doctor's review`),
      ...pending.map((r) => `${r.name} has not been done yet`),
    ],
    symptomAnalysis: symptoms.length
      ? symptoms.slice(0, 8)
      : ["No additional symptoms were confirmed during the conversation"],
    riskFactors: conditions.map((c) => `${displayName(c)} — pattern matched from your answers`),
  };
}
