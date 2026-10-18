import Ionicons from '@expo/vector-icons/Ionicons';
import type { TFunction } from 'i18next';
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
import { ErrorState, errorKindFromError } from '@/components/ui/error-state';
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
import { getDeviceLocale, useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { isNotificationsSupported, notificationService } from '@/lib/notifications';
import { registerForServerPush, type PushRegistration } from '@/lib/push';
import { analytics } from '@/lib/telemetry';
import { userErrorMessage } from '@/lib/user-error';
import { useNotify } from '@/providers/notify';
import { layout, spacing, useTheme } from '@/theme';

/** Sunday to Saturday, matching the numbers the server stores (0 = Sunday). Short names in the phone's language. */
function weekdayNames(): string[] {
  const locale = getDeviceLocale();
  // 7 Jan 2024 was a Sunday
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(locale, { weekday: 'short' }));
}

const UNWORN_MIN_DAYS = 14;
const UNWORN_MAX_DAYS = 365;
const UNWORN_DEFAULT_DAYS = 60;

type PushProblem = Exclude<PushRegistration, { ok: true }>['reason'];

const PUSH_PROBLEM_KEYS = {
  'unsupported-in-expo-go': 'prefs.problems.unsupportedInExpoGo',
  'not-a-device': 'prefs.problems.notADevice',
  'no-project-id': 'prefs.problems.noProjectId',
  'permission-denied': 'prefs.problems.permissionDenied',
  failed: 'prefs.problems.failed',
} as const satisfies Record<PushProblem, string>;

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

function describeTest(result: TestResult, t: TFunction<'notifications'>): string {
  const lines = [t('prefs.test.inApp')];
  if (result.email && result.email !== 'skipped') {
    lines.push(result.email.ok ? t('prefs.test.emailSent') : t('prefs.test.emailFailed', { error: result.email.error ?? t('prefs.test.unknownError') }));
  }
  if (result.push && result.push !== 'skipped') {
    lines.push(
      result.push.ok
        ? t('prefs.test.pushSent', { count: result.push.devices })
        : t('prefs.test.pushFailed', { error: result.push.error ?? t('prefs.test.unknownError') }),
    );
  }
  if (result.push === 'skipped') lines.push(t('prefs.test.pushOff'));
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
  const { t } = useTranslation('notifications');
  const { colors } = useTheme();
  const notify = useNotify();
  const insets = useSafeAreaInsets();
  const { data, error, isLoading, isError, isRefetching, fetchStatus, refetch } = useServerPrefs();
  const save = useSaveServerPrefs();
  const sendTest = useSendTestNotification();

  const deviceTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_SERVER_PREFS.timezone, []);
  const days = useMemo(() => weekdayNames(), []);

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
  const [pushResult, setPushResult] = useState<{ ok: true } | { ok: false; reason: PushProblem } | null>(null);
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
      const pushChanged = saved?.push !== result.prefs.push;
      setSavedOverride(result.prefs);
      setEdits(result.prefs);
      // the phone's own skincare reminders pause or resume depending on these settings
      void notificationService.rescheduleAll();
      notify.success(t('prefs.save.toast'));
      if (pushChanged) analytics.track('notifications_toggled', { enabled: result.prefs.push });
    } catch (e) {
      notify.error(userErrorMessage(e, t('prefs.save.failed')));
    }
  }

  async function onTest() {
    try {
      await notify.alert({ title: t('prefs.test.resultTitle'), message: describeTest(await sendTest.mutateAsync(), t), severity: 'info' });
    } catch (e) {
      notify.error(userErrorMessage(e, t('prefs.test.failed')));
    }
  }

  async function onRegister() {
    setRegistering(true);
    setPushResult(null);
    const result = await registerForServerPush();
    if (result.ok) haptics.success();
    setPushResult(result.ok ? { ok: true } : { ok: false, reason: result.reason });
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
      notify.success(t('prefs.permission.granted'));
    } else if (wasDenied) {
      void Linking.openSettings();
    } else {
      notify.warning(t('prefs.permission.stillOff'));
    }
  }

  if (!draft) {
    return (
      <Screen contentContainerStyle={{ flexGrow: 1 }}>
        {isError ? (
          <ErrorState kind={errorKindFromError(error)} onRetry={() => void refetch()} retrying={isRefetching} />
        ) : isLoading || fetchStatus !== 'paused' ? (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </>
        ) : (
          <EmptyState variant="offline" description={t('prefs.loadOffline')} actionTitle={t('prefs.loadRetry')} onAction={() => void refetch()} />
        )}
      </Screen>
    );
  }

  const devices = data?.devices ?? 0;
  const permissionBadge =
    permission === 'granted'
      ? ({ label: t('prefs.permission.allowed'), severity: 'success' } as const)
      : permission === 'denied'
        ? ({ label: t('prefs.permission.off'), severity: 'warning' } as const)
        : permission === 'undetermined'
          ? ({ label: t('prefs.permission.notAsked'), severity: 'neutral' } as const)
          : permission === 'unsupported'
            ? ({ label: t('prefs.permission.unavailable'), severity: 'neutral' } as const)
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
            title={dirty ? t('prefs.save.save') : t('prefs.save.saved')}
            disabled={!dirty}
            loading={save.isPending}
            onPress={() => {
              haptics.tap();
              void onSave();
            }}
          />
        </View>
      }>
      {/* A failed refresh keeps the saved settings on screen and adds a retry row above them. */}
      {isError ? <ErrorState size="inline" kind={errorKindFromError(error)} onRetry={() => void refetch()} retrying={isRefetching} /> : null}

      {permission === 'denied' || permission === 'undetermined' ? (
        <Banner
          severity="warning"
          title={t('prefs.permission.bannerTitle')}
          message={t('prefs.permission.bannerMessage')}
          action={{ label: enabling ? t('prefs.permission.enabling') : t('prefs.permission.enable'), onPress: () => !enabling && void onEnable() }}
        />
      ) : permission === 'unsupported' ? (
        <Banner severity="info" message={t('prefs.problems.unsupportedInExpoGo')} />
      ) : null}

      <SettingsSection title={t('prefs.where.title')} footer={t('prefs.where.footer')}>
        <ListItem
          icon="notifications-outline"
          title={t('prefs.where.inAppTitle')}
          subtitle={t('prefs.where.inAppSubtitle')}
          meta={t('prefs.where.inAppMeta')}
          divider
        />
        <SwitchRow
          icon="phone-portrait-outline"
          title={t('prefs.where.pushTitle')}
          subtitle={devices > 0 ? t('prefs.where.pushConnected', { count: devices }) : t('prefs.where.pushNone')}
          value={draft.push}
          onValueChange={(v) => patch('push', v)}
          divider
        />
        <SwitchRow
          icon="mail-outline"
          title={t('prefs.where.emailTitle')}
          subtitle={t('prefs.where.emailSubtitle')}
          value={draft.email}
          onValueChange={(v) => patch('email', v)}
          divider
        />
        <ListItem
          icon="shield-checkmark-outline"
          title={t('prefs.permission.rowTitle')}
          subtitle={t('prefs.permission.rowSubtitle')}
          meta={permissionBadge ? <Badge label={permissionBadge.label} severity={permissionBadge.severity} size="sm" /> : undefined}
        />
      </SettingsSection>

      <View style={{ gap: spacing.sm, marginTop: -spacing.sm }}>
        <Button
          title={devices > 0 ? t('prefs.connect.reconnect') : t('prefs.connect.connect')}
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
              <Ionicons name="warning" size={18} color={colors.warningText} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            )}
            <Text variant="caption" color={pushResult.ok ? 'successText' : 'warningText'} style={{ flex: 1 }}>
              {pushResult.ok ? t('prefs.connect.done') : t(PUSH_PROBLEM_KEYS[pushResult.reason])}
            </Text>
          </View>
        ) : null}
      </View>

      <SettingsSection title={t('prefs.time.title')} footer={t('prefs.time.footer')}>
        <ListItem icon="globe-outline" title={t('prefs.time.zoneTitle')} subtitle={draft.timezone} divider />
        {draft.timezone !== deviceTimezone ? (
          <View style={{ paddingHorizontal: layout.cardPadding, paddingVertical: spacing.sm }}>
            <Button title={t('prefs.time.useDevice', { zone: deviceTimezone })} variant="ghost" size="sm" onPress={() => patch('timezone', deviceTimezone)} />
          </View>
        ) : null}
        <SwitchRow
          icon="moon-outline"
          title={t('prefs.time.quietTitle')}
          subtitle={draft.quietHours.enabled ? t('prefs.time.quietOn') : t('prefs.time.quietOff')}
          value={draft.quietHours.enabled}
          onValueChange={(v) => patchIn('quietHours', { enabled: v })}
        />
        {draft.quietHours.enabled ? (
          <Expand>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
              <TimeField label={t('prefs.time.from')} value={draft.quietHours.start} onChange={(v) => v && patchIn('quietHours', { start: v })} />
              <TimeField label={t('prefs.time.to')} value={draft.quietHours.end} onChange={(v) => v && patchIn('quietHours', { end: v })} />
            </View>
          </Expand>
        ) : null}
      </SettingsSection>

      <SettingsSection title={t('prefs.alerts.title')}>
        <SwitchRow
          icon="wallet-outline"
          accent="finance"
          title={t('prefs.alerts.budgetTitle')}
          subtitle={t('prefs.alerts.budgetSubtitle')}
          value={draft.budget.enabled}
          onValueChange={(v) => patchIn('budget', { enabled: v })}
          divider
        />
        <SwitchRow
          icon="repeat-outline"
          accent="finance"
          title={t('prefs.alerts.subscriptionsTitle')}
          subtitle={t('prefs.alerts.subscriptionsSubtitle')}
          value={draft.subscriptions.enabled}
          onValueChange={(v) => patchIn('subscriptions', { enabled: v })}
        />
      </SettingsSection>

      <SettingsSection title={t('prefs.reminders.title')} card={false} footer={t('prefs.reminders.footer')}>
        <ReminderCard>
          <SwitchRow
            icon="barbell-outline"
            accent="fitness"
            title={t('prefs.reminders.workoutTitle')}
            subtitle={t('prefs.reminders.workoutSubtitle')}
            value={draft.workout.enabled}
            onValueChange={(v) => patchIn('workout', { enabled: v })}
          />
          {draft.workout.enabled ? (
            <Expand>
              <TimeField label={t('prefs.reminders.at')} value={draft.workout.time} onChange={(v) => v && patchIn('workout', { time: v })} />
              <View style={{ gap: spacing.xs }}>
                <Text variant="label" color="textSecondary">
                  {t('prefs.reminders.workoutDays')}
                </Text>
                <ChipGroup>
                  {days.map((day, i) => {
                    const on = draft.workout.days.includes(i);
                    return (
                      <Chip
                        key={i}
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
                <SwitchRow title={t('prefs.reminders.workoutSkip')} value={draft.workout.onlyIfNotLogged} onValueChange={(v) => patchIn('workout', { onlyIfNotLogged: v })} />
              </Flush>
            </Expand>
          ) : null}
        </ReminderCard>

        <ReminderCard>
          <SwitchRow
            icon="restaurant-outline"
            accent="food"
            title={t('prefs.reminders.mealsTitle')}
            subtitle={t('prefs.reminders.mealsSubtitle')}
            value={draft.meals.enabled}
            onValueChange={(v) => patchIn('meals', { enabled: v })}
          />
          {draft.meals.enabled ? (
            <Expand>
              <TimeField label={t('prefs.reminders.breakfast')} value={draft.meals.breakfast} clearable onChange={(v) => patchIn('meals', { breakfast: v })} />
              <TimeField label={t('prefs.reminders.lunch')} value={draft.meals.lunch} clearable onChange={(v) => patchIn('meals', { lunch: v })} />
              <TimeField label={t('prefs.reminders.dinner')} value={draft.meals.dinner} clearable onChange={(v) => patchIn('meals', { dinner: v })} />
              <Flush>
                <SwitchRow title={t('prefs.reminders.mealsSkip')} value={draft.meals.onlyIfNotLogged} onValueChange={(v) => patchIn('meals', { onlyIfNotLogged: v })} />
              </Flush>
            </Expand>
          ) : null}
        </ReminderCard>

        <ReminderCard>
          <SwitchRow
            icon="sparkles-outline"
            accent="skincare"
            title={t('prefs.reminders.skincareTitle')}
            subtitle={t('prefs.reminders.skincareSubtitle')}
            value={draft.skincare.enabled}
            onValueChange={(v) => patchIn('skincare', { enabled: v })}
          />
          {draft.skincare.enabled ? (
            <Expand>
              <TimeField label={t('prefs.reminders.morning')} value={draft.skincare.morning} clearable onChange={(v) => patchIn('skincare', { morning: v })} />
              <TimeField label={t('prefs.reminders.evening')} value={draft.skincare.evening} clearable onChange={(v) => patchIn('skincare', { evening: v })} />
              <Text variant="caption" color="textSecondary">
                {t('prefs.reminders.skincareNote')}
              </Text>
            </Expand>
          ) : null}
        </ReminderCard>

        <ReminderCard>
          <SwitchRow
            icon="shirt-outline"
            accent="fashion"
            title={t('prefs.reminders.fashionTitle')}
            subtitle={t('prefs.reminders.fashionSubtitle')}
            value={draft.fashion.enabled}
            onValueChange={(v) => patchIn('fashion', { enabled: v })}
          />
          {draft.fashion.enabled ? (
            <Expand>
              <Input
                label={t('prefs.reminders.unwornLabel')}
                helper={t('prefs.reminders.unwornHelper', { min: UNWORN_MIN_DAYS, max: UNWORN_MAX_DAYS })}
                keyboardType="number-pad"
                returnKeyType="done"
                value={String(draft.fashion.unwornDays)}
                onChangeText={(text) => {
                  const n = Number.parseInt(text.replace(/\D/g, ''), 10);
                  patchIn('fashion', { unwornDays: Number.isFinite(n) ? Math.min(UNWORN_MAX_DAYS, Math.max(UNWORN_MIN_DAYS, n)) : UNWORN_DEFAULT_DAYS });
                }}
              />
              <View style={{ gap: spacing.xs }}>
                <Text variant="label" color="textSecondary">
                  {t('prefs.reminders.nudgeOn')}
                </Text>
                <ChipGroup>
                  {days.map((day, i) => (
                    <Chip key={i} label={day} accent="fashion" selected={draft.fashion.weekday === i} onPress={() => patchIn('fashion', { weekday: i })} />
                  ))}
                </ChipGroup>
              </View>
              <TimeField label={t('prefs.reminders.at')} value={draft.fashion.time} onChange={(v) => v && patchIn('fashion', { time: v })} />
            </Expand>
          ) : null}
        </ReminderCard>
      </SettingsSection>

      <SettingsSection title={t('prefs.test.title')} footer={t('prefs.test.footer')}>
        <ListItem
          icon="paper-plane-outline"
          title={t('prefs.test.action')}
          subtitle={sendTest.isPending ? t('prefs.test.sending') : t('prefs.test.idle')}
          disabled={sendTest.isPending}
          onPress={() => void onTest()}
          chevron={false}
        />
      </SettingsSection>
    </Screen>
  );
}
