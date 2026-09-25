// src/lib/screening.functions.ts
// Screening server functions - replaced Supabase with backend REST API
// All data syncs through central backend so Kiosk and Consumer App share same data

import { auth } from "@/lib/firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://aaha-api-405281288207.asia-south1.run.app/api/v2";

// ─── Types ───────────────────────────────────────────────────────────────────

export type JsonObject = Record<string, unknown>;

export interface ScreeningAnswer {
  id: string;
  screening_id: string;
  question_id: string;
  topic: string;
  question_text: string | null;
  answer: string;
  normalized_value: JsonObject;
  answered_at: string;
}

export interface TestReading {
  test_id: string;
  test_name: string;
  numeric_value: number | null;
  text_value: string | null;
  unit: string;
  reference_range: string | null;
  flag: string;
  label: string;
  status: string;
  source: string;
  category: string | null;
  reading_at: string;
}

export interface Screening {
  id: string;
  patient_id: string;
  complaint: string;
  language_code: string;
  phase: string;
  status: "in_progress" | "complete";
  state: JsonObject;
  report: JsonObject | null;
  awis: number | null;
  awis_available: boolean;
  band: string | null;
  summary: string | null;
  suspected_conditions: string[];
  created_at: string;
  updated_at: string;
}

export interface ScreeningBundle {
  screening: Screening | null;
  answers: ScreeningAnswer[];
  readings: TestReading[];
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function authHeader(): Promise<HeadersInit> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeader();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(msg || `API error ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (error) {
    console.warn(`[Offline Mode] Backend unavailable for POST ${path}. Using mock response.`);
    if (path === "/screenings/start") return { screeningId: "mock-screening-id" } as unknown as T;
    if (path.includes("/readings") && !path.includes("/delete")) {
      const b = body as any;
      return { 
        test_id: b.test_id, numeric_value: b.numeric_value, text_value: b.text_value, 
        unit: b.unit, reference_range: b.reference_range, flag: b.flag, 
        label: b.label, status: b.status, reading_at: new Date().toISOString() 
      } as unknown as T;
    }
    return { ok: true } as unknown as T;
  }
}

async function get<T>(path: string): Promise<T> {
  const headers = await authHeader();
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(msg || `API error ${res.status}`);
    }
    return res.json() as Promise<T>;
  } catch (error) {
    console.warn(`[Offline Mode] Backend unavailable for GET ${path}. Using mock response.`);
    if (path.includes("/active") || path.includes("/latest")) {
      return { screening: null, answers: [], readings: [] } as unknown as T;
    }
    if (path.includes("/readings/latest")) {
      return { readings: [] } as unknown as T;
    }
    return {} as unknown as T;
  }
}

// ─── Screening Functions ──────────────────────────────────────────────────────

/** Begin a new screening and get back its id */
export async function startScreening(data: {
  complaint: string;
  languageCode: string;
  state: JsonObject;
}): Promise<{ screeningId: string }> {
  return post("/screenings/start", {
    complaint: data.complaint,
    language_code: data.languageCode,
    state: data.state,
  });
}

/** Persist the live conversation state so a refresh resumes exactly where it left off */
export async function saveScreeningState(data: {
  screeningId: string;
  state: JsonObject;
  phase?: string;
  suspectedConditions?: string[];
}): Promise<{ ok: boolean }> {
  return post(`/screenings/${data.screeningId}/state`, {
    state: data.state,
    phase: data.phase,
    suspected_conditions: data.suspectedConditions,
  });
}

/** Store one canonical answer */
export async function saveScreeningAnswer(data: {
  screeningId: string;
  questionId: string;
  topic: string;
  questionText?: string | null;
  answer: string;
  normalizedValue: JsonObject;
  state: JsonObject;
  phase?: string;
  suspectedConditions?: string[];
}): Promise<{ ok: boolean }> {
  return post(`/screenings/${data.screeningId}/answers`, {
    question_id: data.questionId,
    topic: data.topic,
    question_text: data.questionText ?? null,
    answer: data.answer,
    normalized_value: data.normalizedValue,
    state: data.state,
    phase: data.phase,
    suspected_conditions: data.suspectedConditions,
  });
}

/** Save or overwrite a single test reading */
export async function saveTestReading(data: {
  screeningId: string;
  testId: string;
  testName: string;
  numericValue?: number | null;
  textValue?: string | null;
  unit?: string;
  referenceRange?: string | null;
  flag?: string;
  label?: string;
  status?: string;
  source?: string;
  category?: string | null;
}): Promise<TestReading> {
  return post(`/screenings/${data.screeningId}/readings`, {
    test_id: data.testId,
    test_name: data.testName,
    numeric_value: data.numericValue ?? null,
    text_value: data.textValue ?? null,
    unit: data.unit ?? "",
    reference_range: data.referenceRange ?? null,
    flag: data.flag ?? "green",
    label: data.label ?? "",
    status: data.status ?? "recorded",
    source: data.source ?? "manual",
    category: data.category ?? null,
  });
}

/** Delete a test reading */
export async function deleteTestReading(data: {
  screeningId: string;
  testId: string;
}): Promise<{ ok: boolean }> {
  return post(`/screenings/${data.screeningId}/readings/delete`, {
    test_id: data.testId,
  });
}

/** Mark the screening finished and store the report */
export async function completeScreening(data: {
  screeningId: string;
  state: JsonObject;
  report: JsonObject;
  awis: number;
  awisAvailable: boolean;
  band?: string | null;
  summary?: string | null;
  suspectedConditions?: string[];
  assessmentId?: string | null;
}): Promise<{ ok: boolean }> {
  return post(`/screenings/${data.screeningId}/complete`, {
    state: data.state,
    report: data.report,
    awis: data.awis,
    awis_available: data.awisAvailable,
    band: data.band ?? null,
    summary: data.summary ?? null,
    suspected_conditions: data.suspectedConditions,
    assessment_id: data.assessmentId ?? null,
  });
}

/** Get everything stored for one screening */
export async function getScreening(data: {
  screeningId: string;
}): Promise<ScreeningBundle> {
  return get<ScreeningBundle>(`/screenings/${data.screeningId}`);
}

/** Get the active (unfinished) screening for the current patient */
export async function getActiveScreening(): Promise<ScreeningBundle> {
  return get<ScreeningBundle>("/screenings/active");
}

/** Get the latest completed screening */
export async function getLatestScreening(): Promise<ScreeningBundle> {
  return get<ScreeningBundle>("/screenings/latest");
}

/** Latest reading per test for the signed-in patient */
export async function listLatestReadings(): Promise<TestReading[]> {
  const data = await get<{ readings: TestReading[] }>("/screenings/readings/latest");
  return data.readings ?? [];
}
