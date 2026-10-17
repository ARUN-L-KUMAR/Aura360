import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { useNow } from '@/features/fitness/session-store';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, useTheme } from '@/theme';

const PRESETS = [30, 60, 90, 120];

/** Rest-timer state. While running it stores the moment it ends, so the countdown stays right if the app stalls. */
type TimerState = { totalSeconds: number; leftMs: number; endsAt: number | null };

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/** Stand-alone rest interval timer (outside a live workout): presets, play / pause, reset and +15 s. */
export function RestTimer() {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('fitness');
  const fitness = accent('fitness');

  const [timer, setTimer] = useState<TimerState>({ totalSeconds: 60, leftMs: 60_000, endsAt: null });
  const now = useNow(timer.endsAt !== null, 250);

  const { totalSeconds, endsAt } = timer;
  const remainingMs = endsAt !== null ? Math.max(0, Math.min(endsAt - now, totalSeconds * 1000)) : timer.leftMs;
  const secondsRemaining = Math.ceil(remainingMs / 1000);
  const isRunning = endsAt !== null && secondsRemaining > 0;
  const isComplete = endsAt !== null && secondsRemaining === 0;
  const percent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  const status = isComplete ? t('restTimer.complete') : isRunning ? t('restTimer.resting') : t('restTimer.ready');

  useEffect(() => {
    if (isComplete) haptics.success();
  }, [isComplete]);

  const selectPreset = (secs: number) => setTimer({ totalSeconds: secs, leftMs: secs * 1000, endsAt: null });

  const addTime = (secs: number) =>
    setTimer((prev) => {
      const totalSeconds = prev.totalSeconds + secs;
      if (prev.endsAt === null) return { totalSeconds, leftMs: prev.leftMs + secs * 1000, endsAt: null };
      // Already finished: the extra time becomes a fresh, idle countdown. Still running: push the end back.
      if (Date.now() >= prev.endsAt) return { totalSeconds, leftMs: secs * 1000, endsAt: null };
      return { totalSeconds, leftMs: prev.leftMs, endsAt: prev.endsAt + secs * 1000 };
    });

  const toggleRun = () => {
    haptics.tap();
    setTimer((prev) => {
      if (prev.endsAt !== null && Date.now() < prev.endsAt) {
        // Pause: remember what is left.
        return { ...prev, leftMs: prev.endsAt - Date.now(), endsAt: null };
      }
      // Start, resume, or restart after completion.
      const leftMs = prev.endsAt !== null || prev.leftMs <= 0 ? prev.totalSeconds * 1000 : prev.leftMs;
      return { ...prev, leftMs, endsAt: Date.now() + leftMs };
    });
  };

  const reset = () => setTimer((prev) => ({ ...prev, leftMs: prev.totalSeconds * 1000, endsAt: null }));

  return (
    <Card variant={isRunning ? 'tinted' : 'outlined'} accent="fitness" style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="timer-outline" size={20} color={fitness.text} />
          <Text variant="title" accessibilityRole="header">
            {t('restTimer.title')}
          </Text>
        </View>
        {/* One short phrase that only changes when the state does, so a screen reader announces it sparingly. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }} accessibilityLiveRegion="polite">
          {isComplete ? <SuccessCheck size={spacing.lg + spacing.xs} accessibilityLabel={null} /> : null}
          <Text variant="label" color={isComplete ? 'successText' : 'textSecondary'}>
            {status}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
        <Text variant="display" numeric color={isComplete ? 'successText' : 'text'} accessibilityLabel={t('restTimer.secondsRemaining', { count: secondsRemaining })}>
          {formatTime(secondsRemaining)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={isRunning ? t('restTimer.pause') : isComplete ? t('restTimer.restart') : t('restTimer.start')}
            onPress={toggleRun}
            haptic={false}
            ringRadius={radius.pill}
            style={{
              width: layout.minTouchTarget + spacing.xs,
              height: layout.minTouchTarget + spacing.xs,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: fitness.solid,
            }}>
            <Ionicons name={isRunning ? 'pause' : 'play'} size={22} color={fitness.onSolid} />
          </PressableScale>
          <IconButton icon="refresh" variant="tonal" accessibilityLabel={t('restTimer.reset')} onPress={reset} />
          <Button title={t('rest.plus15')} variant="tertiary" size="sm" fullWidth={false} accessibilityLabel={t('rest.plus15Label')} onPress={() => addTime(15)} />
        </View>
      </View>

      <ProgressBar percent={percent} color={isComplete ? colors.success : fitness.solid} height={spacing.sm} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {PRESETS.map((p) => (
          <Chip key={p} label={t('units.seconds', { value: p })} accent="fitness" selected={totalSeconds === p} onPress={() => selectPreset(p)} accessibilityHint={t('restTimer.presetHint', { count: p })} />
        ))}
      </View>
    </Card>
  );
}
