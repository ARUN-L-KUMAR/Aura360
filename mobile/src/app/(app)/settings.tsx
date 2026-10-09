import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import {
  DEFAULT_NOTIF_PREFERENCES,
  notificationService,
  type NotificationPreferences,
} from '@/lib/notifications';
import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';
import { moduleColors, radius, spacing, useTheme, type ThemeMode } from '@/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { user, signOut, serverUrl } = useAuth();
  const { mode, setMode, colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const { isAvailable, isEnabled, biometricLabel, biometricType, toggleBiometrics } = useBiometrics();

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFERENCES);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    void notificationService.getPreferences().then(setNotifPrefs);
  }, []);

  async function updateNotif(patch: Partial<NotificationPreferences>) {
    const next = { ...notifPrefs, ...patch };
    setNotifPrefs(next);
    await notificationService.savePreferences(next);
  }

  async function sendTest() {
    const ok = await notificationService.sendTestNotification();
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } else {
      Alert.alert(
        'Notifications in Expo Go',
        'Android notifications in Expo SDK 53+ require a development build (npx expo run:android) to display native system notifications.',
        [{ text: 'OK' }]
      );
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again to access your Aura360 workspace.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email
      ? user.email[0].toUpperCase()
      : 'A';

  const biometricIcon: keyof typeof Ionicons.glyphMap =
    biometricType === 'face'
      ? 'scan-outline'
      : biometricType === 'fingerprint'
        ? 'finger-print-outline'
        : 'shield-checkmark-outline';

  return (
    <Screen topInset={false}>
      {/* Profile Hero Card */}
      <GlassCard
        glowColor={moduleColors.ai}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
          padding: spacing.lg,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: radius.pill,
            backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)',
            borderWidth: 2,
            borderColor: moduleColors.ai,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: moduleColors.ai }}>{initials}</Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading">{user?.name ?? 'Aura User'}</Text>
          <Text muted numberOfLines={1}>
            {user?.email ?? 'user@aura360.internal'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
            <Text variant="caption" style={{ color: colors.success, fontWeight: '600' }}>
              Active Workspace
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Habit Reminders & Notifications Section */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="notifications-outline" size={18} color={moduleColors.fitness} />
            <Text variant="label" muted>
              Daily Habit Reminders
            </Text>
          </View>
          <Switch
            value={notifPrefs.enabled}
            onValueChange={(val) => void updateNotif({ enabled: val })}
            trackColor={{ false: colors.border, true: moduleColors.fitness }}
          />
        </View>

        {notifPrefs.enabled ? (
          <View style={{ gap: spacing.md, paddingTop: spacing.xs }}>
            {/* Water Reminder */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '600' }}>💧 Hydration Check</Text>
                <Text variant="caption" muted>
                  Prompts at 11:00 AM, 2:30 PM & 5:30 PM
                </Text>
              </View>
              <Switch
                value={notifPrefs.waterReminders}
                onValueChange={(val) => void updateNotif({ waterReminders: val })}
                trackColor={{ false: colors.border, true: moduleColors.food }}
              />
            </View>

            {/* Morning Skincare */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '600' }}>☀️ Morning Skincare</Text>
                <Text variant="caption" muted>
                  Daily routine alert at 8:00 AM
                </Text>
              </View>
              <Switch
                value={notifPrefs.morningSkincare}
                onValueChange={(val) => void updateNotif({ morningSkincare: val })}
                trackColor={{ false: colors.border, true: moduleColors.skincare }}
              />
            </View>

            {/* Evening Skincare */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '600' }}>🌙 Evening Skincare</Text>
                <Text variant="caption" muted>
                  Night routine & wind-down at 10:00 PM
                </Text>
              </View>
              <Switch
                value={notifPrefs.eveningSkincare}
                onValueChange={(val) => void updateNotif({ eveningSkincare: val })}
                trackColor={{ false: colors.border, true: moduleColors.skincare }}
              />
            </View>

            {/* Daily Review */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '600' }}>✨ Evening Review</Text>
                <Text variant="caption" muted>
                  Review workout & finance tallies at 8:00 PM
                </Text>
              </View>
              <Switch
                value={notifPrefs.dailyReview}
                onValueChange={(val) => void updateNotif({ dailyReview: val })}
                trackColor={{ false: colors.border, true: moduleColors.ai }}
              />
            </View>

            {/* Budget Alerts */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '600' }}>💳 Budget Threshold Alerts</Text>
                <Text variant="caption" muted>
                  Notify when spending crosses limits
                </Text>
              </View>
              <Switch
                value={notifPrefs.budgetAlerts}
                onValueChange={(val) => void updateNotif({ budgetAlerts: val })}
                trackColor={{ false: colors.border, true: moduleColors.finance }}
              />
            </View>

            {/* Test Notification Trigger */}
            <Pressable
              accessibilityRole="button"
              onPress={() => void sendTest()}
              style={{
                marginTop: spacing.xs,
                padding: spacing.md,
                borderRadius: radius.md,
                backgroundColor: isDark ? 'rgba(34, 48, 65, 0.5)' : colors.cardMuted,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}>
              <Ionicons name="paper-plane-outline" size={16} color={moduleColors.fitness} />
              <Text variant="caption" style={{ fontWeight: '700', color: colors.text }}>
                {testSent ? '✓ Test Alert Sent to Notification Tray!' : 'Send Test Notification'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text variant="caption" muted>
            Turn on habit notifications to receive scheduled water, skincare, and daily review alerts.
          </Text>
        )}
      </GlassCard>

      {/* Security & Biometrics Section */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name={biometricIcon} size={18} color={moduleColors.ai} />
          <Text variant="label" muted>
            Security & App Lock
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 2, paddingRight: spacing.md }}>
            <Text style={{ fontWeight: '600' }}>Require {biometricLabel}</Text>
            <Text variant="caption" muted>
              {isAvailable
                ? `Lock Aura360 and require ${biometricLabel} when opening or switching apps`
                : 'Biometric hardware not enrolled or available on this device'}
            </Text>
          </View>
          <Switch
            disabled={!isAvailable}
            value={isEnabled}
            onValueChange={(val) => void toggleBiometrics(val)}
            trackColor={{ false: colors.border, true: moduleColors.ai }}
          />
        </View>
      </GlassCard>

      {/* Appearance Section */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="color-palette-outline" size={18} color={colors.textMuted} />
          <Text variant="label" muted>
            Appearance Theme
          </Text>
        </View>
        <Segmented options={THEME_OPTIONS} value={mode} onChange={setMode} />
      </GlassCard>

      {/* Server & Architecture Info */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="server-outline" size={18} color={colors.textMuted} />
          <Text variant="label" muted>
            Backend & System
          </Text>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text variant="caption" muted>
            Backend Server URL
          </Text>
          <View
            style={{
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: isDark ? 'rgba(34, 48, 65, 0.5)' : colors.cardMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>{serverUrl || 'Default local host'}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.xs }}>
          <Text muted>App Version</Text>
          <Text style={{ fontWeight: '600' }}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </GlassCard>

      <Button title="Sign out from Aura360" variant="danger" onPress={confirmSignOut} />
    </Screen>
  );
}
