import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { getDeviceLocale, i18n } from '@/i18n';
import { api } from '@/lib/api';
import { error as errorRamp, moduleColors } from '@/theme/colors';

const NOTIF_PREFS_KEY = 'aura.notification_preferences';

type Clock = { hour: number; minute: number };

/** When the phone's own habit reminders fire. Shared with the Settings screen, which shows them. */
export const HABIT_TIMES = {
  morningSkincare: { hour: 8, minute: 0 },
  eveningSkincare: { hour: 22, minute: 0 },
  dailyReview: { hour: 20, minute: 0 },
  water: [
    { hour: 11, minute: 0 },
    { hour: 14, minute: 30 },
    { hour: 17, minute: 30 },
  ],
} as const satisfies Record<string, Clock | readonly Clock[]>;

/** "8:00 AM" or "08:00", following the phone's region. */
export function formatClock({ hour, minute }: Clock): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(getDeviceLocale(), { hour: 'numeric', minute: '2-digit' });
}

export interface NotificationPreferences {
  enabled: boolean;
  waterReminders: boolean;
  morningSkincare: boolean;
  eveningSkincare: boolean;
  dailyReview: boolean;
  budgetAlerts: boolean;
}

export const DEFAULT_NOTIF_PREFERENCES: NotificationPreferences = {
  enabled: true,
  waterReminders: true,
  morningSkincare: true,
  eveningSkincare: true,
  dailyReview: true,
  budgetAlerts: true,
};

const isExpoGo =
  isRunningInExpoGo() ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Android remote/push notification functionality was removed from Expo Go in SDK 53+.
// Loading expo-notifications on Android in Expo Go throws a fatal exception.
export const isNotificationsSupported = !(Platform.OS === 'android' && isExpoGo);

let Notifications: typeof import('expo-notifications') | null = null;
if (isNotificationsSupported) {
  try {
    // Dynamically require so Metro doesn't evaluate expo-notifications when running in Expo Go Android
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    if (__DEV__) {
      console.warn('[notifications] Failed to initialize expo-notifications:', err);
    }
  }
}

export function addNotificationResponseListener(
  listener: (response: any) => void
): { remove: () => void } {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * True when the server is already sending skincare reminders to this phone (push on, a phone connected, skincare reminders
 * on), so the phone's own ones should pause. Any failure (offline, signed out) returns false and keeps the local ones.
 */
async function serverSendsSkincare(): Promise<boolean> {
  try {
    const { prefs, devices } = await api<{ prefs: { push: boolean; skincare: { enabled: boolean } }; devices: number }>(
      '/api/notifications/preferences',
    );
    return devices > 0 && prefs.push && prefs.skincare.enabled;
  } catch {
    return false;
  }
}

export const notificationService = {
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) return { ...DEFAULT_NOTIF_PREFERENCES, ...JSON.parse(raw) };
    } catch {
      // Fallback
    }
    return DEFAULT_NOTIF_PREFERENCES;
  },

  async savePreferences(prefs: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
      if (prefs.enabled) {
        await this.rescheduleAll(prefs);
      } else if (Notifications) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch {
      // Handle gracefully
    }
  },

  async requestPermission(): Promise<boolean> {
    if (!Notifications) return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return false;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('habits', {
          name: i18n.t('notifications:local.channels.habits'),
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: moduleColors.ai,
        });
        await Notifications.setNotificationChannelAsync('finance', {
          name: i18n.t('notifications:local.channels.finance'),
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 200, 300],
          lightColor: errorRamp[500],
        });
      }

      return true;
    } catch {
      return false;
    }
  },

  async rescheduleAll(prefs?: NotificationPreferences): Promise<void> {
    if (!Notifications) return;

    const activePrefs = prefs ?? (await this.getPreferences());
    if (!activePrefs.enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    const granted = await this.requestPermission();
    if (!granted) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const serverHasSkincare = await serverSendsSkincare();

    // 1. Morning skincare
    if (activePrefs.morningSkincare && !serverHasSkincare) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('notifications:local.morningSkincare.title'),
          body: i18n.t('notifications:local.morningSkincare.body'),
          data: { route: '/skincare' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: HABIT_TIMES.morningSkincare.hour,
          minute: HABIT_TIMES.morningSkincare.minute,
          channelId: 'habits',
        },
      });
    }

    // 2. Evening skincare
    if (activePrefs.eveningSkincare && !serverHasSkincare) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('notifications:local.eveningSkincare.title'),
          body: i18n.t('notifications:local.eveningSkincare.body'),
          data: { route: '/skincare' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: HABIT_TIMES.eveningSkincare.hour,
          minute: HABIT_TIMES.eveningSkincare.minute,
          channelId: 'habits',
        },
      });
    }

    // 3. Daily review
    if (activePrefs.dailyReview) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('notifications:local.dailyReview.title'),
          body: i18n.t('notifications:local.dailyReview.body'),
          data: { route: '/' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: HABIT_TIMES.dailyReview.hour,
          minute: HABIT_TIMES.dailyReview.minute,
          channelId: 'habits',
        },
      });
    }

    // 4. Hydration reminders
    if (activePrefs.waterReminders) {
      for (const time of HABIT_TIMES.water) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: i18n.t('notifications:local.hydration.title'),
            body: i18n.t('notifications:local.hydration.body'),
            data: { route: '/food' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: time.hour,
            minute: time.minute,
            channelId: 'habits',
          },
        });
      }
    }
  },

  async sendTestNotification(): Promise<boolean> {
    if (!Notifications) return false;
    const granted = await this.requestPermission();
    if (!granted) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications:local.test.title'),
        body: i18n.t('notifications:local.test.body'),
        data: { test: true },
      },
      trigger: { channelId: 'habits' },
    });
    return true;
  },

  async sendBudgetWarning(category: string, percent: number): Promise<void> {
    if (!Notifications) return;
    const prefs = await this.getPreferences();
    if (!prefs.enabled || !prefs.budgetAlerts) return;

    await this.requestPermission();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications:local.budget.title'),
        body: i18n.t('notifications:local.budget.body', { percent, category }),
        data: { route: '/finance' },
      },
      trigger: { channelId: 'finance' },
    });
  },
};
