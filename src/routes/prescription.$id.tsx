import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Btn, Card, Icon, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { PrescriptionView } from "@/components/prescription-view";
import { ReportShare } from "@/components/report-share";
import { contentOf, getPrescription } from "@/lib/prescriptions";

export const Route = createFileRoute("/prescription/$id")({
  head: () => ({
    meta: [
      { title: "Prescription | Aaha Companion" },
      {
        name: "description",
        content: "Your doctor-approved care plan: medicines, lifestyle, nutrition, activity and follow-up.",
      },
      { property: "og:title", content: "Prescription | Aaha Companion" },
      { property: "og:description", content: "A doctor-approved plan written in plain language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrescriptionScreen,
});

function PrescriptionScreen() {
  return (
    <Screen>
      <TopBar title="Prescription" subtitle="Approved care plan" />
      <RequireAuth message="Sign in to open this prescription.">
        <PrescriptionDetail />
      </RequireAuth>
    </Screen>
  );
}

function PrescriptionDetail() {
  const { id } = Route.useParams();
  const row = useQuery({ queryKey: ["prescription", id], queryFn: () => getPrescription(id) });

  if (row.isLoading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" /> Loading…
        </Card>
      </Section>
    );

  if (!row.data)
    return (
      <Section>
        <Card className="text-center">
          <Icon name="folder_off" className="text-[32px] text-primary" />
          <p className="mt-2 text-sm font-bold">Prescription not available</p>
          <p className="mt-1 text-xs text-muted-foreground">
            It may still be with your doctor for approval.
          </p>
          <Btn to="/prescriptions" className="mt-3" icon="prescriptions">
            Back to prescriptions
          </Btn>
        </Card>
      </Section>
    );

  const c = contentOf(row.data);
  return (
    <>
      <PrescriptionView row={row.data} />
      <ReportShare
        title={`Prescription from ${row.data.doctor_name ?? "your Aaha doctor"}`}
        summary={row.data.consultation_summary ?? ""}
        document={{
          title: "Doctor-approved prescription",
          reportId: row.data.id,
          date: row.data.approved_at ?? row.data.created_at,
          summary: c.consultation_summary ?? row.data.consultation_summary ?? "",
          sections: [
            {
              type: "table",
              title: "Medication",
              columns: ["Medicine", "Dosage", "Frequency", "Duration"],
              rows: (c.medication ?? []).map((m) => [
                m.name,
                m.dosage ?? "—",
                m.frequency ?? "—",
                m.duration ?? "—",
              ]),
            },
            {
              type: "list",
              title: "Lifestyle management",
              items: (c.lifestyle_management ?? []).map((i) => `${i.title}: ${i.detail}`),
            },
            { type: "list", title: "Nutrition", items: (c.nutrition ?? []).map((i) => `${i.title}: ${i.detail}`) },
            {
              type: "list",
              title: "Physical activity",
              items: (c.physical_activity ?? []).map((i) => `${i.title}: ${i.detail}`),
            },
            {
              type: "list",
              title: "Follow-up",
              items: [
                c.follow_up?.timeline ?? "",
                ...(c.follow_up?.tests ?? []),
                c.follow_up?.notes ?? "",
              ].filter(Boolean),
            },
          ],
        }}
      />
    </>
  );
}
