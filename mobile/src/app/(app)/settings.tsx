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
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { runManualSync } from '@/lib/manual-sync';
import { DEFAULT_NOTIF_PREFERENCES, HABIT_TIMES, formatClock, notificationService, type NotificationPreferences } from '@/lib/notifications';
import { useOfflineSnapshot } from '@/lib/offline/use-offline';
import { analytics } from '@/lib/telemetry';
import { userErrorMessage } from '@/lib/user-error';
import { useAuth } from '@/providers/auth';
import { useBiometrics } from '@/providers/biometrics';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme, type ThemeMode } from '@/theme';

/** Small preview of the brand colours in the current theme. Decorative: the text below it says what it shows. */
function PalettePreview() {
  const { t } = useTranslation('settings');
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
        {t(`appearance.preview.${mode === 'system' ? 'system' : 'fixed'}.${scheme}`)}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation('settings');
  const router = useRouter();
  const notify = useNotify();
  const { user, signOut, serverUrl } = useAuth();
  const { mode, setMode } = useTheme();
  const { isAvailable, isEnabled, biometricLabel, biometricType, toggleBiometrics } = useBiometrics();
  const sync = useOfflineSnapshot();

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFERENCES);
  // Whether usage data and crash reports may be sent. Off until the user opts in; the stored choice is read first.
  const [shareUsage, setShareUsage] = useState(analytics.isEnabled());

  useEffect(() => {
    void notificationService.getPreferences().then(setNotifPrefs);
  }, []);

  useEffect(() => {
    let alive = true;
    void analytics.ready().then(() => {
      if (alive) setShareUsage(analytics.isEnabled());
    });
    return () => {
      alive = false;
    };
  }, []);

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: t('appearance.system') },
    { value: 'light', label: t('appearance.light') },
    { value: 'dark', label: t('appearance.dark') },
  ];

  function changeTheme(next: ThemeMode) {
    setMode(next);
    analytics.track('theme_changed', { mode: next });
  }

  async function updateNotif(patch: Partial<NotificationPreferences>) {
    const next = { ...notifPrefs, ...patch };
    setNotifPrefs(next);
    try {
      await notificationService.savePreferences(next);
      if (patch.enabled !== undefined) analytics.track('notifications_toggled', { enabled: patch.enabled });
    } catch (e) {
      notify.error(userErrorMessage(e, t('notifications.saveFailed')));
    }
  }

  async function sendTest() {
    try {
      const ok = await notificationService.sendTestNotification();
      if (ok) {
        notify.success(t('notifications.testSent'));
      } else {
        await notify.alert({
          title: t('notifications.expoGoTitle'),
          message: t('notifications.expoGoMessage'),
          severity: 'info',
        });
      }
    } catch (e) {
      notify.error(userErrorMessage(e, t('notifications.testFailed')));
    }
  }

  async function changeBiometrics(enable: boolean) {
    const ok = await toggleBiometrics(enable);
    if (ok) analytics.track('biometrics_toggled', { enabled: enable });
    else if (enable) notify.warning(t('security.notConfirmed', { method: biometricLabel }));
  }

  async function changeShareUsage(enabled: boolean) {
    const previous = shareUsage;
    setShareUsage(enabled);
    try {
      // Opting out is recorded while the previous consent still applies; opting in once it is stored.
      if (!enabled) analytics.track('telemetry_consent_changed', { enabled });
      await analytics.setEnabled(enabled);
      if (enabled) analytics.track('telemetry_consent_changed', { enabled });
    } catch (e) {
      setShareUsage(previous);
      notify.error(userErrorMessage(e, t('privacy.saveFailed')));
    }
  }

  async function confirmSignOut() {
    const ok = await notify.confirm({
      title: t('signOut.confirmTitle'),
      message: t('signOut.confirmMessage'),
      confirmLabel: t('signOut.button'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await signOut();
      analytics.track('sign_out');
    } catch (e) {
      notify.error(userErrorMessage(e, t('signOut.failed')));
    }
  }

  const displayName = user?.name ?? t('account.fallbackName');
  const biometricIcon: keyof typeof Ionicons.glyphMap =
    biometricType === 'face' ? 'scan-outline' : biometricType === 'fingerprint' ? 'finger-print-outline' : 'shield-checkmark-outline';

  const syncSubtitle =
    sync.failed > 0
      ? t('data.failed', { count: sync.failed })
      : sync.pending > 0
        ? t('data.pending', { count: sync.pending })
        : sync.online
          ? t('data.allSaved')
          : t('data.savedOnPhone');
  const canSync = sync.online && sync.pending > 0;

  return (
    <Screen topInset={false}>
      <Section title={t('account.title')}>
        <ListItem avatar={{ name: user?.name ?? user?.email, size: 'lg' }} title={displayName} subtitle={user?.email} />
      </Section>

      <Section title={t('appearance.title')} footer={t('appearance.footer')}>
        <View style={{ padding: layout.cardPadding, gap: spacing.lg }}>
          <Segmented options={themeOptions} value={mode} onChange={changeTheme} accessibilityLabel={t('appearance.themeLabel')} />
          <PalettePreview />
        </View>
      </Section>

      <Section title={t('notifications.title')} footer={notifPrefs.enabled ? t('notifications.footerOn') : t('notifications.footerOff')}>
        <ListItem
          icon="notifications"
          accent="finance"
          title={t('notifications.alertsTitle')}
          subtitle={t('notifications.alertsSubtitle')}
          onPress={() => router.push('/notifications/settings' as never)}
          divider
        />
        <SwitchRow
          icon="alarm-outline"
          accent="fitness"
          title={t('notifications.habitsTitle')}
          subtitle={t('notifications.habitsSubtitle')}
          value={notifPrefs.enabled}
          onValueChange={(val) => void updateNotif({ enabled: val })}
          divider={notifPrefs.enabled}
        />
        {notifPrefs.enabled ? (
          <Reveal>
            <SwitchRow
              icon="water-outline"
              accent="food"
              title={t('notifications.hydrationTitle')}
              subtitle={t('notifications.hydrationSubtitle', {
                first: formatClock(HABIT_TIMES.water[0]),
                second: formatClock(HABIT_TIMES.water[1]),
                third: formatClock(HABIT_TIMES.water[2]),
              })}
              value={notifPrefs.waterReminders}
              onValueChange={(val) => void updateNotif({ waterReminders: val })}
              divider
            />
            <SwitchRow
              icon="sunny-outline"
              accent="skincare"
              title={t('notifications.morningTitle')}
              subtitle={t('notifications.morningSubtitle', { time: formatClock(HABIT_TIMES.morningSkincare) })}
              value={notifPrefs.morningSkincare}
              onValueChange={(val) => void updateNotif({ morningSkincare: val })}
              divider
            />
            <SwitchRow
              icon="moon-outline"
              accent="skincare"
              title={t('notifications.eveningTitle')}
              subtitle={t('notifications.eveningSubtitle', { time: formatClock(HABIT_TIMES.eveningSkincare) })}
              value={notifPrefs.eveningSkincare}
              onValueChange={(val) => void updateNotif({ eveningSkincare: val })}
              divider
            />
            <SwitchRow
              icon="sparkles-outline"
              accent="ai"
              title={t('notifications.reviewTitle')}
              subtitle={t('notifications.reviewSubtitle', { time: formatClock(HABIT_TIMES.dailyReview) })}
              value={notifPrefs.dailyReview}
              onValueChange={(val) => void updateNotif({ dailyReview: val })}
              divider
            />
            <SwitchRow
              icon="card-outline"
              accent="finance"
              title={t('notifications.budgetTitle')}
              subtitle={t('notifications.budgetSubtitle')}
              value={notifPrefs.budgetAlerts}
              onValueChange={(val) => void updateNotif({ budgetAlerts: val })}
              divider
            />
            <ListItem
              icon="paper-plane-outline"
              title={t('notifications.testTitle')}
              subtitle={t('notifications.testSubtitle')}
              onPress={() => void sendTest()}
              chevron={false}
            />
          </Reveal>
        ) : null}
      </Section>

      <Section title={t('security.title')} footer={isAvailable ? undefined : t('security.footerUnavailable')}>
        <SwitchRow
          icon={biometricIcon}
          accent="ai"
          title={t('security.requireTitle', { method: biometricLabel })}
          subtitle={isAvailable ? t('security.requireSubtitle') : t('security.unavailable')}
          value={isEnabled}
          disabled={!isAvailable}
          onValueChange={(val) => void changeBiometrics(val)}
        />
      </Section>

      <Section title={t('privacy.title')}>
        <SwitchRow
          icon="analytics-outline"
          accent="ai"
          title={t('privacy.shareTitle')}
          subtitle={t('privacy.shareSubtitle')}
          titleLines={2}
          value={shareUsage}
          onValueChange={(val) => void changeShareUsage(val)}
        />
      </Section>

      <Section title={t('data.title')}>
        <ListItem
          icon={sync.online ? 'cloud-done-outline' : 'cloud-offline-outline'}
          title={sync.online ? t('data.online') : t('data.offline')}
          subtitle={syncSubtitle}
          divider
        />
        {canSync ? (
          <Reveal>
            <ListItem
              icon="sync-outline"
              title={t('data.syncNow')}
              subtitle={sync.replaying ? t('data.syncing') : t('data.syncSubtitle')}
              disabled={sync.replaying}
              onPress={() => {
                haptics.tap();
                runManualSync().catch(() => notify.error(t('data.syncFailed')));
              }}
              chevron={false}
              divider
            />
          </Reveal>
        ) : null}
        <ListItem icon="server-outline" title={t('data.server')} subtitle={serverUrl || t('data.defaultServer')} />
      </Section>

      <Section title={t('about.title')}>
        <ListItem icon="information-circle-outline" title={t('about.version')} meta={Constants.expoConfig?.version ?? '1.0.0'} />
      </Section>

      <Button title={t('signOut.button')} variant="destructive" leftIcon="log-out-outline" onPress={() => void confirmSignOut()} />
    </Screen>
  );
}
