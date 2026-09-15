import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useRoles } from "@/hooks/use-role";
import { useI18n } from "@/lib/i18n";
import { listPatientAssessments } from "@/lib/prescriptions";
import { generatePrescriptionDraft } from "@/lib/prescriptions.functions";

export const Route = createFileRoute("/doctor/consult/$patientId")({
  head: () => ({
    meta: [
      { title: "Consultation | Aaha Companion" },
      {
        name: "description",
        content: "Record the consultation summary, impression and instructions, then generate a prescription draft.",
      },
      { property: "og:title", content: "Consultation | Aaha Companion" },
      { property: "og:description", content: "Doctor consultation notes and prescription drafting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConsultScreen,
});

const field =
  "w-full rounded-2xl bg-muted px-3 py-2 text-sm outline-none placeholder:text-muted-foreground";

function ConsultScreen() {
  return (
    <Screen>
      <TopBar title="Consultation" subtitle="Notes and prescription draft" />
      <RequireAuth message="Sign in with your doctor account.">
        <ConsultBody />
      </RequireAuth>
    </Screen>
  );
}

function ConsultBody() {
  const { patientId } = Route.useParams();
  const { isDoctor, loading } = useRoles();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const generate = useServerFn(generatePrescriptionDraft);

  const assessments = useQuery({
    queryKey: ["patient-assessments", patientId],
    queryFn: () => listPatientAssessments(patientId),
    enabled: isDoctor,
  });
  const latest = assessments.data?.[0];

  const [standalone, setStandalone] = useState(false);
  const [summary, setSummary] = useState("");
  const [impression, setImpression] = useState("");
  const [instructions, setInstructions] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [medication, setMedication] = useState("");

  const ready = summary.trim().length >= 20;

  const draft = useMutation({
    mutationFn: () =>
      generate({
        data: {
          patientId,
          language: lang,
          sourceType: standalone ? "STANDALONE_CONSULTATION" : "SCREENING_CONSULTATION",
          ...(standalone || !latest ? {} : { assessmentId: latest.id }),
          doctor: {
            consultation_summary: summary.trim(),
            impression: impression.trim(),
            instructions: instructions.trim(),
            recorded_symptoms: symptoms.trim(),
            medication_notes: medication.trim(),
          },
        },
      }),
    onSuccess: (res) => {
      toast.success("Draft ready to review");
      void navigate({ to: "/doctor/prescription/$id", params: { id: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not draft the prescription"),
  });

  if (loading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" /> Checking your access…
        </Card>
      </Section>
    );

  if (!isDoctor)
    return (
      <Section>
        <Card className="text-center">
          <Icon name="lock" className="text-[32px] text-primary" />
          <p className="mt-2 text-sm font-bold">Doctors only</p>
          <Btn to="/home" className="mt-3" icon="home">
            Back to home
          </Btn>
        </Card>
      </Section>
    );

  const useScreening = !standalone && Boolean(latest);

  return (
    <>
      <Section title="Case context">
        <Card>
          {latest ? (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="text-sm font-bold">Screening on {new Date(latest.created_at).toLocaleDateString()}</p>
                <Pill tone={useScreening ? "green" : "neutral"}>{useScreening ? "In use" : "Not used"}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Wellness score {latest.score ?? "n/a"}
                {latest.band ? ` · ${latest.band}` : ""}
                {latest.suspected_conditions?.length ? ` · ${latest.suspected_conditions.join(", ")}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Symptoms already collected in screening are sent automatically — no need to re-enter them.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No screening on file for this patient. This will be a standalone consultation.
            </p>
          )}
          <label className="mt-3 flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={standalone || !latest}
              disabled={!latest}
              onChange={(e) => setStandalone(e.target.checked)}
              className="size-4 accent-current"
            />
            Standalone consultation (do not use screening / wellness score data)
          </label>
        </Card>
      </Section>

      <Section title="Consultation summary">
        <Card>
          <textarea
            aria-label="Consultation summary"
            rows={8}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Clinical findings, symptoms discussed, clinical impression, what the patient should do, treatment and follow-up instructions"
            className={field}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {ready ? "Ready to generate." : "Add a little more detail to enable prescription generation."}
          </p>
        </Card>
      </Section>

      <Section title="Clinical impression">
        <Card>
          <textarea
            aria-label="Clinical impression"
            rows={3}
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="Diagnosis / condition impression"
            className={field}
          />
        </Card>
      </Section>

      {(standalone || !latest) && (
        <Section title="Symptoms recorded today">
          <Card>
            <textarea
              aria-label="Symptoms recorded"
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Symptoms as reported during this consultation"
              className={field}
            />
          </Card>
        </Section>
      )}

      <Section title="Instructions to the patient">
        <Card>
          <textarea
            aria-label="Instructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Anything you told the patient to do"
            className={field}
          />
        </Card>
      </Section>

      <Section title="Medication you are prescribing">
        <Card>
          <textarea
            aria-label="Medication"
            rows={3}
            value={medication}
            onChange={(e) => setMedication(e.target.value)}
            placeholder="e.g. Tab Thyronorm 50 mcg, once daily before breakfast, 8 weeks"
            className={field}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Aaha never suggests medicine. Only what you write here (or add later while editing) appears in the
            prescription.
          </p>
        </Card>
      </Section>

      <Section>
        <Btn
          icon={draft.isPending ? "progress_activity" : "auto_awesome"}
          disabled={!ready || draft.isPending}
          onClick={() => draft.mutate()}
        >
          {draft.isPending ? "Generating prescription draft…" : "Generate prescription"}
        </Btn>
        {draft.isError ? (
          <Card className="mt-3 text-xs text-destructive">
            {draft.error instanceof Error ? draft.error.message : "Generation failed."} Nothing was saved — you can
            retry.
          </Card>
        ) : null}
      </Section>
    </>
  );
}
