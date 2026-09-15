import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PrescriptionRow = Tables<"prescriptions">;

export type CareItem = { title: string; detail: string };
export type Medicine = {
  name: string;
  dosage: string;
  frequency: string;
  route?: string;
  duration: string;
  notes: string;
};
export type FollowUp = { timeline: string; tests: string[]; notes: string };


/** The editable body of a prescription — shared by the AI draft, doctor edit and approved copy. */
export type PrescriptionContent = {
  consultation_summary: string;
  lifestyle_management: CareItem[];
  medication: Medicine[];
  nutrition: CareItem[];
  physical_activity: CareItem[];
  follow_up: FollowUp;
};

export const emptyContent: PrescriptionContent = {
  consultation_summary: "",
  lifestyle_management: [],
  medication: [],
  nutrition: [],
  physical_activity: [],
  follow_up: { timeline: "", tests: [], notes: "" },
};

export function contentOf(row: PrescriptionRow): PrescriptionContent {
  return {
    consultation_summary: row.consultation_summary ?? "",
    lifestyle_management: (row.lifestyle_management ?? []) as unknown as CareItem[],
    medication: (row.medication ?? []) as unknown as Medicine[],
    nutrition: (row.nutrition ?? []) as unknown as CareItem[],
    physical_activity: (row.physical_activity ?? []) as unknown as CareItem[],
    follow_up: (row.follow_up ?? emptyContent.follow_up) as unknown as FollowUp,
  };
}

export type SymptomSnapshot = { label: string; answer: string };
export type AwisSnapshot = { score?: number; band?: string; summary?: string };
export type ConditionSnapshot = { primary?: string; suspected?: string[] };

/** Prescriptions the signed-in patient can see (approved only, enforced by access rules). */
export async function listMyPrescriptions() {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*")
    .order("approved_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPrescription(id: string) {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Every prescription authored by the signed-in doctor. */
export async function listDoctorPrescriptions() {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listPatients() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listPatientAssessments(patientId: string) {
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "AI draft",
  DOCTOR_REVIEW: "Doctor reviewed",
  DOCTOR_REVIEWED: "Doctor reviewed",
  APPROVED: "Approved · available to patient",
};

export type PrescriptionVersion = {
  id: string;
  kind: string;
  revision: number;
  created_at: string;
  actor_id: string;
  content: unknown;
  context: unknown;
};

export const VERSION_LABEL: Record<string, string> = {
  DRAFT_GENERATED: "AI draft generated",
  DOCTOR_EDITED: "Doctor edited",
  APPROVED: "Final approved",
};

/** Append-only audit trail for one prescription. */
export async function listPrescriptionVersions(prescriptionId: string) {
  const { data, error } = await supabase
    .from("prescription_versions")
    .select("id, kind, revision, created_at, actor_id, content, context")
    .eq("prescription_id", prescriptionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PrescriptionVersion[];
}

