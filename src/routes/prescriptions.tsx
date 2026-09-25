import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { listMyPrescriptions } from "@/lib/prescriptions";

export const Route = createFileRoute("/prescriptions")({
  head: () => ({
    meta: [
      { title: "My prescriptions | Aaha Companion" },
      {
        name: "description",
        content: "Every care plan your Aaha doctor has approved — medicines, nutrition, activity and follow-up.",
      },
      { property: "og:title", content: "My prescriptions | Aaha Companion" },
      { property: "og:description", content: "Doctor-approved care plans, saved in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrescriptionsScreen,
});

function PrescriptionsScreen() {
  return (
    <Screen>
      <TopBar title="Prescriptions" subtitle="Approved by your doctor" />
      <RequireAuth message="Sign in to see your prescriptions.">
        <PrescriptionList />
      </RequireAuth>
    </Screen>
  );
}

function PrescriptionList() {
  const list = useQuery({ queryKey: ["prescriptions"], queryFn: listMyPrescriptions });

  if (list.isLoading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" /> Loading…
        </Card>
      </Section>
    );

  const rows = list.data ?? [];
  if (rows.length === 0)
    return (
      <Section>
        <Card className="text-center">
          <Icon name="prescriptions" className="text-[32px] text-primary" />
          <p className="mt-2 text-sm font-bold">No prescriptions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            After a consultation, your doctor's approved plan appears here.
          </p>
          <Btn to="/doctors" className="mt-3" icon="stethoscope">
            Talk to a doctor
          </Btn>
        </Card>
      </Section>
    );

  return (
    <Section title="Approved plans">
      <ul className="space-y-3">
        {rows.map((r: any) => (
          <Card as="li" key={r.id}>
            <Link to="/prescription/$id" params={{ id: r.id }} className="block">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{r.doctor_name ?? "Aaha doctor"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.approved_at ? new Date(r.approved_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <Pill tone="green">Approved</Pill>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.consultation_summary}</p>
            </Link>
          </Card>
        ))}
      </ul>
    </Section>
  );
}
