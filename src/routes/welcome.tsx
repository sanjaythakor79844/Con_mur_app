import { createFileRoute } from "@tanstack/react-router";
import { Btn, Card, Icon } from "@/components/aaha";
import { useDisplayName } from "@/hooks/use-overview";
import { useAuth } from "@/hooks/use-auth";
import hero from "@/assets/aaha-hero.png";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Aaha | Aaha Companion" },
      {
        name: "description",
        content: "Continue your health journey with Aaha after your kiosk health screening.",
      },
      { property: "og:title", content: "Welcome to Aaha" },
      { property: "og:description", content: "Continue your health journey with Aaha." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { firstName } = useDisplayName();
  const { patient } = useAuth();
  
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-10">
      <div className="rounded-[2.5rem] bg-soft p-6">
        <img
          src={hero}
          alt="Friendly illustration welcoming you to Aaha"
          width={1024}
          height={1024}
          loading="lazy"
          className="mx-auto w-full max-w-[220px]"
        />
      </div>
      <h1 className="mt-7 text-3xl font-bold leading-tight">
        {patient?.full_name || firstName ? `Hello, ${patient?.full_name || firstName}` : "Hello"}
        <span className="block text-primary">Welcome to Aaha</span>
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        Your screening is complete. Aaha will explain what your results mean, suggest the right next
        tests, and stay with you through your care.
      </p>
      
      {/* Backend Patient Info Badge */}
      {patient && (
        <Card className="mt-4 bg-accent/30">
          <div className="flex items-center gap-3">
            <Icon name="verified_user" className="text-primary" />
            <div className="text-xs">
              <p className="font-semibold">Connected to your health records</p>
              <p className="text-muted-foreground">
                Patient ID: {patient.patient_id} • Age: {patient.age}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-6 space-y-3">
        {[
          { i: "monitor_heart", t: "See your screening results in simple words" },
          { i: "upload_file", t: "Upload lab reports and get them explained" },
          { i: "favorite", t: "Talk to Aaha for personalised guidance" },
        ].map((r) => (
          <div key={r.i} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
              <Icon name={r.i} />
            </span>
            <p className="text-sm font-semibold">{r.t}</p>
          </div>
        ))}
      </Card>

      <div className="mt-auto space-y-3 pt-8">
        <Btn to="/upload-file" icon="upload_file" variant="outline">
          Upload Lab Reports
        </Btn>
        <Btn to="/home" icon="rocket_launch">
          Continue Your Health Journey
        </Btn>
      </div>
    </main>
  );
}
