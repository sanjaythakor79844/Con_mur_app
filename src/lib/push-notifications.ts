/**
 * Push Notification Service
 * Handles FCM token registration, notification permissions, and message handling
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Check if push notifications are supported on this platform
 */
export function isPushNotificationsSupported(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Register for push notifications and handle token/message events
 * Call this after user authentication
 */
export async function registerForPushNotifications(
  onTokenReceived: (token: string) => Promise<void>,
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationTapped?: (notification: ActionPerformed) => void
): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationsSupported()) {
    return { success: false, error: 'Push notifications not supported on this platform' };
  }

  try {
    // Request permission
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return { success: false, error: 'Push notification permission denied' };
    }

    // Register with FCM
    await PushNotifications.register();

    // Handle token registration
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[FCM] Token received:', token.value);
      try {
        await onTokenReceived(token.value);
      } catch (error) {
        console.error('[FCM] Failed to send token to backend:', error);
      }
    });

    // Handle registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[FCM] Registration error:', error);
    });

    // Handle foreground notifications
    if (onNotificationReceived) {
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[FCM] Foreground notification:', notification);
        onNotificationReceived(notification);
      });
    }

    // Handle notification tap (app opened from notification)
    if (onNotificationTapped) {
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('[FCM] Notification action:', action);
        onNotificationTapped(action);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[FCM] Registration failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during registration' 
    };
  }
}

/**
 * Remove all push notification listeners
 * Call this on logout
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (!isPushNotificationsSupported()) {
    return;
  }

  try {
    await PushNotifications.removeAllListeners();
    console.log('[FCM] All listeners removed');
  } catch (error) {
    console.error('[FCM] Failed to remove listeners:', error);
  }
}

/**
 * Get currently delivered notifications (Android only)
 */
export async function getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
  if (!isPushNotificationsSupported()) {
    return [];
  }

  try {
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  } catch (error) {
    console.error('[FCM] Failed to get delivered notifications:', error);
    return [];
  }
}

/**
 * Remove specific delivered notifications by ID (Android only)
 */
export async function removeDeliveredNotifications(ids: string[]): Promise<void> {
  if (!isPushNotificationsSupported() || ids.length === 0) {
    return;
  }

  try {
    await PushNotifications.removeDeliveredNotifications({ notifications: ids.map(id => ({ id })) });
  } catch (error) {
    console.error('[FCM] Failed to remove delivered notifications:', error);
  }
}
