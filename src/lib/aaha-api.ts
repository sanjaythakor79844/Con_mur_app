// src/lib/aaha-api.ts
// All API calls use backend REST API (http://localhost:5001/api/v2)
// No Supabase dependency - works for both Kiosk and Consumer App

import { auth } from "@/lib/firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://aaha-api-405281288207.asia-south1.run.app/api/v2";

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
  patient_id: string;
  doctor_name: string;
  speciality: string;
  mode: string;
  slot_label: string;
  status: string;
  centre?: string;
  scheduled_for?: string;
  created_at: string;
}

export interface Notification {
  id: string;
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

export interface Profile {
  id: string;
  mobile_number?: string;
  full_name?: string;
  phone?: string;
  language?: string;
  age?: number;
  gender?: string;
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
  report: unknown;
  source: "consumer_app" | "kiosk";
  created_at: string;
  report_pdf_url?: string;
  _raw?: any;
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (user) {
    return user.getIdToken();
  }
  const demoSessionStr = localStorage.getItem("aaha_demo_session");
  if (demoSessionStr) {
    try {
      const demoSession = JSON.parse(demoSessionStr);
      return demoSession.token;
    } catch (e) {
      return null;
    }
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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    console.error(`[API Error] ${init?.method || 'GET'} ${url} - ${res.status}: ${msg}`);
    const error = new Error(msg || `API error ${res.status}`);
    (error as any).status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function listReports(): Promise<Report[]> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ uploads?: any[], reports?: any[] }>("/uploads/me", { headers }).catch(() => ({ uploads: [], reports: [] as any[] }));
  const items = data.uploads || data.reports || [];
  return items.map((u: any) => ({
    id: String(u.upload_id || u.id),
    patient_id: String(u.patient_id),
    title: u.original_filename || u.filename || "Uploaded Report",
    category: u.report_type || "lab",
    report_type: "uploaded",
    source: "consumer_app",
    file_url: u.file_path,
    file_name: u.filename,
    created_at: u.uploaded_at || u.created_at,
    status_label: u.status || "Completed",
  }));
}

export async function latestAnalysedReports(limit = 3): Promise<Report[]> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ reports: Report[] }>(`/reports/me?analysed=true&limit=${limit}`, { headers });
  return data.reports ?? [];
}

export async function getReport(id: string): Promise<Report | null> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ report: Report }>(`/reports/${id}`, { headers });
  return data.report ?? null;
}

export async function uploadReport(opts: {
  userId: string;
  file: File;
  title: string;
  category: string;
  device_id: string;
}): Promise<Report> {
  const token = await getToken();
  const form = new FormData();
  form.append("file", opts.file);
  form.append("title", opts.title);
  form.append("category", opts.category);
  form.append("device_id", opts.device_id);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload report");
  const data = await res.json();
  return data.report;
}

export async function reportFileUrl(reportId: string): Promise<string> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ url: string }>(`/reports/${reportId}/url`, { headers });
  return data.url;
}

export async function deleteReport(report: Report): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch(`/reports/${report.id}`, { method: "DELETE", headers });
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(_userId: string): Promise<Profile | null> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ patient: Profile }>("/patients/me", { headers });
  return data.patient ?? null;
}

export async function updateProfile(_userId: string, patch: Partial<Profile>): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch("/patients/me", {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
  });
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function listAppointments(): Promise<Appointment[]> {
  // API not yet implemented in production
  return [];
}

export async function bookAppointment(input: {
  userId: string;
  doctorName: string;
  speciality: string;
  mode: string;
  slotLabel: string;
}): Promise<Appointment> {
  throw new Error("Appointments API not yet implemented in production");
}

export async function cancelAppointment(id: string): Promise<void> {
  throw new Error("Appointments API not yet implemented in production");
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function listNotifications(): Promise<Notification[]> {
  // API not yet implemented in production
  return [];
}

export async function markNotificationRead(id: string): Promise<void> {
  // API not yet implemented in production
}

export async function markAllNotificationsRead(_userId: string): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch("/notifications/me/read-all", { method: "POST", headers });
}

export async function addNotification(input: Partial<Notification>): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch("/notifications", { method: "POST", headers, body: JSON.stringify(input) });
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export async function listAssessments(): Promise<Assessment[]> {
  const headers = await apiHeaders();
  try {
    const data = await apiFetch<{ reports: any[] }>("/reports/me", { 
      headers, 
      cache: "no-store" 
    });
    const reports = data.reports || [];
    return reports.map((r: any) => {
      // Backend developer confirmed /reports/me now includes report_pdf_url (signed url)
      const finalPdfUrl = r.report_pdf_url || r.pdf_url || r.report_url || r.file_path || r.report_data?.report_pdf_url || r.report_data?.pdf_url || r.report_data?.report_url || r.report_data?.file_path;

      return {
        id: String(r.report_id || r.id),
        patient_id: String(r.patient_id),
        complaint: r.report_data?.complaint || "Health Assessment",
        score: Number(r.awis_score) || 0,
        band: r.prediction?.risk_band || "",
        summary: r.prediction?.awis_label || r.report_data?.report?.summary || "",
        suspected_conditions: r.prediction?.conditions_found || [],
        answers: r.report_data?.answers || {},
        readings: r.report_data?.readings || {},
        report: r.report_data?.report || null,
        source: (
          (r.source || "").toLowerCase().includes("kiosk") ||
          (r.report_data?.source || "").toLowerCase().includes("kiosk") ||
          r.report_type === "kiosk" ||
          r.created_by === "kiosk" ||
          !r.report_data?.report || 
          finalPdfUrl
        ) ? "kiosk" : "consumer_app",
        created_at: r.created_at,
        report_pdf_url: finalPdfUrl,
        _raw: r
      };
    });
  } catch (e) {
    console.error("Failed to list assessments:", e);
    return [];
  }
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
      awis_score: input.score,
      prediction: {
        conditions_found: input.suspectedConditions,
        risk_band: input.band,
        awis_label: input.summary
      },
      report_data: {
        complaint: input.complaint,
        answers: input.answers,
        readings: input.readings,
        report: input.report
      }
    })
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
