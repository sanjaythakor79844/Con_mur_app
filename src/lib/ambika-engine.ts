// Ambika engine — TypeScript port of question_engine.py + adaptive_conversation.py
// Pure functions only: the conversation state travels with each request.

import {
  CONDITION_DEVICES,
  CONDITION_DISPLAY,
  CONDITION_QSETS,
  CONDITION_QUESTIONS,
  DEVICE_DEFS,
  INTAKE_QUESTIONS,
  NUTRITION_PLANS,
  STT_VARIANTS,
  SYMPTOM_SWEEP,
  THERAPY_PLANS,
  type Loc,
  type Question,
} from "./ambika-data";
import {
  buildExecutiveSummary,
  buildGuidance,
  buildScoreBreakdown,
  buildTestPlan,
  type ExecutiveSummary,
  type Guidance,
  type ScoreBreakdown,
  type TestPlan,
} from "./health-recommendations";
import {
  affirmedTopics,
  isMenstrualTopic,
  knownDuration,
  makeSlot,
  menstrualExcluded,
  topicOf,
  type Slot,
} from "./symptom-slots";

export type Phase = "intake" | "reports" | "deepdive" | "diagnostics" | "done";

export type Reading = {
  device_id: string;
  name: string;
  value: string | number;
  unit: string;
  label: string;
  flag: "green" | "amber" | "red";
  source: "report" | "skipped" | "manual" | "pending";
  category?: "essential" | "rapid" | "lab";
  ref_text?: string;
  status?: "recorded" | "pending";
};

export type ConversationState = {
  session_id: string;
  language_code: string;
  initial_complaint: string;
  phase: Phase;
  asked_codes: string[];
  /** Questions the user already answered inside earlier free-text replies. */
  skipped_codes: string[];
  answers: Record<string, string>;
  /** Canonical, structured version of every answer, keyed by question code. */
  slots: Record<string, Slot>;
  /** Clinical topics already covered — a topic is never asked about twice. */
  asked_topics: string[];
  suspected_conditions: string[];
  report_queue: string[];
  report_index: number;
  readings: Record<string, Reading>;
  current_code: string | null;
  /** null = not asked yet, true/false = user's single answer to the lab-report gate. */
  reports_consent: boolean | null;
  /** The "let me look closer at X" line is said exactly once. */
  hypothesis_shown: boolean;
  diagnostics_done: boolean;
};

/** Older saved states may pre-date the slot model — normalise before use. */
export function normaliseState(s: ConversationState): ConversationState {
  s.skipped_codes = s.skipped_codes ?? [];
  s.answers = s.answers ?? {};
  s.readings = normaliseReadings(s.readings);
  s.slots = s.slots ?? {};

  // Older states treated every displayed question as answered. Rebuild the
  // markers from facts that were actually answered or deliberately skipped,
  // while retaining only the current unanswered question as a pending marker.
  // This makes refresh/resume deterministic and prevents a stale marker from
  // hiding the next question.
  for (const [code, slot] of Object.entries(s.slots)) {
    if (code !== "initial_complaint" && s.answers[code] === undefined && slot.text) {
      s.answers[code] = slot.text;
    }
  }
  for (const [code, answer] of Object.entries(s.answers)) {
    if (!s.slots[code]) s.slots[code] = makeSlot(code, answer);
  }

  const answeredCodes = Object.keys(s.answers);
  const skippedCodes = [...new Set(s.skipped_codes)];
  s.skipped_codes = skippedCodes.filter((code) => !s.answers[code]);
  s.asked_codes = [
    ...answeredCodes,
    ...s.skipped_codes.filter((code) => !answeredCodes.includes(code)),
  ];
  if (s.current_code && !s.answers[s.current_code] && !s.asked_codes.includes(s.current_code)) {
    s.asked_codes.push(s.current_code);
  }

  s.asked_topics = [];
  for (const code of [...answeredCodes, ...s.skipped_codes]) {
    const topic = topicOf(code);
    if (!s.asked_topics.includes(topic)) s.asked_topics.push(topic);
  }
  seedComplaintSlot(s);
  return s;
}

/**
 * The opening complaint is itself an answer: it often already states the symptom,
 * its severity and how long it has lasted. Storing it as a canonical slot means
 * those facts count towards AWIS and are never asked for a second time.
 */
export function seedComplaintSlot(s: ConversationState) {
  const complaint = (s.initial_complaint ?? "").trim();
  if (!complaint || s.slots["initial_complaint"]) return;
  const slot = makeSlot("initial_complaint", complaint);
  slot.polarity = "yes";
  slot.severity = Math.max(1, slot.severity);
  s.slots["initial_complaint"] = slot;
}


/** Record an answer once, in both raw and canonical form. */
export function recordAnswer(s: ConversationState, code: string, answer: string) {
  s.answers[code] = answer;
  s.slots[code] = makeSlot(code, answer);
  s.skipped_codes = s.skipped_codes.filter((item) => item !== code);
  const topic = topicOf(code);
  if (!s.asked_topics.includes(topic)) s.asked_topics.push(topic);
  if (!s.asked_codes.includes(code)) s.asked_codes.push(code);
}



const LANG: Record<string, string> = {
  en: "en",
  hi: "hi",
  mr: "mr",
  "en-IN": "en",
  "hi-IN": "hi",
  "mr-IN": "mr",
};

const lang = (code: string) => LANG[code] ?? "en";
const pick = (q: Loc, code: string) => q[lang(code)] ?? q.en;

/* ── STT-robust matching ─────────────────────────────────────────────── */

const YES_WORDS = [
  "yes", "present", "हाँ", "हो", "होय", "हां", "yeah", "haan", "han", " ha ", "हा", "जी",
  "ho ", "ho,", "hoy", "ahe", "आहे", "aahe",
];

export function isYes(answers: Record<string, string>, code: string) {
  const v = String(answers[code] ?? "").toLowerCase();
  return YES_WORDS.some((w) => v.includes(w));
}

function isSubstantiveYes(answer: string) {
  const a = String(answer).toLowerCase().trim();
  if (!a || a.length < 2) return false;
  const no = ["no ", "nahi", "nahin", "nah", "nope", "never", "nothing", "mat ", "na ", "nako", "nai ", "bilkul nahi"];
  if (no.some((w) => a.includes(w))) return false;
  const yes = ["yes", "haan", "han", "haa", " ha ", "ji", "sure", "ok", "okay", "accha", "bilkul", "zarur", "thik"];
  if (yes.some((w) => a.includes(w))) return true;
  return a.split(/\s+/).length >= 3;
}

function triggerMatches(answer: string, triggers: string[] = []) {
  const a = String(answer).toLowerCase();
  for (const trigger of triggers) {
    const t = trigger.toLowerCase();
    if (a.includes(t)) return true;
    for (const [key, variants] of Object.entries(STT_VARIANTS)) {
      if (variants.includes(t) || t === key) {
        if (variants.some((v) => a.includes(v))) return true;
      }
    }
  }
  return false;
}

/* ── Already-answered detection ──────────────────────────────────────── */

const STOPWORDS = new Set([
  "do", "does", "did", "you", "your", "have", "has", "had", "are", "is", "was", "were", "the", "a", "an", "and", "or",
  "but", "of", "to", "in", "on", "for", "with", "any", "some", "when", "how", "what", "which", "that", "this", "they",
  "them", "it", "its", "be", "been", "can", "could", "would", "should", "very", "much", "more", "most", "than", "then",
  "there", "here", "about", "also", "just", "like", "say", "said", "tell", "me", "my", "i", "at", "by", "from", "come",
  "comes", "get", "gets", "feel", "feels", "felt", "please", "sure", "ever", "entirely", "still", "over", "out",
]);

const keywords = (text: string) =>
  Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z\u0900-\u097F\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    ),
  );

/** Everything the user has said so far, used to avoid re-asking answered things. */
export function corpusOf(s: ConversationState) {
  return [s.initial_complaint, ...Object.values(s.answers)].join(" ").toLowerCase();
}

function alreadyCovered(questionText: string, corpus: string, threshold: number) {
  const words = keywords(questionText);
  if (words.length < threshold) return false;
  const hits = words.filter((w) => corpus.includes(w.slice(0, Math.max(4, w.length - 1)))).length;
  return hits >= threshold;
}

/* ── Question walkers (same rules as the Python engine) ──────────────── */

function nextFrom(qset: Question[], s: ConversationState): { code: string; text: string } | null {
  const askedCodes = s.asked_codes;
  const answers = s.answers;
  const corpus = corpusOf(s);
  const duration = knownDuration(s.slots);
  const menstrualOff = menstrualExcluded(corpus);

  const skip = (code: string) => {
    if (!s.skipped_codes.includes(code)) s.skipped_codes.push(code);
    if (!askedCodes.includes(code)) askedCodes.push(code);
    const topic = topicOf(code);
    if (!s.asked_topics.includes(topic)) s.asked_topics.push(topic);
  };

  /**
   * A question is redundant when its clinical topic is already covered — either
   * because another question about the same topic was answered, or because the
   * information it asks for (duration, menstrual status) is already known.
   */
  const redundant = (code: string, isFollowup = false, parentCode?: string) => {
    const topic = topicOf(code);
    // A follow-up belongs to the answer that triggered it. It must be allowed
    // even when it shares that answer's topic; otherwise every useful detail
    // question is skipped immediately after the parent question.
    if (s.asked_topics.includes(topic) && (!isFollowup || topicOf(parentCode ?? "") !== topic)) return true;
    if (topic === "duration" && duration) return true;
    if (menstrualOff && isMenstrualTopic(topic)) return true;
    return false;
  };

  // A refresh can arrive between displaying a question and saving its answer.
  // Honour that pending question before walking the set, rather than treating
  // its old asked marker as proof that it was completed.
  if (s.current_code && !answers[s.current_code]) {
    for (const main of qset) {
      if (main.code === s.current_code) return { code: main.code, text: pick(main.q, s.language_code) };
      const followup = (main.followups ?? []).find((fu) => fu.code === s.current_code);
      if (followup) return { code: followup.code, text: pick(followup.q, s.language_code) };
    }
  }

  for (const main of qset) {
    if (askedCodes.includes(main.code)) {
      const followups = main.followups ?? [];
      const multiBranch = followups.length > 1;
      for (const fu of followups) {
        if (askedCodes.includes(fu.code)) continue;
        if (redundant(fu.code, true, main.code)) {
          skip(fu.code);
          continue;
        }
        const mainAnswer = String(answers[main.code] ?? "");
        const hit = triggerMatches(mainAnswer, fu.trigger ?? []);
        if (multiBranch ? hit : hit || isSubstantiveYes(mainAnswer)) {
          const text = pick(fu.q, s.language_code);
          // The user often answers the follow-up inside their own free-text reply.
          if (alreadyCovered(text, corpus, 2)) {
            skip(fu.code);
            continue;
          }
          return { code: fu.code, text };
        }
      }
      continue;
    }
    if (redundant(main.code)) {
      skip(main.code);
      continue;
    }
    const text = pick(main.q, s.language_code);
    if (alreadyCovered(text, corpus, 3)) {
      skip(main.code);
      continue;
    }
    return { code: main.code, text };
  }
  return null;
}

/** Text of a question by its code — used to restore an in-progress check-up. */
export function questionTextOf(code: string, languageCode: string): string | null {
  const sets: Question[][] = [
    INTAKE_QUESTIONS,
    SYMPTOM_SWEEP,
    ...Object.values(CONDITION_QSETS),
    ...Object.values(CONDITION_QUESTIONS),
  ];
  for (const set of sets) {
    for (const q of set) {
      if (q.code === code) return pick(q.q, languageCode);
      for (const fu of q.followups ?? []) if (fu.code === code) return pick(fu.q, languageCode);
    }
  }
  return null;
}

export const nextIntakeQuestion = (s: ConversationState) => nextFrom(INTAKE_QUESTIONS, s);

export const nextSweepQuestion = (s: ConversationState) => nextFrom(SYMPTOM_SWEEP, s);

export function nextConditionQuestion(s: ConversationState, conditionId: string) {
  const qset = CONDITION_QSETS[conditionId] ?? CONDITION_QUESTIONS[conditionId] ?? CONDITION_QSETS.general;
  return nextFrom(qset, s);
}


/* ── Condition detection (port of detect_suspected_conditions) ───────── */

export function detectSuspectedConditions(s: ConversationState): string[] {
  const answers = s.answers;
  const initial = (s.initial_complaint || "").toLowerCase();
  const y = (c: string) => isYes(answers, c);
  const has = (words: string[]) => words.some((w) => initial.includes(w));
  const flag = (id: string) => s.readings[id]?.flag;
  const scores: Record<string, number> = {};

  let p = 0;
  if (has(["period", "पीरियड", "पाळी", "irregular", "अनियमित", "माहवारी"])) p += 2;
  if (y("period_regularity")) p += 2;
  if (y("facial_hair") || y("body_hair")) p += 2;
  if (y("weight_gain")) p += 1;
  if (y("acne")) p += 1;
  if (y("dark_patches")) p += 1;
  if (y("scalp_hair")) p += 1;
  if (p >= 2) scores.pcos = p;

  let t = 0;
  if (has(["thyroid", "थायराइड", "थायरॉईड", "थकान", "थकवा", "tired"])) t += 1;
  if (y("fatigue_after_sleep")) t += 2;
  if (y("mental_fog")) t += 1;
  if (y("cold_intolerance") || y("heat_intolerance")) t += 2;
  if (y("weight_change")) t += 1;
  if (y("hair_falling")) t += 1;
  if (y("dry_skin")) t += 1;
  if (y("neck_swelling")) t += 3;
  if (t >= 2) scores.thyroid = t;

  let a = 0;
  if (has(["tired", "थकान", "थकवा", "dizzy", "चक्कर", "weak", "कमजोर", "pale"])) a += 1;
  if (y("pallor_told") || y("pallor_eyelids")) a += 2;
  if (y("dizziness") || y("breathlessness")) a += 2;
  if (y("palpitations")) a += 1;
  if (y("pica")) a += 3;
  if (y("heavy_periods_anaemia") || y("heavy_period_endo")) a += 2;
  if (y("brittle_nails")) a += 1;
  if (y("gi_symptoms")) a += 2;
  if (a >= 2) scores.anaemia = a;

  let h = 0;
  if (has(["headache", "सिरदर्द", "डोकेदुखी", "bp", "pressure"])) h += 1;
  if (y("bp_known_high")) h += 3;
  if (y("chest_pain_bp")) h += 2;
  if (y("vision_blur")) h += 1;
  if (flag("bp") === "red") h += 4;
  if (h >= 3) scores.hypertension = h;

  let e = 0;
  if (has(["period pain", "दर्द", "दुखणे", "पाळी"])) e += 1;
  if (y("period_pain_severity")) e += 3;
  if (y("pelvic_pain_outside")) e += 2;
  if (y("pain_worsening")) e += 2;
  if (y("bowel_symptoms")) e += 1;
  if (e >= 2) scores.endometriosis = e;

  let m = 0;
  if (has(["sugar", "शुगर", "thirst", "प्यास", "diabetes", "मधुमेह"])) m += 2;
  if (y("thirst")) m += 2;
  if (y("frequent_urination")) m += 2;
  if (y("tingling")) m += 2;
  if (y("frequent_infections")) m += 1;
  if (m >= 2) scores.metabolic = m;

  let am = 0;
  if (
    has([
      "period stop", "periods stopped", "no period", "missed period", "period nahi",
      "पीरियड बंद", "माहवारी नहीं", "पीरियड नहीं", "पाळी बंद", "पाळी नाही",
      "amenorrhea", "periods absent", "never period",
    ])
  ) am += 4;
  if (y("amen_last_period")) am += 2;
  if (am >= 3) scores.amenorrhea = am;

  let b = 0;
  if (has(["lump", "गांठ", "breast", "स्तन", "nipple"])) b += 3;
  if (y("main_symptom")) b += 2;
  if (y("skin_changes")) b += 2;
  if (y("nipple_changes")) b += 2;
  if (b >= 2) scores.breast = b;

  const ranked = Object.keys(scores)
    .sort((x, z) => scores[z] - scores[x])
    .slice(0, 3);
  return ranked.length ? ranked : ["general"];
}

/* ── Report queue (lab tests replace the kiosk devices) ──────────────── */

const LAB_DEVICES = new Set([
  "haemoglobin", "ferritin", "tsh", "glucose", "hba1c", "lh_fsh", "testosterone",
  "prolactin", "lipid", "urine", "pregnancy_test",
]);

export function buildReportQueue(conditions: string[]) {
  const list: string[] = [];
  for (const c of conditions) {
    for (const d of CONDITION_DEVICES[c] ?? []) {
      if (LAB_DEVICES.has(d) && !list.includes(d)) list.push(d);
    }
  }
  return list;
}

export const reportName = (id: string) => DEVICE_DEFS[id]?.name ?? id;
export const reportUnit = (id: string) => DEVICE_DEFS[id]?.unit ?? "";

export function conditionName(id: string) {
  return CONDITION_DISPLAY[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** Single, one-time gate: "do you have ANY of these reports?" */
export function consentMessage(conditions: string[], queue: string[]) {
  const conds = conditions.map(conditionName).join(" and ");
  if (!queue.length) {
    return `From what you've told me I'd like to look closer at ${conds}. No lab reports are needed for this — a few more questions will do.`;
  }
  return `From what you've told me I'd like to look closer at ${conds}. Do you have any recent reports for ${queue
    .map(reportName)
    .join(", ")}?`;
}


/* ── Reading interpretation for uploaded lab values ──────────────────── */

const REFERENCE: Record<string, { low?: number; high?: number; amberLow?: number; amberHigh?: number }> = {
  haemoglobin: { low: 12, amberLow: 11 },
  ferritin: { low: 30, amberLow: 15 },
  tsh: { high: 4.0, amberHigh: 6.0, low: 0.4 },
  glucose: { high: 100, amberHigh: 126 },
  hba1c: { high: 5.7, amberHigh: 6.5 },
  lh_fsh: { high: 2, amberHigh: 3 },
  testosterone: { high: 50, amberHigh: 80 },
  prolactin: { high: 25, amberHigh: 50 },
  lipid: { high: 200, amberHigh: 240 },
};

export function interpretReading(
  deviceId: string,
  value: number,
  source: Reading["source"] = "report",
): Reading {
  const ref = REFERENCE[deviceId];
  let flag: Reading["flag"] = "green";
  let label = "Within range";

  if (ref) {
    if (ref.low !== undefined && value < ref.low) {
      flag = ref.amberLow !== undefined && value >= ref.amberLow ? "amber" : "red";
      label = flag === "amber" ? "Slightly low" : "Low";
    }
    if (ref.high !== undefined && value > ref.high) {
      flag = ref.amberHigh !== undefined && value <= ref.amberHigh ? "amber" : "red";
      label = flag === "amber" ? "Slightly high" : "High";
    }
  }

  return {
    device_id: deviceId,
    name: reportName(deviceId),
    value,
    unit: reportUnit(deviceId),
    label,
    flag,
    source,
    status: "recorded",
  };
}

/**
 * One rule for "is this reading recorded?", used by the score, the report counts
 * and every screen. A reading counts as recorded only when it actually carries a
 * value and was not skipped, so a test can never look recorded in one place and
 * pending in another.
 */
export function isRecordedReading(r: Reading): boolean {
  if (!r) return false;
  if (r.source === "skipped" || r.source === "pending") return false;
  if (r.status === "pending") return false;
  if (r.value === null || r.value === undefined) return false;
  const text = String(r.value).trim().toLowerCase();
  return text !== "" && text !== "pending" && text !== "—";
}

/** Canonical copy of a reading with its status (and label) made consistent. */
export function normaliseReading(r: Reading): Reading {
  const recorded = isRecordedReading(r);
  return {
    ...r,
    status: recorded ? "recorded" : "pending",
    source: recorded ? (r.source === "manual" ? "manual" : r.source) : r.source === "skipped" ? "skipped" : "pending",
    label: r.label || (recorded ? "Recorded" : "Not done yet"),
  };
}

/** Every reading of a screening, canonicalised and keyed by test id. */
export function normaliseReadings(
  readings: Record<string, Reading> | undefined,
): Record<string, Reading> {
  const out: Record<string, Reading> = {};
  for (const [id, r] of Object.entries(readings ?? {})) out[id] = normaliseReading(r);
  return out;
}


/* ── AWIS score + conclusion ─────────────────────────────────────────── */

const AWIS_BANDS: Array<{ lo: number; hi: number; label: string; description: string; color: string }> = [
  { lo: 0, hi: 5, label: "Low Risk", description: "Your health indicators are reassuring. Routine check in 6 months.", color: "#60c060" },
  { lo: 6, hi: 11, label: "Moderate Risk", description: "Some areas need attention. See a doctor within 2 weeks.", color: "#e0c040" },
  { lo: 12, hi: 16, label: "High Risk", description: "Multiple concerning findings. See a doctor within 2-3 days.", color: "#e08040" },
  { lo: 17, hi: 20, label: "Critical", description: "Urgent attention needed. See a doctor today or tomorrow.", color: "#e06060" },
];

export const awisDescription = (awis: number) =>
  AWIS_BANDS.find((b) => awis >= b.lo && awis <= b.hi) ?? AWIS_BANDS[AWIS_BANDS.length - 1];

/**
 * Number of distinct symptoms the person confirmed. Driven by the canonical slot
 * model, so a symptom described in free text ("I feel drained by lunch") counts
 * exactly like a plain "yes", and the same symptom asked twice counts once.
 * Legacy states without slots fall back to the original keyword check.
 */
export function symptomCount(s: ConversationState): number {
  const slots = s.slots ?? {};
  if (Object.keys(slots).length) return affirmedTopics(slots).length;
  return Object.keys(s.answers ?? {}).filter((c) => isYes(s.answers, c)).length;
}

export type AwisDetail = {
  /** Score on the existing 0–20 scale. */
  awis: number;
  /**
   * false when nothing has been answered or measured yet — the score is
   * *unavailable*, which is different from a genuine 0.
   */
  available: boolean;
  symptoms: number;
  red: number;
  amber: number;
};

export function awisDetail(s: ConversationState): AwisDetail {
  const symptoms = symptomCount(s);
  const readings = Object.values(normaliseReadings(s.readings)).filter(isRecordedReading);

  const red = readings.filter((r) => r.flag === "red").length;
  const amber = readings.filter((r) => r.flag === "amber").length;
  const answered = Object.keys(s.answers ?? {}).length > 0;
  return {
    awis: Math.min(20, Math.round(symptoms * 1.2 + red * 4 + amber * 2)),
    available: answered || readings.length > 0,
    symptoms,
    red,
    amber,
  };
}

export function calculateAwis(s: ConversationState) {
  return awisDetail(s).awis;
}

export type AwisReport = {
  awis: number;
  /** false when nothing was answered or measured — show "not available", not 0. */
  awis_available: boolean;
  /** Count of tests with an actual value, used by the report header. */
  recorded_count: number;
  pending_count: number;
  /** When this report was generated from the stored screening. */
  generated_at: string;
  risk_band: string;
  risk_label: string;
  risk_description: string;
  risk_color: string;
  primary_condition: string;
  primary_condition_name: string;
  suspected_conditions: string[];
  readings: Reading[];
  essential: Reading[];
  rapid: Reading[];
  lab: Reading[];
  pending: Reading[];
  risk_indicators: string[];
  nutrition: { title: string; points: string[] };
  therapy: string[];
  summary: string;
  next_steps: string[];
  follow_up: string[];
  /** Categorised test recommendations driven by the detected conditions. */
  test_plan: TestPlan;
  /** Lifestyle, nutrition, hormonal, preventive and follow-up guidance. */
  guidance: Guidance;
  /** Detailed, sectioned narrative for the report screen. */
  executive: ExecutiveSummary;
  /** How each part of the conversation contributed to the AWIS score. */
  score_breakdown: ScoreBreakdown;
};

/** Human-readable "question — answer" lines for every symptom the user confirmed. */
function confirmedSymptoms(s: ConversationState): string[] {
  const texts: Record<string, string> = {};
  const walk = (qs: Question[]) => {
    for (const q of qs) {
      texts[q.code] = q.q.en;
      for (const fu of q.followups ?? []) texts[fu.code] = fu.q.en;
    }
  };
  walk(INTAKE_QUESTIONS);
  walk(SYMPTOM_SWEEP);
  for (const set of Object.values(CONDITION_QSETS)) walk(set);
  for (const set of Object.values(CONDITION_QUESTIONS)) walk(set);

  const slots = Object.values(s.slots ?? {}).filter((slot) => slot.polarity === "yes");
  if (slots.length) {
    // One line per clinical topic, so a symptom captured twice is reported once.
    const byTopic = new Map<string, string>();
    for (const slot of slots) {
      if (byTopic.has(slot.topic)) continue;
      const duration = slot.duration ? ` (${slot.duration.value_text} ${slot.duration.unit})` : "";
      byTopic.set(slot.topic, `${texts[slot.code] ?? slot.code} — ${slot.text}${duration}`);
    }
    return [...byTopic.values()];
  }

  return Object.keys(s.answers)
    .filter((code) => isYes(s.answers, code))
    .map((code) => `${texts[code] ?? code} — ${s.answers[code]}`);
}

export function buildReport(s: ConversationState): AwisReport {
  const conditions = s.suspected_conditions.length ? s.suspected_conditions : ["general"];
  const primary = conditions[0];
  const readingMap = normaliseReadings(s.readings);
  const readings = Object.values(readingMap);
  const recorded = readings.filter(isRecordedReading);
  const flags = recorded.map((r) => r.flag);
  const detail = awisDetail(s);
  const yesCount = detail.symptoms;

  const risk = flags.includes("red") || yesCount >= 5 ? "high" : flags.includes("amber") || yesCount >= 3 ? "moderate" : "low";
  const awis = detail.awis;
  const band = awisDescription(awis);

  const inCategory = (cat: Reading["category"]) =>
    recorded.filter((r) => (r.category ?? (r.source === "report" ? "lab" : undefined)) === cat);
  const pending = readings.filter((r) => !isRecordedReading(r));


  const abnormal = recorded.filter((r) => r.flag !== "green");
  const summary = [
    `Based on everything you shared, the picture points most towards ${conditionName(primary)}.`,
    abnormal.length
      ? `Your ${abnormal.map((r) => `${r.name} (${r.value}${r.unit ? ` ${r.unit}` : ""})`).join(", ")} ${abnormal.length > 1 ? "need" : "needs"} attention.`
      : recorded.length
        ? `All ${recorded.length} recorded value${recorded.length > 1 ? "s" : ""} look reassuring so far.`
        : "No test values have been recorded yet, so this report is based on your symptoms only.",
    pending.length ? `${pending.length} investigation${pending.length > 1 ? "s are" : " is"} still pending — this report updates once you add them.` : "",
    band.description,
  ]
    .filter(Boolean)
    .join(" ");

  const symptoms = confirmedSymptoms(s);

  return {
    awis,
    awis_available: detail.available,
    recorded_count: recorded.length,
    pending_count: pending.length,
    generated_at: new Date().toISOString(),
    risk_band: risk,
    risk_label: band.label,
    risk_description: band.description,
    risk_color: band.color,
    primary_condition: primary,
    primary_condition_name: conditionName(primary),
    suspected_conditions: conditions,
    readings,
    essential: inCategory("essential"),
    rapid: inCategory("rapid"),
    lab: inCategory("lab"),
    pending,
    risk_indicators: abnormal.map((r) => `${r.name}: ${r.value}${r.unit ? ` ${r.unit}` : ""} — ${r.label}`),
    nutrition: NUTRITION_PLANS[primary] ?? NUTRITION_PLANS.general,
    therapy: THERAPY_PLANS[primary] ?? THERAPY_PLANS.general,
    summary,
    next_steps: [
      "Review these findings with a doctor at your nearest Aaha Health Centre",
      ...pending.map((r) => `Get your ${r.name} test done and upload the report`),
      "Repeat the key tests after 8 weeks to see your progress",
    ],
    follow_up: [
      band.label === "Low Risk" ? "Routine review in 6 months" : band.label === "Moderate Risk" ? "Consultation within 2 weeks" : "Consultation within 2-3 days",
      "Upload any pending laboratory reports — your report updates automatically",
      "Recheck the flagged values after 8 weeks",
    ],
    test_plan: buildTestPlan(conditions, readingMap),
    guidance: buildGuidance(conditions, awis, readingMap),

    executive: buildExecutiveSummary({
      conditions,
      awis,
      bandLabel: band.label,
      bandDescription: band.description,
      recorded,
      pending,
      symptoms,
    }),
    score_breakdown: buildScoreBreakdown(
      yesCount,
      recorded.filter((r) => r.flag === "red").length,
      recorded.filter((r) => r.flag === "amber").length,
    ),
  };
}



/* ── Hypothesis line said before deepdive ────────────────────────────── */

export function generateHypothesis(s: ConversationState, conditions: string[]) {
  const text = [s.initial_complaint, ...Object.values(s.answers)].join(" ").toLowerCase();
  const map: Record<string, string> = {
    tired: "unusual tiredness",
    fatigue: "fatigue",
    period: "period changes",
    irregular: "irregular periods",
    hair: "hair changes",
    weight: "weight changes",
    headache: "headaches",
    dizzy: "dizziness",
    breathless: "breathlessness",
    cold: "cold sensitivity",
    thirst: "excessive thirst",
    lump: "a lump",
  };
  const found = Object.entries(map)
    .filter(([k]) => text.includes(k))
    .map(([, v]) => v)
    .slice(0, 3);
  const symptomText = found.length ? found.join(", ") : "what you described";
  return `From ${symptomText}, I suspect ${conditions.map(conditionName).join(" and ")}. Let me ask a few focused questions to be sure.`;
}
