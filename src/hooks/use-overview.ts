import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getProfile,
  listAppointments,
  listAssessments,
  listNotifications,
  listReports,
  type Appointment,
  type Assessment,
} from "@/lib/aaha-api";

/** Friendly display name for the signed-in person, from profile → auth metadata → email. */
export function useDisplayName() {
  const { userId, user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: () => getProfile(userId!),
  });

  const metaName = (user?.name as string | undefined) ?? undefined;
  const emailName = user?.email ? user.email.split("@")[0] : undefined;
  const full = profile?.full_name?.trim() || metaName?.trim() || emailName || "";
  const first = full ? full.split(" ")[0] : "";
  return { fullName: full, firstName: first, userId };
}

export function bandTone(band?: string | null): "green" | "amber" | "red" | "neutral" {
  const b = (band ?? "").toLowerCase();
  if (b.includes("low") || b.includes("green")) return "green";
  if (b.includes("high") || b.includes("red")) return "red";
  if (b.includes("moderate") || b.includes("amber")) return "amber";
  return "neutral";
}

export function bandLabel(a?: Assessment | null) {
  if (!a) return "";
  const b = (a.band ?? "").toLowerCase();
  if (b.includes("low")) return "Low risk";
  if (b.includes("high")) return "High risk";
  if (b.includes("moderate")) return "Moderate risk";
  return a.band ?? "";
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Everything the dashboard-style screens need, in one place. */
export function useOverview() {
  const { userId } = useAuth();
  const enabled = !!userId;

  const assessments = useQuery({
    queryKey: ["assessments", userId],
    enabled,
    queryFn: listAssessments,
  });
  const reports = useQuery({ queryKey: ["reports", userId], enabled, queryFn: listReports });
  const appointments = useQuery({
    queryKey: ["appointments", userId],
    enabled,
    queryFn: listAppointments,
  });
  const notifications = useQuery({
    queryKey: ["notifications", userId],
    enabled,
    queryFn: listNotifications,
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming: Appointment | undefined = (appointments.data ?? [])
    .filter((a) => a.status !== "Cancelled" && (a.scheduled_for || "") >= today)
    .sort((a, b) => (a.scheduled_for || "").localeCompare(b.scheduled_for || ""))[0];

  return {
    userId,
    latestAssessment: (assessments.data ?? [])[0] ?? null,
    assessments: assessments.data ?? [],
    reports: reports.data ?? [],
    appointments: appointments.data ?? [],
    upcoming: upcoming ?? null,
    unreadCount: (notifications.data ?? []).filter((n) => !n.is_read).length,
    loading:
      assessments.isLoading || reports.isLoading || appointments.isLoading || notifications.isLoading,
    error: assessments.error ?? reports.error ?? appointments.error ?? notifications.error ?? null,
  };
}
