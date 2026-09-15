import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useRoles } from "@/hooks/use-role";
import { useI18n } from "@/lib/i18n";
import {
  contentOf,
  emptyContent,
  getPrescription,
  listPrescriptionVersions,
  STATUS_LABEL,
  VERSION_LABEL,
  type CareItem,
  type Medicine,
  type PrescriptionContent,
} from "@/lib/prescriptions";
import {
  acknowledgeRisk,
  approvePrescription,
  regeneratePrescriptionDraft,
  savePrescription,
} from "@/lib/prescriptions.functions";


export const Route = createFileRoute("/doctor/prescription/$id")({
  head: () => ({
    meta: [
      { title: "Review prescription | Aaha Companion" },
      {
        name: "description",
        content: "Edit the AI-drafted care plan and approve it before the patient can see it.",
      },
      { property: "og:title", content: "Review prescription | Aaha Companion" },
      { property: "og:description", content: "Doctor review and approval for an Aaha prescription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewScreen,
});

function ReviewScreen() {
  return (
    <Screen>
      <TopBar title="Review prescription" subtitle="Edit, then approve" />
      <RequireAuth message="Sign in with your doctor account.">
        <ReviewBody />
      </RequireAuth>
    </Screen>
  );
}

const field =
  "min-h-11 w-full rounded-2xl bg-muted px-3 py-2 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground";

function ReviewBody() {
  const { id } = Route.useParams();
  const { isDoctor, loading } = useRoles();
  const { lang } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const save = useServerFn(savePrescription);
  const approve = useServerFn(approvePrescription);
  const regenerate = useServerFn(regeneratePrescriptionDraft);
  const ack = useServerFn(acknowledgeRisk);

  const row = useQuery({ queryKey: ["prescription", id], queryFn: () => getPrescription(id) });
  const versions = useQuery({
    queryKey: ["prescription-versions", id],
    queryFn: () => listPrescriptionVersions(id),
  });
  const [content, setContent] = useState<PrescriptionContent>(emptyContent);

  useEffect(() => {
    if (row.data) setContent(contentOf(row.data));
  }, [row.data]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["prescription", id] });
    void qc.invalidateQueries({ queryKey: ["prescription-versions", id] });
    void qc.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
  };

  const saveDraft = useMutation({
    mutationFn: () => save({ data: { id, content } }),
    onSuccess: () => {
      toast.success("Changes saved");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const redraft = useMutation({
    mutationFn: () => regenerate({ data: { id, language: lang } }),
    onSuccess: () => {
      toast.success("New draft generated");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not regenerate the draft"),
  });

  const acknowledge = useMutation({
    mutationFn: () => ack({ data: { id } }),
    onSuccess: () => {
      toast.success("Escalation protocol acknowledged");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record the acknowledgement"),
  });

  const finalise = useMutation({
    mutationFn: () => approve({ data: { id, content } }),
    onSuccess: () => {
      toast.success("Prescription approved and sent to the patient");
      refresh();
      void navigate({ to: "/doctor" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not approve"),
  });


  if (loading || row.isLoading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" /> Loading…
        </Card>
      </Section>
    );

  if (!isDoctor || !row.data)
    return (
      <Section>
        <Card className="text-center">
          <Icon name="lock" className="text-[32px] text-primary" />
          <p className="mt-2 text-sm font-bold">Not available</p>
          <Btn to="/doctor" className="mt-3" icon="arrow_back">
            Back to dashboard
          </Btn>
        </Card>
      </Section>
    );

  const approved = row.data.status === "APPROVED";
  const highRisk = row.data.risk_level === "HIGH";
  const riskAcknowledged = Boolean(row.data.risk_acknowledged_at);
  const riskReasons = (row.data.risk_reasons ?? []) as unknown as string[];
  const set = (patch: Partial<PrescriptionContent>) => setContent((c) => ({ ...c, ...patch }));


  const careSection = (
    key: "lifestyle_management" | "nutrition" | "physical_activity",
    title: string,
    icon: string,
  ) => (
    <Section title={title} key={key}>
      <div className="space-y-3">
        {content[key].map((item: CareItem, index) => (
          <Card key={`${key}-${index}`}>
            <input
              aria-label={`${title} title`}
              value={item.title}
              disabled={approved}
              placeholder="Title"
              onChange={(e) => {
                const next = [...content[key]];
                next[index] = { ...item, title: e.target.value };
                set({ [key]: next } as Partial<PrescriptionContent>);
              }}
              className={field}
            />
            <textarea
              aria-label={`${title} detail`}
              value={item.detail}
              disabled={approved}
              placeholder="What the patient should do"
              rows={2}
              onChange={(e) => {
                const next = [...content[key]];
                next[index] = { ...item, detail: e.target.value };
                set({ [key]: next } as Partial<PrescriptionContent>);
              }}
              className={`${field} mt-2 font-normal`}
            />
            {!approved ? (
              <button
                type="button"
                onClick={() => set({ [key]: content[key].filter((_, i) => i !== index) } as Partial<PrescriptionContent>)}
                className="mt-2 text-xs font-semibold text-destructive"
              >
                Remove
              </button>
            ) : null}
          </Card>
        ))}
        {!approved ? (
          <button
            type="button"
            onClick={() => set({ [key]: [...content[key], { title: "", detail: "" }] } as Partial<PrescriptionContent>)}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
          >
            <Icon name={icon} className="text-[16px]" /> Add item
          </button>
        ) : null}
      </div>
    </Section>
  );

  return (
    <>
      <Section>
        <Card>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p className="truncate text-sm font-bold">Prescription for review</p>
            <Pill tone={approved ? "green" : row.data.status === "DRAFT" ? "amber" : "info"}>
              {STATUS_LABEL[row.data.status] ?? row.data.status}
            </Pill>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The AI draft is built from your consultation notes and this patient's case data. You are responsible for the
            final content.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Source: {row.data.source_type === "STANDALONE_CONSULTATION" ? "Standalone consultation" : "Screening consultation"}
            {" · "}Last updated {new Date(row.data.updated_at).toLocaleString()}
          </p>
        </Card>
      </Section>

      {highRisk ? (
        <Section>
          <Card className="border border-destructive/40">
            <div className="flex items-center gap-2 text-destructive">
              <Icon name="warning" className="text-[18px]" />
              <p className="text-sm font-bold">High-risk case</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              High-risk case: existing escalation/sign-off protocol applies. Please review the required escalation
              pathway before approving this prescription.
            </p>
            {riskReasons.length ? (
              <ul className="mt-2 space-y-1">
                {riskReasons.map((r) => (
                  <li key={r} className="text-xs text-muted-foreground">
                    • {r}
                  </li>
                ))}
              </ul>
            ) : null}
            {riskAcknowledged ? (
              <p className="mt-2 text-xs font-semibold text-primary">
                Acknowledged {new Date(row.data.risk_acknowledged_at as string).toLocaleString()}
              </p>
            ) : approved ? null : (
              <Btn
                variant="outline"
                icon="task_alt"
                className="mt-3"
                disabled={acknowledge.isPending}
                onClick={() => acknowledge.mutate()}
              >
                {acknowledge.isPending ? "Recording…" : "I have reviewed the escalation pathway"}
              </Btn>
            )}
          </Card>
        </Section>
      ) : null}

      <Section title="Consultation summary">
        <Card>
          <textarea
            aria-label="Consultation summary"
            value={content.consultation_summary}
            disabled={approved}
            rows={4}
            placeholder="Presentation and clinical impression"
            onChange={(e) => set({ consultation_summary: e.target.value })}
            className={`${field} font-normal`}
          />
        </Card>
      </Section>

      <Section title="Medication">
        <div className="space-y-3">
          {content.medication.length === 0 ? (
            <Card className="bg-soft">
              <p className="text-sm font-semibold">No medication prescribed</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aaha never suggests medicine. Add any medicine yourself below.
              </p>
            </Card>
          ) : null}
          {content.medication.map((m: Medicine, index) => (
            <Card key={`med-${index}`}>
              <div className="grid gap-2">
                {(["name", "dosage", "frequency", "route", "duration", "notes"] as const).map((k) => (
                  <input
                    key={k}
                    aria-label={`Medicine ${k}`}
                    value={m[k] ?? ""}

                    disabled={approved}
                    placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                    onChange={(e) => {
                      const next = [...content.medication];
                      next[index] = { ...m, [k]: e.target.value };
                      set({ medication: next });
                    }}
                    className={field}
                  />
                ))}
              </div>
              {!approved ? (
                <button
                  type="button"
                  onClick={() => set({ medication: content.medication.filter((_, i) => i !== index) })}
                  className="mt-2 text-xs font-semibold text-destructive"
                >
                  Remove
                </button>
              ) : null}
            </Card>
          ))}
          {!approved ? (
            <button
              type="button"
              onClick={() =>
                set({
                  medication: [
                    ...content.medication,
                    { name: "", dosage: "", frequency: "", route: "", duration: "", notes: "" },
                  ],
                })
              }
              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-primary"
            >
              <Icon name="add" className="text-[16px]" /> Add medicine
            </button>
          ) : null}
        </div>
      </Section>

      {careSection("lifestyle_management", "Lifestyle management", "add")}
      {careSection("nutrition", "Nutrition", "add")}
      {careSection("physical_activity", "Physical activity", "add")}

      <Section title="Follow-up">
        <Card>
          <input
            aria-label="Follow-up timeline"
            value={content.follow_up.timeline}
            disabled={approved}
            placeholder="e.g. Review in 4 weeks"
            onChange={(e) => set({ follow_up: { ...content.follow_up, timeline: e.target.value } })}
            className={field}
          />
          <input
            aria-label="Follow-up tests"
            value={content.follow_up.tests.join(", ")}
            disabled={approved}
            placeholder="Tests, comma separated"
            onChange={(e) =>
              set({
                follow_up: {
                  ...content.follow_up,
                  tests: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                },
              })
            }
            className={`${field} mt-2`}
          />
          <textarea
            aria-label="Follow-up notes"
            value={content.follow_up.notes}
            disabled={approved}
            rows={2}
            placeholder="Anything else the patient should watch for"
            onChange={(e) => set({ follow_up: { ...content.follow_up, notes: e.target.value } })}
            className={`${field} mt-2 font-normal`}
          />
        </Card>
      </Section>

      <Section>
        {approved ? (
          <Card className="bg-soft text-sm text-muted-foreground">
            This prescription is approved and locked. The patient can now see it.
          </Card>
        ) : (
          <div className="space-y-3">
            <Btn
              variant="outline"
              icon={redraft.isPending ? "progress_activity" : "refresh"}
              disabled={redraft.isPending}
              onClick={() => redraft.mutate()}
            >
              {redraft.isPending ? "Generating prescription draft…" : "Regenerate draft"}
            </Btn>
            <Btn variant="outline" icon="save" disabled={saveDraft.isPending} onClick={() => saveDraft.mutate()}>
              {saveDraft.isPending ? "Saving…" : "Save draft"}
            </Btn>
            <Btn
              icon="verified"
              disabled={finalise.isPending || (highRisk && !riskAcknowledged)}
              onClick={() => finalise.mutate()}
            >
              {finalise.isPending ? "Approving…" : "Approve prescription"}
            </Btn>
            {highRisk && !riskAcknowledged ? (
              <p className="text-xs text-muted-foreground">
                Acknowledge the escalation protocol above to enable approval.
              </p>
            ) : null}
          </div>
        )}
      </Section>

      <Section title="Version history">
        <Card>
          {versions.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading audit trail…</p>
          ) : (versions.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No versions recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {(versions.data ?? []).map((v) => (
                <li key={v.id} className="rounded-2xl bg-muted p-3">
                  <p className="text-sm font-semibold">{VERSION_LABEL[v.kind] ?? v.kind}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Revision {v.revision} · {new Date(v.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>

    </>
  );
}
