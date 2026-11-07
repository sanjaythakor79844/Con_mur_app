/**
 * Push Notification Provider
 * Automatically registers device for push notifications after user authentication
 * Handles foreground notifications and notification taps
 */

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  registerForPushNotifications,
  unregisterPushNotifications,
  isPushNotificationsSupported,
} from "@/lib/push-notifications";
import { registerDeviceToken, unregisterDeviceToken } from "@/lib/aaha-api";
import { toast } from "sonner";
import type { PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Wait for auth to initialize
    if (loading) return;

    // Only register if user is authenticated and on native platform
    if (!session || !isPushNotificationsSupported()) {
      return;
    }

    // Avoid duplicate registration
    if (isRegistered) return;

    // Register for push notifications
    const register = async () => {
      try {
        const result = await registerForPushNotifications(
          // Token callback - send to backend
          async (token: string) => {
            console.log("[Push] Registering token with backend");
            try {
              await registerDeviceToken({
                token,
                platform: "android",
                device_id: token.substring(0, 32), // Use token prefix as device ID
              });
              console.log("[Push] Token registered successfully");
              setIsRegistered(true);
            } catch (error) {
              console.error("[Push] Failed to register token with backend:", error);
            }
          },
          // Foreground notification handler
          (notification: PushNotificationSchema) => {
            console.log("[Push] Foreground notification received:", notification);
            
            // Show toast with notification
            toast.info(notification.title || "New Notification", {
              description: notification.body,
              duration: 5000,
            });
          },
          // Notification tap handler
          (action: ActionPerformed) => {
            console.log("[Push] Notification tapped:", action);
            
            const notification = action.notification;
            const data = notification.data;
            
            // Handle report-related notifications
            if (data?.action === "VIEW_REPORT" || data?.type === "report_ready") {
              // Navigate to Longevity Journey page
              navigate({ to: "/liv" });
            } else if (data?.link) {
              // Navigate to custom link
              navigate({ to: data.link as string });
            } else {
              // Default: navigate to home
              navigate({ to: "/" });
            }
          }
        );

        if (!result.success) {
          console.warn("[Push] Registration failed:", result.error);
        }
      } catch (error) {
        console.error("[Push] Registration error:", error);
      }
    };

    register();

    // Cleanup on unmount or logout
    return () => {
      if (session && isRegistered) {
        // Note: We don't unregister immediately on unmount because the component
        // may remount. Only unregister explicitly on logout.
      }
    };
  }, [session, loading, isRegistered, navigate]);

  // Handle logout - unregister push notifications
  useEffect(() => {
    if (!session && isRegistered) {
      const cleanup = async () => {
        console.log("[Push] User logged out, cleaning up");
        await unregisterPushNotifications();
        setIsRegistered(false);
      };
      cleanup();
    }
  }, [session, isRegistered]);

  return <>{children}</>;
}
