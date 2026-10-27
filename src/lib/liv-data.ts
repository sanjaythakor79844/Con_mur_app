// ─── Liv Living Lab Prototype Data Engine & Clinical Models ──────────────────
// Extracted and typed exactly from liv-app-prototype.html

export interface Biomarker {
  id: string;
  g: string; // group
  n: string; // name
  v: string; // display value
  x: number; // numeric value
  u: string; // unit
  s: "o" | "b" | "p"; // optimal | borderline | priority
  min?: number;
  max?: number;
  z?: [number, "o" | "b" | "p"][]; // zones [upperBound, status]
  opt: string;
  clin: string;
  t?: string; // Day-90 target
  m: string; // meaning explanation
  a: string[]; // actionable moves
  prev?: string; // previous check-in value
  when?: string; // previous check-in date
  nobar?: boolean;
  label?: string;
  isRecorded?: boolean;
  iv?: [string, string][]; // for ECG intervals: [value, label]
  find?: [string, string, string][]; // for posture: [status, title, subtitle]
  eeg?: [string, string, string, number][]; // for EEG: [state, waves, label, waveType]
}

export interface SystemGroup {
  id: string;
  name: string;
}

export const GROUPS: SystemGroup[] = [
  { id: "heart", name: "Heart and arteries" },
  { id: "met", name: "Metabolic health" },
  { id: "body", name: "Strength, body and bone" },
  { id: "inf", name: "Inflammation, liver and kidney" },
  { id: "hor", name: "Hormones and nutrients" },
  { id: "sense", name: "Senses and breath" },
  { id: "brain", name: "Brain and nervous system" },
  { id: "mind", name: "Mind, sleep and recovery" },
];

export const WALK = "Walk for 10 minutes after each main meal";
export const STR = "Three 45-minute strength sessions a week with Coach Ritu";
export const FIB = "Fibre-forward plates: oats, legumes, isabgol and nuts";
export const SLP = "Protect a 7-hour night. Short nights raise next-day glucose";
export const DIN = "Front-load carbs earlier in the day and eat dinner earlier";

export const BIOMARKERS: Biomarker[] = [
  // ─── Heart and arteries
  {
    id: "ecg",
    g: "heart",
    n: "ECG rhythm",
    v: "Normal",
    x: 0,
    u: "lead-I · 30 s",
    s: "o",
    nobar: true,
    prev: "Normal",
    when: "6 Oct",
    opt: "Regular sinus rhythm",
    clin: "No arrhythmia",
    m: "A regular sinus rhythm. Every interval sits inside its normal window, so the heart's electrical timing is as it should be. Recorded on the kiosk ECG at every check-in and read by the physician.",
    a: ["Nothing to change. It is recorded again at your next check-in"],
    iv: [
      ["68", "bpm"],
      ["152", "PR ms"],
      ["88", "QRS ms"],
      ["398", "QTc ms"],
    ],
  },
  {
    id: "bp",
    g: "heart",
    n: "Blood pressure",
    v: "122 / 81",
    x: 122,
    u: "mmHg",
    s: "b",
    min: 90,
    max: 170,
    z: [
      [120, "o"],
      [140, "b"],
      [170, "p"],
    ],
    opt: "< 120 / 80",
    clin: "< 140 / 90",
    t: "< 120 / 80",
    prev: "126 / 84",
    when: "6 Oct",
    m: "Just above optimal and well inside the clinical range.",
    a: [
      "Ten minutes of slow nasal breathing every day",
      "Cardio and strength sessions as planned",
    ],
  },
  {
    id: "apob",
    g: "heart",
    n: "ApoB",
    v: "102",
    x: 102,
    u: "mg/dL",
    s: "p",
    min: 40,
    max: 140,
    z: [
      [80, "o"],
      [100, "b"],
      [140, "p"],
    ],
    opt: "< 80",
    clin: "< 130",
    t: "< 90",
    m: "The best count of artery-clogging particles. Moderately raised, and your clearest lever for long-term heart protection.",
    a: [
      FIB,
      STR,
      "If lifestyle alone does not reach 90 by Day 90, Dr. Deshmukh will discuss next options with you",
    ],
  },
  {
    id: "lpa",
    g: "heart",
    n: "Lipoprotein(a)",
    v: "18",
    x: 18,
    u: "mg/dL",
    s: "o",
    min: 0,
    max: 100,
    z: [
      [30, "o"],
      [50, "b"],
      [100, "p"],
    ],
    opt: "< 30",
    clin: "< 50",
    m: "Genetically set and measured once. Yours is low, which is good news that never changes.",
    a: [],
  },
  {
    id: "ldl",
    g: "heart",
    n: "LDL cholesterol",
    v: "128",
    x: 128,
    u: "mg/dL",
    s: "b",
    min: 40,
    max: 190,
    z: [
      [100, "o"],
      [130, "b"],
      [190, "p"],
    ],
    opt: "< 100",
    clin: "< 130",
    t: "< 100",
    m: "Borderline. It tracks with ApoB, which is the number your plan targets.",
    a: [FIB],
  },
  {
    id: "hdl",
    g: "heart",
    n: "HDL cholesterol",
    v: "52",
    x: 52,
    u: "mg/dL",
    s: "o",
    min: 20,
    max: 100,
    z: [
      [40, "p"],
      [50, "b"],
      [100, "o"],
    ],
    opt: "> 50",
    clin: "> 40",
    m: "In the optimal zone. Protect it.",
    a: [],
  },

  // ─── Metabolic health
  {
    id: "hba1c",
    g: "met",
    n: "HbA1c",
    v: "5.9",
    x: 5.9,
    u: "%",
    s: "b",
    min: 4.6,
    max: 7,
    z: [
      [5.6, "o"],
      [6.5, "b"],
      [7, "p"],
    ],
    opt: "< 5.6",
    clin: "< 6.5",
    t: "≤ 5.7%",
    m: "The early-warning band, not the diabetes band. Caught at the right time. In most women this fully reverses within one to two re-test cycles.",
    a: [
      WALK,
      DIN,
      "Wear the 14-day glucose sensor to find your personal spike foods",
      SLP,
    ],
  },
  {
    id: "glu",
    g: "met",
    n: "Fasting glucose",
    v: "104",
    x: 104,
    u: "mg/dL",
    s: "b",
    min: 60,
    max: 140,
    z: [
      [70, "b"],
      [100, "o"],
      [126, "b"],
      [140, "p"],
    ],
    opt: "70–100",
    clin: "< 126",
    t: "70–100",
    m: "Just above the optimal band on a fasting sample. It moves together with HbA1c and insulin.",
    a: [WALK, DIN],
  },
  {
    id: "ins",
    g: "met",
    n: "Fasting insulin",
    v: "11.2",
    x: 11.2,
    u: "µIU/mL",
    s: "b",
    min: 0,
    max: 27,
    z: [
      [2, "b"],
      [8, "o"],
      [16, "b"],
      [27, "p"],
    ],
    opt: "2–8",
    clin: "2–25",
    t: "< 9",
    m: "The earliest signal of metabolic strain. It rises years before sugar does.",
    a: [STR, WALK],
  },
  {
    id: "tg",
    g: "met",
    n: "Triglycerides",
    v: "142",
    x: 142,
    u: "mg/dL",
    s: "b",
    min: 40,
    max: 250,
    z: [
      [100, "o"],
      [150, "b"],
      [250, "p"],
    ],
    opt: "< 100",
    clin: "< 150",
    t: "< 100",
    m: "Borderline. One of the five metabolic markers telling the same story: more muscle, earlier dinners, better sleep.",
    a: [DIN, WALK],
  },
  {
    id: "vf",
    g: "met",
    n: "Visceral fat",
    v: "11",
    x: 11,
    u: "level",
    s: "b",
    min: 1,
    max: 20,
    z: [
      [9, "o"],
      [13, "b"],
      [20, "p"],
    ],
    opt: "< 9",
    clin: "< 13",
    t: "< 9",
    m: "Deep-belly fat, in the borderline band.",
    a: [STR, DIN],
  },

  // ─── Strength, body and bone
  {
    id: "posture",
    g: "body",
    n: "Posture score",
    v: "72",
    x: 72,
    u: "/ 100",
    s: "b",
    min: 0,
    max: 100,
    z: [
      [60, "p"],
      [80, "b"],
      [100, "o"],
    ],
    opt: "> 80",
    clin: "> 60",
    t: "> 80",
    prev: "69",
    when: "6 Oct",
    m: "Three small drifts, all common at a desk: the head sits forward, the right shoulder a little low, and a mild tilt at the pelvis. All three respond to the shoulder protocol and strength work.",
    a: [
      "Four-session desk-shoulder protocol at the centre",
      "Strength sessions with Coach Ritu, with the posture cues",
      "Raise your screen to eye level and stand every 45 minutes",
    ],
    find: [
      ["p", "Forward head", "12° from the plumb line · target under 8°"],
      ["b", "Shoulder level", "right 1.5 cm lower than left"],
      ["b", "Pelvic tilt", "mild anterior tilt"],
      ["o", "Knee alignment", "neutral, both sides"],
    ],
  },
  {
    id: "smm",
    g: "body",
    n: "Skeletal muscle mass",
    v: "20.9",
    x: 20.9,
    u: "kg",
    s: "p",
    min: 16,
    max: 30,
    z: [
      [22, "p"],
      [24, "b"],
      [30, "o"],
    ],
    opt: "> 24",
    clin: "> 22",
    t: "+0.8 kg",
    m: "The organ of longevity. Your biggest and fastest-rewarding opportunity.",
    a: [
      STR,
      "Protein at every meal, 1.4 g per kg per day. A vegetarian plan is included",
    ],
  },
  {
    id: "grip",
    g: "body",
    n: "Grip strength",
    v: "24",
    x: 24,
    u: "kg",
    s: "p",
    min: 14,
    max: 40,
    z: [
      [26, "p"],
      [30, "b"],
      [40, "o"],
    ],
    opt: "> 30",
    clin: "> 26",
    t: "27 kg",
    m: "30th percentile. A top predictor of healthy ageing, and one of the fastest to improve.",
    a: [STR],
  },
  {
    id: "vo2",
    g: "body",
    n: "VO₂max",
    v: "28.4",
    x: 28.4,
    u: "mL/kg/min",
    s: "p",
    min: 18,
    max: 48,
    z: [
      [30, "p"],
      [35, "b"],
      [48, "o"],
    ],
    opt: "> 35",
    clin: "> 30",
    t: "> 31",
    m: "35th percentile. The top third for your age means meaningfully more healthy years.",
    a: ["One long walk a week, plus dance-friendly cardio", STR],
  },
  {
    id: "bmi",
    g: "body",
    n: "BMI",
    v: "26.4",
    x: 26.4,
    u: "kg/m²",
    s: "p",
    min: 15,
    max: 35,
    z: [
      [18.5, "b"],
      [23, "o"],
      [25, "b"],
      [35, "p"],
    ],
    opt: "18.5–23",
    clin: "< 25 (Asian cut-off)",
    t: "< 25",
    prev: "26.8",
    when: "6 Oct",
    m: "We use the Asian cut-offs, which are stricter than the global ones. Waist and muscle matter more than this number, and both are in your plan.",
    a: [STR, DIN, WALK],
  },
  {
    id: "bf",
    g: "body",
    n: "Body fat",
    v: "36.2",
    x: 36.2,
    u: "%",
    s: "b",
    min: 15,
    max: 45,
    z: [
      [21, "b"],
      [30, "o"],
      [35, "b"],
      [45, "p"],
    ],
    opt: "21–30",
    clin: "< 35",
    t: "< 34",
    prev: "36.5",
    when: "6 Oct",
    m: "Estimated by the camera and the body-composition scale together. It moves with muscle, so strength work is the lever.",
    a: [STR, DIN],
  },
  {
    id: "bone",
    g: "body",
    n: "Bone density (T-score)",
    v: "−0.6",
    x: -0.6,
    u: "DXA",
    s: "o",
    min: -3,
    max: 1,
    z: [
      [-2.5, "p"],
      [-1, "b"],
      [1, "o"],
    ],
    opt: "> −1.0",
    clin: "> −2.5",
    m: "Inside the optimal zone. Strength training keeps it there.",
    a: [],
  },
  {
    id: "waist",
    g: "body",
    n: "Waist",
    v: "88",
    x: 88,
    u: "cm",
    s: "p",
    min: 60,
    max: 110,
    z: [
      [80, "o"],
      [88, "b"],
      [110, "p"],
    ],
    opt: "< 80",
    clin: "South Asian cut-off",
    t: "≤ 85 cm",
    prev: "89",
    when: "6 Oct",
    m: "Waist matters more than weight. We hold you to the protective South Asian cut-off of 80 cm, not the lenient one.",
    a: [STR, WALK],
  },
  {
    id: "w2h",
    g: "body",
    n: "Waist-to-height",
    v: "0.55",
    x: 0.55,
    u: "ratio",
    s: "p",
    min: 0.35,
    max: 0.7,
    z: [
      [0.5, "o"],
      [0.55, "b"],
      [0.7, "p"],
    ],
    opt: "< 0.50",
    clin: "< 0.55",
    t: "< 0.52",
    m: "The single best shape number for metabolic risk. It moves with waist.",
    a: [STR, WALK],
  },
  {
    id: "w2hip",
    g: "body",
    n: "Waist-to-hip",
    v: "0.85",
    x: 0.85,
    u: "ratio",
    s: "b",
    min: 0.6,
    max: 1,
    z: [
      [0.8, "o"],
      [0.85, "b"],
      [1, "p"],
    ],
    opt: "< 0.80",
    clin: "< 0.85",
    m: "Borderline. Hip 104 cm, waist 88 cm.",
    a: [],
  },

  // ─── Inflammation, liver and kidney
  {
    id: "crp",
    g: "inf",
    n: "hs-CRP",
    v: "2.1",
    x: 2.1,
    u: "mg/L",
    s: "b",
    min: 0,
    max: 6,
    z: [
      [1, "o"],
      [3, "b"],
      [6, "p"],
    ],
    opt: "< 1.0",
    clin: "< 3.0",
    t: "< 1.0",
    m: "Silent inflammation, mildly raised. Expected to settle with the plan.",
    a: ["Follow the plan. It is re-checked at Day 90"],
  },
  {
    id: "alt",
    g: "inf",
    n: "ALT (liver)",
    v: "22",
    x: 22,
    u: "U/L",
    s: "o",
    min: 0,
    max: 80,
    z: [
      [30, "o"],
      [45, "b"],
      [80, "p"],
    ],
    opt: "< 30",
    clin: "< 45",
    m: "Optimal. Your liver is a quiet strength.",
    a: [],
  },
  {
    id: "cre",
    g: "inf",
    n: "Creatinine",
    v: "0.7",
    x: 0.7,
    u: "mg/dL · eGFR 104",
    s: "o",
    min: 0.3,
    max: 1.6,
    z: [
      [0.5, "b"],
      [1, "o"],
      [1.2, "b"],
      [1.6, "p"],
    ],
    opt: "0.5–1.0",
    clin: "0.5–1.2",
    m: "Excellent. A strong foundation for everything else.",
    a: [],
  },

  // ─── Hormones and nutrients
  {
    id: "vitd",
    g: "hor",
    n: "Vitamin D",
    v: "16",
    x: 16,
    u: "ng/mL",
    s: "p",
    min: 0,
    max: 80,
    z: [
      [20, "p"],
      [40, "b"],
      [60, "o"],
      [80, "b"],
    ],
    opt: "40–60",
    clin: "> 20",
    t: "> 40",
    m: "Deficient. Common in Indian women and easy to fix.",
    a: [
      "Physician-prescribed vitamin D replacement, starting this week",
      "Re-test at Day 90",
    ],
  },
  {
    id: "fer",
    g: "hor",
    n: "Ferritin",
    v: "18",
    x: 18,
    u: "ng/mL",
    s: "p",
    min: 0,
    max: 160,
    z: [
      [30, "p"],
      [50, "b"],
      [120, "o"],
      [160, "b"],
    ],
    opt: "50–120",
    clin: "> 15",
    t: "> 50",
    m: "Low iron stores quietly drain energy. This is the likely cause of your afternoon fatigue.",
    a: [
      "Physician-prescribed iron replacement, starting this week",
      "Re-test at Day 90. An iron IV is considered only if Day-30 orals underperform",
    ],
  },
  {
    id: "tsh",
    g: "hor",
    n: "TSH (thyroid)",
    v: "2.4",
    x: 2.4,
    u: "µIU/mL",
    s: "o",
    min: 0,
    max: 8,
    z: [
      [0.5, "b"],
      [3.5, "o"],
      [5, "b"],
      [8, "p"],
    ],
    opt: "0.5–3.5",
    clin: "0.4–5.0",
    m: "Your thyroid, the master metabolic dial, is in the ideal zone.",
    a: [
      "Nothing to change. It is re-measured at every re-test",
      "If it ever drifts out of range, your physician reviews it before your plan changes",
    ],
  },
  {
    id: "b12",
    g: "hor",
    n: "Vitamin B12",
    v: "260",
    x: 260,
    u: "pg/mL",
    s: "b",
    min: 100,
    max: 900,
    z: [
      [200, "p"],
      [400, "b"],
      [900, "o"],
    ],
    opt: "> 400",
    clin: "> 200",
    t: "> 400",
    m: "Inside the clinical range and below the optimal zone.",
    a: ["Raise it with your physician at your next review"],
  },
  {
    id: "hb",
    g: "hor",
    n: "Haemoglobin",
    v: "12.4",
    x: 12.4,
    u: "g/dL",
    s: "b",
    min: 9,
    max: 17,
    z: [
      [12, "p"],
      [12.5, "b"],
      [15.5, "o"],
      [17, "b"],
    ],
    opt: "12.5–15.5",
    clin: "> 12.0",
    t: "> 12.5",
    m: "Inside the clinical range, at its lower edge. Low iron stores can pull it down over time.",
    a: [
      "Start the physician-prescribed iron replacement",
      "Re-test with ferritin at Day 90",
    ],
  },

  // ─── Senses and breath
  {
    id: "fev",
    g: "sense",
    n: "FEV₁ (force of exhale)",
    v: "89",
    x: 89,
    u: "% predicted",
    s: "o",
    min: 50,
    max: 120,
    z: [
      [70, "p"],
      [80, "b"],
      [120, "o"],
    ],
    opt: "> 80%",
    clin: "> 70%",
    m: "Strong first baseline. Trainable with cardio and daily paced breathing.",
    a: [],
  },
  {
    id: "fvc",
    g: "sense",
    n: "FVC (lung capacity)",
    v: "3.10",
    x: 92,
    u: "L · 92% predicted",
    s: "o",
    min: 50,
    max: 120,
    z: [
      [70, "p"],
      [80, "b"],
      [120, "o"],
    ],
    opt: "> 80%",
    clin: "> 70%",
    m: "Strong first baseline.",
    a: [],
  },
  {
    id: "ratio",
    g: "sense",
    n: "FEV₁ / FVC",
    v: "0.82",
    x: 0.82,
    u: "ratio",
    s: "o",
    min: 0.5,
    max: 1,
    z: [
      [0.7, "p"],
      [0.75, "b"],
      [1, "o"],
    ],
    opt: "> 0.75",
    clin: "> 0.70",
    m: "No sign of airway narrowing.",
    a: [],
  },
  {
    id: "lung",
    g: "sense",
    n: "Estimated lung age",
    v: "44",
    x: 44,
    u: "years",
    s: "b",
    min: 30,
    max: 60,
    z: [
      [42, "o"],
      [47, "b"],
      [60, "p"],
    ],
    opt: "≤ 42",
    clin: "< 47",
    t: "≤ 42",
    m: "Two years ahead of the calendar, and trainable.",
    a: ["Ten minutes of slow nasal breathing every day"],
  },
  {
    id: "va",
    g: "sense",
    n: "Visual acuity",
    v: "R 6/6 · L 6/9",
    x: 0,
    u: "",
    s: "b",
    nobar: true,
    opt: "6/6 both eyes",
    clin: "Prescription check",
    m: "A small left-eye drift, common at 42. A prescription check will sharpen evening screens.",
    a: ["Book a left-eye prescription check"],
  },
  {
    id: "iop",
    g: "sense",
    n: "Eye pressure (IOP)",
    v: "14 / 15",
    x: 14.5,
    u: "mmHg",
    s: "o",
    min: 5,
    max: 30,
    z: [
      [10, "b"],
      [21, "o"],
      [30, "p"],
    ],
    opt: "10–21",
    clin: "< 21",
    m: "Normal in both eyes.",
    a: [],
  },
  {
    id: "retina",
    g: "sense",
    n: "Retinal photograph",
    v: "Healthy",
    x: 0,
    u: "vessels and nerve",
    s: "o",
    nobar: true,
    opt: "Healthy vessels, healthy nerve",
    clin: "No change",
    m: "The one place we can watch your blood vessels directly, and yours look excellent.",
    a: [],
  },
  {
    id: "strain",
    g: "sense",
    n: "Digital eye strain",
    v: "Moderate",
    x: 0,
    u: "intake + blink rate",
    s: "b",
    nobar: true,
    opt: "Low",
    clin: "20-20-20 breaks",
    m: "Prescription: 20-20-20 screen breaks. Liv will remind you.",
    a: ["20-20-20 screen breaks, reminded by Liv"],
  },
  {
    id: "hear",
    g: "sense",
    n: "Hearing thresholds",
    v: "≤ 20 dB",
    x: 0,
    u: "both ears · 4 kHz notch left",
    s: "o",
    nobar: true,
    opt: "≤ 20 dB",
    clin: "≤ 25 dB",
    m: "A faint 4 kHz dip on the left that traces earbud volume. Keep it under 60%.",
    a: ["Earbuds under 60% volume"],
  },
  {
    id: "notch",
    g: "sense",
    n: "4 kHz notch (left)",
    v: "30",
    x: 30,
    u: "dB",
    s: "b",
    min: 0,
    max: 60,
    z: [
      [20, "o"],
      [35, "b"],
      [60, "p"],
    ],
    opt: "≤ 20 dB",
    clin: "≤ 35 dB",
    m: "A faint dip that traces earbud volume. Hearing preserved is cognition preserved.",
    a: ["Earbuds under 60% volume"],
  },
  {
    id: "sin",
    g: "sense",
    n: "Speech-in-noise",
    v: "Above norm",
    x: 0,
    u: "age norm",
    s: "o",
    nobar: true,
    opt: "At or above age norm",
    clin: "Age norm",
    m: "Above the norm for your age.",
    a: [],
  },

  // ─── Brain and nervous system
  {
    id: "hr",
    g: "brain",
    n: "Resting heart rate (lab)",
    v: "68",
    x: 68,
    u: "bpm",
    s: "o",
    min: 40,
    max: 110,
    z: [
      [50, "b"],
      [70, "o"],
      [90, "b"],
      [110, "p"],
    ],
    opt: "50–70",
    clin: "60–100",
    prev: "74",
    when: "6 Oct",
    m: "Inside the optimal zone and six beats lower than last check-in. Cardio fitness pulls it down further.",
    a: [
      "One long walk a week, plus dance-friendly cardio",
      "Ten minutes of slow nasal breathing every day",
    ],
  },
  {
    id: "rt",
    g: "brain",
    n: "Reaction time",
    v: "312",
    x: 312,
    u: "ms",
    s: "b",
    min: 200,
    max: 500,
    z: [
      [300, "o"],
      [380, "b"],
      [500, "p"],
    ],
    opt: "< 300",
    clin: "< 380",
    t: "< 300",
    prev: "318",
    when: "6 Oct",
    m: "The easiest brain marker to track: a 60-second tap test on the kiosk at every check-in. Sleep and cardio fitness move it most.",
    a: [SLP, "One long walk a week, plus dance-friendly cardio"],
  },
  {
    id: "settle",
    g: "brain",
    n: "Brain settle time",
    v: "12",
    x: 12,
    u: "min after a thriller",
    s: "b",
    min: 0,
    max: 20,
    z: [
      [5, "o"],
      [10, "b"],
      [20, "p"],
    ],
    opt: "< 5",
    clin: "< 10",
    t: "< 8",
    m: "How long your alert system stays on after high-stimulation content, from the EEG session. Watched late, it becomes lost deep sleep.",
    a: [
      "Nothing high-stimulation in the last hour before bed. Liv curates the wind-down",
    ],
  },
  {
    id: "eeg",
    g: "brain",
    n: "EEG in three states",
    v: "Read",
    x: 0,
    u: "rest · meditation · thriller",
    s: "b",
    nobar: true,
    opt: "Calm idle, trainable theta",
    clin: "No abnormal rhythm",
    eeg: [
      [
        "Rest, eyes closed",
        "alpha 42% · beta 21%",
        "A brain that idles beautifully",
        1,
      ],
      [
        "Meditation, 12 min",
        "theta +18% vs rest",
        "Rising, but effortful: an untrained skill",
        2,
      ],
      ["Thriller clip", "beta 58% · slow return", "Fires hard, and lingers", 3],
    ],
    m: "Clinical-grade EEG for 24 minutes, analysed by Living Lab AI and physician-reviewed.",
    a: [
      "Nothing high-stimulation in the last hour before bed. Liv curates the wind-down",
    ],
  },
  {
    id: "rmssd",
    g: "brain",
    n: "Vagal tone (RMSSD)",
    v: "28",
    x: 28,
    u: "ms · lab ECG",
    s: "b",
    min: 5,
    max: 70,
    z: [
      [20, "p"],
      [35, "b"],
      [70, "o"],
    ],
    opt: "> 35",
    clin: "> 20",
    t: "> 35",
    m: "Your calm system is strong but under-used: at six breaths a minute it jumped 42% within minutes. Daily practice makes that your resting state.",
    a: ["Ten minutes of coherence breathing with Liv, daily"],
  },
  {
    id: "sdnn",
    g: "brain",
    n: "SDNN (overall variability)",
    v: "42",
    x: 42,
    u: "ms · lab ECG",
    s: "b",
    min: 10,
    max: 100,
    z: [
      [30, "p"],
      [50, "b"],
      [100, "o"],
    ],
    opt: "> 50",
    clin: "> 30",
    m: "Borderline on the lab recording.",
    a: [],
  },
  {
    id: "lfhf",
    g: "brain",
    n: "Sympathetic balance (LF/HF)",
    v: "2.4",
    x: 2.4,
    u: "alert-leaning",
    s: "b",
    min: 0,
    max: 5,
    z: [
      [1.5, "o"],
      [3, "b"],
      [5, "p"],
    ],
    opt: "< 1.5",
    clin: "< 3",
    t: "< 2",
    m: "Alert-leaning. Your calm system is strong but under-used.",
    a: ["Ten minutes of coherence breathing with Liv, daily"],
  },
  {
    id: "paced",
    g: "brain",
    n: "Response to paced breathing",
    v: "+42%",
    x: 0,
    u: "RMSSD at 6 breaths/min",
    s: "o",
    nobar: true,
    opt: "Strong rise",
    clin: "Any rise",
    m: "The best news on this page: at six breaths a minute your vagal tone jumped 42% within minutes.",
    a: [],
  },
  {
    id: "cort",
    g: "brain",
    n: "Morning cortisol",
    v: "18.2",
    x: 18.2,
    u: "µg/dL · 8 AM serum",
    s: "b",
    min: 2,
    max: 30,
    z: [
      [6, "p"],
      [16, "o"],
      [19.4, "b"],
      [30, "p"],
    ],
    opt: "6–16",
    clin: "6.2–19.4",
    t: "< 16",
    prev: "19.0",
    when: "6 Oct",
    m: "The blood marker of your alert system. It sits at the upper edge of normal, which matches what the EEG shows: an alert system that fires hard and lingers. It should fall as sleep, coherence breathing and the screen curfew settle in.",
    a: [
      "Ten minutes of coherence breathing with Liv, daily",
      SLP,
      "Nothing high-stimulation in the last hour before bed. Liv curates the wind-down",
    ],
  },

  // ─── Mind, sleep and recovery
  {
    id: "hrv",
    g: "mind",
    n: "HRV",
    v: "38",
    x: 38,
    u: "ms",
    s: "b",
    min: 10,
    max: 90,
    z: [
      [30, "p"],
      [45, "b"],
      [90, "o"],
    ],
    opt: "> 45",
    clin: "> 30",
    t: "> 45",
    prev: "35",
    when: "6 Oct",
    m: "Your 14-day wearable average. Short nights and late screens hold it down; coherence breathing and sleep lift it.",
    a: ["Ten minutes of coherence breathing with Liv, daily", SLP],
  },
  {
    id: "sleep",
    g: "mind",
    n: "Sleep duration",
    v: "6 h 10",
    x: 6.17,
    u: "14-day avg",
    s: "p",
    min: 4,
    max: 9,
    z: [
      [6.5, "p"],
      [7, "b"],
      [8.5, "o"],
      [9, "b"],
    ],
    opt: "7–8.5 h",
    clin: "> 6.5 h",
    t: "7 h +",
    m: "Short sleep works against Priorities 1 and 2. We treat sleep as training.",
    a: [
      "Lights out 11 PM, wake 6:45 AM",
      "60-minute pre-sleep screen curfew on high-stimulation content",
    ],
  },
  {
    id: "cog",
    g: "mind",
    n: "Cognitive screen",
    v: "Normal",
    x: 0,
    u: "attention · memory · speed",
    s: "o",
    nobar: true,
    opt: "Above age norm",
    clin: "Normal",
    m: "Attention, memory and processing speed at or above the norm for your age.",
    a: [],
  },
];

export const YEARS_CONTRIBUTORS: [string, number][] = [
  ["Glucose regulation", 1.4],
  ["ApoB and lipids", 1.1],
  ["Muscle and VO₂max", 0.9],
  ["Silent inflammation", 0.7],
  ["Vitamin D and iron", 0.6],
  ["Blood pressure", -0.3],
  ["Liver health", -0.3],
  ["Kidney function", -0.3],
];

export const SYSTEM_SCORES: [string, number][] = [
  ["Liver and kidney", 92],
  ["Senses and breath", 84],
  ["Mind, sleep and recovery", 74],
  ["Hormones and nutrients", 66],
  ["Inflammation", 64],
  ["Heart and arteries", 62],
  ["Metabolic health", 58],
  ["Strength and body", 52],
];

export interface Priority {
  t: string; // title
  sig: string; // signal
  move: string; // action
  tar: string; // Day-90 target
}

export const PRIORITIES: Priority[] = [
  {
    t: "Rebuild strength and muscle",
    sig: "Muscle 20.9 kg · grip 24 kg · VO₂max 35th percentile",
    move: "3 × 45-minute strength sessions a week at the centre, plus one long walk. Protein at every meal, 1.4 g/kg/day.",
    tar: "Grip 27 kg · +0.8 kg muscle",
  },
  {
    t: "Reset your blood sugar",
    sig: "HbA1c 5.9% · fasting insulin 11.2 · visceral fat 11",
    move: "14-day glucose sensor to find your spike foods. Carbs earlier in the day. 10-minute walks after meals.",
    tar: "HbA1c ≤ 5.7% · insulin < 9",
  },
  {
    t: "Refill what is missing, protect your heart",
    sig: "Vitamin D 16 · ferritin 18 · ApoB 102",
    move: "Physician-prescribed vitamin D and iron replacement. Fibre-forward nutrition plan targeting ApoB.",
    tar: "Vit D > 40 · ferritin > 50 · ApoB < 90",
  },
];

export interface JourneyStep {
  w: [number, number]; // week range
  when: string;
  tag: string;
  t: string; // title
  d: string; // description
  cta?: [string, string]; // [button label, target type]
  open?: boolean;
}

export interface JourneyTrack {
  id: "hm" | "inf" | "dh";
  n: string;
  short: string;
  find: string;
  mk: string[];
  goal: string;
  guide: string[];
  steps: JourneyStep[];
}

export const JOURNEY_TRACKS: JourneyTrack[] = [
  {
    id: "hm",
    n: "Hormonal and metabolic",
    short: "Blood sugar is in the early-warning band. Thyroid is ideal.",
    find: "HbA1c 5.9% and fasting insulin 11.2 sit in the early-warning band, and ApoB is raised. Your thyroid is in the ideal zone. This is the best moment to act.",
    mk: ["hba1c", "ins", "tg", "apob", "tsh"],
    goal: "HbA1c ≤ 5.7% · insulin < 9 · ApoB < 90",
    guide: [
      WALK,
      DIN,
      "Protein at every meal and three strength sessions a week",
      SLP,
    ],
    steps: [
      {
        w: [1, 1],
        when: "Week 1",
        tag: "Review",
        t: "Physician review",
        d: "Dr. Deshmukh confirms your plan against your labs.",
      },
      {
        w: [1, 2],
        when: "Weeks 1 to 2",
        tag: "Test",
        t: "14-day glucose sensor",
        d: "Finds the foods that spike your sugar.",
      },
      {
        w: [1, 12],
        when: "Every day",
        tag: "Habit",
        t: "Walk after meals, eat dinner earlier",
        d: "Tracked in your daily plan.",
      },
      {
        w: [3, 8],
        when: "Weeks 3 to 8",
        tag: "Training",
        t: "Strength sessions, three a week",
        d: "Programmed by Coach Ritu. Muscle is where glucose goes.",
        cta: ["Book a session", "coach"],
      },
      {
        w: [3, 8],
        when: "Weeks 3 to 8",
        tag: "Therapy",
        t: "Infrared sauna, three a week",
        d: "20 minutes at 55 to 60°C. Evidence: established.",
        cta: ["Book a session", "ther"],
      },
      {
        w: [4, 8],
        when: "Weeks 4 to 8",
        tag: "Therapy",
        t: "Metabolic and Hormonal Health Drip",
        d: "Only if Dr. Deshmukh prescribes it against your labs.",
        cta: ["Book, for sign-off", "svc:iv5"],
        open: true,
      },
      {
        w: [13, 13],
        when: "Day 90",
        tag: "Test",
        t: "Re-test at the kiosk",
        d: "HbA1c, insulin, lipids and ApoB, checked against your targets.",
      },
    ],
  },
  {
    id: "inf",
    n: "Inflammation",
    short: "hs-CRP is mildly raised and vitamin D is low.",
    find: "hs-CRP of 2.1 shows mild silent inflammation, and vitamin D is deficient at 16. Both are expected to settle with the plan.",
    mk: ["crp", "vitd", "vf"],
    goal: "hs-CRP < 1.0 · vitamin D > 40",
    guide: [
      FIB,
      SLP,
      "Move every day. Strength and easy cardio are both in your plan",
    ],
    steps: [
      {
        w: [1, 1],
        when: "Week 1",
        tag: "Supplement",
        t: "Start vitamin D replacement",
        d: "Dose prescribed by Dr. Deshmukh.",
      },
      {
        w: [1, 12],
        when: "Every day",
        tag: "Habit",
        t: "Fibre-forward plates and a 7-hour night",
        d: "Tracked in your daily plan.",
      },
      {
        w: [3, 8],
        when: "Weeks 3 to 8",
        tag: "Therapy",
        t: "Red-light session after training",
        d: "20 minutes of red and near-infrared light. Evidence: strong emerging.",
        cta: ["Book a session", "svc:mask"],
      },
      {
        w: [5, 5],
        when: "Day 30",
        tag: "Test",
        t: "Vitamin D and ferritin check",
        d: "Confirms the replacement is working.",
        cta: ["Book the test", "pod"],
      },
      {
        w: [5, 10],
        when: "Weeks 5 to 10",
        tag: "Therapy",
        t: "Hyperbaric oxygen, introductory block",
        d: "Ten 60-minute sessions after a safety screen. Evidence: emerging.",
        cta: ["Book a session", "ther"],
      },
      {
        w: [13, 13],
        when: "Day 90",
        tag: "Test",
        t: "Re-test at the kiosk",
        d: "hs-CRP and vitamin D, checked against your targets.",
      },
    ],
  },
  {
    id: "dh",
    n: "Derma and hair",
    short: "Refill iron and vitamin D first. Skin and hair scan pending.",
    find: "Ferritin is 18 and vitamin D is 16. Low iron stores and low vitamin D are commonly linked with hair shedding and dull skin, so we refill them before any treatment.",
    mk: ["fer", "vitd", "b12", "hb"],
    goal: "Ferritin > 50 · vitamin D > 40 · B12 > 400",
    guide: [
      "Take iron and vitamin D exactly as prescribed",
      "Protein at every meal. Hair is built from it",
      "Sunscreen SPF 30 or higher, every morning",
    ],
    steps: [
      {
        w: [1, 1],
        when: "Week 1",
        tag: "Supplement",
        t: "Start iron and vitamin D",
        d: "Doses prescribed by Dr. Deshmukh.",
      },
      {
        w: [1, 4],
        when: "This week",
        tag: "Test",
        t: "Skin and hair scan at the kiosk",
        d: "The smart camera sets your baseline for skin and scalp.",
        cta: ["Book the scan", "pod"],
        open: true,
      },
      {
        w: [2, 10],
        when: "Weeks 2 to 10",
        tag: "Therapy",
        t: "HydraFacial, once a month",
        d: "Three sessions: cleanse, extract and hydrate.",
        cta: ["Book a session", "svc:hf"],
      },
      {
        w: [4, 12],
        when: "Weeks 4 to 12",
        tag: "Therapy",
        t: "Hair growth therapy (GFC)",
        d: "Three sessions, one month apart, after a doctor consult.",
        cta: ["Book, for sign-off", "svc:gfc"],
      },
      {
        w: [4, 8],
        when: "Weeks 4 to 8",
        tag: "Therapy",
        t: "Anti-Hairfall Drip",
        d: "Only if prescribed against your labs.",
        cta: ["Book, for sign-off", "svc:iv3"],
        open: true,
      },
      {
        w: [13, 13],
        when: "Day 90",
        tag: "Test",
        t: "Re-scan and re-test",
        d: "Skin and hair scan, ferritin, vitamin D and B12.",
      },
    ],
  },
];

export interface CarePackage {
  n: string;
  len: string;
  f: string;
  inc: string[];
}

export const CARE_PACKAGES: Record<string, CarePackage> = {
  hm: {
    n: "Metabolic Reset",
    len: "12 weeks",
    f: "For HbA1c, insulin and ApoB",
    inc: [
      "2 physician reviews with Dr. Deshmukh",
      "14-day glucose sensor",
      "36 strength sessions with Coach Ritu",
      "18 infrared sauna sessions",
      "2 nutrition sessions",
      "Metabolic and Hormonal Health Drip, if prescribed",
      "Day-90 re-test at the kiosk",
    ],
  },
  inf: {
    n: "Inflammation Care",
    len: "12 weeks",
    f: "For hs-CRP and vitamin D",
    inc: [
      "Physician-led vitamin D replacement",
      "12 photobiomodulation sessions",
      "10-session hyperbaric oxygen block",
      "1 nutrition session for fibre-forward plates",
      "Day-30 and Day-90 blood tests",
    ],
  },
  dh: {
    n: "Skin and Hair Renewal",
    len: "12 weeks",
    f: "For ferritin, vitamin D and B12",
    inc: [
      "2 skin and hair scans at the kiosk",
      "Physician-led iron and vitamin D replacement",
      "3 HydraFacial sessions",
      "3 hair growth therapy (GFC) sessions",
      "Anti-Hairfall Drip, if prescribed",
      "Day-90 re-scan and re-test",
    ],
  },
};

export interface TreatmentService {
  id: string;
  cat: "skin" | "hair" | "iv";
  n: string;
  d: string;
  s: string;
  rec?: string;
  packs: number[];
  sign: boolean;
  scr?: string[];
  care: string;
}

const SCR_IV = [
  "Any allergy to medicines or vitamins?",
  "Pregnant or breastfeeding?",
  "Any kidney, liver or heart condition?",
];
const SCR_SKIN = [
  "Any active acne, eczema or open wounds on the face?",
  "Used retinoids or had a peel in the last 2 weeks?",
];

export const TREATMENTS: TreatmentService[] = [
  {
    id: "hf",
    cat: "skin",
    n: "HydraFacial",
    d: "Cleanse, extract and hydrate · 45 min",
    s: "Three-step facial that clears congestion and restores glow. Packages: The Spark (1), The Edit (3) and The Ritual (6).",
    rec: "Pairs with your iron and vitamin D refill. Skin reflects both.",
    packs: [1, 3, 6],
    sign: false,
    scr: SCR_SKIN,
    care: "No make-up for 6 hours. Sunscreen every morning. Skip active serums for 48 hours.",
  },
  {
    id: "peel",
    cat: "skin",
    n: "Chemical peel",
    d: "Medical-grade peel · 30 min",
    s: "Controlled exfoliation for tone, texture and pigmentation. Strength chosen at your consult.",
    packs: [1, 3],
    sign: true,
    scr: SCR_SKIN,
    care: "Expect light flaking for 3 to 5 days. No sun, no scrubbing, sunscreen always.",
  },
  {
    id: "mask",
    cat: "skin",
    n: "Red-light face mask",
    d: "Photobiomodulation · 20 min",
    s: "Red and near-infrared light for collagen, redness and recovery. Can be added after any facial.",
    packs: [1, 6],
    sign: false,
    care: "None needed. Drink water and skip sunbathing today.",
  },
  {
    id: "gfc",
    cat: "hair",
    n: "Hair growth therapy (GFC)",
    d: "Growth-factor concentrate · 60 min",
    s: "Growth factors from your own blood, placed into the scalp. Three sessions, one month apart.",
    rec: "For hair shedding linked to ferritin 18 and vitamin D 16. Starts once iron is refilled.",
    packs: [1, 3],
    sign: true,
    scr: ["On blood thinners or aspirin?", "Any scalp infection right now?"],
    care: "No hair wash for 24 hours. No oil, colour or heat for 3 days.",
  },
  {
    id: "prp",
    cat: "hair",
    n: "PRP hair therapy",
    d: "Platelet-rich plasma · 60 min",
    s: "Your own platelets injected into thinning areas of the scalp. Alternative to GFC.",
    packs: [1, 3],
    sign: true,
    scr: ["On blood thinners or aspirin?", "Any scalp infection right now?"],
    care: "No hair wash for 24 hours. Mild tenderness for a day is normal.",
  },
  {
    id: "iv1",
    cat: "iv",
    n: "Ultimate Glow Drip",
    d: "Glutathione and vitamin C · 45 min",
    s: "Antioxidant drip for skin brightness and recovery. Indian or Japanese glutathione tiers.",
    packs: [1, 4],
    sign: true,
    scr: SCR_IV,
    care: "Drink water for the rest of the day. Eat a normal meal.",
  },
  {
    id: "iv2",
    cat: "iv",
    n: "Anti-Ageing Drip",
    d: "NAD+ and antioxidants · 60 min",
    s: "Cellular energy and repair support for longevity programmes.",
    packs: [1, 4],
    sign: true,
    scr: SCR_IV,
    care: "Rest for the evening. Mild flushing during the drip is normal.",
  },
  {
    id: "iv3",
    cat: "iv",
    n: "Anti-Hairfall Drip",
    d: "Biotin, zinc and B-complex · 45 min",
    s: "Nutrient support for hair, given alongside iron replacement.",
    rec: "Only if Dr. Deshmukh prescribes it against your ferritin and B12.",
    packs: [1, 4],
    sign: true,
    scr: SCR_IV,
    care: "Drink water for the rest of the day.",
  },
  {
    id: "iv4",
    cat: "iv",
    n: "Weight Management Drip",
    d: "L-carnitine and B vitamins · 45 min",
    s: "Metabolic support alongside the strength and nutrition plan.",
    packs: [1, 4],
    sign: true,
    scr: SCR_IV,
    care: "Walk for 10 minutes after the drip. Eat a protein meal.",
  },
  {
    id: "iv5",
    cat: "iv",
    n: "Metabolic & Hormonal Health Drip",
    d: "Physician-prescribed blend · 60 min",
    s: "Prescribed against your HbA1c, insulin and thyroid results.",
    rec: "Part of your hormonal and metabolic journey, weeks 4 to 8.",
    packs: [1, 4],
    sign: true,
    scr: SCR_IV,
    care: "Drink water for the rest of the day. Log your evening glucose if you wear the sensor.",
  },
  {
    id: "iv6",
    cat: "iv",
    n: "Ultimate Recovery & Rejuvenation Drip",
    d: "Multivitamin and amino blend · 60 min",
    s: "For training blocks and low-energy weeks.",
    packs: [1, 4],
    sign: true,
    scr: SCR_IV,
    care: "Rest this evening.",
  },
];

export const TAPE_MEASUREMENTS: [string, string, string, "o" | "b" | "p"][] = [
  ["Waist", "88 cm", "< 80", "p"],
  ["Waist-to-height", "0.55", "< 0.50", "p"],
  ["Waist-to-hip", "0.85", "< 0.80", "b"],
  ["Hip", "104 cm", "–", "o"],
  ["Neck", "33 cm", "< 34", "o"],
  ["Mid-arm", "28 cm", "–", "o"],
  ["Mid-thigh", "55 cm", "–", "o"],
  ["Calf", "36 cm", "> 33", "o"],
];

export const THERAPIES: [string, string, string][] = [
  ["Strength coaching", "3×/week · Coach Ritu", "P1 P2 P3"],
  ["Infrared sauna chamber", "3×/week · 20 min", "P2 P3 Sleep"],
  ["Normatec lymphatic compression", "2×/week · post-training", "P1 Sleep"],
  ["Signature IV drips", "Physician-prescribed", "P2 P3"],
  ["Hyperbaric oxygen (HBOT)", "10-session block", "P1 P3"],
  ["Photobiomodulation", "12 min after training", "P1 Sleep"],
  ["Focused recovery tech", "4-session shoulder protocol", "P1 Sleep"],
  ["Coherence breathing with Liv", "10 min daily · HRV-tracked", "P2 Sleep"],
];

export const BADGE_DEFINITIONS: Record<string, [string, string]> = {
  first: ["First session", "Strength with Coach Ritu"],
  streak7: ["7-day streak", "Every step, every day"],
  vitd: ["Vitamin D started", "Week 1 refill"],
  sensor: ["Sensor week", "14 days of glucose data"],
  day: ["Day done", "All three things, one day"],
  three: ["Three a week", "Strength, three times in a week"],
  step: ["Journey step", "A plan step completed"],
  p400: ["400 points", "Reward unlocked at the centre"],
  twelve: ["12 sessions", "Four weeks of strength"],
  d90: ["Day 90", "Re-test done"],
};

export const REPORT_CHAPTERS = [
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
  "Your next 90 days",
  "Methods, rights and sign-off",
];

export const CHAPTER_SYSTEM_MAP: [string, string, string, number][] = [
  [
    "heart",
    "Your blood pressure and lifetime genetics are on your side. ApoB is the one number to move.",
    "Heart and arteries",
    62,
  ],
  [
    "met",
    "Five markers tell one story: more muscle, earlier dinners, better sleep. It is asking early, which is a gift.",
    "Metabolic health",
    58,
  ],
  [
    "body",
    "Nothing predicts a long, energetic life like muscle and cardio fitness, and nothing responds faster to training.",
    "Strength, body and bone",
    52,
  ],
  [
    "inf",
    "Silent inflammation is mildly raised; your filtration organs are excellent.",
    "Inflammation, liver and kidney",
    78,
  ],
  [
    "hor",
    "Your thyroid, the master metabolic dial, is ideal. Vitamin D and iron are the fixable gaps.",
    "Hormones and nutrients",
    66,
  ],
  [
    "sense",
    "Eyes, ears and lungs: the systems that quietly shape how you experience every year you gain.",
    "Senses and breath",
    84,
  ],
  [
    "brain",
    "Clinical-grade EEG in three states and a laboratory heart-rhythm recording: two windows into how your nervous system works, and rests.",
    "Your brain, recorded",
    74,
  ],
  [
    "mind",
    "Cognition is above the age norm. Sleep is the keystone habit that multiplies everything else.",
    "Mind, sleep and recovery",
    74,
  ],
];

export const PLAIN_EXPLANATIONS: Record<string, string> = {
  heart:
    "Your heart page is mostly good news. Blood pressure is a touch above ideal, and Lp(a), the genetic one, is low, which never changes. The single number to move is ApoB at 102. Think of it as the count of particles that can clog arteries. Fibre-forward meals and strength work bring it down, and we re-check it on Day 90.",
  met:
    "Five numbers here tell one story. Your HbA1c is 5.9, which is the early-warning band, not the diabetes band. Insulin is a little high, which is the earliest signal of all. This is the best possible moment to act: walks after meals, earlier dinners and more muscle reverse this in most women within one or two re-tests.",
  body:
    "This is your biggest lever. Muscle is 20.9 kg and grip is 24 kg, both below where we want them, and they respond faster than anything else on the report. Three strength sessions a week with Coach Ritu is the whole plan here. Your bones are fine. The waist number matters more than the weight number.",
  inf:
    "Your liver and kidneys are excellent, a quiet superpower. hs-CRP at 2.1 is mild silent inflammation. It is expected to settle as sleep, fibre and training come in. Nothing to do on its own.",
  hor:
    "Your thyroid is ideal, so energy is not a thyroid story. Vitamin D at 16 and ferritin at 18 are the two gaps, and they are the likely reason for your afternoon dips. Both are easy refills that started in week 1.",
  sense:
    "Eyes, ears and lungs are a strong first baseline. A small left-eye drift is worth a prescription check, the faint 4 kHz dip on the left says keep earbuds under 60%, and your lungs are two years younger than you are.",
  brain:
    "Your brain idles beautifully at rest. The one pattern to watch is that after high-stimulation content your alert system stays on for about 12 minutes, and your morning cortisol sits at the top of normal, which says the same thing in blood. Ten minutes of coherence breathing a day is the fix, and your body already showed it can do it: vagal tone jumped 42% within minutes.",
  mind:
    "Cognition is above the age norm. Sleep is the keystone: 6 hours 10 minutes on average, and short nights push up next-day glucose. Lights out at 11, wake at 6:45, and the HRV number will climb on its own.",
};

export const WEEK_RHYTHM: [string, string, string][] = [
  ["Sun", "Rest day", "Dance, rest, family. Fully off"],
  ["Mon", "Strength session", "45 min · programmed for you"],
  ["Tue", "Post-dinner walk", "Easy pace, 20 minutes"],
  ["Wed", "Strength session", "45 min · programmed for you"],
  ["Thu", "Long walk", "45 minutes at an easy pace"],
  ["Fri", "Strength session", "45 min · programmed for you"],
  ["Sat", "Recovery session", "At the centre, as prescribed"],
];

const nowDow = new Date().getDay();
export const DEFAULT_HABITS: [string, string, string][] = [
  ["main", WEEK_RHYTHM[nowDow][1], WEEK_RHYTHM[nowDow][2]],
  ["pro", "Protein at every meal", "Vegetarian plan in your app"],
  ["sup", "Vitamin D and iron", "As prescribed by Dr. Deshmukh"],
  ["sleep", "Lights out by 11 PM", "Wake 6:45 AM · 7 hours protected"],
];

export interface NextStepResult {
  t: JourneyTrack;
  s: JourneyStep;
  i: number;
  p: number;
  key: string;
}

export function getNextStep(weekNumber: number, completedSteps: Record<string, boolean> = {}): NextStepResult | null {
  let best: NextStepResult | null = null;
  JOURNEY_TRACKS.forEach((t) => {
    t.steps.forEach((s, i) => {
      const isDone = completedSteps[`${t.id}:${i}`];
      let state: "done" | "now" | "up" = "up";
      if (isDone) state = "done";
      else if (s.open) state = s.w[0] <= weekNumber ? "now" : "up";
      else if (s.w[1] < weekNumber) state = "done";
      else state = s.w[0] <= weekNumber ? "now" : "up";

      if (state === "now" && s.cta) {
        const priority = (s.open ? 0 : 100) + s.w[0];
        if (!best || priority < best.p) {
          best = { t, s, i, p: priority, key: `${t.id}:${i}` };
        }
      }
    });
  });
  return best;
}

export const VISIT_TYPES: Record<string, [string, string]> = {
  doc: ["Physician review", "Dr. A. Deshmukh · 20 min"],
  coach: ["Coach session", "Ritu S. · 30 min"],
  pod: ["Kiosk screening", "Living Lab kiosk at the centre · 30 min"],
  thx: ["Nutrition session", "Protein and iron-rich food plan · 30 min"],
  ther: [
    "Therapy session",
    "Sauna, light, HydraFacial, HBOT or drip · at the centre",
  ],
};

export const TIME_SLOTS = [
  "9:00 AM",
  "10:30 AM",
  "12:00 PM",
  "4:00 PM",
  "5:30 PM",
  "6:30 PM",
];

// Helper functions for math & rendering
export function getEcgPath(w: number, h: number, beats: number, amp = 1): string {
  const base = h * 0.62;
  const bw = w / beats;
  let p = `M0 ${base}`;
  let x = 0;
  for (let i = 0; i < beats; i++) {
    const s = x;
    const u = bw / 100;
    p += ` L${s + 8 * u} ${base} Q${s + 13 * u} ${base - 7 * amp} ${s + 18 * u} ${base}`;
    p += ` L${s + 26 * u} ${base} L${s + 29 * u} ${base + 4 * amp} L${s + 32 * u} ${base - 34 * amp}`;
    p += ` L${s + 35 * u} ${base + 9 * amp} L${s + 38 * u} ${base}`;
    p += ` L${s + 50 * u} ${base} Q${s + 60 * u} ${base - 12 * amp} ${s + 70 * u} ${base}`;
    p += ` L${s + 100 * u} ${base}`;
    x += bw;
  }
  return p;
}

export function getEegSvgPath(w: number, h: number, k: number): string {
  let p = `M0 15`;
  let x = 0;
  while (x < w) {
    x += k === 1 ? 6 : k === 2 ? 9 : 2.5;
    const yOffset =
      k === 3
        ? Math.random() * 16 - 8
        : Math.sin(x / (k === 1 ? 3 : 5)) * (k === 1 ? 7 : 9);
    p += ` L${x} ${15 + yOffset}`;
  }
  return p;
}

export function getMarkerById(id: string): Biomarker | undefined {
  return BIOMARKERS.find((m) => m.id === id);
}

export function getTrackById(id: string): JourneyTrack | undefined {
  return JOURNEY_TRACKS.find((t) => t.id === id);
}

export function getTreatmentById(id: string): TreatmentService | undefined {
  return TREATMENTS.find((t) => t.id === id);
}

export function getTrackForMarker(marker: Biomarker): JourneyTrack {
  const found = JOURNEY_TRACKS.find((t) => t.mk.includes(marker.id));
  if (found) return found;
  if (marker.g === "inf") return JOURNEY_TRACKS[1];
  if (marker.g === "hor") return JOURNEY_TRACKS[2];
  return JOURNEY_TRACKS[0];
}
