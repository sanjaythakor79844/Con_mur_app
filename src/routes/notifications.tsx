import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, FlowNav, Icon, Pill, Screen, Section, TopBar } from "@/components/aaha";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/hooks/use-auth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/lib/aaha-api";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications | Aaha Companion" },
      {
        name: "description",
        content: "Appointment updates, report alerts, follow-up reminders, health camps and tips.",
      },
      { property: "og:title", content: "Notifications | Aaha Companion" },
      { property: "og:description", content: "Gentle reminders that keep your care on track." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notifications,
});

const ICONS: Record<string, string> = {
  Diagnostics: "science",
  "Report upload": "upload_file",
  Consultation: "stethoscope",
  "Follow-up": "event_repeat",
  Therapy: "spa",
  Assessment: "insights",
};

function Notifications() {
  return (
    <Screen>
      <TopBar title="Notifications" subtitle="Your next steps" />
      <RequireAuth message="Sign in to see reminders for your care journey.">
        <NotificationList />
      </RequireAuth>
      <FlowNav
        steps={[
          { to: "/journey", title: "My health journey", subtitle: "See the full timeline", icon: "timeline" },
        ]}
      />
    </Screen>
  );
}

function NotificationList() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const notes = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (notes.isLoading)
    return (
      <Section>
        <Card className="flex items-center gap-3 text-sm text-muted-foreground">
          <Icon name="progress_activity" className="animate-spin text-primary" />
          Loading your reminders…
        </Card>
      </Section>
    );

  const all = notes.data ?? [];
  const reminders = all.filter((n) => n.kind === "reminder");
  const updates = all.filter((n) => n.kind !== "reminder");
  const unread = all.filter((n) => !n.is_read).length;

  const item = (n: Notification) => (
    <Card as="li" key={n.id} className={!n.is_read ? "border-primary/40 bg-accent/30" : ""}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
          <Icon name={ICONS[n.step ?? ""] ?? "notifications"} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {n.step ? <Pill tone="neutral">{n.step}</Pill> : null}
            {n.due_label ? (
              <Pill tone="brand" icon="schedule">
                {n.due_label}
              </Pill>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-bold">{n.title}</p>
          {n.body ? <p className="text-xs text-muted-foreground">{n.body}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {n.link ? (
              <Link
                to={n.link}
                onClick={() => !n.is_read && readOne.mutate(n.id)}
                className="text-xs font-semibold text-primary"
              >
                Open this step →
              </Link>
            ) : null}
            {!n.is_read ? (
              <button
                type="button"
                onClick={() => readOne.mutate(n.id)}
                className="text-xs font-semibold text-muted-foreground"
              >
                Mark as read
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      {all.length === 0 ? (
        <Section>
          <Card className="text-center">
            <Icon name="notifications_off" className="text-[32px] text-primary" />
            <p className="mt-2 text-sm font-bold">Nothing pending</p>
            <p className="text-xs text-muted-foreground">Reminders appear as your care journey moves forward.</p>
          </Card>
        </Section>
      ) : null}

      {reminders.length > 0 ? (
        <Section
          title="Reminders for your next steps"
          action={
            unread > 0 ? (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                className="text-xs font-semibold text-primary"
              >
                Mark all read
              </button>
            ) : null
          }
        >
          <ul className="space-y-3">{reminders.map(item)}</ul>
        </Section>
      ) : null}

      {updates.length > 0 ? (
        <Section title="Updates">
          <ul className="space-y-3">{updates.map(item)}</ul>
        </Section>
      ) : null}
    </>
  );
}
