// Canonical answer model for the guided check-up.
//
// Every question the engine asks is mapped to a *topic*. A topic is the clinical
// thing being asked about ("how long", "period pattern", "tiredness"), not the
// wording of a particular question. Once a topic has been answered we never ask
// another main question about it again, no matter which condition question-set
// it lives in. This is what stops the engine looping over the same tiredness /
// duration / period questions in different words.

export type Polarity = "yes" | "no" | "unknown";

export type DurationUnit = "days" | "weeks" | "months" | "years";

/** "several months" → { value: 4, value_text: "several", unit: "months", days: 120 }. */
export type DurationInfo = {
  value: number;
  value_text: string;
  unit: DurationUnit;
  days: number;
  approximate?: boolean;
};

/** One canonical, structured fact captured from a free-text answer. */
export type Slot = {
  code: string;
  topic: string;
  polarity: Polarity;
  /** 0 = none, 1 = mild, 2 = moderate, 3 = severe. */
  severity: number;
  /** Duration in days, when the answer mentioned one. */
  duration_days?: number;
  /** Duration exactly as the user expressed it, plus its normalised form. */
  duration?: DurationInfo;
  /** Canonical symptom name, e.g. heavy_bleeding. */
  symptom?: string;
  /** Qualifier such as "heavy" / "light" for flow-type answers. */
  qualifier?: string;
  text: string;
  at: string;
};

/* ── Code → topic map ─────────────────────────────────────────────────── */

const TOPIC_CODES: Record<string, string[]> = {
  duration: [
    "how_long_anaemia", "how_long_bp", "how_long_thyroid", "how_long_meta", "how_long_general",
    "how_long_endo", "endo_duration", "symptom_duration", "intake_duration", "fertility_duration",
  ],
  fatigue: ["sw_tired", "sw_tired_type", "fatigue_after_sleep", "fatigue_severity", "intake_tired_detail", "meta_fatigue_weight"],
  severity: ["intake_severity"],
  associated: ["intake_associated", "other_symptoms", "sw_anything_else", "gi_bleeding", "gi_detail"],
  menstrual_pattern: [
    "period_regularity", "period_pattern_detail", "sw_periods", "sw_periods_detail",
    "menstrual_history", "intake_period_detail", "period_change_thyroid", "period_duration_months",
  ],
  menstrual_flow: ["period_flow", "period_flow_endo", "period_heavy_endo", "period_heavy_detail", "heavy_periods_anaemia", "heavy_periods_clots"],
  menstrual_clots: ["period_clots", "blood_clots_endo", "heavy_periods_clots"],
  menstrual_colour: ["period_color", "period_color_detail", "period_color_endo", "endo_blood_color"],
  menstrual_pain: ["period_pain_severity", "pelvic_timing", "amen_cyclical_pain"],
  weight: ["weight_gain", "weight_gain_detail", "weight_change", "weight_gain_thyroid", "weight_loss_thyroid", "intake_weight_detail", "sw_weight_hair", "meta_fatigue_weight", "meta_central_obesity"],
  hair: ["facial_hair", "facial_hair_growth", "body_hair", "scalp_hair", "hair_falling", "intake_hair_detail"],
  pallor: ["pallor", "pallor_detail", "pallor_told", "pallor_eyelids"],
  thirst_urination: ["thirst", "frequent_urination", "thirst_urination", "meta_thirst_urination", "meta_thirst_detail", "sw_thirst_sugar", "nocturia"],
  temperature: ["cold_intolerance", "heat_intolerance", "temperature_sensitivity", "cold_hands_feet", "sw_cold_hot"],
  palpitations: ["palpitations", "palpitations_thyroid", "heart_racing"],
  vision: ["vision_symptoms", "vision_detail", "vision_blur", "blurred_vision"],
  headache: ["headache_pattern", "headache_location", "headache_timing", "morning_bp_headache", "sw_headache_bp"],
  chest: ["chest_symptoms", "chest_pain_bp", "meta_cardiac_sx", "meta_cardiac_urgent"],
  bowel: ["bowel_bladder", "bowel_detail", "bowel_symptoms", "gi_symptoms", "constipation"],
  neuropathy: ["tingling", "tingling_severity", "meta_neuropathy", "meta_neuropathy_feet"],
  neck: ["neck_swelling", "neck_swelling_detail", "sw_thyroid_hint"],
  breast: ["sw_breast", "nipple_changes", "discharge_type", "discharge_detail", "skin_changes", "main_symptom", "lump_detail"],
  diet: ["iron_diet", "tea_with_meals", "tea_coffee", "meta_diet_habits", "meta_hidden_sugar", "salt_diet", "salt_stress", "amen_eating"],
  stress: ["intake_stress", "amen_stress_weight"],
  sleep: ["sleep_issues"],
  mood: ["mood_energy"],
  prior_treatment: ["prior_anaemia", "prior_treatment_completion", "intake_previous_treatment", "meta_current_meds", "meta_med_control"],
  medication: ["pain_medication", "bp_medication", "hormone_use"],
  activity: ["meta_activity_level"],
  family_history: [
    "family_pcos", "family_bp", "family_endo", "family_thyroid", "family_diabetes",
    "family_breast", "amen_family_history", "meta_family_hx", "meta_pcos_gestational",
  ],
  skin: ["dark_patches", "dark_patches_detail"],
  breathing: ["breathlessness", "breathlessness_severity"],
  craving: ["pica", "pica_detail"],
  cardiac: ["chest_symptoms", "chest_pain_bp", "meta_cardiac_sx", "meta_cardiac_urgent", "heart_racing"],
};

const CODE_TOPIC: Record<string, string> = {};
for (const [topic, codes] of Object.entries(TOPIC_CODES)) {
  for (const code of codes) CODE_TOPIC[code] = topic;
}

/** Topic for a question code. Unmapped codes are their own topic (never collapsed). */
export function topicOf(code: string): string {
  if (CODE_TOPIC[code]) return CODE_TOPIC[code];
  if (code.startsWith("amen_")) return `amen:${code}`;
  // Generated question sets occasionally add a detail/severity code without
  // adding it to the map. Keep those variants attached to their base symptom
  // instead of allowing the same fact to reappear under a new code.
  const base = code.replace(/_(detail|severity|location|timing|pattern|duration)$/, "");
  if (base !== code && CODE_TOPIC[base]) return CODE_TOPIC[base];
  return code;
}

const MENSTRUAL_TOPICS = new Set([
  "menstrual_pattern", "menstrual_flow", "menstrual_clots", "menstrual_colour", "menstrual_pain",
]);

export const isMenstrualTopic = (topic: string) => MENSTRUAL_TOPICS.has(topic);

const MENSTRUAL_EXCLUSIONS = [
  "menopause", "menopausal", "post menopausal", "postmenopausal", "रजोनिवृत्ति", "रजोनिवृत्ती",
  "hysterectomy", "uterus removed", "गर्भाशय निकाल", "pregnant", "pregnancy", "गर्भवती", "गरोदर",
  "i am male", "i'm male", "i am a man", "male patient",
];

/**
 * Menstrual questions are only relevant when the person still menstruates.
 * The moment the conversation says otherwise we stop asking them entirely.
 */
export function menstrualExcluded(corpus: string): boolean {
  const c = corpus.toLowerCase();
  return MENSTRUAL_EXCLUSIONS.some((w) => c.includes(w));
}

/* ── Free-text interpretation ─────────────────────────────────────────── */

const NEGATIVE = [
  "no", "nope", "never", "nothing", "none", "not really", "not at all", "no issue", "no problem",
  "nahi", "nahin", "nai", "bilkul nahi", "नहीं", "नाही", "नको", "no change", "normal",
];

const AFFIRMATIVE = [
  "yes", "yeah", "yep", "haan", "han", "haa", "ji haan", "sure", "correct", "true",
  "हाँ", "हां", "हो", "होय", "आहे", "aahe", "ho ", "present", "sometimes", "often", "always",
  "a lot", "very much", "daily", "every day", "kabhi kabhi", "roz",
];

const UNSURE = ["not sure", "don't know", "dont know", "maybe", "cannot say", "can't say", "पता नहीं", "माहित नाही"];

const SEVERE = ["severe", "unbearable", "terrible", "worst", "every day", "daily", "always", "constant", "bahut", "बहुत", "खूप", "very bad", "extreme"];
const MODERATE = ["moderate", "often", "frequently", "quite", "kaafi", "काफी", "much", "a lot"];
const MILD = ["mild", "slight", "sometimes", "occasionally", "rarely", "thoda", "थोड़ा", "थोडे", "little"];

const wordHit = (text: string, words: string[]) => words.some((w) => text.includes(w));

/** Yes / no / unknown for a free-text answer. Negation always wins. */
export function answerPolarity(raw: string): Polarity {
  const a = ` ${String(raw ?? "").toLowerCase().trim()} `;
  if (!a.trim()) return "unknown";
  if (wordHit(a, UNSURE)) return "unknown";
  if (wordHit(a, NEGATIVE.map((w) => ` ${w} `)) || /^\s*(no|nahi|नहीं|नाही)\b/.test(a)) return "no";
  if (wordHit(a, AFFIRMATIVE.map((w) => ` ${w} `)) || wordHit(a, AFFIRMATIVE)) return "yes";
  // A descriptive free-text reply ("I feel drained by lunchtime") is an affirmation
  // of the symptom being asked about.
  return a.trim().split(/\s+/).length >= 3 ? "yes" : "unknown";
}

export function answerSeverity(raw: string): number {
  const a = ` ${String(raw ?? "").toLowerCase()} `;
  if (wordHit(a, SEVERE)) return 3;
  if (wordHit(a, MODERATE)) return 2;
  if (wordHit(a, MILD)) return 1;
  return 0;
}

const DURATION_UNITS: Array<[RegExp, DurationUnit, number]> = [
  [/(year|yr|साल|वर्ष)/, "years", 365],
  [/(month|mnth|महीन|महिन)/, "months", 30],
  [/(week|wk|हफ्त|आठवड)/, "weeks", 7],
  [/(day|दिन|दिवस)/, "days", 1],
];

/** Word quantities people actually say instead of a number. */
const WORD_QUANTITY: Array<[RegExp, string, number]> = [
  [/\b(a couple(?: of)?|couple(?: of)?|do |दो |दोन )/, "couple", 2],
  [/\b(a few|few|कुछ|काही)/, "few", 3],
  [/\b(several|kai|कई|कित्येक)/, "several", 4],
  [/\b(many|lots of|बहुत|खूप)/, "many", 6],
  [/\b(some|thoda|थोड़े|थोडे)/, "some", 3],
];

/**
 * Pull "3 months", "several months", "for a few weeks" out of a free-text answer.
 * Returns the words the user used *and* a normalised day count so the same fact
 * can drive AWIS, recommendations and the report without asking again.
 */
export function parseDuration(raw: string): DurationInfo | undefined {
  const a = ` ${String(raw ?? "").toLowerCase()} `;
  for (const [unitRe, unit, mult] of DURATION_UNITS) {
    const unitHit = a.search(unitRe);
    if (unitHit < 0) continue;
    const before = a.slice(0, unitHit + 1);
    const numeric = before.match(/(\d+(?:\.\d+)?)\s*[a-z\u0900-\u097F]*\s*$/);
    if (numeric) {
      const value = Number(numeric[1]);
      return { value, value_text: numeric[1], unit, days: Math.round(value * mult) };
    }
    for (const [wordRe, label, approx] of WORD_QUANTITY) {
      if (wordRe.test(before)) {
        return { value: approx, value_text: label, unit, days: Math.round(approx * mult), approximate: true };
      }
    }
    // "it has been going on for months" — a plural unit alone still means "several".
    if (new RegExp(`${unitRe.source}s`).test(a)) {
      return { value: 4, value_text: "several", unit, days: 4 * mult, approximate: true };
    }
  }
  return undefined;
}

export function answerDurationDays(raw: string): number | undefined {
  return parseDuration(raw)?.days;
}

/* ── Symptom naming ───────────────────────────────────────────────────── */

const SYMPTOM_PATTERNS: Array<[RegExp, string]> = [
  [/(heavy|flooding|bahut|खूब).{0,20}(bleed|flow|period|पाळी|माहवारी)/, "heavy_bleeding"],
  [/(bleed|flow).{0,20}(heavy|excessive)/, "heavy_bleeding"],
  [/(irregular|delayed|missed).{0,20}(period|cycle|पाळी)/, "irregular_periods"],
  [/(tired|fatigue|exhaust|drained|थक)/, "fatigue"],
  [/(sleep|नींद|झोप)/, "sleep_disturbance"],
  [/(pain|ache|दर्द|दुखणे)/, "pain"],
  [/(dizzy|giddy|चक्कर)/, "dizziness"],
  [/(weight gain|gaining weight)/, "weight_gain"],
  [/(hair fall|hair loss|बाल)/, "hair_loss"],
  [/(thirst|urinat|प्यास)/, "thirst_urination"],
];

const FLOW_WORDS: Array<[RegExp, string]> = [
  [/(heavy|flooding|excessive|clots)/, "heavy"],
  [/(light|scanty|spotting)/, "light"],
];

/** Turn a raw answer into the canonical slot stored on the conversation state. */
export function makeSlot(code: string, raw: string): Slot {
  const text = String(raw ?? "").trim();
  const lower = text.toLowerCase();
  const polarity = answerPolarity(raw);
  const slot: Slot = {
    code,
    topic: topicOf(code),
    polarity,
    severity: polarity === "yes" ? Math.max(1, answerSeverity(raw)) : 0,
    text,
    at: new Date().toISOString(),
  };

  const duration = parseDuration(raw);
  if (duration) {
    slot.duration = duration;
    slot.duration_days = duration.days;
  }

  const symptom = SYMPTOM_PATTERNS.find(([re]) => re.test(lower))?.[1];
  if (symptom) slot.symptom = symptom;
  const qualifier = FLOW_WORDS.find(([re]) => re.test(lower))?.[1];
  if (qualifier) slot.qualifier = qualifier;

  return slot;
}

/**
 * The canonical, JSON-serialisable form of a slot — this is what is persisted in
 * `screening_answers.normalized_value` and read back on refresh.
 */
export function normalizedValue(slot: Slot) {
  return {
    topic: slot.topic,
    polarity: slot.polarity,
    severity: slot.severity,
    symptom: slot.symptom ?? null,
    qualifier: slot.qualifier ?? null,
    duration_value: slot.duration?.value_text ?? null,
    duration_unit: slot.duration?.unit ?? null,
    duration_days: slot.duration_days ?? null,
  };
}

/** Duration already captured anywhere in this screening — never ask for it twice. */
export function knownDuration(slots: Record<string, Slot>): DurationInfo | undefined {
  for (const slot of Object.values(slots)) if (slot.duration) return slot.duration;
  return undefined;
}

/** Affirmed topics, counted once each — the symptom burden used for AWIS. */
export function affirmedTopics(slots: Record<string, Slot>): Slot[] {
  const best = new Map<string, Slot>();
  for (const slot of Object.values(slots)) {
    if (slot.polarity !== "yes") continue;
    const current = best.get(slot.topic);
    if (!current || slot.severity > current.severity) best.set(slot.topic, slot);
  }
  return [...best.values()];
}
