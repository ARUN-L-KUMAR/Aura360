import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { api } from '@/lib/api';
import { isNotificationsSupported, notificationService } from '@/lib/notifications';

/**
 * Server push: registers this phone's Expo push token with the Aura360 server so budget alerts, renewals and the other
 * reminders chosen in Settings reach the phone even when the app is closed.
 * (lib/notifications.ts schedules separate reminders on the phone itself; this is the part that talks to the server.)
 */

const TOKEN_KEY = 'aura.pushToken';

/** Expo needs an EAS project id to issue a token. `eas init` adds it to app.json under extra.eas.projectId. */
function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

export type PushRegistration =
  | { ok: true; token: string }
  | { ok: false; reason: 'not-a-device' | 'permission-denied' | 'no-project-id' | 'failed' | 'unsupported-in-expo-go' };

/** Call once the user is signed in. Safe to call on every launch: it just refreshes the registration. */
export async function registerForServerPush(): Promise<PushRegistration> {
  try {
    if (!isNotificationsSupported) {
      if (__DEV__) {
        console.log(
          '[push] Push notifications are not supported in Expo Go on Android SDK 53+. Use a development build (npx expo run:android) for remote push notifications.'
        );
      }
      return { ok: false, reason: 'unsupported-in-expo-go' };
    }

    // Simulators and emulators cannot receive push notifications
    if (!Device.isDevice) return { ok: false, reason: 'not-a-device' };

    const id = projectId();
    if (!id) return { ok: false, reason: 'no-project-id' };

    // Asks for permission if needed (and creates the Android notification channels)
    const granted = await notificationService.requestPermission();
    if (!granted) return { ok: false, reason: 'permission-denied' };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });

    await api('/api/notifications/push-token', {
      method: 'POST',
      body: {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        deviceName: Device.deviceName ?? undefined,
      },
    });
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** Call on sign-out, before the session is cleared, so this phone stops receiving the previous account's alerts. */
export async function unregisterFromServerPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await api('/api/notifications/push-token', { method: 'DELETE', body: { token } });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Best effort: the server also forgets a phone the first time a push to it fails
  }
}
