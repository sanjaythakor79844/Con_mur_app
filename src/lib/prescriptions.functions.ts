import { createServerFn } from "@tanstack/react-start";
// import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { PrescriptionContent } from "@/lib/prescriptions";
import {
  assessRisk,
  describeReports,
  draftPrescription,
  type DoctorInput,
  type WorkflowContext,
} from "@/lib/prescriptions.server";

type GenerateInput = {
  patientId: string;
  assessmentId?: string;
  consultationId?: string;
  language?: string;
  /** SCREENING_CONSULTATION uses AWIS/screening context, STANDALONE_CONSULTATION uses doctor notes only. */
  sourceType?: "SCREENING_CONSULTATION" | "STANDALONE_CONSULTATION";
  doctor: DoctorInput;
};

function validateGenerate(input: GenerateInput) {
  if (!input?.patientId) throw new Error("patientId is required");
  if (!input?.doctor?.consultation_summary || input.doctor.consultation_summary.trim().length < 20) {
    throw new Error("Add a consultation summary before generating a prescription.");
  }
  return input;
}

/** Shared generator: builds the payload, drafts with AI and returns the content plus context. */
async function buildDraft(supabase: any, userId: string, data: GenerateInput) {
  const standalone = data.sourceType === "STANDALONE_CONSULTATION";

  const { data: assessment } = standalone
    ? { data: null }
    : data.assessmentId
      ? await supabase.from("assessments").select("*").eq("id", data.assessmentId).maybeSingle()
      : await supabase
          .from("assessments")
          .select("*")
          .eq("user_id", data.patientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();


  const { data: reports } = standalone
    ? { data: null }
    : await supabase
        .from("reports")
        .select("title, report_date, extracted_values")
        .eq("user_id", data.patientId)
        .order("report_date", { ascending: false })
        .limit(3);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.patientId)
    .maybeSingle();
  const { data: doctorProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const answers = (assessment?.answers ?? {}) as Record<string, string>;
  const symptoms = Object.entries(answers)
    .filter(([, v]) => String(v ?? "").trim())
    .slice(0, 30)
    .map(([label, answer]) => ({ label, answer: String(answer) }));

  const report = (assessment?.report ?? {}) as { domains?: Record<string, number> };
  const awis = {
    score: assessment?.score ?? undefined,
    band: assessment?.band ?? undefined,
    summary: assessment?.summary ?? undefined,
    domains: report?.domains,
  };
  const suspected = (assessment?.suspected_conditions ?? []) as string[];

  const workflow: WorkflowContext | undefined = standalone
    ? undefined
    : { suspected, awis, symptoms, reportLines: describeReports(reports) };

  const risk = assessRisk({
    band: assessment?.band ?? null,
    score: assessment?.score ?? null,
    suspected: standalone ? [] : suspected,
    freeText: [data.doctor.consultation_summary, data.doctor.impression, data.doctor.recorded_symptoms]
      .filter(Boolean)
      .join("\n"),
  });

  const content = await draftPrescription({
    patientName: profile?.full_name ?? "Patient",
    doctor: data.doctor,
    workflow,
    language: data.language,
  });

  return {
    content,
    risk,
    symptoms: standalone ? [] : symptoms,
    awis: standalone ? {} : awis,
    suspected: standalone ? [] : suspected,
    doctorName: doctorProfile?.full_name ?? "Aaha doctor",
    context: { standalone, doctor: data.doctor, workflow: workflow ?? null },
  };
}

/** Creates a prescription with an AI-drafted body for the doctor to review. */
export const generatePrescriptionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateGenerate)
  .handler(async ({ data, context }: any) => {
    const { supabase, userId } = context;

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "doctor")
      .maybeSingle();
    if (!role) throw new Error("Only doctors can create prescriptions.");

    const built = await buildDraft(supabase, userId, data);

    const { data: row, error } = await supabase
      .from("prescriptions")
      .insert({
        patient_id: data.patientId,
        doctor_id: userId,
        consultation_id: data.consultationId ?? null,
        assessment_id: data.assessmentId ?? null,
        source_type: data.sourceType ?? "SCREENING_CONSULTATION",
        status: "DRAFT",
        doctor_name: built.doctorName,
        doctor_input: data.doctor as never,
        doctor_impression: data.doctor.impression ?? null,
        doctor_instructions: data.doctor.instructions ?? null,
        risk_level: built.risk.level,
        risk_reasons: built.risk.reasons as never,
        symptoms_snapshot: built.symptoms as never,
        awis_snapshot: built.awis as never,
        condition_snapshot: { primary: built.suspected[0], suspected: built.suspected } as never,
        consultation_summary: built.content.consultation_summary,
        lifestyle_management: built.content.lifestyle_management as never,
        medication: built.content.medication as never,
        nutrition: built.content.nutrition as never,
        physical_activity: built.content.physical_activity as never,
        follow_up: built.content.follow_up as never,
        ai_draft: built.content as never,
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from("prescription_versions").insert({
      prescription_id: row.id,
      actor_id: userId,
      kind: "DRAFT_GENERATED",
      revision: 1,
      content: built.content as never,
      context: built.context as never,
    });

    return { ok: true as const, id: row.id };
  });

/** Regenerates the AI draft for an existing, not-yet-approved prescription. */
export const regeneratePrescriptionDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; language?: string }) => {
    if (!input?.id) throw new Error("id is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { supabase, userId } = context;
    const { data: existing, error: readError } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("id", data.id)
      .eq("doctor_id", userId)
      .maybeSingle();
    if (readError) throw readError;
    if (!existing) throw new Error("Prescription not found.");
    if (existing.status === "APPROVED") throw new Error("An approved prescription cannot be regenerated.");

    const doctor = (existing.doctor_input ?? {}) as DoctorInput;
    if (!doctor.consultation_summary?.trim()) throw new Error("This draft has no consultation summary to work from.");

    const built = await buildDraft(supabase, userId, {
      patientId: existing.patient_id,
      ...(existing.assessment_id ? { assessmentId: existing.assessment_id } : {}),
      ...(data.language ? { language: data.language } : {}),
      sourceType: existing.source_type === "STANDALONE_CONSULTATION" ? "STANDALONE_CONSULTATION" : "SCREENING_CONSULTATION",
      doctor,
    });

    const revision = (existing.revision ?? 1) + 1;
    const { error } = await supabase
      .from("prescriptions")
      .update({
        status: "DRAFT",
        revision,
        risk_level: built.risk.level,
        risk_reasons: built.risk.reasons as never,
        consultation_summary: built.content.consultation_summary,
        lifestyle_management: built.content.lifestyle_management as never,
        medication: built.content.medication as never,
        nutrition: built.content.nutrition as never,
        physical_activity: built.content.physical_activity as never,
        follow_up: built.content.follow_up as never,
        ai_draft: built.content as never,
      })
      .eq("id", data.id)
      .eq("doctor_id", userId)
      .neq("status", "APPROVED");
    if (error) throw error;

    await supabase.from("prescription_versions").insert({
      prescription_id: data.id,
      actor_id: userId,
      kind: "DRAFT_GENERATED",
      revision,
      content: built.content as never,
      context: built.context as never,
    });

    return { ok: true as const };
  });

/** Records the doctor's acknowledgement of the high-risk escalation protocol. */
export const acknowledgeRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const { error } = await context.supabase
      .from("prescriptions")
      .update({ risk_acknowledged_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("doctor_id", context.userId);
    if (error) throw error;
    return { ok: true as const };
  });

/** Saves the doctor's edits without publishing them to the patient. */
export const savePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; content: PrescriptionContent }) => {
    if (!input?.id) throw new Error("id is required");
    if (!input?.content) throw new Error("content is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const c = data.content;
    const { data: row, error } = await context.supabase
      .from("prescriptions")
      .update({
        consultation_summary: c.consultation_summary,
        lifestyle_management: c.lifestyle_management as never,
        medication: c.medication as never,
        nutrition: c.nutrition as never,
        physical_activity: c.physical_activity as never,
        follow_up: c.follow_up as never,
        doctor_edited_version: c as never,
        status: "DOCTOR_REVIEW",
      })
      .eq("id", data.id)
      .eq("doctor_id", context.userId)
      .neq("status", "APPROVED")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("This prescription is already approved or is not yours.");

    await context.supabase.from("prescription_versions").insert({
      prescription_id: data.id,
      actor_id: context.userId,
      kind: "DOCTOR_EDITED",
      revision: row.revision ?? 1,
      content: c as never,
    });

    return { ok: true as const };
  });

/** Locks the prescription, publishes it to the patient and notifies them. */
export const approvePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; content: PrescriptionContent }) => {
    if (!input?.id) throw new Error("id is required");
    if (!input?.content) throw new Error("content is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const c = data.content;
    if (!c.consultation_summary?.trim()) throw new Error("Add a consultation summary before approving.");

    const { data: current, error: readError } = await context.supabase
      .from("prescriptions")
      .select("risk_level, risk_acknowledged_at, status")
      .eq("id", data.id)
      .eq("doctor_id", context.userId)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) throw new Error("Prescription not found.");
    if (current.status === "APPROVED") throw new Error("This prescription is already approved.");
    if (current.risk_level === "HIGH" && !current.risk_acknowledged_at) {
      throw new Error("Acknowledge the high-risk escalation protocol before approving.");
    }

    const { data: row, error } = await context.supabase
      .from("prescriptions")
      .update({
        consultation_summary: c.consultation_summary,
        lifestyle_management: c.lifestyle_management as never,
        medication: c.medication as never,
        nutrition: c.nutrition as never,
        physical_activity: c.physical_activity as never,
        follow_up: c.follow_up as never,
        doctor_edited_version: c as never,
        approved_version: c as never,
        status: "APPROVED",
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("doctor_id", context.userId)
      .neq("status", "APPROVED")
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("This prescription is already approved or is not yours.");

    await context.supabase.from("prescription_versions").insert({
      prescription_id: data.id,
      actor_id: context.userId,
      kind: "APPROVED",
      revision: row.revision ?? 1,
      content: c as never,
    });

    const { error: notifyError } = await context.supabase.from("notifications").insert({
      user_id: row.patient_id,
      title: "Your prescription is ready",
      body: `${row.doctor_name ?? "Your doctor"} has approved your care plan.`,
      step: "Consultation",
      due_label: "Just now",
      link: `/prescription/${row.id}`,
      kind: "update",
    });
    if (notifyError) console.error("prescription notification failed", notifyError);

    return { ok: true as const };
  });
