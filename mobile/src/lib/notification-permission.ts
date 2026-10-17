import { isNotificationsSupported } from '@/lib/notifications';

/**
 * Whether the OS already lets this app show notifications. Reading the status never shows the system prompt, so it is
 * safe to call at launch. The prompt itself belongs to the permissions screen (first sign-in) and to Settings, where the
 * user sees why it is needed first.
 */
export async function isNotificationPermissionGranted(): Promise<boolean> {
  if (!isNotificationsSupported) return false;
  try {
    // Imported lazily: loading expo-notifications in Expo Go on Android only logs errors (see lib/notifications.ts).
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
