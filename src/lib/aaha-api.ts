// src/lib/aaha-api.ts
// All API calls use backend REST API (http://localhost:5001/api/v2)
// No Supabase dependency - works for both Kiosk and Consumer App

import { auth } from "@/lib/firebase";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://aaha-api-REDACTED_SENDER_ID.asia-south1.run.app/api/v2";

const FEATURE_API_BASE =
  import.meta.env.VITE_FEATURE_API_BASE_URL || "https://aaha-feature-backend.onrender.com/api/v2";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  patient_id: string;
  title: string;
  category: string;
  report_type: "uploaded" | "generated" | "lab";
  source: "consumer_app" | "kiosk";
  file_url?: string;
  file_name?: string;
  status_label?: string;
  status_tone?: string;
  analysis_status?: string;
  report_date?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
  extracted_values?: unknown[];
  analysis?: unknown;
  extraction_confidence?: number | string;
  ocr_error?: string;
  file_path?: string;
}

export interface Appointment {
  id: string;
  appointment_id?: string;
  _id?: string;
  patient_id?: string;
  doctor_name?: string;
  doctor_id?: string;
  kiosk_id?: string;
  speciality?: string;
  mode: string;
  slot_label: string;
  appointment_time?: string;
  appointment_date?: string;
  scheduled_for?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  booking_type?: string;
  appointment_type?: string;
  centre?: string;
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  _id?: string;
  patient_id: string;
  title: string;
  body: string;
  step?: string;
  due_label?: string;
  link?: string;
  kind?: string;
  is_read: boolean;
  created_at: string;
}

export interface UserPreferences {
  language?: string;
  marketing_consent?: boolean;
  data_sharing_consent?: boolean;
  theme?: string;
  appointment_reminders?: boolean;
  checkup_reminders?: boolean;
}

export interface Profile {
  id: string;
  patient_id?: number | string;
  mobile_number?: string;
  full_name?: string;
  phone?: string;
  language?: string;
  age?: number;
  gender?: string;
  referred_by?: string;
  created_at?: string;
}

export interface Assessment {
  id: string;
  patient_id: string;
  complaint: string;
  score: number;
  band: string;
  summary: string;
  suspected_conditions: string[];
  answers: Record<string, unknown>;
  readings: Record<string, unknown>;
  baseline_readings?: Record<string, unknown>;
  condition_readings?: Record<string, unknown>;
  report: unknown;
  source: "consumer_app" | "kiosk" | "health_record";
  created_at: string;
  report_pdf_url?: string;
  kiosk_id?: string;
  has_storage_path?: boolean;
  nutrition_plans?: Array<{ title?: string; points?: string[] }>;
  therapy_plan?: string[];
  _raw?: any;
}

export interface CarePlanItem {
  title: string;
  detail?: string;
  done?: boolean;
}

export interface CarePlan {
  _id?: string;
  id?: string;
  firebase_uid: string;
  patient_id?: string;
  consultation_summary?: string;
  lifestyle_management?: CarePlanItem[];
  medication?: Array<{ name: string; dosage?: string; frequency?: string; duration?: string; notes?: string }>;
  nutrition?: CarePlanItem[];
  physical_activity?: CarePlanItem[];
  follow_up?: { timeline?: string; tests?: string[]; notes?: string; duration_days?: number };
  status: "draft" | "approved" | "completed" | "cancelled";
  approved_by?: string;
  approved_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (user) {
    return user.getIdToken();
  }
  return null;
}

async function apiHeaders(isMultipart = false): Promise<HeadersInit> {
  const token = await getToken();
  const headers: HeadersInit = {};
  if (!isMultipart) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit, useFeatureBackend = false): Promise<T> {
  const baseUrl = useFeatureBackend ? FEATURE_API_BASE : API_BASE;
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    console.error(`[API Error] ${init?.method || "GET"} ${url} - ${res.status}: ${msg}`);
    const error = new Error(msg || `API error ${res.status}`);
    (error as any).status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function listReports(): Promise<Report[]> {
  const headers = await apiHeaders();
  const [featureData, clinicalData] = await Promise.all([
    apiFetch<{ uploads: any[] }>("/uploads/me", { headers }, true).catch(() => ({ uploads: [] as any[] })),
    apiFetch<{ uploads: any[] }>("/uploads/me", { headers }, false).catch(() => ({ uploads: [] as any[] })),
  ]);

  const items = featureData.uploads || [];
  const reports: Report[] = items.map((u: any): Report => {
    let rawPath = u.file_url || u.file_path || "";
    if (typeof rawPath === "string" && rawPath.startsWith("gs://")) {
      rawPath = "";
    }
    return {
      id: String(u.upload_id || u.id || u._id),
      patient_id: String(u.patient_id || ""),
      title: u.title || u.description || u.original_filename || u.filename || "Uploaded Report",
      category: u.category || u.report_type || "lab",
      report_type: "uploaded",
      source: "consumer_app",
      file_url: rawPath || undefined,
      file_name: u.original_filename || u.filename,
      created_at: u.uploaded_at || u.created_at || new Date().toISOString(),
      status_label: u.status_label || u.status || "Completed",
      extracted_values: u.extracted_values,
      analysis: u.analysis,
      metadata: u.metadata,
    };
  });

  const existingFileNames = new Set(reports.map((r) => (r.file_name || r.title || "").toLowerCase()));
  const clinicalItems = clinicalData.uploads || [];
  for (const cu of clinicalItems) {
    const fn = (cu.original_filename || cu.filename || "").toLowerCase();
    if (!existingFileNames.has(fn)) {
      reports.push({
        id: `clinical-${cu.upload_id}`,
        patient_id: "",
        title: cu.original_filename || `${cu.device_id ? cu.device_id.toUpperCase() : "Specialized"} Report`,
        category: cu.device_id || "Specialized Lab",
        report_type: "uploaded",
        source: "consumer_app",
        file_name: cu.original_filename,
        created_at: cu.uploaded_at || new Date().toISOString(),
        status_label: cu.status === "invalid" ? "Review Required" : cu.status === "valid" ? "Verified" : cu.status || "Recorded",
        metadata: {
          validation_note: cu.validation_note,
          device_id: cu.device_id,
        },
      });
    }
  }

  return reports;
}

export async function latestAnalysedReports(limit = 3): Promise<Report[]> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ reports: Report[] }>(`/reports/me?analysed=true&limit=${limit}`, {
    headers,
  });
  return data.reports ?? [];
}

export async function getReport(id: string): Promise<any | null> {
  const assessments = await listAssessments();
  const a = assessments.find((a) => a.id === id);
  if (a) {
    const r = a._raw || {};
    const rd = r.report_data || {};
    const isKiosk = a.source === "kiosk";
    const isApp = a.source === "consumer_app";
    const defaultTitle = isKiosk
      ? (rd.kiosk_id || a.kiosk_id ? `Kiosk Check-up #${rd.kiosk_id || a.kiosk_id}` : "Kiosk Check-up")
      : isApp
      ? (a.complaint || "Guided Check-up")
      : (a.complaint || "Health Record");

    const defaultCategory = isKiosk
      ? "Kiosk Check-up"
      : isApp
      ? "Guided Check-up"
      : "Health Record";

    return {
      id: String(r.report_id || r.id || a.id),
      patient_id: String(r.patient_id || a.patient_id || ""),
      title: defaultTitle,
      category: defaultCategory,
      report_type: isKiosk ? "kiosk" : isApp ? "consumer_app" : "health_record",
      source: a.source || (isKiosk ? "kiosk" : isApp ? "consumer_app" : "health_record"),
      created_at: r.created_at || a.created_at,
      status_label: r.status || "Completed",
      score: parseAwisScore(r.awis_score ?? rd.awis_score ?? r.prediction?.awis_score) || a.score || 0,
      band: a.band || r.prediction?.risk_band || "",
      summary: rd.conclusion || r.prediction?.awis_label || a.summary || "",
      conclusion: rd.conclusion || "",
      kiosk_id: rd.kiosk_id || a.kiosk_id || "",
      baseline_readings: rd.baseline_readings || a.readings || {},
      readings: rd.baseline_readings || a.readings || {},
      condition_readings: rd.condition_readings || {},
      conditions_found: r.prediction?.conditions_found || a.suspected_conditions || [],
      recommended_tests: r.prediction?.recommended_tests || [],
      refer_to_doctor: Boolean(r.prediction?.refer_to_doctor),
      nutrition_plans: rd.nutrition_plans || [],
      therapy_plan: rd.therapy_plan || [],
      extracted_values: rd.extracted_values || [],
      analysis: rd.analysis || r.prediction || null,
      file_path: undefined, // Never expose raw gs:// paths
      report_pdf_url: a.report_pdf_url,
      has_storage_path: a.has_storage_path,
      extraction_confidence: rd.extraction_confidence,
      _raw: r,
    };
  }

  const uploads = await listReports();
  const u = uploads.find((u) => u.id === id);
  if (u) return u;

  try {
    const headers = await apiHeaders();
    const data = await apiFetch<{ upload: any }>(`/uploads/${id}`, { headers }, true);
    if (data?.upload) {
      const up = data.upload;
      return {
        id: String(up.id || up._id),
        patient_id: String(up.patient_id),
        title: up.title || up.original_filename || "Report",
        category: up.category || up.report_type || "lab",
        report_type: "uploaded",
        source: "consumer_app",
        file_url: up.file_url || up.file_path,
        file_name: up.original_filename || up.filename,
        created_at: up.uploaded_at || up.created_at || new Date().toISOString(),
        status_label: up.status_label || up.status || "Completed",
        extracted_values: up.extracted_values,
        analysis: up.analysis,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export const CLINICAL_7_LAB_TYPES = [
  { device_id: "tsh", name: "TSH (Thyroid)", desc: "Thyroid function & metabolic health", icon: "file" as const },
  { device_id: "ferritin", name: "Ferritin (Iron)", desc: "Iron stores & anaemia assessment", icon: "drop" as const },
  { device_id: "lh_fsh", name: "LH / FSH Ratio", desc: "Hormonal balance & fertility", icon: "file" as const },
  { device_id: "testosterone", name: "Testosterone", desc: "Free & total testosterone", icon: "flame" as const },
  { device_id: "prolactin", name: "Prolactin", desc: "Pituitary & hormone evaluation", icon: "file" as const },
  { device_id: "urine", name: "Urine Protein", desc: "Kidney filtration & protein levels", icon: "drop" as const },
  { device_id: "pregnancy_test", name: "Pregnancy Test", desc: "Beta-hCG confirmation", icon: "spark" as const },
] as const;

export const CLINICAL_7_DEVICE_IDS = new Set<string>([
  "tsh",
  "ferritin",
  "lh_fsh",
  "testosterone",
  "prolactin",
  "urine",
  "pregnancy_test",
]);

export async function uploadReport(opts: {
  userId: string;
  file: File;
  title: string;
  category: string;
  device_id: string;
}): Promise<Report> {
  const token = await getToken();
  if (!token) {
    throw new Error("Authentication required. Please sign in to upload reports.");
  }

  // If this is one of the 7 specialized clinical lab types, sync with Clinical backend
  let clinicalUploadId: number | undefined;
  let validationNote: string | undefined;
  if (CLINICAL_7_DEVICE_IDS.has(opts.device_id)) {
    try {
      const clinForm = new FormData();
      clinForm.append("file", opts.file);
      clinForm.append("report_type", opts.device_id);
      clinForm.append("device_id", opts.device_id);
      clinForm.append("description", opts.title);

      const clinRes = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: clinForm,
      });

      if (clinRes.ok) {
        const clinData = await clinRes.json();
        const cup = clinData.upload || clinData;
        clinicalUploadId = cup.upload_id;
        validationNote = cup.validation_note;
        console.log("[Clinical Sync] Upload synced with clinical backend:", cup);
      } else {
        const errText = await clinRes.text();
        console.warn("[Clinical Sync Note] Clinical backend response:", clinRes.status, errText);
      }
    } catch (clinErr) {
      console.warn("[Clinical Sync Note] Could not sync with clinical backend:", clinErr);
    }
  }

  const form = new FormData();
  form.append("file", opts.file);
  form.append("title", opts.title);
  form.append("description", opts.title);
  form.append("category", opts.category);
  form.append("report_type", opts.device_id);
  form.append("device_id", opts.device_id);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${FEATURE_API_BASE}/uploads`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "Failed to upload report");
  }
  const data = await res.json();
  const u = data.report || data.upload || data;
  let safeUrl = u.file_url || u.file_path || "";
  if (typeof safeUrl === "string" && safeUrl.startsWith("gs://")) {
    safeUrl = "";
  }
  return {
    id: String(u.id || u.upload_id || u._id),
    patient_id: String(u.patient_id || opts.userId),
    title: u.title || opts.title,
    category: u.category || opts.category,
    report_type: "uploaded",
    source: "consumer_app",
    file_url: safeUrl || undefined,
    file_name: u.file_name || u.original_filename || opts.file.name,
    created_at: u.created_at || new Date().toISOString(),
    status_label: u.status_label || u.status || "Completed",
    extracted_values: u.extracted_values,
    analysis: u.analysis,
    metadata: {
      clinical_upload_id: clinicalUploadId,
      validation_note: validationNote,
      device_id: opts.device_id,
    },
  };
}

export async function deleteReport(report: Report): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch(`/uploads/${report.id}`, { method: "DELETE", headers }, true);
}

export async function processReport(reportId: string): Promise<{
  ok: boolean;
  message?: string;
  values: Array<{
    test_name: string;
    value: string;
    unit: string;
    reference_range: string;
    status: "Low" | "Normal" | "High" | "Unknown";
    confidence: number;
  }>;
  confidence?: number;
  analysis?: any;
  report?: any;
}> {
  const headers = await apiHeaders();
  return await apiFetch(`/uploads/${reportId}/process`, {
    method: "POST",
    headers,
  }, true);
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(_userId: string): Promise<Profile | null> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ patient: Profile }>("/patients/me", { headers });
  return data.patient ?? null;
}

export async function updateProfile(_userId: string, patch: Partial<Profile>): Promise<void> {
  const headers = await apiHeaders();
  
  // Filter out language since the backend doesn't support it
  const { language, ...validPatch } = patch;
  
  if (Object.keys(validPatch).length === 0) {
    return;
  }

  await apiFetch("/patients/me", {
    method: "PUT",
    headers,
    body: JSON.stringify(validPatch),
  });
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function listAppointments(): Promise<Appointment[]> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ appointments: any[] }>("/appointments/me", { headers }, true).catch(
    () => ({ appointments: [] as any[] }),
  );
  const items = data.appointments || [];
  return items.map((a: any) => ({
    id: String(a.appointment_id || a.id || a._id || ""),
    appointment_id: String(a.appointment_id || a.id || a._id || ""),
    _id: a._id,
    patient_id: String(a.patient_id || ""),
    doctor_name:
      a.doctor_name ||
      a.doctor_id ||
      (a.booking_type === "kiosk" || a.kiosk_id ? "Aaha Kiosk" : "Doctor"),
    doctor_id: a.doctor_id,
    kiosk_id: a.kiosk_id,
    speciality:
      a.speciality ||
      (a.booking_type === "kiosk" || a.kiosk_id ? "Kiosk Screening" : "General Medicine"),
    mode: a.mode || "In person",
    slot_label: a.slot_label || a.appointment_time || "",
    appointment_time: a.appointment_time || a.slot_label || "",
    appointment_date:
      a.appointment_date || a.scheduled_for || (a.created_at ? a.created_at.split("T")[0] : ""),
    scheduled_for: a.scheduled_for || a.appointment_date || "",
    status: (a.status || "confirmed").toLowerCase() as "pending" | "confirmed" | "cancelled" | "completed",
    booking_type: a.booking_type || (a.kiosk_id ? "kiosk" : "doctor"),
    centre: a.centre || "Aaha Health Centre, Aundh, Pune",
    appointment_type:
      a.appointment_type || (a.booking_type === "kiosk" ? "Screening" : "Consultation"),
    notes: a.notes,
    created_at: a.created_at || new Date().toISOString(),
  }));
}

export async function getAppointmentSlots(
  date: string,
  doctor_id?: string,
  kiosk_id?: string,
): Promise<{ date: string; slots: string[] }> {
  const headers = await apiHeaders();
  let path = `/appointments/slots?date=${encodeURIComponent(date)}`;
  if (doctor_id) path += `&doctor_id=${encodeURIComponent(doctor_id)}`;
  if (kiosk_id) path += `&kiosk_id=${encodeURIComponent(kiosk_id)}`;
  return await apiFetch<{ date: string; slots: string[] }>(path, { headers }, true);
}

export async function bookAppointment(input: {
  userId?: string;
  patientId?: string;
  doctorName?: string;
  doctorId?: string;
  kioskId?: string;
  speciality?: string;
  mode?: string;
  slotLabel?: string;
  appointmentTime?: string;
  appointmentDate?: string;
  appointmentType?: string;
  bookingType?: string;
  centre?: string;
  notes?: string;
}): Promise<Appointment> {
  const headers = await apiHeaders();

  const isKiosk =
    input.bookingType === "kiosk" ||
    Boolean(input.kioskId) ||
    input.mode?.toLowerCase() === "kiosk" ||
    input.appointmentType === "Screening";

  const date = input.appointmentDate || new Date().toISOString().split("T")[0];
  const time = input.appointmentTime || input.slotLabel || "10:00 AM";

  const payload: Record<string, any> = {
    appointment_date: date,
    appointment_time: time,
    appointment_type: input.appointmentType || (isKiosk ? "Screening" : "Consultation"),
    booking_type: isKiosk ? "kiosk" : "doctor",
    mode: input.mode || "In person",
    centre: input.centre || "Aaha Health Centre, Aundh, Pune",
    notes:
      input.notes ||
      (isKiosk ? "Kiosk screening" : `Consultation (${input.speciality || "General"})`),
  };

  if (isKiosk) {
    payload.kiosk_id = input.kioskId || "Aaha Kiosk";
  } else {
    payload.doctor_id = input.doctorId || input.doctorName || "Dr. Meera Joshi";
    payload.doctor_name = input.doctorName || input.doctorId || "Dr. Meera Joshi";
  }

  if (input.userId || input.patientId) {
    payload.patient_id = input.patientId || input.userId;
  }

  const data = await apiFetch<{ message: string; appointment: any }>(
    "/appointments",
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
    true,
  );

  const a = data.appointment || data;
  return {
    id: String(a.appointment_id || a.id || a._id || ""),
    appointment_id: String(a.appointment_id || a.id || a._id || ""),
    _id: a._id,
    patient_id: String(a.patient_id || input.userId || ""),
    doctor_name:
      a.doctor_name ||
      payload.doctor_name ||
      (payload.booking_type === "kiosk" ? "Aaha Kiosk" : "Doctor"),
    doctor_id: a.doctor_id || payload.doctor_id,
    kiosk_id: a.kiosk_id || payload.kiosk_id,
    speciality: a.speciality || (isKiosk ? "Kiosk Screening" : "General Medicine"),
    mode: a.mode || payload.mode,
    slot_label: a.slot_label || a.appointment_time || time,
    appointment_time: a.appointment_time || a.slot_label || time,
    appointment_date: a.appointment_date || a.scheduled_for || date,
    scheduled_for: a.scheduled_for || a.appointment_date || date,
    status: (a.status || "confirmed").toLowerCase() as any,
    booking_type: a.booking_type || payload.booking_type,
    centre: a.centre || payload.centre,
    appointment_type: a.appointment_type || payload.appointment_type,
    notes: a.notes || payload.notes,
    created_at: a.created_at || new Date().toISOString(),
  };
}

export async function cancelAppointment(id: string): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch(`/appointments/${id}`, { method: "DELETE", headers }, true);
}

export async function updateAppointment(
  id: string,
  patch: Partial<{
    appointment_date: string;
    appointment_time: string;
    appointment_type: string;
    booking_type: string;
    mode: string;
    centre: string;
    doctor_id: string;
    kiosk_id: string;
    status: "pending" | "confirmed" | "cancelled" | "completed";
    notes: string;
  }>,
): Promise<Appointment> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ message: string; appointment: any }>(
    `/appointments/${id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(patch),
    },
    true,
  );
  const a = data.appointment || data;
  return {
    id: String(a.appointment_id || a.id || a._id || ""),
    appointment_id: String(a.appointment_id || a.id || a._id || ""),
    _id: a._id,
    patient_id: String(a.patient_id || ""),
    doctor_name:
      a.doctor_name ||
      a.doctor_id ||
      (a.booking_type === "kiosk" || a.kiosk_id ? "Aaha Kiosk" : "Doctor"),
    doctor_id: a.doctor_id,
    kiosk_id: a.kiosk_id,
    speciality:
      a.speciality ||
      (a.booking_type === "kiosk" || a.kiosk_id ? "Kiosk Screening" : "General Medicine"),
    mode: a.mode || "In person",
    slot_label: a.slot_label || a.appointment_time || "",
    appointment_time: a.appointment_time || a.slot_label || "",
    appointment_date:
      a.appointment_date || a.scheduled_for || (a.created_at ? a.created_at.split("T")[0] : ""),
    scheduled_for: a.scheduled_for || a.appointment_date || "",
    status: (a.status || "confirmed").toLowerCase() as any,
    booking_type: a.booking_type || (a.kiosk_id ? "kiosk" : "doctor"),
    centre: a.centre || "Aaha Health Centre, Aundh, Pune",
    appointment_type:
      a.appointment_type || (a.booking_type === "kiosk" ? "Screening" : "Consultation"),
    notes: a.notes,
    created_at: a.created_at || new Date().toISOString(),
  };
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function getPreferences(): Promise<UserPreferences> {
  try {
    const headers = await apiHeaders();
    const res = await apiFetch<any>(
      "/preferences/me",
      { headers },
      true,
    );
    return (res?.preference || res?.preferences || res) as UserPreferences;
  } catch (e) {
    console.warn("Failed to fetch preferences from backend, using local defaults:", e);
    return {
      language: typeof window !== "undefined" ? localStorage.getItem("aaha.lang") || "en" : "en",
      theme:
        typeof window !== "undefined" ? localStorage.getItem("aaha.theme") || "light" : "light",
      marketing_consent: false,
      data_sharing_consent: true,
      appointment_reminders: true,
      checkup_reminders: true,
    };
  }
}

export async function updatePreferences(
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const headers = await apiHeaders();
  try {
    const res = await apiFetch<{ preference?: UserPreferences; preferences?: UserPreferences; message?: string }>(
      "/preferences/me",
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(patch),
      },
      true,
    );
    return res.preference || res.preferences || patch;
  } catch (err: any) {
    if (err?.status === 405 || err?.status === 404) {
      const res = await apiFetch<{ preference?: UserPreferences; preferences?: UserPreferences; message?: string }>(
        "/preferences/me",
        {
          method: "PUT",
          headers,
          body: JSON.stringify(patch),
        },
        true,
      );
      return res.preference || res.preferences || patch;
    }
    throw err;
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function listNotifications(): Promise<Notification[]> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ notifications: any[] }>("/notifications/me", { headers }, true).catch(
    () => ({ notifications: [] as any[] }),
  );
  return (data.notifications || []).map((n: any) => ({
    id: String(n.id || n._id || ""),
    _id: n._id,
    patient_id: String(n.patient_id || ""),
    title: n.title || "Notification",
    body: n.body || n.message || "",
    step: n.step,
    due_label: n.due_label,
    link: n.link,
    kind: n.kind || n.type,
    is_read: Boolean(n.is_read || n.read),
    created_at: n.created_at || n.createdAt || new Date().toISOString(),
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const headers = await apiHeaders();
  try {
    await apiFetch(`/notifications/${id}/read`, { method: "POST", headers }, true);
  } catch {
    await apiFetch(`/notifications/${id}/read`, { method: "PUT", headers }, true);
  }
}

export async function markAllNotificationsRead(_userId?: string): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch("/notifications/me/read-all", { method: "POST", headers }, true);
}

export async function addNotification(input: Partial<Notification>): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch("/notifications", { method: "POST", headers, body: JSON.stringify(input) }, true);
}

// ─── Care Plans ───────────────────────────────────────────────────────────────

export async function listCarePlans(): Promise<CarePlan[]> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ carePlans: CarePlan[] }>("/care-plan", { headers }, true).catch(
    () => ({ carePlans: [] as CarePlan[] }),
  );
  return data.carePlans || [];
}

export async function updateCarePlan(
  id: string,
  updates: Partial<CarePlan>,
): Promise<CarePlan | null> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ carePlan: CarePlan }>(
    `/care-plan/${id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    },
    true,
  );
  return data.carePlan || null;
}

// ─── Normalization & Data Helpers ──────────────────────────────────────────

/**
 * Safely parse AWIS score from backend response.
 * Handles strings like "17.0", numbers like 17, and null/undefined values.
 */
export function parseAwisScore(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const parsed = parseFloat(String(raw).trim());
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? 0 : parsed;
}

/**
 * Safely parse date strings from backend response (e.g. "Mon, 19 Oct 2026 09:14:00 GMT" or ISO strings).
 * Returns a valid ISO string representation or current date if unparseable.
 */
export function parseReportDate(raw: unknown): string {
  if (!raw) return new Date().toISOString();
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? new Date().toISOString() : raw.toISOString();
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Safely format date strings for display without throwing on invalid input.
 */
export function formatReportDate(raw: unknown, options?: Intl.DateTimeFormatOptions): string {
  if (!raw) return "";
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return "";
    return raw.toLocaleDateString("en-IN", options || {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-IN", options || {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export function resetPatientLinkingFlag() {
  // Maintained for backward compatibility with existing imports
}

// ─── Source Classification Helper ─────────────────────────────────────────

export function determineRecordSource(r: any): "kiosk" | "consumer_app" | "health_record" {
  if (!r) return "health_record";
  const kioskId = r.kiosk_id || r.report_data?.kiosk_id;
  const rawSource = String(r.source || r.report_data?.source || "").toLowerCase().trim();
  const rawReportType = String(r.report_type || "").toLowerCase().trim();
  const rawCreatedBy = String(r.created_by || "").toLowerCase().trim();

  // 1. Explicit or verified Physical Kiosk screening
  if (
    Boolean(kioskId) ||
    rawSource.includes("kiosk") ||
    rawReportType === "kiosk" ||
    rawCreatedBy === "kiosk"
  ) {
    return "kiosk";
  }

  // 2. Explicit or verified Consumer App Guided Check-up
  if (
    rawSource === "consumer_app" ||
    rawSource === "app" ||
    rawSource.includes("guided") ||
    rawReportType === "consumer_app" ||
    rawReportType === "guided_checkup"
  ) {
    return "consumer_app";
  }

  // 3. Structured Guided Check-up answers without any physical kiosk identifier
  const hasAppAnswers = Boolean(
    r.report_data?.answers &&
    typeof r.report_data.answers === "object" &&
    Object.keys(r.report_data.answers).length > 0
  );
  if (hasAppAnswers && !kioskId) {
    return "consumer_app";
  }

  // 4. Neutral fallback - never infer or guess kiosk from PDF existence, AWIS score, or DB presence
  return "health_record";
}

export async function listAssessments(): Promise<Assessment[]> {
  const headers = await apiHeaders();
  let data: { reports?: any[] };
  try {
    data = await apiFetch<{ reports: any[] }>("/reports/me", {
      headers,
      cache: "no-store",
    });
  } catch (e: any) {
    // 401: Unauthorized - token invalid or expired, rethrow
    if (e.status === 401) {
      throw e;
    }

    // 404: Patient not found on backend (unlinked account)
    // Treat 404 Patient not found from /reports/me as a possible account-linking problem, not proof that the user has no reports.
    // Do not call POST /patients/link-by-phone until confirmed live by backend developer.
    if (e.status === 404) {
      const err = new Error(e.message || "Patient not found (Account not linked)");
      (err as any).status = 404;
      (err as any).isUnlinked = true;
      throw err;
    }

    throw e;
  }

  const reports = data?.reports || [];
  return reports.map((r: any) => {
    // Backend developer confirmed /reports/me may include report_pdf_url (signed url)
    const rawPdfUrl =
      r.report_pdf_url ||
      r.report_data?.report_pdf_url ||
      r.pdf_url ||
      r.report_data?.pdf_url ||
      r.signed_url ||
      r.report_data?.signed_url ||
      r.download_url ||
      r.report_data?.download_url ||
      r.file_url ||
      r.report_data?.file_url;

    // PDF URL safety: Never treat internal gs:// or storage paths as browser URLs
    const hasHttpPdf =
      typeof rawPdfUrl === "string" &&
      (rawPdfUrl.startsWith("http://") || rawPdfUrl.startsWith("https://"));

    const finalPdfUrl = hasHttpPdf ? rawPdfUrl : undefined;
    const hasStoragePath = Boolean(
      r.report_data?._pdf_path ||
      r._pdf_path ||
      (typeof rawPdfUrl === "string" && rawPdfUrl.startsWith("gs://"))
    );

    const verifiedSource = determineRecordSource(r);
    const resolvedKioskId = r.report_data?.kiosk_id || r.kiosk_id || undefined;

    return {
      id: String(r.report_id || r.id),
      patient_id: String(r.patient_id || ""),
      complaint:
        r.report_data?.complaint ||
        (verifiedSource === "kiosk"
          ? (resolvedKioskId ? `Kiosk Check-up #${resolvedKioskId}` : "Kiosk Screening")
          : verifiedSource === "consumer_app"
          ? "Guided Check-up"
          : "Health Record"),
      score: parseAwisScore(r.awis_score ?? r.report_data?.awis_score ?? r.prediction?.awis_score),
      band: r.prediction?.risk_band || "",
      summary: r.prediction?.awis_label || r.report_data?.report?.summary || "",
      suspected_conditions: r.prediction?.conditions_found || [],
      answers: r.report_data?.answers || {},
      baseline_readings: r.report_data?.baseline_readings || r.baseline_readings || {},
      condition_readings: r.report_data?.condition_readings || r.condition_readings || {},
      readings: {
        ...(r.report_data?.condition_readings || {}),
        ...(r.report_data?.baseline_readings || {}),
        ...(r.report_data?.readings || {}),
        ...(r.baseline_readings || {}),
        ...(r.readings || {}),
      },
      report: r.report_data?.report || null,
      source: verifiedSource,
      created_at: r.created_at,
      report_pdf_url: finalPdfUrl,
      has_storage_path: hasStoragePath,
      kiosk_id: resolvedKioskId,
      nutrition_plans: r.report_data?.nutrition_plans || [],
      therapy_plan: r.report_data?.therapy_plan || [],
      _raw: r,
    };
  });
}

export async function saveAssessment(input: {
  userId: string;
  complaint: string;
  score: number;
  band: string;
  summary: string;
  suspectedConditions: string[];
  answers: Record<string, unknown>;
  readings: Record<string, unknown>;
  report: unknown;
}): Promise<Assessment> {
  const headers = await apiHeaders();
  const data = await apiFetch<any>("/reports", {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: "consumer_app",
      report_type: "consumer_app",
      awis_score: input.score,
      prediction: {
        conditions_found: input.suspectedConditions,
        risk_band: input.band,
        awis_label: input.summary,
      },
      report_data: {
        source: "consumer_app",
        complaint: input.complaint,
        answers: input.answers,
        readings: input.readings,
        report: input.report,
      },
    }),
  });

  const r = data.report || data;
  return {
    id: String(r.report_id || r.id || Date.now()),
    patient_id: String(r.patient_id || input.userId),
    complaint: input.complaint,
    score: input.score,
    band: input.band,
    summary: input.summary,
    suspected_conditions: input.suspectedConditions,
    answers: input.answers,
    readings: input.readings,
    report: input.report,
    source: "consumer_app",
    created_at: r.created_at || new Date().toISOString(),
  };
}
