import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listLatestReadings } from "@/lib/screening.functions";
import { isRecordedReading, type Reading } from "@/lib/ambika-engine";

/** Canonical, persisted status of one test. */
export type TestStatus = "not_started" | "to_do" | "completed";

export const READINGS_KEY = ["test-readings"] as const;

type Row = {
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

function toReading(row: Row): Reading {
  return {
    device_id: row.test_id,
    name: row.test_name,
    value: row.numeric_value ?? row.text_value ?? "",
    unit: row.unit ?? "",
    label: row.label ?? "",
    flag: (row.flag as Reading["flag"]) ?? "green",
    source: (row.source as Reading["source"]) ?? "manual",
    ...(row.category ? { category: row.category as Reading["category"] } : {}),
    ...(row.reference_range ? { ref_text: row.reference_range } : {}),
    status: (row.status as Reading["status"]) ?? "recorded",
  };
}

export function readingStatus(reading: Reading | undefined): TestStatus {
  if (!reading) return "not_started";
  return isRecordedReading(reading) ? "completed" : "to_do";
}

export const STATUS_LABEL: Record<TestStatus, string> = {
  not_started: "Not started",
  to_do: "To do",
  completed: "Completed",
};

/**
 * Every reading the person has stored, read from the database (never from
 * check-up React state), so counts and statuses are the same on every screen.
 */
export function useReadings() {
  const { userId } = useAuth();
  const fetchReadings = useServerFn(listLatestReadings);

  const query = useQuery({
    queryKey: [...READINGS_KEY, userId],
    enabled: !!userId,
    queryFn: async () => (await fetchReadings()) as Row[],
  });

  const byTest: Record<string, Reading> = {};
  for (const row of query.data ?? []) byTest[row.test_id] = toReading(row);

  const all = Object.values(byTest);
  const recorded = all.filter(isRecordedReading);

  return {
    loading: query.isLoading || query.isPending,
    error: query.error,
    byTest,
    readings: all,
    recorded,
    statusOf: (testId: string): TestStatus => readingStatus(byTest[testId]),
    counts: {
      total: recorded.length,
      normal: recorded.filter((r) => r.flag === "green").length,
      slightlyOff: recorded.filter((r) => r.flag === "amber").length,
      abnormal: recorded.filter((r) => r.flag === "red").length,
      pending: all.length - recorded.length,
    },
  };
}

/** Invalidate everything that depends on readings after a mutation. */
export function useInvalidateReadings() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: READINGS_KEY });
    void qc.invalidateQueries({ queryKey: ["active-screening"] });
    void qc.invalidateQueries({ queryKey: ["assessments"] });
    void qc.invalidateQueries({ queryKey: ["reports"] });
  };
}
