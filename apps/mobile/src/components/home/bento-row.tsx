import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { View } from 'react-native';

import { GlassCard } from '@/components/home/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import type { DashboardToday } from '@/features/dashboard/use-dashboard';
import type { RunningTimer } from '@/features/time/hooks';
import { formatClock, formatMinutes } from '@/features/time/types';
import { useTranslation } from '@/i18n';
import { useNow } from '@/lib/use-now';
import { layout, radius, spacing, useTheme } from '@/theme';

const PLAY = layout.minTouchTarget;

/** A round accent button in the corner of a bento card. */
function RoundButton({ icon, label, hint, accentKey, onPress }: { icon: 'play' | 'stop' | 'barbell'; label: string; hint: string; accentKey: 'time' | 'fitness'; onPress: () => void }) {
  const { accent } = useTheme();
  const a = accent(accentKey);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      haptic="tap"
      scaleTo={0.92}
      ringRadius={radius.pill}
      onPress={onPress}
      style={{ width: PLAY, height: PLAY, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: a.solid }}>
      <Ionicons name={icon} size={22} color={a.onSolid} />
    </PressableScale>
  );
}


/** Live clock for a running timer, so the card ticks each second without the rest of Home re-rendering. */
function LiveClock({ timer }: { timer: RunningTimer }) {
  const now = useNow(true);
  const clock = formatClock(Math.max(0, Math.floor((now - timer.startedAt) / 1000)));
  return (
    <Text variant="display" numeric accessibilityRole="timer" accessibilityLabel={clock} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
      {clock}
    </Text>
  );
}

/** Card title row: the tracked label, and the round button that opens the module. */
function Header({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text variant="overline" color="textSecondary" numberOfLines={2} style={{ flex: 1 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Focus: time tracked today as a big number, or the live clock while a timer runs, with a round play / stop button into
 * the Time tab. A glass card that shares a row with another half card, or fills the row when it is alone.
 */
export const FocusCard = memo(function FocusCard({ today, timer }: { today: DashboardToday; timer: RunningTimer | null }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const minutes = today.time.minutesToday;
  return (
    <GlassCard padding={spacing.lg} style={{ flex: 1, gap: spacing.sm, minHeight: layout.minTouchTarget * 3 }}>
      <Header title={t('bento.focusTitle')}>
        <RoundButton
          icon={timer ? 'stop' : 'play'}
          accentKey="time"
          label={timer ? t('bento.focusOpen') : t('bento.focusStart')}
          hint={t('bento.focusHint')}
          onPress={() => router.push('/time')}
        />
      </Header>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 2 }}>
        {timer ? (
          <LiveClock timer={timer} />
        ) : (
          <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {formatMinutes(Math.round(minutes))}
          </Text>
        )}
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {timer ? `${t('bento.focusRunning')} · ${timer.activity}` : t('bento.focusCaption')}
        </Text>
      </View>
    </GlassCard>
  );
});

/** Workouts: sessions this week and a round button that starts one. */
export const WorkoutsCard = memo(function WorkoutsCard({ today }: { today: DashboardToday }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { workoutsWeek, activeDaysWeek } = today.fitness;
  return (
    <GlassCard padding={spacing.lg} style={{ flex: 1, gap: spacing.sm, minHeight: layout.minTouchTarget * 3 }}>
      <Header title={t('bento.workoutsTitle')}>
        <RoundButton icon="barbell" accentKey="fitness" label={t('bento.workoutsStart')} hint={t('bento.workoutsHint')} onPress={() => router.push('/fitness/workout')} />
      </Header>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 2 }}>
        <AnimatedNumber value={workoutsWeek} variant="display" accessibilityLabel={String(workoutsWeek)} />
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {t('bento.workoutsCaption', { count: activeDaysWeek })}
        </Text>
      </View>
    </GlassCard>
  );
});
