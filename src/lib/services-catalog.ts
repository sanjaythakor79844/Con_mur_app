/** The services an Aaha Health Centre offers, with the in-app destination for each. */
export type AahaService = {
  id: string;
  name: string;
  icon: string;
  description: string;
  to: string;
};

export const AAHA_SERVICES: AahaService[] = [
  { id: "womens-health", name: "Women's Health", icon: "female", description: "Screening and care built around women's health needs.", to: "/checkup" },
  { id: "consultation", name: "Doctor Consultation", icon: "stethoscope", description: "Book an in-person review with an Aaha doctor.", to: "/doctors" },
  { id: "preventive", name: "Preventive Checkups", icon: "health_and_safety", description: "Guided check-up with your AWIS wellness score.", to: "/checkup" },
  { id: "nutrition", name: "Nutrition Counselling", icon: "nutrition", description: "A food plan matched to your latest results.", to: "/therapies" },
  { id: "lifestyle", name: "Lifestyle Coaching", icon: "directions_run", description: "Small daily changes tracked over time.", to: "/progress" },
  { id: "hormonal", name: "Hormonal Health", icon: "science", description: "Thyroid, PCOS and hormone-related testing.", to: "/diagnostics" },
  { id: "pcos", name: "PCOS Care", icon: "healing", description: "Cycle, weight and hormone support in one plan.", to: "/checkup" },
  { id: "thyroid", name: "Thyroid Care", icon: "thermostat", description: "TSH testing, review and follow-up.", to: "/recommended-tests" },
  { id: "anaemia", name: "Anaemia Care", icon: "bloodtype", description: "Haemoglobin and iron checks with diet support.", to: "/recommended-tests" },
  { id: "metabolic", name: "Metabolic Health", icon: "monitor_weight", description: "Sugar, lipids and weight tracked together.", to: "/diagnostics" },
  { id: "skin-hair", name: "Skin & Hair Health", icon: "face_retouching_natural", description: "Hair fall and skin concerns linked to your labs.", to: "/aaha" },
  { id: "physiotherapy", name: "Physiotherapy", icon: "accessibility_new", description: "Movement and pain support at the centre.", to: "/therapies" },
  { id: "mental-wellness", name: "Mental Wellness", icon: "self_improvement", description: "Sleep, stress and mood guidance.", to: "/therapies" },
  { id: "teleconsultation", name: "Teleconsultation", icon: "videocam", description: "Talk to a doctor from home.", to: "/teleconsultation" },
  { id: "monitoring", name: "Health Monitoring", icon: "monitor_heart", description: "See how your readings change over time.", to: "/progress" },
  { id: "reports", name: "Report Analysis", icon: "lab_profile", description: "Upload a lab report and get it explained simply.", to: "/upload" },
  { id: "follow-up", name: "Follow-up Care", icon: "event_repeat", description: "Reminders and repeat tests, on schedule.", to: "/follow-up" },
  { id: "education", name: "Health Education", icon: "school", description: "Ask Aaha anything about your health.", to: "/aaha" },
];

/** Async accessor so the screen can show real loading and error states. */
export async function fetchServices(): Promise<AahaService[]> {
  return AAHA_SERVICES;
}
