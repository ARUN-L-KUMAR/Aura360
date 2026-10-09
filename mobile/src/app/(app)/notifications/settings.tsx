import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TimeField } from '@/components/ui/time-field';
import { useSaveServerPrefs, useSendTestNotification, useServerPrefs } from '@/features/notifications/hooks';
import { DEFAULT_SERVER_PREFS, type ServerPrefs, type TestResult } from '@/features/notifications/types';
import { notificationService } from '@/lib/notifications';
import { registerForServerPush, type PushRegistration } from '@/lib/push';
import { moduleColors, spacing, useTheme } from '@/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PUSH_PROBLEMS: Record<Exclude<PushRegistration, { ok: true }>['reason'], string> = {
  'unsupported-in-expo-go': "Push doesn't work in Expo Go. Use a development build.",
  'not-a-device': 'Push needs a real phone, not an emulator.',
  'no-project-id': 'This build has no Expo project id yet. Run "eas init" in the mobile folder, then rebuild.',
  'permission-denied': "Notifications are turned off for Aura360. Allow them in your phone's settings.",
  failed: "Couldn't connect this phone. Check your connection and try again.",
};

function ToggleRow({ title, hint, value, onValueChange }: { title: string; hint?: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600' }}>{title}</Text>
        {hint ? (
          <Text variant="caption" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: moduleColors.finance }} accessibilityLabel={title} />
    </View>
  );
}

function describeTest(result: TestResult): string {
  const lines = ['In-app: ✓ sent'];
  if (result.email && result.email !== 'skipped') lines.push(result.email.ok ? 'Email: ✓ sent' : `Email: ✗ ${result.email.error ?? 'failed'}`);
  if (result.push && result.push !== 'skipped') lines.push(result.push.ok ? `Phone push: ✓ sent to ${result.push.devices}` : `Phone push: ✗ ${result.push.error ?? 'failed'}`);
  if (result.push === 'skipped') lines.push('Phone push: off (turn it on and save first)');
  return lines.join('\n');
}

/** Choose which alerts and reminders the server sends you, when, and where (in-app, phone push, email). */
export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, error, refetch } = useServerPrefs();
  const save = useSaveServerPrefs();
  const sendTest = useSendTestNotification();

  const deviceTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_SERVER_PREFS.timezone, []);
  const [draft, setDraft] = useState<ServerPrefs | null>(null);
  const [saved, setSaved] = useState<ServerPrefs | null>(null);
  const [registering, setRegistering] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  // First load: use the phone's own timezone when nothing has been saved yet (saved only when the user taps Save)
  useEffect(() => {
    if (!data || draft) return;
    const neverSaved = JSON.stringify(data.prefs) === JSON.stringify(DEFAULT_SERVER_PREFS);
    setSaved(data.prefs);
    setDraft(neverSaved ? { ...data.prefs, timezone: deviceTimezone } : data.prefs);
  }, [data, draft, deviceTimezone]);

  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = <K extends keyof ServerPrefs>(key: K, value: ServerPrefs[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const patchIn = <K extends 'quietHours' | 'budget' | 'subscriptions' | 'workout' | 'meals' | 'skincare' | 'fashion'>(key: K, changes: Partial<ServerPrefs[K]>) =>
    setDraft((d) => (d ? { ...d, [key]: { ...d[key], ...changes } } : d));

  async function onSave() {
    if (!draft) return;
    try {
      const result = await save.mutateAsync(draft);
      setSaved(result.prefs);
      setDraft(result.prefs);
      // the phone's own skincare reminders pause or resume depending on these settings
      void notificationService.rescheduleAll();
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : 'Try again.');
    }
  }

  async function onTest() {
    try {
      Alert.alert('Test sent', describeTest(await sendTest.mutateAsync()));
    } catch (e) {
      Alert.alert("Couldn't send the test", e instanceof Error ? e.message : 'Try again.');
    }
  }

  async function onRegister() {
    setRegistering(true);
    setPushMessage(null);
    const result = await registerForServerPush();
    setPushMessage(result.ok ? 'This phone is connected ✓' : PUSH_PROBLEMS[result.reason]);
    await refetch();
    setRegistering(false);
  }

  if (isLoading || !draft) {
    return (
      <Screen>
        <Text muted>{error ? (error instanceof Error ? error.message : 'Could not load your settings.') : 'Loading…'}</Text>
        {error ? <Button title="Try again" variant="secondary" onPress={() => void refetch()} /> : null}
      </Screen>
    );
  }

  const devices = data?.devices ?? 0;

  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      {/* Where alerts go */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <Text variant="heading">Where you get alerts</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="notifications" size={16} color={colors.textMuted} />
          <Text variant="caption" muted style={{ flex: 1 }}>
            In-app: always on. See them under Notifications.
          </Text>
        </View>
        <ToggleRow title="Phone push" hint={devices > 0 ? `${devices} phone${devices === 1 ? '' : 's'} connected` : 'No phone connected yet'} value={draft.push} onValueChange={(v) => patch('push', v)} />
        <ToggleRow title="Email" hint="To your account email" value={draft.email} onValueChange={(v) => patch('email', v)} />

        <View style={{ gap: spacing.sm }}>
          <Button title={devices > 0 ? 'Reconnect this phone' : 'Connect this phone'} variant="secondary" loading={registering} onPress={() => void onRegister()} />
          {pushMessage ? (
            <Text variant="caption" color={pushMessage.endsWith('✓') ? 'success' : 'warning'}>
              {pushMessage}
            </Text>
          ) : null}
        </View>
      </GlassCard>

      {/* Time zone + quiet hours */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <Text variant="heading">Time & quiet hours</Text>
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" muted>
            Time zone
          </Text>
          <Text>{draft.timezone}</Text>
          {draft.timezone !== deviceTimezone ? <Button title={`Use this phone's (${deviceTimezone})`} variant="ghost" onPress={() => patch('timezone', deviceTimezone)} /> : null}
          <Text variant="caption" muted>
            Reminder times below follow this clock.
          </Text>
        </View>
        <ToggleRow title="Quiet hours" hint="No push or email then. Alerts still wait in Notifications." value={draft.quietHours.enabled} onValueChange={(v) => patchIn('quietHours', { enabled: v })} />
        {draft.quietHours.enabled ? (
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <TimeField label="From" value={draft.quietHours.start} onChange={(v) => v && patchIn('quietHours', { start: v })} />
            <TimeField label="To" value={draft.quietHours.end} onChange={(v) => v && patchIn('quietHours', { end: v })} />
          </View>
        ) : null}
      </GlassCard>

      {/* Alerts */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <Text variant="heading">Alerts</Text>
        <ToggleRow title="Budget alerts" hint="When a category reaches its alert level or goes over" value={draft.budget.enabled} onValueChange={(v) => patchIn('budget', { enabled: v })} />
        <ToggleRow title="Subscription renewals" hint="Before a subscription is charged" value={draft.subscriptions.enabled} onValueChange={(v) => patchIn('subscriptions', { enabled: v })} />
      </GlassCard>

      {/* Reminders */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <Text variant="heading">Reminders</Text>

        <ToggleRow title="Workout" hint="A nudge on the days you choose" value={draft.workout.enabled} onValueChange={(v) => patchIn('workout', { enabled: v })} />
        {draft.workout.enabled ? (
          <View style={{ gap: spacing.md, paddingLeft: spacing.sm }}>
            <TimeField label="At" value={draft.workout.time} onChange={(v) => v && patchIn('workout', { time: v })} />
            <ChipGroup>
              {DAYS.map((day, i) => {
                const on = draft.workout.days.includes(i);
                return (
                  <Chip
                    key={day}
                    label={day}
                    selected={on}
                    onPress={() => patchIn('workout', { days: on ? draft.workout.days.filter((d) => d !== i) : [...draft.workout.days, i].sort() })}
                  />
                );
              })}
            </ChipGroup>
            <ToggleRow title="Skip if I already logged one" value={draft.workout.onlyIfNotLogged} onValueChange={(v) => patchIn('workout', { onlyIfNotLogged: v })} />
          </View>
        ) : null}

        <ToggleRow title="Meals" hint="Clear a time to skip that meal" value={draft.meals.enabled} onValueChange={(v) => patchIn('meals', { enabled: v })} />
        {draft.meals.enabled ? (
          <View style={{ gap: spacing.md, paddingLeft: spacing.sm }}>
            <TimeField label="Breakfast" value={draft.meals.breakfast} clearable onChange={(v) => patchIn('meals', { breakfast: v })} />
            <TimeField label="Lunch" value={draft.meals.lunch} clearable onChange={(v) => patchIn('meals', { lunch: v })} />
            <TimeField label="Dinner" value={draft.meals.dinner} clearable onChange={(v) => patchIn('meals', { dinner: v })} />
            <ToggleRow title="Skip a meal I already logged" value={draft.meals.onlyIfNotLogged} onValueChange={(v) => patchIn('meals', { onlyIfNotLogged: v })} />
          </View>
        ) : null}

        <ToggleRow title="Skincare routine" hint="Lists the products in that routine" value={draft.skincare.enabled} onValueChange={(v) => patchIn('skincare', { enabled: v })} />
        {draft.skincare.enabled ? (
          <View style={{ gap: spacing.md, paddingLeft: spacing.sm }}>
            <TimeField label="Morning" value={draft.skincare.morning} clearable onChange={(v) => patchIn('skincare', { morning: v })} />
            <TimeField label="Evening" value={draft.skincare.evening} clearable onChange={(v) => patchIn('skincare', { evening: v })} />
            <Text variant="caption" muted>
              When this is on, the phone's own skincare reminders (in Settings) pause so you don't get two.
            </Text>
          </View>
        ) : null}

        <ToggleRow title="Unworn clothes" hint="A weekly nudge about wardrobe pieces you haven't worn" value={draft.fashion.enabled} onValueChange={(v) => patchIn('fashion', { enabled: v })} />
        {draft.fashion.enabled ? (
          <View style={{ gap: spacing.md, paddingLeft: spacing.sm }}>
            <Input
              label="Unworn for (days)"
              keyboardType="number-pad"
              value={String(draft.fashion.unwornDays)}
              onChangeText={(text) => {
                const n = Number.parseInt(text.replace(/\D/g, ''), 10);
                patchIn('fashion', { unwornDays: Number.isFinite(n) ? Math.min(365, Math.max(14, n)) : 60 });
              }}
            />
            <ChipGroup>
              {DAYS.map((day, i) => (
                <Chip key={day} label={day} selected={draft.fashion.weekday === i} onPress={() => patchIn('fashion', { weekday: i })} />
              ))}
            </ChipGroup>
            <TimeField label="At" value={draft.fashion.time} onChange={(v) => v && patchIn('fashion', { time: v })} />
          </View>
        ) : null}
      </GlassCard>

      <View style={{ gap: spacing.sm }}>
        <Button title={dirty ? 'Save changes' : 'Saved'} disabled={!dirty} loading={save.isPending} onPress={() => void onSave()} />
        <Button title="Send a test notification" variant="secondary" loading={sendTest.isPending} onPress={() => void onTest()} />
        <Text variant="caption" muted style={{ textAlign: 'center' }}>
          The test uses what is saved. Reminders are sent by the server, so they arrive even when the app is closed.
        </Text>
      </View>
    </Screen>
  );
}
