import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Icon, Row, Screen } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/hooks/use-auth";
import {
  getPreferences,
  updatePreferences,
  listAppointments,
  listReports,
  listAssessments,
  type UserPreferences,
} from "@/lib/aaha-api";
import { apiService } from "@/lib/api-service";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Preferences | Aaha Companion" },
      {
        name: "description",
        content: "Manage your verified patient details, language, appearance, notification preferences and privacy consents.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RequireAuth message="Sign in to manage your Aaha profile.">
      <Screen nav={true}>
        <div className="px-5 pt-6 pb-24 sm:px-6 flex flex-col gap-5">
          <ProfileHeader />
          <ProfileBody />
        </div>
      </Screen>
    </RequireAuth>
  );
}

function ProfileHeader() {
  const { t } = useI18n();
  return (
    <header className="flex items-center justify-between pb-1">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          {t("My Profile")}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("Verified clinical records and application settings")}
        </p>
      </div>
    </header>
  );
}

function ProfileBody() {
  const { setLang, lang, t } = useI18n();
  const { user, patient, session } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // Sign out confirmation modal state
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // App Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  // User preferences from backend
  const preferencesQuery = useQuery({
    queryKey: ["preferences"],
    queryFn: getPreferences,
    enabled: Boolean(session),
  });

  // Local preferences state synced with backend
  const [prefs, setPrefs] = useState<UserPreferences>({
    language: lang,
    theme: theme,
    marketing_consent: false,
    data_sharing_consent: true,
    appointment_reminders: true,
    checkup_reminders: true,
  });

  // Sync loaded preferences
  useEffect(() => {
    if (preferencesQuery.data) {
      setPrefs((prev) => ({
        ...prev,
        ...preferencesQuery.data,
      }));

      if (preferencesQuery.data.theme && preferencesQuery.data.theme !== theme) {
        handleThemeChange(preferencesQuery.data.theme as "light" | "dark");
      }
    }
  }, [preferencesQuery.data]);

  // Profile data from backend
  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => apiService.getMyProfile(),
    enabled: Boolean(session),
  });

  const activePatient = profileQuery.data?.patient || patient;

  // Stats queries
  const reportsQuery = useQuery({ queryKey: ["reports"], queryFn: listReports });
  const apptsQuery = useQuery({ queryKey: ["appointments"], queryFn: listAppointments });
  const assessmentsQuery = useQuery({ queryKey: ["assessments"], queryFn: listAssessments });

  const totalReports = reportsQuery.data?.length ?? 0;
  const totalAssessments = assessmentsQuery.data?.length ?? 0;
  const totalDoctorVisits = (apptsQuery.data ?? []).filter(
    (a) => a.status !== "cancelled" && a.booking_type !== "kiosk",
  ).length;
  const totalKioskScreenings = (apptsQuery.data ?? []).filter(
    (a) => a.status !== "cancelled" && (a.booking_type === "kiosk" || a.kiosk_id),
  ).length;

  // Mutation to persist preferences
  const prefMutation = useMutation({
    mutationFn: (newPrefs: Partial<UserPreferences>) => updatePreferences(newPrefs),
    onSuccess: (updated) => {
      setPrefs((prev) => ({ ...prev, ...updated }));
      void qc.invalidateQueries({ queryKey: ["preferences"] });
    },
    onError: (err: any) => {
      console.error("Preferences save error:", err);
      toast.error(t("Could not save preferences to server. Using local settings."));
    },
  });

  // Theme change handler
  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
        localStorage.setItem("aaha.theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("aaha.theme", "light");
      }
    }
    prefMutation.mutate({ theme: newTheme });
  };

  // Language change handler
  const handleLanguageChange = (newLang: Lang) => {
    setLang(newLang);
    prefMutation.mutate({ language: newLang });
    toast.success(t("Language updated"));
  };

  // Toggle helper for notification & consent preferences
  const handleTogglePref = (key: keyof UserPreferences) => {
    const nextVal = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: nextVal }));
    prefMutation.mutate({ [key]: nextVal });
    toast.success(t("Preference updated"));
  };

  // Logout handler
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await qc.cancelQueries();
      qc.clear();
      localStorage.removeItem("aaha_demo_session");
      await signOut(auth);
      toast.success(t("Signed out successfully"));
      void router.navigate({ to: "/login", replace: true });
    } catch (e: any) {
      console.error("Sign out error:", e);
      toast.error(t("Error signing out."));
    } finally {
      setSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  const displayName = activePatient?.full_name?.trim() || user?.name?.trim() || t("Aaha Patient");
  const phoneDisplay = activePatient?.mobile_number || user?.phone || "";
  const initial = (displayName.replace(/^Dr\.\s*/i, "").trim().charAt(0) || "P").toUpperCase();

  return (
    <>
      {/* 1. Verified Patient Identity Card */}
      <section className="p-4 sm:p-5 rounded-[24px] border border-border bg-card shadow-soft flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="size-16 rounded-full bg-accent text-primary text-2xl font-extrabold grid place-items-center shrink-0 ring-4 ring-primary/10">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground truncate">{displayName}</h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Icon name="verified_user" className="text-emerald-600 dark:text-emerald-400 text-[16px]" />
              <span className="font-semibold text-foreground">{phoneDisplay || t("[Mobile Number]")}</span>
            </div>
            {activePatient?.patient_id && (
              <span className="inline-block text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md mt-1.5">
                {t("Clinical ID")}: #{activePatient.patient_id}
              </span>
            )}
          </div>
        </div>

        {/* Clinical Demographics Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/70 text-xs">
          <div className="bg-muted/50 p-2.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("Age")}
            </span>
            <span className="font-semibold text-foreground mt-0.5">
              {activePatient?.age ? `${activePatient.age} ${t("years")}` : t("Recorded at visit")}
            </span>
          </div>

          <div className="bg-muted/50 p-2.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("Gender")}
            </span>
            <span className="font-semibold text-foreground mt-0.5 capitalize">
              {activePatient?.gender ? t(activePatient.gender) : t("Not specified")}
            </span>
          </div>

          <div className="bg-muted/50 p-2.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("Registered Centre")}
            </span>
            <span className="font-semibold text-foreground mt-0.5 truncate">
              {t("Aaha Aundh, Pune")}
            </span>
          </div>

          <div className="bg-muted/50 p-2.5 rounded-xl flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("Referred By")}
            </span>
            <span className="font-semibold text-foreground mt-0.5 truncate">
              {activePatient?.referred_by || t("Health Centre Staff")}
            </span>
          </div>
        </div>

        {/* Clinical Integrity Notice */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-start gap-2 text-muted-foreground leading-relaxed">
          <Icon name="shield" className="text-primary text-[17px] shrink-0 mt-0.5" />
          <span>
            {t(
              "Your patient identity and phone number are securely linked to your clinical health records. To update medical demographic details, please speak with an Aaha Health Centre staff member.",
            )}
          </span>
        </div>
      </section>

      {/* 2. Health Records Summary Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex flex-col">
          <span className="text-2xl font-extrabold text-foreground">{totalAssessments}</span>
          <span className="text-xs text-muted-foreground font-medium mt-0.5">{t("Kiosk Screenings")}</span>
        </div>
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex flex-col">
          <span className="text-2xl font-extrabold text-foreground">{totalReports}</span>
          <span className="text-xs text-muted-foreground font-medium mt-0.5">{t("Lab Reports Saved")}</span>
        </div>
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex flex-col">
          <span className="text-2xl font-extrabold text-foreground">{totalDoctorVisits}</span>
          <span className="text-xs text-muted-foreground font-medium mt-0.5">{t("Doctor Visits")}</span>
        </div>
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex flex-col">
          <span className="text-2xl font-extrabold text-foreground">{totalKioskScreenings}</span>
          <span className="text-xs text-muted-foreground font-medium mt-0.5">{t("Screenings Booked")}</span>
        </div>
      </section>

      {/* 3. User Preferences: Language & Appearance */}
      <section className="p-4 sm:p-5 rounded-[24px] border border-border bg-card shadow-soft flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("Preferences & Display")}
        </h2>

        {/* Language Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Icon name="translate" className="text-[17px] text-primary" />
            <span>{t("Application Language")}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { code: "en" as Lang, label: "English" },
              { code: "hi" as Lang, label: "हिन्दी" },
              { code: "mr" as Lang, label: "मराठी" },
            ].map((item) => {
              const isSelected = lang === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleLanguageChange(item.code)}
                  className={cn(
                    "h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/60 text-foreground border-border hover:bg-muted",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Appearance Toggle */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border/70">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Icon name="palette" className="text-[17px] text-primary" />
            <span>{t("Appearance")}</span>
          </label>
          <div className="h-11 p-1 rounded-xl bg-muted/60 border border-border grid grid-cols-2 gap-1">
            {[
              { id: "light" as const, label: t("Light Mode"), icon: "light_mode" },
              { id: "dark" as const, label: t("Dark Mode"), icon: "dark_mode" },
            ].map((tObj) => {
              const isSelected = theme === tObj.id;
              return (
                <button
                  key={tObj.id}
                  type="button"
                  onClick={() => handleThemeChange(tObj.id)}
                  className={cn(
                    "rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                    isSelected
                      ? "bg-card text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon name={tObj.icon} className="text-[16px]" />
                  <span>{tObj.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Notification & Engagement Preferences */}
      <section className="p-4 sm:p-5 rounded-[24px] border border-border bg-card shadow-soft flex flex-col gap-3.5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("Notifications & Communication")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("Choose which reminders and health alerts you receive")}
          </p>
        </div>

        {/* Toggles List */}
        <div className="flex flex-col gap-3 pt-1">
          {/* Appointment Reminders */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="min-w-0">
              <span className="block text-xs font-bold text-foreground">
                {t("Appointment Reminders")}
              </span>
              <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                {t("Receive SMS and app reminders before doctor visits and kiosk checkups")}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.appointment_reminders ?? true}
              onClick={() => handleTogglePref("appointment_reminders")}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                (prefs.appointment_reminders ?? true) ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full bg-white transition-transform block shadow-xs",
                  (prefs.appointment_reminders ?? true) ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Check-up & Lab Reminders */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="min-w-0">
              <span className="block text-xs font-bold text-foreground">
                {t("Check-up & Lab Follow-ups")}
              </span>
              <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                {t("Gentle reminders when repeat biomarker tests or health screenings are due")}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.checkup_reminders ?? true}
              onClick={() => handleTogglePref("checkup_reminders")}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                (prefs.checkup_reminders ?? true) ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full bg-white transition-transform block shadow-xs",
                  (prefs.checkup_reminders ?? true) ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Health Insights & Tips */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="min-w-0">
              <span className="block text-xs font-bold text-foreground">
                {t("Wellness Guidance & News")}
              </span>
              <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                {t("Personalized lifestyle insights, camp schedules and health tips")}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.marketing_consent ?? false}
              onClick={() => handleTogglePref("marketing_consent")}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                (prefs.marketing_consent ?? false) ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full bg-white transition-transform block shadow-xs",
                  (prefs.marketing_consent ?? false) ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Research & Data Sharing Consent */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="min-w-0">
              <span className="block text-xs font-bold text-foreground">
                {t("Anonymous Clinical Research")}
              </span>
              <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                {t("Help improve community preventive care with de-identified health metrics")}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.data_sharing_consent ?? true}
              onClick={() => handleTogglePref("data_sharing_consent")}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                (prefs.data_sharing_consent ?? true) ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full bg-white transition-transform block shadow-xs",
                  (prefs.data_sharing_consent ?? true) ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Health Navigation Shortcuts */}
      <section className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          {t("My Health & Care")}
        </span>
        <Row
          icon="description"
          title={t("Health Reports")}
          subtitle={totalReports ? `${totalReports} ${t("saved records")}` : t("None saved yet")}
          to="/reports"
        />
        <Row
          icon="upload_file"
          title={t("Upload Lab Report")}
          subtitle={t("Aaha extracts and explains your results")}
          to="/upload"
        />
        <Row
          icon="calendar_month"
          title={t("Care & Appointments")}
          subtitle={
            totalDoctorVisits + totalKioskScreenings > 0
              ? `${totalDoctorVisits + totalKioskScreenings} ${t("appointments scheduled")}`
              : t("Book consultations or kiosk checks")
          }
          to="/appointments"
        />
        <Row
          icon="timeline"
          title={t("Health Journey & Reminders")}
          subtitle={t("Your timeline, step-by-step guidance and follow-ups")}
          to="/journey"
        />
      </section>

      {/* 6. Privacy & Legal */}
      <section className="flex flex-col gap-2 mt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          {t("Security & Privacy")}
        </span>
        <Row
          icon="verified_user"
          title={t("Privacy & Data Consents")}
          subtitle={t("Review what data is shared and control your consents")}
          to="/consent"
        />
        <Row
          icon="support_agent"
          title={t("Help & Health Support")}
          subtitle={t("Contact Aaha health coordinators")}
          to="/services"
        />
      </section>

      {/* 7. Sign Out Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full h-12 rounded-2xl border border-destructive/40 bg-destructive/5 text-destructive font-bold text-xs flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors"
        >
          <Icon name="logout" className="text-[18px]" />
          <span>{t("Sign Out")}</span>
        </button>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-card border border-border shadow-lifted flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-destructive">
              <span className="size-11 rounded-full bg-destructive/10 grid place-items-center shrink-0">
                <Icon name="logout" className="text-xl" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("Sign out of Aaha?")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("You will need your mobile OTP to sign in again.")}
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={signingOut}
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60 shadow-sm"
              >
                {signingOut ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin text-[16px]" />
                    <span>{t("Signing out…")}</span>
                  </>
                ) : (
                  <span>{t("Sign Out")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
