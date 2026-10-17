import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_FORM_MAX_WIDTH } from '@/components/auth-form-parts';
import { IconDisc } from '@/components/onboarding/icon-disc';
import { Button, type IconName } from '@/components/ui/button';
import { useBlockMotion } from '@/components/ui/motion';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { markPermissionsPrompted } from '@/features/onboarding/storage';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { isNotificationsSupported, notificationService } from '@/lib/notifications';
import { registerForServerPush } from '@/lib/push';
import { analytics } from '@/lib/telemetry';
import { useBiometrics } from '@/providers/biometrics';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

type PermissionStep = 'notifications' | 'biometrics';
type StepKey = PermissionStep | 'done';
/** ask: the explanation. working: the system prompt is up. granted / denied: the outcome, with a way forward. */
type Phase = 'ask' | 'working' | 'granted' | 'denied';

const HERO = spacing.xxxl * 2 + spacing.xl; // 120
const HOME = '/' as Href;

/**
 * Shown once, right after the first sign-in. One permission per page with the reason first, then "Allow" (which asks the
 * system) or "Not now". A "no" is never a dead end: it shows a friendly note and moves on.
 */
export default function PermissionsScreen() {
  const { t } = useTranslation('permissions');
  const router = useRouter();
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAvailable, isEnabled, biometricLabel, biometricType, toggleBiometrics } = useBiometrics();

  // Biometrics are offered only when the phone has them set up and they are not on already. Once this screen turns
  // them on, keep the step in the list so the "Step 2 of 2" counter does not change under the user.
  const [enabledHere, setEnabledHere] = useState(false);
  const steps = useMemo(() => {
    const list: PermissionStep[] = [];
    if (isNotificationsSupported) list.push('notifications');
    if (isAvailable && (!isEnabled || enabledHere)) list.push('biometrics');
    return list;
  }, [isAvailable, isEnabled, enabledHere]);

  const [stepKey, setStepKey] = useState<StepKey>(() => (isNotificationsSupported ? 'notifications' : isAvailable ? 'biometrics' : 'done'));
  const [phase, setPhase] = useState<Phase>('ask');

  // Counts as "shown" as soon as it opens, so quitting the app mid-way never brings it back.
  useEffect(() => {
    void markPermissionsPrompted();
  }, []);

  const blockMotion = useBlockMotion();
  const stepIndex = stepKey === 'done' ? -1 : steps.indexOf(stepKey);

  const advance = useCallback(() => {
    const at = stepKey === 'done' ? -1 : steps.indexOf(stepKey);
    setStepKey(steps[at + 1] ?? 'done');
    setPhase('ask');
  }, [stepKey, steps]);

  const finish = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(HOME);
  }, [router]);

  const allow = useCallback(async () => {
    if (stepKey === 'done' || phase !== 'ask') return;
    const permission = stepKey;
    setPhase('working');
    let granted = false;
    try {
      if (permission === 'notifications') {
        granted = await notificationService.requestPermission();
        if (granted) {
          // Now that the phone may notify, register it with the server and (re)schedule the local reminders.
          void registerForServerPush()
            .then(() => notificationService.rescheduleAll())
            .catch(() => {});
        }
      } else {
        granted = await toggleBiometrics(true);
        if (granted) setEnabledHere(true);
      }
    } catch {
      granted = false;
    }
    analytics.track('permission_prompted', { permission, granted });
    if (granted) haptics.success();
    else haptics.warning();
    setPhase(granted ? 'granted' : 'denied');
  }, [stepKey, phase, toggleBiometrics]);

  const notNow = useCallback(() => {
    if (stepKey === 'done') return;
    analytics.track('permission_prompted', { permission: stepKey, granted: false });
    advance();
  }, [stepKey, advance]);

  // Celebrate the end once, and say so to screen readers.
  useEffect(() => {
    if (stepKey === 'done') {
      haptics.success();
      AccessibilityInfo.announceForAccessibility(t('done.title'));
    }
  }, [stepKey, t]);

  const biometricIcon: IconName =
    biometricType === 'face' ? 'scan-outline' : biometricType === 'fingerprint' ? 'finger-print-outline' : 'shield-checkmark-outline';

  const content = (() => {
    if (stepKey === 'done') {
      return { icon: 'checkmark' as IconName, accent: 'ai' as ModuleKey, title: t('done.title'), body: t('done.body') };
    }
    if (stepKey === 'notifications') {
      return {
        icon: 'notifications-outline' as IconName,
        accent: 'time' as ModuleKey,
        title: t('notifications.title'),
        body: t('notifications.reason'),
      };
    }
    return {
      icon: biometricIcon,
      accent: 'ai' as ModuleKey,
      title: t('biometrics.title', { method: biometricLabel }),
      body: t('biometrics.reason', { method: biometricLabel }),
    };
  })();

  const outcome =
    stepKey === 'notifications'
      ? { granted: t('notifications.granted'), denied: t('notifications.denied') }
      : stepKey === 'biometrics'
        ? { granted: t('biometrics.granted', { method: biometricLabel }), denied: t('biometrics.denied', { method: biometricLabel }) }
        : null;

  const allowLabel = stepKey === 'biometrics' ? t('biometrics.allow', { method: biometricLabel }) : t('notifications.allow');
  const working = phase === 'working';
  const showResult = stepKey !== 'done' && (phase === 'granted' || phase === 'denied');

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, spacing.xl), paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
          gestureEnabled: false,
          animation: reduceMotion ? 'fade' : Platform.OS === 'android' ? 'slide_from_bottom' : 'default',
        }}
      />

      <View style={styles.stepRow}>
        {steps.length > 1 && stepIndex >= 0 ? (
          <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
            {t('step', { current: stepIndex + 1, total: steps.length })}
          </Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View key={`${stepKey}-${phase === 'granted' ? 'granted' : 'other'}`} style={styles.column} {...blockMotion}>
          {stepKey === 'done' || phase === 'granted' ? (
            <SuccessCheck size={HERO} accessibilityLabel={null} />
          ) : (
            <IconDisc icon={content.icon} size={HERO} accent={content.accent} />
          )}

          <View style={styles.copy}>
            <Text variant="headline" accessibilityRole="header" style={styles.center}>
              {stepKey === 'done' ? content.title : phase === 'granted' && outcome ? outcome.granted : content.title}
            </Text>
            {stepKey === 'done' || phase === 'ask' || phase === 'working' ? (
              <Text variant="body" color="textSecondary" style={styles.center}>
                {content.body}
              </Text>
            ) : null}
          </View>

          {phase === 'denied' && outcome ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.note, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text variant="body" color="textSecondary" style={styles.noteText}>
                {outcome.denied}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.actions}>
        {stepKey === 'done' ? (
          <Button title={t('done.cta')} size="lg" onPress={finish} />
        ) : showResult ? (
          <>
            <Button title={t('continue')} size="lg" onPress={advance} />
            {phase === 'denied' && stepKey === 'notifications' ? (
              <Button title={t('openSettings')} variant="ghost" onPress={() => void Linking.openSettings()} />
            ) : null}
          </>
        ) : (
          <>
            <Button title={allowLabel} size="lg" loading={working} onPress={() => void allow()} />
            <Button title={t('notNow')} variant="ghost" disabled={working} onPress={notNow} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: layout.screenPaddingWide },
  stepRow: { minHeight: layout.minTouchTarget, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.lg },
  column: { width: '100%', maxWidth: AUTH_FORM_MAX_WIDTH, alignItems: 'center', gap: spacing.xl },
  copy: { gap: spacing.md, alignItems: 'center' },
  center: { textAlign: 'center' },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    width: '100%',
  },
  noteText: { flex: 1 },
  actions: { width: '100%', maxWidth: AUTH_FORM_MAX_WIDTH, alignSelf: 'center', gap: spacing.sm, paddingTop: spacing.md },
});
