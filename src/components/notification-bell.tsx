import { useState } from "react";
import { LivIcon } from "@/components/liv";
import { listNotifications, type Notification } from "@/lib/aaha-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatReportDate } from "@/lib/aaha-api";
import { useNavigate } from "@tanstack/react-router";
import { apiService } from "@/lib/api-service";

interface NotificationBellProps {
  onNotificationClick?: () => void;
}

export function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const [showPanel, setShowPanel] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications using existing API
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 401) return false;
      return failureCount < 2;
    },
  });

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiService.post(`/api/v2/notifications/${notificationId}/read`);
      return response;
    },
    onSuccess: () => {
      // Invalidate notifications query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleBellClick = () => {
    setShowPanel(!showPanel);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to /liv if link points there
    if (notification.link === "/liv" || notification.link?.includes("/liv")) {
      navigate({ to: "/liv" });
      if (onNotificationClick) {
        onNotificationClick();
      }
    }
    setShowPanel(false);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleBellClick}
        style={{
          position: "relative",
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "1px solid var(--line,#D0D0CA)",
          background: "var(--card,#FAFAF8)",
          color: "var(--text,#0B0B0C)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <LivIcon name="bell" size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--danger,#E53935)",
            }}
          />
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            maxHeight: 400,
            background: "var(--card,#FAFAF8)",
            border: "1px solid var(--line,#D0D0CA)",
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--line,#D0D0CA)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--muted,#77776E)",
              }}
              aria-label="Close notifications"
            >
              <LivIcon name="x" size={18} />
            </button>
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: 352, overflowY: "auto" }}>
            {notificationsQuery.isLoading ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--muted,#77776E)",
                  fontSize: 14,
                }}
              >
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--muted,#77776E)",
                  fontSize: 14,
                }}
              >
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--line,#D0D0CA)",
                    background: notification.is_read
                      ? "transparent"
                      : "var(--accent,#F5F5F0)",
                    cursor: "pointer",
                    textAlign: "left",
                    border: "none",
                    borderBottom: "1px solid var(--line,#D0D0CA)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    {!notification.is_read && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--primary,#5C0A24)",
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: notification.is_read ? 400 : 600,
                          fontSize: 14,
                          marginBottom: 4,
                          color: "var(--text,#0B0B0C)",
                        }}
                      >
                        {notification.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--muted,#77776E)",
                          marginBottom: 4,
                        }}
                      >
                        {notification.body}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted,#77776E)",
                        }}
                      >
                        {formatReportDate(notification.created_at)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
