import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Reveal, SettingsSection as Section, SwitchRow } from '@/components/settings-ui';
import { Button } from '@/components/ui/button';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { DEFAULT_NOTIF_PREFERENCES, notificationService, type NotificationPreferences } from '@/lib/notifications';
import { useOfflineSnapshot } from '@/lib/offline/use-offline';
import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';
import { useNotify } from '@/providers/notify';
import { syncNow } from '@/providers/offline';
import { layout, radius, spacing, useTheme, type ThemeMode } from '@/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Small preview of the brand colours in the current theme. Decorative: the text below it says what it shows. */
function PalettePreview() {
  const { colors, scheme, mode } = useTheme();
  const swatches = [colors.primary, colors.secondary, colors.tertiary, colors.success, colors.warning, colors.error];
  return (
    <View style={{ gap: spacing.sm }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: spacing.xs }}>
        {swatches.map((color) => (
          <View key={color} style={{ flex: 1, height: spacing.xl, borderRadius: radius.sm, backgroundColor: color }} />
        ))}
      </View>
      <Text variant="caption" color="textSecondary">
        {mode === 'system' ? `Following your phone: ${scheme} theme` : `Using the ${scheme} theme`}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { user, signOut, serverUrl } = useAuth();
  const { mode, setMode } = useTheme();
  const { isAvailable, isEnabled, biometricLabel, biometricType, toggleBiometrics } = useBiometrics();
  const sync = useOfflineSnapshot();

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFERENCES);

  useEffect(() => {
    void notificationService.getPreferences().then(setNotifPrefs);
  }, []);

  async function updateNotif(patch: Partial<NotificationPreferences>) {
    const next = { ...notifPrefs, ...patch };
    setNotifPrefs(next);
    try {
      await notificationService.savePreferences(next);
    } catch (e) {
      notify.error(e);
    }
  }

  async function sendTest() {
    try {
      const ok = await notificationService.sendTestNotification();
      if (ok) {
        notify.success('Test notification sent. Check your notification tray.');
      } else {
        await notify.alert({
          title: 'Notifications in Expo Go',
          message: 'Android notifications in Expo SDK 53+ require a development build (npx expo run:android) to display native system notifications.',
          severity: 'info',
        });
      }
    } catch (e) {
      notify.error(e);
    }
  }

  async function confirmSignOut() {
    const ok = await notify.confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your Aura360 workspace.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (ok) void signOut();
  }

  const displayName = user?.name ?? 'Aura user';
  const biometricIcon: keyof typeof Ionicons.glyphMap =
    biometricType === 'face' ? 'scan-outline' : biometricType === 'fingerprint' ? 'finger-print-outline' : 'shield-checkmark-outline';

  const syncSubtitle =
    sync.failed > 0
      ? `${plural(sync.failed, "entry couldn't", "entries couldn't")} be saved`
      : sync.pending > 0
        ? `${plural(sync.pending, 'entry', 'entries')} waiting to sync`
        : sync.online
          ? 'Everything is saved to your account'
          : 'Changes are saved on this phone until you are back online';
  const canSync = sync.online && sync.pending > 0;

  return (
    <Screen topInset={false}>
      <Section title="Account">
        <ListItem avatar={{ name: user?.name ?? user?.email, size: 'lg' }} title={displayName} subtitle={user?.email ?? 'user@aura360.internal'} />
      </Section>

      <Section title="Appearance" footer="System follows your phone's light or dark setting.">
        <View style={{ padding: layout.cardPadding, gap: spacing.lg }}>
          <Segmented options={THEME_OPTIONS} value={mode} onChange={setMode} accessibilityLabel="Theme" />
          <PalettePreview />
        </View>
      </Section>

      <Section
        title="Notifications"
        footer={
          notifPrefs.enabled
            ? 'Habit reminders are scheduled on this phone. Alerts and reminders from the server arrive even when the app is closed.'
            : 'Turn on habit reminders to get scheduled water, skincare and daily review alerts.'
        }>
        <ListItem
          icon="notifications"
          accent="finance"
          title="Alerts and reminders"
          subtitle="Budget alerts, renewals, workout, meals and more"
          onPress={() => router.push('/notifications/settings' as never)}
          divider
        />
        <SwitchRow
          icon="alarm-outline"
          accent="fitness"
          title="Daily habit reminders"
          subtitle="Reminders on this phone"
          value={notifPrefs.enabled}
          onValueChange={(val) => void updateNotif({ enabled: val })}
          divider={notifPrefs.enabled}
        />
        {notifPrefs.enabled ? (
          <Reveal>
            <SwitchRow
              icon="water-outline"
              accent="food"
              title="Hydration check"
              subtitle="11:00 AM, 2:30 PM and 5:30 PM"
              value={notifPrefs.waterReminders}
              onValueChange={(val) => void updateNotif({ waterReminders: val })}
              divider
            />
            <SwitchRow
              icon="sunny-outline"
              accent="skincare"
              title="Morning skincare"
              subtitle="Daily routine alert at 8:00 AM"
              value={notifPrefs.morningSkincare}
              onValueChange={(val) => void updateNotif({ morningSkincare: val })}
              divider
            />
            <SwitchRow
              icon="moon-outline"
              accent="skincare"
              title="Evening skincare"
              subtitle="Night routine at 10:00 PM"
              value={notifPrefs.eveningSkincare}
              onValueChange={(val) => void updateNotif({ eveningSkincare: val })}
              divider
            />
            <SwitchRow
              icon="sparkles-outline"
              accent="ai"
              title="Evening review"
              subtitle="Workout and finance tallies at 8:00 PM"
              value={notifPrefs.dailyReview}
              onValueChange={(val) => void updateNotif({ dailyReview: val })}
              divider
            />
            <SwitchRow
              icon="card-outline"
              accent="finance"
              title="Budget threshold alerts"
              subtitle="When spending crosses a limit"
              value={notifPrefs.budgetAlerts}
              onValueChange={(val) => void updateNotif({ budgetAlerts: val })}
              divider
            />
            <ListItem
              icon="paper-plane-outline"
              title="Send a test notification"
              subtitle="See how reminders look on this phone"
              onPress={() => void sendTest()}
              chevron={false}
            />
          </Reveal>
        ) : null}
      </Section>

      <Section title="Security and privacy" footer={isAvailable ? undefined : 'Biometric hardware is not enrolled or available on this device.'}>
        <SwitchRow
          icon={biometricIcon}
          accent="ai"
          title={`Require ${biometricLabel}`}
          subtitle={isAvailable ? 'Lock Aura360 when you open it or switch back to it' : 'Not available on this device'}
          value={isEnabled}
          disabled={!isAvailable}
          onValueChange={(val) => void toggleBiometrics(val)}
        />
      </Section>

      <Section title="Data and sync">
        <ListItem
          icon={sync.online ? 'cloud-done-outline' : 'cloud-offline-outline'}
          title={sync.online ? 'Online' : 'Offline'}
          subtitle={syncSubtitle}
          divider
        />
        {canSync ? (
          <Reveal>
            <ListItem
              icon="sync-outline"
              title="Sync now"
              subtitle={sync.replaying ? 'Syncing...' : 'Send the entries saved on this phone'}
              disabled={sync.replaying}
              onPress={() => {
                haptics.tap();
                void syncNow();
              }}
              chevron={false}
              divider
            />
          </Reveal>
        ) : null}
        <ListItem icon="server-outline" title="Server" subtitle={serverUrl || 'Default local host'} />
      </Section>

      <Section title="About">
        <ListItem icon="information-circle-outline" title="App version" meta={Constants.expoConfig?.version ?? '1.0.0'} />
      </Section>

      <Button title="Sign out" variant="destructive" leftIcon="log-out-outline" onPress={() => void confirmSignOut()} />
    </Screen>
  );
}
