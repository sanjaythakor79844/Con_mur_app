import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Btn, Icon, Row, Screen } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, listAppointments, listReports, listAssessments, updateProfile } from "@/lib/aaha-api";
import { apiService } from "@/lib/api-service";
import { useI18n, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Me | Aaha Companion" },
      {
        name: "description",
        content: "Manage your details, language, privacy, consent and support options.",
      },
    ],
  }),
  component: Profile,
});

function Profile() {
  return (
    <RequireAuth message="Sign in to manage your Aaha profile.">
      <Screen>
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <h1 className="text-[26px] font-bold leading-tight">Profile</h1>
        </div>
        <div className="px-5 pb-6 flex flex-col gap-4">
          <ProfileBody />
        </div>
      </Screen>
    </RequireAuth>
  );
}

function ProfileBody() {
  const { setLang, lang, t } = useI18n();
  const { userId, user, patient, session } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState(lang === 'hi' ? 'हिंदी' : lang === 'mr' ? 'मराठी' : 'English');
  
  // Basic theme toggle
  const [theme, setTheme] = useState(
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aaha.theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aaha.theme', 'light');
    }
  };

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
  const reports = useQuery({ queryKey: ["reports"], queryFn: listReports });
  const appts = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });
  const assessments = useQuery({ queryKey: ["assessments"], queryFn: listAssessments, enabled: !!session });

  const backendReports = useQuery({
    queryKey: ["backend-reports"],
    queryFn: () => apiService.getMyReports(),
    enabled: !!session,
  });

  const sessionPhone = user?.phone ? `+${user.phone.replace(/^\+/, "")}` : "";

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.full_name ?? "");
      setPhone(profile.data.phone ?? sessionPhone);
      // Backend does not support patient language, so we don't read it from profile.data
    }
  }, [profile.data, sessionPhone]);

  useEffect(() => {
    setLanguage(lang === 'hi' ? 'हिंदी' : lang === 'mr' ? 'मराठी' : 'English');
  }, [lang]);

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
    localStorage.removeItem("aaha_demo_session");
    try {
      await signOut(auth);
    } catch (error) {}
    toast.success("Signed out");
    void router.navigate({ to: "/login", replace: true });
  };

  const initial = (name || sessionPhone || "A").charAt(0).toUpperCase();
  const totalReports = (reports.data?.length ?? 0) + (backendReports.data?.reports.length ?? 0);
  const totalCheckups = assessments.data?.length ?? 0;
  const totalVisits = (appts.data ?? []).filter((a) => a.status !== "Cancelled").length;

  return (
    <>
      <section className="bg-card border border-border rounded-[24px] p-4 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="shrink-0 flex items-center justify-center w-[60px] h-[60px] rounded-full bg-accent text-[26px] font-bold text-primary">
            {initial}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-bold truncate">{name || t("Add your name")}</div>
            <div className="text-[14px] text-muted-foreground truncate">{phone || sessionPhone || "[mobile number]"}</div>
            {patient && (
              <div className="text-[14px] text-muted-foreground truncate">
                Patient ID {patient.patient_id}, age {patient.age}
                {patient.referred_by && ` • Ref: ${patient.referred_by}`}
              </div>
            )}
          </div>
          <button onClick={() => setEditing(!editing)} className="shrink-0 h-[44px] px-4 rounded-full bg-primary/10 text-primary text-[14px] font-bold">
            {editing ? t("Close") : t("Edit")}
          </button>
        </div>

        {editing && (
          <div className="flex flex-col gap-3 pt-2 border-t border-border mt-2">
            {[
              { id: "name", label: "Full name", value: name, set: setName, placeholder: "Priya Sharma" },
              { id: "phone", label: "Phone", value: phone, set: setPhone, placeholder: "+91 98250 00000" },
            ].map((f) => (
              <label key={f.id} className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{t(f.label)}</span>
                <input
                  id={f.id}
                  value={f.value}
                  placeholder={f.placeholder}
                  onChange={(e) => f.set(e.target.value)}
                  className="h-[48px] rounded-[24px] bg-muted px-4 text-[15px] font-semibold outline-none focus:border focus:border-primary"
                />
              </label>
            ))}
            <Btn size="md" icon="save" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? t("Saving…") : t("Save")}
            </Btn>
          </div>
        )}
      </section>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border border-border rounded-[20px] p-3 flex flex-col gap-1">
          <b className="text-[26px] font-bold leading-tight">{totalReports}</b>
          <small className="text-[12px] text-muted-foreground">{t("Reports saved")}</small>
        </div>
        <div className="bg-card border border-border rounded-[20px] p-3 flex flex-col gap-1">
          <b className="text-[26px] font-bold leading-tight">{totalCheckups}</b>
          <small className="text-[12px] text-muted-foreground">{t("Check-ups")}</small>
        </div>
        <div className="bg-card border border-border rounded-[20px] p-3 flex flex-col gap-1">
          <b className="text-[26px] font-bold leading-tight">{totalVisits}</b>
          <small className="text-[12px] text-muted-foreground">{t("Doctor visits")}</small>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-1">{t("My health")}</span>
        <Row icon="upload_file" title={t("Upload Report")} subtitle={t("Aaha reads and explains it")} to="/upload-file" />
        <Row icon="health_and_safety" title={t("Reports")} subtitle={totalReports ? `${totalReports} ${t("saved")}` : t("None yet")} to="/reports" />
        <Row icon="prescriptions" title={t("Care plan")} subtitle={t("Doctor-approved care plans")} to="/prescriptions" />
        <Row icon="calendar_today" title={t("Doctor visits")} subtitle={totalVisits ? `${totalVisits} ${t("booked")}` : t("None booked")} to="/appointments" />
      </div>

      <div className="flex flex-col gap-2 mt-3">
        <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-1">{t("Language")}</span>
        <div className="flex gap-2 flex-wrap">
          {['English', 'हिंदी', 'मराठी'].map((l) => (
            <button key={l} onClick={() => {
              setLanguage(l);
              const map: Record<string, Lang> = { 'English': 'en', 'हिंदी': 'hi', 'मराठी': 'mr' };
              if (map[l]) setLang(map[l]);
              toast.success(t("Language updated"));
            }} className={`h-[44px] px-4 rounded-full border border-border text-[15px] font-semibold ${language === l ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-3">
        <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-1">{t("Appearance")}</span>
        <div className="h-[48px] p-1 rounded-[24px] bg-card border border-border grid grid-cols-2 gap-1 shrink-0">
          {[
            { id: 'dark', label: 'Dark' },
            { id: 'light', label: 'Light' }
          ].map(tObj => (
             <button key={tObj.id} onClick={() => handleThemeChange(tObj.id)} className={`rounded-[20px] text-[15px] font-semibold transition-colors ${theme === tObj.id ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground'}`}>
               {t(tObj.label)}
             </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-3">
        <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-1">{t("Privacy and help")}</span>
        <Row icon="lock" title={t("Privacy and consent")} subtitle={t("What you share, and with whom")} to="/consent" />
        <Row icon="help" title={t("Help and support")} subtitle={t("Talk to the Aaha team")} to="/emergency" />
      </div>

      <button onClick={() => void logout()} className="min-h-[52px] mt-2 rounded-full border border-border bg-transparent text-[16px] font-semibold text-foreground flex items-center justify-center gap-2">
        {t("Sign out")}
      </button>
    </>
  );
}
