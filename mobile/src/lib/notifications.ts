import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

const NOTIF_PREFS_KEY = 'aura.notification_preferences';

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
          name: 'Habit & Daily Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#a855f7',
        });
        await Notifications.setNotificationChannelAsync('finance', {
          name: 'Budget & Finance Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 200, 300],
          lightColor: '#ef4444',
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

    // 1. Morning Skincare at 8:00 AM
    if (activePrefs.morningSkincare) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '☀️ Morning Skincare',
          body: 'Rise and shine! Complete your AM routine on Aura360.',
          data: { route: '/skincare' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 0,
          channelId: 'habits',
        },
      });
    }

    // 2. Evening Skincare at 10:00 PM
    if (activePrefs.eveningSkincare) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Evening Skincare & Wind Down',
          body: 'Time to unwind. Check off your PM routine.',
          data: { route: '/skincare' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 22,
          minute: 0,
          channelId: 'habits',
        },
      });
    }

    // 3. Daily Review at 8:00 PM
    if (activePrefs.dailyReview) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✨ Daily Aura Review',
          body: 'Log your workouts, meals, and track your daily spending.',
          data: { route: '/' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
          channelId: 'habits',
        },
      });
    }

    // 4. Hydration Reminders (11:00 AM, 2:30 PM, 5:30 PM)
    if (activePrefs.waterReminders) {
      const times = [
        { hour: 11, minute: 0 },
        { hour: 14, minute: 30 },
        { hour: 17, minute: 30 },
      ];
      for (const t of times) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 Hydration Check',
            body: 'Drink a glass of water and keep your macro rings glowing!',
            data: { route: '/food' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: t.hour,
            minute: t.minute,
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
        title: '⚡ Aura360 Test Alert',
        body: 'Notifications are working perfectly on this device!',
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
        title: '⚠️ Budget Limit Alert',
        body: `You've reached ${percent}% of your ${category} monthly budget!`,
        data: { route: '/finance' },
      },
      trigger: { channelId: 'finance' },
    });
  },
};
