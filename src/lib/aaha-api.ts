// src/lib/aaha-api.ts
// All API calls use backend REST API (http://localhost:5001/api/v2)
// No Supabase dependency - works for both Kiosk and Consumer App

import { auth } from "@/lib/firebase";
import { getDeviceId } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api/v2";

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
  const data = await apiFetch<{ reports: Report[] }>("/reports/me", { headers });
  return data.reports ?? [];
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
}): Promise<Report> {
  const token = await getToken();
  const form = new FormData();
  form.append("file", opts.file);
  form.append("title", opts.title);
  form.append("category", opts.category);
  form.append("source", "consumer_app");
  form.append("device_id", getDeviceId());

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
  try {
    const headers = await apiHeaders();
    const data = await apiFetch<{ appointments: Appointment[] }>("/appointments/me", { headers });
    return data.appointments ?? [];
  } catch (e) {
    console.warn("Appointments API unavailable, showing empty state", e);
    return [];
  }
}

export async function bookAppointment(input: {
  userId: string;
  doctorName: string;
  speciality: string;
  mode: string;
  slotLabel: string;
}): Promise<Appointment> {
  const headers = await apiHeaders();
  const data = await apiFetch<{ appointment: Appointment }>("/appointments", {
    method: "POST",
    headers,
    body: JSON.stringify({
      doctor_name: input.doctorName,
      speciality: input.speciality,
      mode: input.mode,
      slot_label: input.slotLabel,
    }),
  });
  return data.appointment;
}

export async function cancelAppointment(id: string): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch(`/appointments/${id}/cancel`, { method: "POST", headers });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function listNotifications(): Promise<Notification[]> {
  try {
    const headers = await apiHeaders();
    const data = await apiFetch<{ notifications: Notification[] }>("/notifications/me", { headers });
    return data.notifications ?? [];
  } catch (e) {
    console.warn("Notifications API unavailable, showing empty state", e);
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const headers = await apiHeaders();
  await apiFetch(`/notifications/${id}/read`, { method: "POST", headers });
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
  try {
    const headers = await apiHeaders();
    const data = await apiFetch<{ assessments: Assessment[] }>("/assessments/me", { headers });
    return data.assessments ?? [];
  } catch (e) {
    console.warn("Assessments API unavailable, showing empty state", e);
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
  const data = await apiFetch<{ assessment: Assessment }>("/assessments", {
    method: "POST",
    headers,
    body: JSON.stringify({
      complaint: input.complaint,
      score: input.score,
      band: input.band,
      summary: input.summary,
      suspected_conditions: input.suspectedConditions,
      answers: input.answers,
      readings: input.readings,
      report: input.report,
      source: "consumer_app",
    }),
  });
  return data.assessment;
}
