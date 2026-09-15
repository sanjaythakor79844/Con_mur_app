import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Btn, Card, Icon, Row, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, listAppointments, listReports, updateProfile } from "@/lib/aaha-api";
import { apiService } from "@/lib/api-service";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile | Aaha Companion" },
      {
        name: "description",
        content: "Manage your details, language, privacy, consent and support options.",
      },
      { property: "og:title", content: "My profile | Aaha Companion" },
      { property: "og:description", content: "Your details, records and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  return (
    <Screen>
      <TopBar title="Profile" back={false} />
      <RequireAuth message="Sign in to manage your Aaha profile.">
        <ProfileBody />
      </RequireAuth>
      <Section title="Preferences">
        <div className="space-y-3">
          <Row icon="lock" title="Privacy" subtitle="Data and sharing" to="/consent" />
          <Row icon="fact_check" title="Consent" subtitle="Manage your consents" to="/consent" />
          <Row icon="support_agent" title="Help & Support" subtitle="We're here to help" to="/emergency" />
        </div>
      </Section>
      <Section>
        <Card className="bg-soft">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="location_on" />
            <p className="text-sm font-bold">Your centre: Aaha Health Centre, Satellite</p>
          </div>
          <Btn to="/centre-details" size="md" variant="outline" className="mt-3" icon="info">
            View centre details
          </Btn>
        </Card>
      </Section>
    </Screen>
  );
}

function ProfileBody() {
  const { userId, user, patient, session } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("English");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
  const reports = useQuery({ queryKey: ["reports"], queryFn: listReports });
  const appts = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });
  
  // Backend API - Get reports count
  const backendReports = useQuery({
    queryKey: ["backend-reports"],
    queryFn: () => apiService.getMyReports(),
    enabled: !!session,
  });

  // The verified mobile number on the session is the account identity, so it is
  // the fallback whenever the profile row has no phone saved yet.
  const sessionPhone = user?.phone ? `+${user.phone.replace(/^\+/, "")}` : "";

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.full_name ?? "");
      setPhone(profile.data.phone ?? sessionPhone);
      setLanguage(profile.data.language ?? "English");
    }
  }, [profile.data, sessionPhone]);

  const save = useMutation({
    mutationFn: () => updateProfile(userId!, { full_name: name, phone, language }),
    onSuccess: () => {
      toast.success("Profile updated");
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const logout = async () => {
    await qc.cancelQueries();
    qc.clear();
    
    // Clear demo session if exists
    localStorage.removeItem("aaha_demo_session");
    console.log("🎭 Demo session cleared");
    
    // Sign out from Firebase (if logged in via Firebase)
    try {
      await signOut(auth);
    } catch (error) {
      console.log("Not logged in via Firebase");
    }
    
    toast.success("Signed out");
    void router.navigate({ to: "/login", replace: true });
  };

  const initial = (name || sessionPhone || "A").charAt(0).toUpperCase();
  
  const totalReports = (reports.data?.length ?? 0) + (backendReports.data?.reports.length ?? 0);

  return (
    <>
      <Section>
        <Card>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-xl font-bold text-primary">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{name || "Add your name"}</p>
              <p className="truncate text-xs text-muted-foreground">{phone || sessionPhone}</p>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="mt-1 text-xs font-semibold text-primary"
              >
                {editing ? "Close" : "Edit personal details"}
              </button>
            </div>
          </div>

          {editing ? (
            <div className="mt-4 space-y-3">
              {[
                { id: "name", label: "Full name", value: name, set: setName, placeholder: "Priya Sharma" },
                { id: "phone", label: "Phone", value: phone, set: setPhone, placeholder: "+91 98250 00000" },
                { id: "language", label: "Language", value: language, set: setLanguage, placeholder: "English" },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="text-xs font-semibold text-muted-foreground">
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    value={f.value}
                    placeholder={f.placeholder}
                    onChange={(e) => f.set(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-2xl bg-muted px-3 text-sm font-semibold outline-none"
                  />
                </div>
              ))}
              <Btn size="md" icon="save" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "Saving…" : "Save details"}
              </Btn>
            </div>
          ) : null}
        </Card>
      </Section>

      <Section title="Your records">
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-2xl font-bold text-primary">{totalReports}</p>
            <p className="text-xs text-muted-foreground">Reports saved</p>
            {backendReports.data && backendReports.data.reports.length > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                ({backendReports.data.reports.length} from Kiosk)
              </p>
            )}
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-primary">
              {(appts.data ?? []).filter((a) => a.status !== "Cancelled").length}
            </p>
            <p className="text-xs text-muted-foreground">Consultations</p>
          </Card>
        </div>
        
        {/* Backend Patient Info */}
        {patient && (
          <Card className="mt-3 bg-accent/30">
            <div className="flex items-center gap-2">
              <Icon name="badge" className="text-primary" />
              <div>
                <p className="text-xs font-semibold">Patient ID: {patient.patient_id}</p>
                <p className="text-[10px] text-muted-foreground">
                  Age: {patient.age} • Gender: {patient.gender}
                </p>
              </div>
            </div>
          </Card>
        )}
        
        <div className="mt-3 space-y-3">
          <Row icon="folder_open" title="My reports" subtitle="Uploads and check-ups" to="/reports" />
          <Row icon="prescriptions" title="My prescriptions" subtitle="Doctor-approved care plans" to="/prescriptions" />

          <Row icon="translate" title="Language" subtitle={language} to="/language" />
        </div>
      </Section>

      <Section>
        <Btn variant="outline" icon="logout" onClick={() => void logout()}>
          Logout
        </Btn>
      </Section>
    </>
  );
}
