import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Btn, Card, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useRoles } from "@/hooks/use-role";
import { listDoctorPrescriptions, listPatients, STATUS_LABEL } from "@/lib/prescriptions";


export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor dashboard | Aaha Companion" },
      {
        name: "description",
        content: "Review patients, generate an AI prescription draft, edit it and approve the final care plan.",
      },
      { property: "og:title", content: "Doctor dashboard | Aaha Companion" },
      { property: "og:description", content: "Prescriptions drafted from each patient's own health record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorScreen,
});

function DoctorScreen() {
  return (
    <Screen>
      <TopBar title="Doctor dashboard" subtitle="Prescriptions and patients" back={false} />
      <RequireAuth message="Sign in with your doctor account.">
        <DoctorBody />
      </RequireAuth>
    </Screen>
  );
}

function DoctorBody() {
  const { isDoctor, loading } = useRoles();

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
          <p className="mt-1 text-xs text-muted-foreground">
            This dashboard is for Aaha doctors. Ask the centre team to enable your doctor access.
          </p>
          <Btn to="/home" className="mt-3" icon="home">
            Back to home
          </Btn>
        </Card>
      </Section>
    );

  return (
    <>
      <DraftList />
      <PatientList />
    </>
  );
}

function DraftList() {
  const list = useQuery({ queryKey: ["doctor-prescriptions"], queryFn: listDoctorPrescriptions });
  const rows = list.data ?? [];
  if (rows.length === 0) return null;

  return (
    <Section title="Your prescriptions">
      <ul className="space-y-3">
        {rows.map((r) => (
          <Card as="li" key={r.id}>
            <Link to="/doctor/prescription/$id" params={{ id: r.id }} className="block">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="truncate text-sm font-bold">{r.consultation_summary || "Untitled draft"}</p>
                <Pill tone={r.status === "APPROVED" ? "green" : r.status === "DRAFT" ? "amber" : "info"}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Created {new Date(r.created_at).toLocaleDateString()}
              </p>
            </Link>
          </Card>
        ))}
      </ul>
    </Section>
  );
}

function PatientList() {
  const patients = useQuery({ queryKey: ["doctor-patients"], queryFn: listPatients });

  return (
    <Section title="Your patients">
      {patients.isLoading ? (
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" /> Loading patients…
        </Card>
      ) : (patients.data ?? []).length === 0 ? (
        <Card className="text-sm text-muted-foreground">
          <p className="text-sm font-bold text-foreground">No patients assigned yet</p>
          <p className="mt-1 text-xs">
            You can only see records for patients under your care. Ask the centre team to assign a patient to you, or
            open a patient you have already prescribed for.
          </p>
        </Card>
      ) : (

        <ul className="space-y-3">
          {(patients.data ?? []).map((p) => (
            <Card as="li" key={p.id}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{p.full_name || "Patient"}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.phone || p.language}</p>
                </div>
                <Link
                  to="/doctor/consult/$patientId"
                  params={{ patientId: p.id }}
                  className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <Icon name="stethoscope" className="text-[16px]" />
                  Open case
                </Link>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </Section>
  );
}

