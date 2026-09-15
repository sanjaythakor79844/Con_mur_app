/**
 * Server-only helpers for reading and writing a screening session.
 * Everything here runs as the signed-in person, so row level security applies.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** JSON-safe value, so states and reports round-trip through the database cleanly. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ReadingRow = {
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
};

export type AnswerRow = {
  question_id: string;
  topic: string;
  question_text: string | null;
  answer: string;
  normalized_value: JsonObject;
  answered_at: string;
};

export type ScreeningRow = {
  id: string;
  complaint: string;
  language_code: string;
  phase: string;
  status: string;
  suspected_conditions: string[];
  state: JsonObject;
  awis: number | null;
  awis_available: boolean;
  band: string | null;
  summary: string | null;
  report: JsonObject | null;
  created_at: string;
  updated_at: string;
};

export type ScreeningBundle = {
  screening: ScreeningRow | null;
  answers: AnswerRow[];
  readings: ReadingRow[];
};

const SCREENING_COLUMNS =
  "id, complaint, language_code, phase, status, suspected_conditions, state, awis, awis_available, band, summary, report, created_at, updated_at";

export async function loadScreening(
  db: SupabaseClient,
  screeningId: string,
): Promise<ScreeningBundle> {
  const [screening, answers, readings] = await Promise.all([
    db.from("screenings").select(SCREENING_COLUMNS).eq("id", screeningId).maybeSingle(),
    db
      .from("screening_answers")
      .select("question_id, topic, question_text, answer, normalized_value, answered_at")
      .eq("screening_id", screeningId)
      .order("answered_at", { ascending: true }),
    db
      .from("test_readings")
      .select(
        "test_id, test_name, numeric_value, text_value, unit, reference_range, flag, label, status, source, category, reading_at",
      )
      .eq("screening_id", screeningId)
      .order("reading_at", { ascending: true }),
  ]);

  if (screening.error) throw new Error(screening.error.message);
  if (answers.error) throw new Error(answers.error.message);
  if (readings.error) throw new Error(readings.error.message);

  return {
    screening: (screening.data as ScreeningRow | null) ?? null,
    answers: (answers.data ?? []) as AnswerRow[],
    readings: (readings.data ?? []) as ReadingRow[],
  };
}

/** The screening the person is currently in the middle of, if any. */
export async function loadActiveScreening(
  db: SupabaseClient,
  userId: string,
): Promise<ScreeningBundle> {
  const { data, error } = await db
    .from("screenings")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { screening: null, answers: [], readings: [] };
  return loadScreening(db, data.id as string);
}

/**
 * Latest stored reading per test across every screening of the person.
 * This is the single source of truth for "has this test been done?" so the
 * check-up, recommended tests, readings and report screens can never disagree.
 */
export async function loadLatestReadings(
  db: SupabaseClient,
  userId: string,
): Promise<ReadingRow[]> {
  const { data, error } = await db
    .from("test_readings")
    .select(
      "test_id, test_name, numeric_value, text_value, unit, reference_range, flag, label, status, source, category, reading_at",
    )
    .eq("user_id", userId)
    .order("reading_at", { ascending: false });
  if (error) throw new Error(error.message);

  const latest = new Map<string, ReadingRow>();
  for (const row of (data ?? []) as ReadingRow[]) {
    if (!latest.has(row.test_id)) latest.set(row.test_id, row);
  }
  return [...latest.values()];
}
