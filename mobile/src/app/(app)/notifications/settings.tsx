import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Reveal, SettingsSection, SwitchRow } from '@/components/settings-ui';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { ListItem } from '@/components/ui/list-item';
import { useListMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { TimeField } from '@/components/ui/time-field';
import { useSaveServerPrefs, useSendTestNotification, useServerPrefs } from '@/features/notifications/hooks';
import { DEFAULT_SERVER_PREFS, type ServerPrefs, type TestResult } from '@/features/notifications/types';
import { haptics } from '@/lib/haptics';
import { isNotificationsSupported, notificationService } from '@/lib/notifications';
import { registerForServerPush, type PushRegistration } from '@/lib/push';
import { useNotify } from '@/providers/notify';
import { layout, spacing, useTheme } from '@/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PUSH_PROBLEMS: Record<Exclude<PushRegistration, { ok: true }>['reason'], string> = {
  'unsupported-in-expo-go': "Push doesn't work in Expo Go. Use a development build.",
  'not-a-device': 'Push needs a real phone, not an emulator.',
  'no-project-id': 'This build has no Expo project id yet. Run "eas init" in the mobile folder, then rebuild.',
  'permission-denied': "Notifications are turned off for Aura360. Allow them in your phone's settings.",
  failed: "Couldn't connect this phone. Check your connection and try again.",
};

/** What the phone's operating system currently allows. `unsupported`: no notification module in this build (Expo Go). */
type PermissionState = 'checking' | 'granted' | 'denied' | 'undetermined' | 'unsupported';

/** Read-only check of the OS permission (the prompt itself is `notificationService.requestPermission`). */
async function readPermission(): Promise<PermissionState> {
  if (!isNotificationsSupported) return 'unsupported';
  try {
    // Loaded on demand like lib/push.ts does, so Expo Go on Android never evaluates the module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    const name: string = status;
    return name === 'granted' ? 'granted' : name === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'unsupported';
  }
}

function describeTest(result: TestResult): string {
  const lines = ['In-app: sent'];
  if (result.email && result.email !== 'skipped') lines.push(result.email.ok ? 'Email: sent' : `Email: failed (${result.email.error ?? 'unknown error'})`);
  if (result.push && result.push !== 'skipped') lines.push(result.push.ok ? `Phone push: sent to ${result.push.devices}` : `Phone push: failed (${result.push.error ?? 'unknown error'})`);
  if (result.push === 'skipped') lines.push('Phone push: off (turn it on and save first)');
  return lines.join('\n');
}

/** Extra options that appear under a switch when it is on. */
function Expand({ children }: { children: ReactNode }) {
  return <Reveal style={{ paddingHorizontal: layout.cardPadding, paddingBottom: layout.cardPadding, gap: spacing.md }}>{children}</Reveal>;
}

/** Lets a row inside an `Expand` use the card's full width again. */
function Flush({ children }: { children: ReactNode }) {
  return <View style={{ marginHorizontal: -layout.cardPadding }}>{children}</View>;
}

/** One reminder: a switch row, and its options underneath while it is on. */
function ReminderCard({ children }: { children: ReactNode }) {
  const { layout: reflow } = useListMotion();
  return (
    <Animated.View layout={reflow}>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        {children}
      </Card>
    </Animated.View>
  );
}

/** Choose which alerts and reminders the server sends you, when, and where (in-app, phone push, email). */
export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const notify = useNotify();
  const insets = useSafeAreaInsets();
  const { data, error, isLoading, isError, isRefetching, fetchStatus, refetch } = useServerPrefs();
  const save = useSaveServerPrefs();
  const sendTest = useSendTestNotification();

  const deviceTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_SERVER_PREFS.timezone, []);

  // What the server has, with the phone's own timezone when nothing was ever saved (saved only when the user taps Save)
  const base = useMemo<ServerPrefs | null>(() => {
    if (!data) return null;
    const neverSaved = JSON.stringify(data.prefs) === JSON.stringify(DEFAULT_SERVER_PREFS);
    return neverSaved ? { ...data.prefs, timezone: deviceTimezone } : data.prefs;
  }, [data, deviceTimezone]);

  // The user's edits (null until the first change) and the last saved copy from this session
  const [edits, setEdits] = useState<ServerPrefs | null>(null);
  const [savedOverride, setSavedOverride] = useState<ServerPrefs | null>(null);
  const draft = edits ?? base;
  const saved = savedOverride ?? data?.prefs ?? null;

  const [registering, setRegistering] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [pushResult, setPushResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [permission, setPermission] = useState<PermissionState>('checking');

  // Keep the permission fresh, including when the user comes back from the phone's settings
  useEffect(() => {
    let alive = true;
    const refresh = () => void readPermission().then((next) => alive && setPermission(next));
    refresh();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = <K extends keyof ServerPrefs>(key: K, value: ServerPrefs[K]) =>
    setEdits((d) => {
      const current = d ?? base;
      return current ? { ...current, [key]: value } : d;
    });
  const patchIn = <K extends 'quietHours' | 'budget' | 'subscriptions' | 'workout' | 'meals' | 'skincare' | 'fashion'>(key: K, changes: Partial<ServerPrefs[K]>) =>
    setEdits((d) => {
      const current = d ?? base;
      return current ? { ...current, [key]: { ...current[key], ...changes } } : d;
    });

  async function onSave() {
    if (!draft) return;
    try {
      const result = await save.mutateAsync(draft);
      setSavedOverride(result.prefs);
      setEdits(result.prefs);
      // the phone's own skincare reminders pause or resume depending on these settings
      void notificationService.rescheduleAll();
      notify.success('Settings saved');
    } catch (e) {
      notify.error(e);
    }
  }

  async function onTest() {
    try {
      await notify.alert({ title: 'Test sent', message: describeTest(await sendTest.mutateAsync()), severity: 'info' });
    } catch (e) {
      notify.error(e);
    }
  }

  async function onRegister() {
    setRegistering(true);
    setPushResult(null);
    const result = await registerForServerPush();
    if (result.ok) haptics.success();
    setPushResult(result.ok ? { ok: true, text: 'This phone is connected' } : { ok: false, text: PUSH_PROBLEMS[result.reason] });
    if (result.ok) setPermission('granted');
    else if (result.reason === 'permission-denied') setPermission('denied');
    await refetch();
    setRegistering(false);
  }

  /** Ask for permission; when the system won't ask again, take the user to this app's page in the phone's settings. */
  async function onEnable() {
    const wasDenied = permission === 'denied';
    setEnabling(true);
    const granted = await notificationService.requestPermission();
    const next = await readPermission();
    setPermission(next);
    setEnabling(false);
    if (granted) {
      notify.success('Notifications are on for this phone');
    } else if (wasDenied) {
      void Linking.openSettings();
    } else {
      notify.warning('Notifications are still off. You can allow them in your phone settings.');
    }
  }

  if (!draft) {
    return (
      <Screen contentContainerStyle={{ flexGrow: 1 }}>
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />
        ) : isLoading || fetchStatus !== 'paused' ? (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </>
        ) : (
          <EmptyState variant="offline" description="Connect to the internet to load your alert settings." actionTitle="Try again" onAction={() => void refetch()} />
        )}
      </Screen>
    );
  }

  const devices = data?.devices ?? 0;
  const permissionBadge =
    permission === 'granted'
      ? ({ label: 'Allowed', severity: 'success' } as const)
      : permission === 'denied'
        ? ({ label: 'Turned off', severity: 'warning' } as const)
        : permission === 'undetermined'
          ? ({ label: 'Not asked yet', severity: 'neutral' } as const)
          : permission === 'unsupported'
            ? ({ label: 'Unavailable', severity: 'neutral' } as const)
            : null;

  return (
    <Screen
      footer={
        <View
          style={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.background,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}>
          <Button
            title={dirty ? 'Save changes' : 'All changes saved'}
            disabled={!dirty}
            loading={save.isPending}
            onPress={() => {
              haptics.tap();
              void onSave();
            }}
          />
        </View>
      }>
      {permission === 'denied' || permission === 'undetermined' ? (
        <Banner
          severity="warning"
          title="Notifications are off for this phone"
          message="Allow notifications so alerts and reminders can reach you, even when the app is closed."
          action={{ label: enabling ? 'Enabling...' : 'Enable notifications', onPress: () => !enabling && void onEnable() }}
        />
      ) : permission === 'unsupported' ? (
        <Banner severity="info" message={PUSH_PROBLEMS['unsupported-in-expo-go']} />
      ) : null}

      <SettingsSection
        title="Where you get alerts"
        footer="In-app alerts are always on. Phone push and email follow the quiet hours below.">
        <ListItem icon="notifications-outline" title="In the app" subtitle="See them under Notifications" meta="Always on" divider />
        <SwitchRow
          icon="phone-portrait-outline"
          title="Phone push"
          subtitle={devices > 0 ? `${devices} phone${devices === 1 ? '' : 's'} connected` : 'No phone connected yet'}
          value={draft.push}
          onValueChange={(v) => patch('push', v)}
          divider
        />
        <SwitchRow icon="mail-outline" title="Email" subtitle="To your account email" value={draft.email} onValueChange={(v) => patch('email', v)} divider />
        <ListItem
          icon="shield-checkmark-outline"
          title="Phone permission"
          subtitle="Set in your phone's settings"
          meta={permissionBadge ? <Badge label={permissionBadge.label} severity={permissionBadge.severity} size="sm" /> : undefined}
        />
      </SettingsSection>

      <View style={{ gap: spacing.sm, marginTop: -spacing.sm }}>
        <Button
          title={devices > 0 ? 'Reconnect this phone' : 'Connect this phone'}
          variant="secondary"
          leftIcon="link-outline"
          loading={registering}
          onPress={() => void onRegister()}
        />
        {pushResult ? (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {pushResult.ok ? (
              <SuccessCheck size={20} accessibilityLabel={null} />
            ) : (
              <Ionicons name="warning" size={18} color={colors.warningText} />
            )}
            <Text variant="caption" color={pushResult.ok ? 'successText' : 'warningText'} style={{ flex: 1 }}>
              {pushResult.text}
            </Text>
          </View>
        ) : null}
      </View>

      <SettingsSection title="Time and quiet hours" footer="Reminder times follow the time zone. During quiet hours there is no push or email, and alerts wait in Notifications.">
        <ListItem icon="globe-outline" title="Time zone" subtitle={draft.timezone} divider />
        {draft.timezone !== deviceTimezone ? (
          <View style={{ paddingHorizontal: layout.cardPadding, paddingVertical: spacing.sm }}>
            <Button title={`Use this phone's (${deviceTimezone})`} variant="ghost" size="sm" onPress={() => patch('timezone', deviceTimezone)} />
          </View>
        ) : null}
        <SwitchRow
          icon="moon-outline"
          title="Quiet hours"
          subtitle={draft.quietHours.enabled ? 'On' : 'Off'}
          value={draft.quietHours.enabled}
          onValueChange={(v) => patchIn('quietHours', { enabled: v })}
        />
        {draft.quietHours.enabled ? (
          <Expand>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
              <TimeField label="From" value={draft.quietHours.start} onChange={(v) => v && patchIn('quietHours', { start: v })} />
              <TimeField label="To" value={draft.quietHours.end} onChange={(v) => v && patchIn('quietHours', { end: v })} />
            </View>
          </Expand>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Alerts">
        <SwitchRow
          icon="wallet-outline"
          accent="finance"
          title="Budget alerts"
          subtitle="At the alert level, or over budget"
          value={draft.budget.enabled}
          onValueChange={(v) => patchIn('budget', { enabled: v })}
          divider
        />
        <SwitchRow
          icon="repeat-outline"
          accent="finance"
          title="Subscription renewals"
          subtitle="Before a subscription is charged"
          value={draft.subscriptions.enabled}
          onValueChange={(v) => patchIn('subscriptions', { enabled: v })}
        />
      </SettingsSection>

      <SettingsSection title="Reminders" card={false} footer="Reminders are sent by the server, so they arrive even when the app is closed.">
        <ReminderCard>
          <SwitchRow
            icon="barbell-outline"
            accent="fitness"
            title="Workout"
            subtitle="A nudge on the days you choose"
            value={draft.workout.enabled}
            onValueChange={(v) => patchIn('workout', { enabled: v })}
          />
          {draft.workout.enabled ? (
            <Expand>
              <TimeField label="At" value={draft.workout.time} onChange={(v) => v && patchIn('workout', { time: v })} />
              <View style={{ gap: spacing.xs }}>
                <Text variant="label" color="textSecondary">
                  On these days
                </Text>
                <ChipGroup>
                  {DAYS.map((day, i) => {
                    const on = draft.workout.days.includes(i);
                    return (
                      <Chip
                        key={day}
                        label={day}
                        accent="fitness"
                        selected={on}
                        onPress={() => patchIn('workout', { days: on ? draft.workout.days.filter((d) => d !== i) : [...draft.workout.days, i].sort() })}
                      />
                    );
                  })}
                </ChipGroup>
              </View>
              <Flush>
                <SwitchRow title="Skip if I already logged one" value={draft.workout.onlyIfNotLogged} onValueChange={(v) => patchIn('workout', { onlyIfNotLogged: v })} />
              </Flush>
            </Expand>
          ) : null}
        </ReminderCard>

        <ReminderCard>
          <SwitchRow
            icon="restaurant-outline"
            accent="food"
            title="Meals"
            subtitle="Clear a time to skip that meal"
            value={draft.meals.enabled}
            onValueChange={(v) => patchIn('meals', { enabled: v })}
          />
          {draft.meals.enabled ? (
            <Expand>
              <TimeField label="Breakfast" value={draft.meals.breakfast} clearable onChange={(v) => patchIn('meals', { breakfast: v })} />
              <TimeField label="Lunch" value={draft.meals.lunch} clearable onChange={(v) => patchIn('meals', { lunch: v })} />
              <TimeField label="Dinner" value={draft.meals.dinner} clearable onChange={(v) => patchIn('meals', { dinner: v })} />
              <Flush>
                <SwitchRow title="Skip a meal I already logged" value={draft.meals.onlyIfNotLogged} onValueChange={(v) => patchIn('meals', { onlyIfNotLogged: v })} />
              </Flush>
            </Expand>
          ) : null}
        </ReminderCard>

        <ReminderCard>
          <SwitchRow
            icon="sparkles-outline"
            accent="skincare"
            title="Skincare routine"
            subtitle="Lists the products in that routine"
            value={draft.skincare.enabled}
            onValueChange={(v) => patchIn('skincare', { enabled: v })}
          />
          {draft.skincare.enabled ? (
            <Expand>
              <TimeField label="Morning" value={draft.skincare.morning} clearable onChange={(v) => patchIn('skincare', { morning: v })} />
              <TimeField label="Evening" value={draft.skincare.evening} clearable onChange={(v) => patchIn('skincare', { evening: v })} />
              <Text variant="caption" color="textSecondary">
                {"When this is on, the phone's own skincare reminders (in Settings) pause so you don't get two."}
              </Text>
            </Expand>
          ) : null}
        </ReminderCard>

        <ReminderCard>
          <SwitchRow
            icon="shirt-outline"
            accent="fashion"
            title="Unworn clothes"
            subtitle="A weekly nudge about pieces you haven't worn"
            value={draft.fashion.enabled}
            onValueChange={(v) => patchIn('fashion', { enabled: v })}
          />
          {draft.fashion.enabled ? (
            <Expand>
              <Input
                label="Unworn for (days)"
                helper="Between 14 and 365 days"
                keyboardType="number-pad"
                returnKeyType="done"
                value={String(draft.fashion.unwornDays)}
                onChangeText={(text) => {
                  const n = Number.parseInt(text.replace(/\D/g, ''), 10);
                  patchIn('fashion', { unwornDays: Number.isFinite(n) ? Math.min(365, Math.max(14, n)) : 60 });
                }}
              />
              <View style={{ gap: spacing.xs }}>
                <Text variant="label" color="textSecondary">
                  Nudge me on
                </Text>
                <ChipGroup>
                  {DAYS.map((day, i) => (
                    <Chip key={day} label={day} accent="fashion" selected={draft.fashion.weekday === i} onPress={() => patchIn('fashion', { weekday: i })} />
                  ))}
                </ChipGroup>
              </View>
              <TimeField label="At" value={draft.fashion.time} onChange={(v) => v && patchIn('fashion', { time: v })} />
            </Expand>
          ) : null}
        </ReminderCard>
      </SettingsSection>

      <SettingsSection title="Test" footer="The test uses what is saved, and goes to every channel that is on.">
        <ListItem
          icon="paper-plane-outline"
          title="Send a test notification"
          subtitle={sendTest.isPending ? 'Sending...' : 'Check that alerts reach you'}
          disabled={sendTest.isPending}
          onPress={() => void onTest()}
          chevron={false}
        />
      </SettingsSection>
    </Screen>
  );
}
