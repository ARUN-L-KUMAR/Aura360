import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { formatClock, categoryColor } from '@/features/time/types';
import { readRunningTimer, type RunningTimer } from '@/features/time/hooks';
import { useTranslation } from '@/i18n';
import { useNow } from '@/lib/use-now';
import { spacing, useTheme } from '@/theme';

/**
 * The timer stored on this phone, re-read each time Home comes into view (the Time tab owns it). `null` when none runs.
 */
export function useRunningTimerOnFocus() {
  const [timer, setTimer] = useState<RunningTimer | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      readRunningTimer().then((stored) => {
        if (!cancelled) setTimer(stored);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );
  return timer;
}

/** A running timer, live: activity and clock on one card that opens the Time tab to stop it. Nothing when none runs. */
export function TimerStrip({ timer, index }: { timer: RunningTimer; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { colors } = useTheme();
  const now = useNow(true);
  const seconds = Math.max(0, Math.floor((now - timer.startedAt) / 1000));
  const clock = formatClock(seconds);

  return (
    <Section index={index}>
      <Card
        variant="tinted"
        accent="time"
        rounded="xl"
        onPress={() => router.push('/time')}
        accessibilityRole="button"
        accessibilityLabel={`${t('timer.running')}. ${t('timer.elapsed', { activity: timer.activity, time: clock })}`}
        accessibilityHint={t('timer.openHint')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name="radio-button-on" size={18} color={categoryColor(timer.category)} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" color="textSecondary">
            {t('timer.running')}
          </Text>
          <Text variant="label" weight="semiBold" numberOfLines={1}>
            {timer.activity}
          </Text>
        </View>
        <Text variant="title" weight="bold" numeric accessibilityRole="timer">
          {clock}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </Section>
  );
}
