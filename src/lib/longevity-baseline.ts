// ─── Liv Living Lab 52 Longevity Biomarkers Baseline ─────────────────────────
// Complete clinical-grade reference dataset from Living Lab kiosk screening

export interface LongevityMarker {
  id: string;
  g: 'heart' | 'met' | 'body' | 'inf' | 'hor' | 'sense' | 'brain' | 'mind';
  n: string;
  v: string;
  x: number;
  u: string;
  s: 'p' | 'b' | 'o';
  min?: number;
  max?: number;
  z?: Array<[number, 'p' | 'b' | 'o']>;
  nobar?: boolean;
  opt: string;
  clin: string;
  t?: string;
  prev?: string;
  when?: string;
  m: string;
  a: string[];
  iv?: Array<[string, string]>;
  find?: Array<[string, string, string]>;
  eeg?: Array<any>;
}

export interface LongevityGroup {
  id: string;
  name: string;
}

export const LONGEVITY_GROUPS: LongevityGroup[] = [
  {
    "id": "heart",
    "name": "Heart and arteries"
  },
  {
    "id": "met",
    "name": "Metabolic health"
  },
  {
    "id": "body",
    "name": "Strength, body and bone"
  },
  {
    "id": "inf",
    "name": "Inflammation, liver and kidney"
  },
  {
    "id": "hor",
    "name": "Hormones and nutrients"
  },
  {
    "id": "sense",
    "name": "Senses and breath"
  },
  {
    "id": "brain",
    "name": "Brain and nervous system"
  },
  {
    "id": "mind",
    "name": "Mind, sleep and recovery"
  }
];

export const LONGEVITY_MARKERS: LongevityMarker[] = [
  {
    "id": "ecg",
    "g": "heart",
    "n": "ECG rhythm",
    "v": "Normal",
    "x": 0,
    "u": "lead-I · 30 s",
    "s": "o",
    "nobar": true,
    "prev": "Normal",
    "when": "6 Oct",
    "opt": "Regular sinus rhythm",
    "clin": "No arrhythmia",
    "m": "A regular sinus rhythm. Every interval sits inside its normal window, so the heart's electrical timing is as it should be. Recorded on the kiosk ECG at every check-in and read by the physician.",
    "a": [
      "Nothing to change. It is recorded again at your next check-in"
    ],
    "iv": [
      [
        "68",
        "bpm"
      ],
      [
        "152",
        "PR ms"
      ],
      [
        "88",
        "QRS ms"
      ],
      [
        "398",
        "QTc ms"
      ]
    ]
  },
  {
    "id": "hr",
    "g": "brain",
    "n": "Resting heart rate (lab)",
    "v": "68",
    "x": 68,
    "u": "bpm",
    "s": "o",
    "min": 40,
    "max": 110,
    "z": [
      [
        50,
        "b"
      ],
      [
        70,
        "o"
      ],
      [
        90,
        "b"
      ],
      [
        110,
        "p"
      ]
    ],
    "opt": "50–70",
    "clin": "60–100",
    "prev": "74",
    "when": "6 Oct",
    "m": "Inside the optimal zone and six beats lower than last check-in. Cardio fitness pulls it down further.",
    "a": [
      "One long walk a week, plus dance-friendly cardio",
      "Ten minutes of slow nasal breathing every day"
    ]
  },
  {
    "id": "posture",
    "g": "body",
    "n": "Posture score",
    "v": "72",
    "x": 72,
    "u": "/ 100",
    "s": "b",
    "min": 0,
    "max": 100,
    "z": [
      [
        60,
        "p"
      ],
      [
        80,
        "b"
      ],
      [
        100,
        "o"
      ]
    ],
    "opt": "> 80",
    "clin": "> 60",
    "t": "> 80",
    "prev": "69",
    "when": "6 Oct",
    "m": "Three small drifts, all common at a desk: the head sits forward, the right shoulder a little low, and a mild tilt at the pelvis. All three respond to the shoulder protocol and strength work.",
    "a": [
      "Four-session desk-shoulder protocol at the centre",
      "Strength sessions with Coach Ritu, with the posture cues",
      "Raise your screen to eye level and stand every 45 minutes"
    ],
    "find": [
      [
        "p",
        "Forward head",
        "12° from the plumb line · target under 8°"
      ],
      [
        "b",
        "Shoulder level",
        "right 1.5 cm lower than left"
      ],
      [
        "b",
        "Pelvic tilt",
        "mild anterior tilt"
      ],
      [
        "o",
        "Knee alignment",
        "neutral, both sides"
      ]
    ]
  },
  {
    "id": "bf",
    "g": "body",
    "n": "Body fat",
    "v": "36.2",
    "x": 36.2,
    "u": "%",
    "s": "b",
    "min": 15,
    "max": 45,
    "z": [
      [
        21,
        "b"
      ],
      [
        30,
        "o"
      ],
      [
        35,
        "b"
      ],
      [
        45,
        "p"
      ]
    ],
    "opt": "21–30",
    "clin": "< 35",
    "t": "< 34",
    "prev": "36.5",
    "when": "6 Oct",
    "m": "Estimated by the camera and the body-composition scale together. It moves with muscle, so strength work is the lever.",
    "a": [
      "Three 45-minute strength sessions a week with Coach Ritu",
      "Front-load carbs earlier in the day and eat dinner earlier"
    ]
  },
  {
    "id": "bone",
    "g": "body",
    "n": "Bone density (T-score)",
    "v": "−0.6",
    "x": -0.6,
    "u": "DXA",
    "s": "o",
    "min": -3,
    "max": 1,
    "z": [
      [
        -2.5,
        "p"
      ],
      [
        -1,
        "b"
      ],
      [
        1,
        "o"
      ]
    ],
    "opt": "> −1.0",
    "clin": "> −2.5",
    "m": "Inside the optimal zone. Strength training keeps it there.",
    "a": []
  },
  {
    "id": "bmi",
    "g": "body",
    "n": "BMI",
    "v": "26.4",
    "x": 26.4,
    "u": "kg/m²",
    "s": "p",
    "min": 15,
    "max": 35,
    "z": [
      [
        18.5,
        "b"
      ],
      [
        23,
        "o"
      ],
      [
        25,
        "b"
      ],
      [
        35,
        "p"
      ]
    ],
    "opt": "18.5–23",
    "clin": "< 25 (Asian cut-off)",
    "t": "< 25",
    "prev": "26.8",
    "when": "6 Oct",
    "m": "We use the Asian cut-offs, which are stricter than the global ones. Waist and muscle matter more than this number, and both are in your plan.",
    "a": [
      "Three 45-minute strength sessions a week with Coach Ritu",
      "Front-load carbs earlier in the day and eat dinner earlier",
      "Walk for 10 minutes after each main meal"
    ]
  },
  {
    "id": "hba1c",
    "g": "met",
    "n": "HbA1c",
    "v": "5.9",
    "x": 5.9,
    "u": "%",
    "s": "b",
    "min": 4.6,
    "max": 7,
    "z": [
      [
        5.6,
        "o"
      ],
      [
        6.5,
        "b"
      ],
      [
        7,
        "p"
      ]
    ],
    "opt": "< 5.6",
    "clin": "< 6.5",
    "t": "≤ 5.7%",
    "m": "The early-warning band, not the diabetes band. Caught at the right time. In most women this fully reverses within one to two re-test cycles.",
    "a": [
      "Walk for 10 minutes after each main meal",
      "Front-load carbs earlier in the day and eat dinner earlier",
      "Wear the 14-day glucose sensor to find your personal spike foods",
      "Protect a 7-hour night. Short nights raise next-day glucose"
    ]
  },
  {
    "id": "glu",
    "g": "met",
    "n": "Fasting glucose",
    "v": "104",
    "x": 104,
    "u": "mg/dL",
    "s": "b",
    "min": 60,
    "max": 140,
    "z": [
      [
        70,
        "b"
      ],
      [
        100,
        "o"
      ],
      [
        126,
        "b"
      ],
      [
        140,
        "p"
      ]
    ],
    "opt": "70–100",
    "clin": "< 126",
    "t": "70–100",
    "m": "Just above the optimal band on a fasting sample. It moves together with HbA1c and insulin.",
    "a": [
      "Walk for 10 minutes after each main meal",
      "Front-load carbs earlier in the day and eat dinner earlier"
    ]
  },
  {
    "id": "ins",
    "g": "met",
    "n": "Fasting insulin",
    "v": "11.2",
    "x": 11.2,
    "u": "µIU/mL",
    "s": "b",
    "min": 0,
    "max": 27,
    "z": [
      [
        2,
        "b"
      ],
      [
        8,
        "o"
      ],
      [
        16,
        "b"
      ],
      [
        27,
        "p"
      ]
    ],
    "opt": "2–8",
    "clin": "2–25",
    "t": "< 9",
    "m": "The earliest signal of metabolic strain. It rises years before sugar does.",
    "a": [
      "Three 45-minute strength sessions a week with Coach Ritu",
      "Walk for 10 minutes after each main meal"
    ]
  },
  {
    "id": "tg",
    "g": "met",
    "n": "Triglycerides",
    "v": "142",
    "x": 142,
    "u": "mg/dL",
    "s": "b",
    "min": 40,
    "max": 250,
    "z": [
      [
        100,
        "o"
      ],
      [
        150,
        "b"
      ],
      [
        250,
        "p"
      ]
    ],
    "opt": "< 100",
    "clin": "< 150",
    "t": "< 100",
    "m": "Borderline. One of the five metabolic markers telling the same story: more muscle, earlier dinners, better sleep.",
    "a": [
      "Front-load carbs earlier in the day and eat dinner earlier",
      "Walk for 10 minutes after each main meal"
    ]
  },
  {
    "id": "apob",
    "g": "heart",
    "n": "ApoB",
    "v": "102",
    "x": 102,
    "u": "mg/dL",
    "s": "p",
    "min": 40,
    "max": 140,
    "z": [
      [
        80,
        "o"
      ],
      [
        100,
        "b"
      ],
      [
        140,
        "p"
      ]
    ],
    "opt": "< 80",
    "clin": "< 130",
    "t": "< 90",
    "m": "The best count of artery-clogging particles. Moderately raised, and your clearest lever for long-term heart protection.",
    "a": [
      "Fibre-forward plates: oats, legumes, isabgol and nuts",
      "Three 45-minute strength sessions a week with Coach Ritu",
      "If lifestyle alone does not reach 90 by Day 90, Dr. Deshmukh will discuss next options with you"
    ]
  },
  {
    "id": "ldl",
    "g": "heart",
    "n": "LDL cholesterol",
    "v": "128",
    "x": 128,
    "u": "mg/dL",
    "s": "b",
    "min": 40,
    "max": 190,
    "z": [
      [
        100,
        "o"
      ],
      [
        130,
        "b"
      ],
      [
        190,
        "p"
      ]
    ],
    "opt": "< 100",
    "clin": "< 130",
    "t": "< 100",
    "m": "Borderline. It tracks with ApoB, which is the number your plan targets.",
    "a": [
      "Fibre-forward plates: oats, legumes, isabgol and nuts"
    ]
  },
  {
    "id": "hdl",
    "g": "heart",
    "n": "HDL cholesterol",
    "v": "52",
    "x": 52,
    "u": "mg/dL",
    "s": "o",
    "min": 20,
    "max": 100,
    "z": [
      [
        40,
        "p"
      ],
      [
        50,
        "b"
      ],
      [
        100,
        "o"
      ]
    ],
    "opt": "> 50",
    "clin": "> 40",
    "m": "In the optimal zone. Protect it.",
    "a": []
  },
  {
    "id": "lpa",
    "g": "heart",
    "n": "Lipoprotein(a)",
    "v": "18",
    "x": 18,
    "u": "mg/dL",
    "s": "o",
    "min": 0,
    "max": 100,
    "z": [
      [
        30,
        "o"
      ],
      [
        50,
        "b"
      ],
      [
        100,
        "p"
      ]
    ],
    "opt": "< 30",
    "clin": "< 50",
    "m": "Genetically set and measured once. Yours is low, which is good news that never changes.",
    "a": []
  },
  {
    "id": "bp",
    "g": "heart",
    "n": "Blood pressure",
    "v": "122 / 81",
    "x": 122,
    "u": "mmHg",
    "s": "b",
    "min": 90,
    "max": 170,
    "z": [
      [
        120,
        "o"
      ],
      [
        140,
        "b"
      ],
      [
        170,
        "p"
      ]
    ],
    "opt": "< 120 / 80",
    "clin": "< 140 / 90",
    "t": "< 120 / 80",
    "m": "Just above optimal and well inside the clinical range.",
    "a": [
      "Ten minutes of slow nasal breathing every day",
      "Cardio and strength sessions as planned"
    ],
    "prev": "126 / 84",
    "when": "6 Oct"
  },
  {
    "id": "hb",
    "g": "hor",
    "n": "Haemoglobin",
    "v": "12.4",
    "x": 12.4,
    "u": "g/dL",
    "s": "b",
    "min": 9,
    "max": 17,
    "z": [
      [
        12,
        "p"
      ],
      [
        12.5,
        "b"
      ],
      [
        15.5,
        "o"
      ],
      [
        17,
        "b"
      ]
    ],
    "opt": "12.5–15.5",
    "clin": "> 12.0",
    "t": "> 12.5",
    "m": "Inside the clinical range, at its lower edge. Low iron stores can pull it down over time.",
    "a": [
      "Start the physician-prescribed iron replacement",
      "Re-test with ferritin at Day 90"
    ]
  },
  {
    "id": "fer",
    "g": "hor",
    "n": "Ferritin",
    "v": "18",
    "x": 18,
    "u": "ng/mL",
    "s": "p",
    "min": 0,
    "max": 160,
    "z": [
      [
        30,
        "p"
      ],
      [
        50,
        "b"
      ],
      [
        120,
        "o"
      ],
      [
        160,
        "b"
      ]
    ],
    "opt": "50–120",
    "clin": "> 15",
    "t": "> 50",
    "m": "Low iron stores quietly drain energy. This is the likely cause of your afternoon fatigue.",
    "a": [
      "Physician-prescribed iron replacement, starting this week",
      "Re-test at Day 90. An iron IV is considered only if Day-30 orals underperform"
    ]
  },
  {
    "id": "vitd",
    "g": "hor",
    "n": "Vitamin D",
    "v": "16",
    "x": 16,
    "u": "ng/mL",
    "s": "p",
    "min": 0,
    "max": 80,
    "z": [
      [
        20,
        "p"
      ],
      [
        40,
        "b"
      ],
      [
        60,
        "o"
      ],
      [
        80,
        "b"
      ]
    ],
    "opt": "40–60",
    "clin": "> 20",
    "t": "> 40",
    "m": "Deficient. Common in Indian women and easy to fix.",
    "a": [
      "Physician-prescribed vitamin D replacement, starting this week",
      "Re-test at Day 90"
    ]
  },
  {
    "id": "b12",
    "g": "hor",
    "n": "Vitamin B12",
    "v": "260",
    "x": 260,
    "u": "pg/mL",
    "s": "b",
    "min": 100,
    "max": 900,
    "z": [
      [
        200,
        "p"
      ],
      [
        400,
        "b"
      ],
      [
        900,
        "o"
      ]
    ],
    "opt": "> 400",
    "clin": "> 200",
    "t": "> 400",
    "m": "Inside the clinical range and below the optimal zone.",
    "a": [
      "Raise it with your physician at your next review"
    ]
  },
  {
    "id": "tsh",
    "g": "hor",
    "n": "TSH (thyroid)",
    "v": "2.4",
    "x": 2.4,
    "u": "µIU/mL",
    "s": "o",
    "min": 0,
    "max": 8,
    "z": [
      [
        0.5,
        "b"
      ],
      [
        3.5,
        "o"
      ],
      [
        5,
        "b"
      ],
      [
        8,
        "p"
      ]
    ],
    "opt": "0.5–3.5",
    "clin": "0.4–5.0",
    "m": "Your thyroid, the master metabolic dial, is in the ideal zone.",
    "a": [
      "Nothing to change. It is re-measured at every re-test",
      "If it ever drifts out of range, your physician reviews it before your plan changes"
    ]
  },
  {
    "id": "crp",
    "g": "inf",
    "n": "hs-CRP",
    "v": "2.1",
    "x": 2.1,
    "u": "mg/L",
    "s": "b",
    "min": 0,
    "max": 6,
    "z": [
      [
        1,
        "o"
      ],
      [
        3,
        "b"
      ],
      [
        6,
        "p"
      ]
    ],
    "opt": "< 1.0",
    "clin": "< 3.0",
    "t": "< 1.0",
    "m": "Silent inflammation, mildly raised. Expected to settle with the plan.",
    "a": [
      "Follow the plan. It is re-checked at Day 90"
    ]
  },
  {
    "id": "alt",
    "g": "inf",
    "n": "ALT (liver)",
    "v": "22",
    "x": 22,
    "u": "U/L",
    "s": "o",
    "min": 0,
    "max": 80,
    "z": [
      [
        30,
        "o"
      ],
      [
        45,
        "b"
      ],
      [
        80,
        "p"
      ]
    ],
    "opt": "< 30",
    "clin": "< 45",
    "m": "Optimal. Your liver is a quiet strength.",
    "a": []
  },
  {
    "id": "cre",
    "g": "inf",
    "n": "Creatinine",
    "v": "0.7",
    "x": 0.7,
    "u": "mg/dL · eGFR 104",
    "s": "o",
    "min": 0.3,
    "max": 1.6,
    "z": [
      [
        0.5,
        "b"
      ],
      [
        1,
        "o"
      ],
      [
        1.2,
        "b"
      ],
      [
        1.6,
        "p"
      ]
    ],
    "opt": "0.5–1.0",
    "clin": "0.5–1.2",
    "m": "Excellent. A strong foundation for everything else.",
    "a": []
  },
  {
    "id": "smm",
    "g": "body",
    "n": "Skeletal muscle mass",
    "v": "20.9",
    "x": 20.9,
    "u": "kg",
    "s": "p",
    "min": 16,
    "max": 30,
    "z": [
      [
        22,
        "p"
      ],
      [
        24,
        "b"
      ],
      [
        30,
        "o"
      ]
    ],
    "opt": "> 24",
    "clin": "> 22",
    "t": "+0.8 kg",
    "m": "The organ of longevity. Your biggest and fastest-rewarding opportunity.",
    "a": [
      "Three 45-minute strength sessions a week with Coach Ritu",
      "Protein at every meal, 1.4 g per kg per day. A vegetarian plan is included"
    ]
  },
  {
    "id": "grip",
    "g": "body",
    "n": "Grip strength",
    "v": "24",
    "x": 24,
    "u": "kg",
    "s": "p",
    "min": 14,
    "max": 40,
    "z": [
      [
        26,
        "p"
      ],
      [
        30,
        "b"
      ],
      [
        40,
        "o"
      ]
    ],
    "opt": "> 30",
    "clin": "> 26",
    "t": "27 kg",
    "m": "30th percentile. A top predictor of healthy ageing, and one of the fastest to improve.",
    "a": [
      "Three 45-minute strength sessions a week with Coach Ritu"
    ]
  },
  {
    "id": "vo2",
    "g": "body",
    "n": "VO₂max",
    "v": "28.4",
    "x": 28.4,
    "u": "mL/kg/min",
    "s": "p",
    "min": 18,
    "max": 48,
    "z": [
      [
        30,
        "p"
      ],
      [
        35,
        "b"
      ],
      [
        48,
        "o"
      ]
    ],
    "opt": "> 35",
    "clin": "> 30",
    "m": "35th percentile. The top third for your age means meaningfully more healthy years.",
    "a": [
      "One long walk a week, plus dance-friendly cardio",
      "Three 45-minute strength sessions a week with Coach Ritu"
    ]
  },
  {
    "id": "vf",
    "g": "met",
    "n": "Visceral fat",
    "v": "11",
    "x": 11,
    "u": "level",
    "s": "b",
    "min": 1,
    "max": 20,
    "z": [
      [
        9,
        "o"
      ],
      [
        13,
        "b"
      ],
      [
        20,
        "p"
      ]
    ],
    "opt": "< 9",
    "clin": "< 13",
    "t": "< 9",
    "m": "Deep-belly fat, in the borderline band.",
    "a": [
      "Three 45-minute strength sessions a week with Coach Ritu",
      "Front-load carbs earlier in the day and eat dinner earlier"
    ]
  },
  {
    "id": "waist",
    "g": "body",
    "n": "Waist",
    "v": "88",
    "x": 88,
    "u": "cm",
    "s": "p",
    "min": 60,
    "max": 110,
    "z": [
      [
        80,
        "o"
      ],
      [
        88,
        "b"
      ],
      [
        110,
        "p"
      ]
    ],
    "opt": "< 80",
    "clin": "South Asian cut-off",
    "t": "≤ 85 cm",
    "m": "Waist matters more than weight. We hold you to the protective South Asian cut-off of 80 cm, not the lenient one.",
    "a": [
      "Three 45-minute strength sessions a week with Coach Ritu",
      "Walk for 10 minutes after each main meal"
    ],
    "prev": "89",
    "when": "6 Oct"
  },
  {
    "id": "w2h",
    "g": "body",
    "n": "Waist-to-height",
    "v": "0.55",
    "x": 0.55,
    "u": "ratio",
    "s": "p",
    "min": 0.35,
    "max": 0.7,
    "z": [
      [
        0.5,
        "o"
      ],
      [
        0.55,
        "b"
      ],
      [
        0.7,
        "p"
      ]
    ],
    "opt": "< 0.50",
    "clin": "< 0.55",
    "t": "< 0.52",
    "m": "The single best shape number for metabolic risk. It moves with waist.",
    "a": [
      "Three 45-minute strength sessions a week with Coach Ritu",
      "Walk for 10 minutes after each main meal"
    ]
  },
  {
    "id": "w2hip",
    "g": "body",
    "n": "Waist-to-hip",
    "v": "0.85",
    "x": 0.85,
    "u": "ratio",
    "s": "b",
    "min": 0.6,
    "max": 1,
    "z": [
      [
        0.8,
        "o"
      ],
      [
        0.85,
        "b"
      ],
      [
        1,
        "p"
      ]
    ],
    "opt": "< 0.80",
    "clin": "< 0.85",
    "m": "Borderline. Hip 104 cm, waist 88 cm.",
    "a": []
  },
  {
    "id": "hrv",
    "g": "mind",
    "n": "HRV",
    "v": "38",
    "x": 38,
    "u": "ms",
    "s": "b",
    "min": 10,
    "max": 90,
    "z": [
      [
        30,
        "p"
      ],
      [
        45,
        "b"
      ],
      [
        90,
        "o"
      ]
    ],
    "opt": "> 45",
    "clin": "> 30",
    "t": "> 45",
    "prev": "35",
    "when": "6 Oct",
    "m": "Your 14-day wearable average. Short nights and late screens hold it down; coherence breathing and sleep lift it.",
    "a": [
      "Ten minutes of coherence breathing with Liv, daily",
      "Protect a 7-hour night. Short nights raise next-day glucose"
    ]
  },
  {
    "id": "sleep",
    "g": "mind",
    "n": "Sleep duration",
    "v": "6 h 10",
    "x": 6.17,
    "u": "14-day avg",
    "s": "p",
    "min": 4,
    "max": 9,
    "z": [
      [
        6.5,
        "p"
      ],
      [
        7,
        "b"
      ],
      [
        8.5,
        "o"
      ],
      [
        9,
        "b"
      ]
    ],
    "opt": "7–8.5 h",
    "clin": "> 6.5 h",
    "t": "7 h +",
    "m": "Short sleep works against Priorities 1 and 2. We treat sleep as training.",
    "a": [
      "Lights out 11 PM, wake 6:45 AM",
      "60-minute pre-sleep screen curfew on high-stimulation content"
    ]
  },
  {
    "id": "cog",
    "g": "mind",
    "n": "Cognitive screen",
    "v": "Normal",
    "x": 0,
    "u": "attention · memory · speed",
    "s": "o",
    "nobar": true,
    "opt": "Above age norm",
    "clin": "Normal",
    "m": "Attention, memory and processing speed at or above the norm for your age.",
    "a": []
  },
  {
    "id": "rt",
    "g": "brain",
    "n": "Reaction time",
    "v": "312",
    "x": 312,
    "u": "ms",
    "s": "b",
    "min": 200,
    "max": 500,
    "z": [
      [
        300,
        "o"
      ],
      [
        380,
        "b"
      ],
      [
        500,
        "p"
      ]
    ],
    "opt": "< 300",
    "clin": "< 380",
    "t": "< 300",
    "prev": "318",
    "when": "6 Oct",
    "m": "The easiest brain marker to track: a 60-second tap test on the kiosk at every check-in. Sleep and cardio fitness move it most.",
    "a": [
      "Protect a 7-hour night. Short nights raise next-day glucose",
      "One long walk a week, plus dance-friendly cardio"
    ]
  },
  {
    "id": "settle",
    "g": "brain",
    "n": "Brain settle time",
    "v": "12",
    "x": 12,
    "u": "min after a thriller",
    "s": "b",
    "min": 0,
    "max": 20,
    "z": [
      [
        5,
        "o"
      ],
      [
        10,
        "b"
      ],
      [
        20,
        "p"
      ]
    ],
    "opt": "< 5",
    "clin": "< 10",
    "t": "< 8",
    "m": "How long your alert system stays on after high-stimulation content, from the EEG session. Watched late, it becomes lost deep sleep.",
    "a": [
      "Nothing high-stimulation in the last hour before bed. Liv curates the wind-down"
    ]
  },
  {
    "id": "eeg",
    "g": "brain",
    "n": "EEG in three states",
    "v": "Read",
    "x": 0,
    "u": "rest · meditation · thriller",
    "s": "b",
    "nobar": true,
    "opt": "Calm idle, trainable theta",
    "clin": "No abnormal rhythm",
    "eeg": [
      [
        "Rest, eyes closed",
        "alpha 42% · beta 21%",
        "A brain that idles beautifully",
        1
      ],
      [
        "Meditation, 12 min",
        "theta +18% vs rest",
        "Rising, but effortful: an untrained skill",
        2
      ],
      [
        "Thriller clip",
        "beta 58% · slow return",
        "Fires hard, and lingers",
        3
      ]
    ],
    "m": "Clinical-grade EEG for 24 minutes, analysed by Living Lab AI and physician-reviewed.",
    "a": [
      "Nothing high-stimulation in the last hour before bed. Liv curates the wind-down"
    ]
  },
  {
    "id": "rmssd",
    "g": "brain",
    "n": "Vagal tone (RMSSD)",
    "v": "28",
    "x": 28,
    "u": "ms · lab ECG",
    "s": "b",
    "min": 5,
    "max": 70,
    "z": [
      [
        20,
        "p"
      ],
      [
        35,
        "b"
      ],
      [
        70,
        "o"
      ]
    ],
    "opt": "> 35",
    "clin": "> 20",
    "t": "> 35",
    "m": "Your calm system is strong but under-used: at six breaths a minute it jumped 42% within minutes. Daily practice makes that your resting state.",
    "a": [
      "Ten minutes of coherence breathing with Liv, daily"
    ]
  },
  {
    "id": "sdnn",
    "g": "brain",
    "n": "SDNN (overall variability)",
    "v": "42",
    "x": 42,
    "u": "ms · lab ECG",
    "s": "b",
    "min": 10,
    "max": 100,
    "z": [
      [
        30,
        "p"
      ],
      [
        50,
        "b"
      ],
      [
        100,
        "o"
      ]
    ],
    "opt": "> 50",
    "clin": "> 30",
    "m": "Borderline on the lab recording.",
    "a": []
  },
  {
    "id": "lfhf",
    "g": "brain",
    "n": "Sympathetic balance (LF/HF)",
    "v": "2.4",
    "x": 2.4,
    "u": "alert-leaning",
    "s": "b",
    "min": 0,
    "max": 5,
    "z": [
      [
        1.5,
        "o"
      ],
      [
        3,
        "b"
      ],
      [
        5,
        "p"
      ]
    ],
    "opt": "< 1.5",
    "clin": "< 3",
    "t": "< 2",
    "m": "Alert-leaning. Your calm system is strong but under-used.",
    "a": [
      "Ten minutes of coherence breathing with Liv, daily"
    ]
  },
  {
    "id": "paced",
    "g": "brain",
    "n": "Response to paced breathing",
    "v": "+42%",
    "x": 0,
    "u": "RMSSD at 6 breaths/min",
    "s": "o",
    "nobar": true,
    "opt": "Strong rise",
    "clin": "Any rise",
    "m": "The best news on this page: at six breaths a minute your vagal tone jumped 42% within minutes.",
    "a": []
  },
  {
    "id": "cort",
    "g": "brain",
    "n": "Morning cortisol",
    "v": "18.2",
    "x": 18.2,
    "u": "µg/dL · 8 AM serum",
    "s": "b",
    "min": 2,
    "max": 30,
    "z": [
      [
        6,
        "p"
      ],
      [
        16,
        "o"
      ],
      [
        19.4,
        "b"
      ],
      [
        30,
        "p"
      ]
    ],
    "opt": "6–16",
    "clin": "6.2–19.4",
    "t": "< 16",
    "prev": "19.0",
    "when": "6 Oct",
    "m": "The blood marker of your alert system. It sits at the upper edge of normal, which matches what the EEG shows: an alert system that fires hard and lingers. It should fall as sleep, coherence breathing and the screen curfew settle in. One morning sample is a snapshot; the trend across check-ins is what we read.",
    "a": [
      "Ten minutes of coherence breathing with Liv, daily",
      "Protect a 7-hour night. Short nights raise next-day glucose",
      "Nothing high-stimulation in the last hour before bed. Liv curates the wind-down"
    ]
  },
  {
    "id": "fev",
    "g": "sense",
    "n": "FEV₁ (force of exhale)",
    "v": "89",
    "x": 89,
    "u": "% predicted",
    "s": "o",
    "min": 50,
    "max": 120,
    "z": [
      [
        70,
        "p"
      ],
      [
        80,
        "b"
      ],
      [
        120,
        "o"
      ]
    ],
    "opt": "> 80%",
    "clin": "> 70%",
    "m": "Strong first baseline. Trainable with cardio and daily paced breathing.",
    "a": []
  },
  {
    "id": "fvc",
    "g": "sense",
    "n": "FVC (lung capacity)",
    "v": "3.10",
    "x": 92,
    "u": "L · 92% predicted",
    "s": "o",
    "min": 50,
    "max": 120,
    "z": [
      [
        70,
        "p"
      ],
      [
        80,
        "b"
      ],
      [
        120,
        "o"
      ]
    ],
    "opt": "> 80%",
    "clin": "> 70%",
    "m": "Strong first baseline.",
    "a": []
  },
  {
    "id": "ratio",
    "g": "sense",
    "n": "FEV₁ / FVC",
    "v": "0.82",
    "x": 0.82,
    "u": "ratio",
    "s": "o",
    "min": 0.5,
    "max": 1,
    "z": [
      [
        0.7,
        "p"
      ],
      [
        0.75,
        "b"
      ],
      [
        1,
        "o"
      ]
    ],
    "opt": "> 0.75",
    "clin": "> 0.70",
    "m": "No sign of airway narrowing.",
    "a": []
  },
  {
    "id": "lung",
    "g": "sense",
    "n": "Estimated lung age",
    "v": "44",
    "x": 44,
    "u": "years",
    "s": "b",
    "min": 30,
    "max": 60,
    "z": [
      [
        42,
        "o"
      ],
      [
        47,
        "b"
      ],
      [
        60,
        "p"
      ]
    ],
    "opt": "≤ 42",
    "clin": "< 47",
    "t": "≤ 42",
    "m": "Two years ahead of the calendar, and trainable.",
    "a": [
      "Ten minutes of slow nasal breathing every day"
    ]
  },
  {
    "id": "va",
    "g": "sense",
    "n": "Visual acuity",
    "v": "R 6/6 · L 6/9",
    "x": 0,
    "u": "",
    "s": "b",
    "nobar": true,
    "opt": "6/6 both eyes",
    "clin": "Prescription check",
    "m": "A small left-eye drift, common at 42. A prescription check will sharpen evening screens.",
    "a": [
      "Book a left-eye prescription check"
    ]
  },
  {
    "id": "iop",
    "g": "sense",
    "n": "Eye pressure (IOP)",
    "v": "14 / 15",
    "x": 14.5,
    "u": "mmHg",
    "s": "o",
    "min": 5,
    "max": 30,
    "z": [
      [
        10,
        "b"
      ],
      [
        21,
        "o"
      ],
      [
        30,
        "p"
      ]
    ],
    "opt": "10–21",
    "clin": "< 21",
    "m": "Normal in both eyes.",
    "a": []
  },
  {
    "id": "retina",
    "g": "sense",
    "n": "Retinal photograph",
    "v": "Healthy",
    "x": 0,
    "u": "vessels and nerve",
    "s": "o",
    "nobar": true,
    "opt": "Healthy vessels, healthy nerve",
    "clin": "No change",
    "m": "The one place we can watch your blood vessels directly, and yours look excellent.",
    "a": []
  },
  {
    "id": "strain",
    "g": "sense",
    "n": "Digital eye strain",
    "v": "Moderate",
    "x": 0,
    "u": "intake + blink rate",
    "s": "b",
    "nobar": true,
    "opt": "Low",
    "clin": "20-20-20 breaks",
    "m": "Prescription: 20-20-20 screen breaks. Liv will remind you.",
    "a": [
      "20-20-20 screen breaks, reminded by Liv"
    ]
  },
  {
    "id": "hear",
    "g": "sense",
    "n": "Hearing thresholds",
    "v": "≤ 20 dB",
    "x": 0,
    "u": "both ears · 4 kHz notch left",
    "s": "o",
    "nobar": true,
    "opt": "≤ 20 dB",
    "clin": "≤ 25 dB",
    "m": "A faint 4 kHz dip on the left that traces earbud volume. Keep it under 60%.",
    "a": [
      "Earbuds under 60% volume"
    ]
  },
  {
    "id": "notch",
    "g": "sense",
    "n": "4 kHz notch (left)",
    "v": "30",
    "x": 30,
    "u": "dB",
    "s": "b",
    "min": 0,
    "max": 60,
    "z": [
      [
        20,
        "o"
      ],
      [
        35,
        "b"
      ],
      [
        60,
        "p"
      ]
    ],
    "opt": "≤ 20 dB",
    "clin": "≤ 35 dB",
    "m": "A faint dip that traces earbud volume. Hearing preserved is cognition preserved.",
    "a": [
      "Earbuds under 60% volume"
    ]
  },
  {
    "id": "sin",
    "g": "sense",
    "n": "Speech-in-noise",
    "v": "Above norm",
    "x": 0,
    "u": "age norm",
    "s": "o",
    "nobar": true,
    "opt": "At or above age norm",
    "clin": "Age norm",
    "m": "Above the norm for your age.",
    "a": []
  }
];

export function calculateRangePosition(m: LongevityMarker): number {
  if (m.nobar || m.min === undefined || m.max === undefined) return 50;
  const span = m.max - m.min;
  if (span <= 0) return 50;
  const raw = ((m.x - m.min) / span) * 100;
  return Math.max(4, Math.min(96, raw));
}
