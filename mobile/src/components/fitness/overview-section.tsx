import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FitnessSummary } from '@/components/fitness/fitness-summary';
import { SectionLabel } from '@/components/fitness/section-label';
import { WorkoutCard } from '@/components/fitness/workout-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useReadiness, useRecentFitness } from '@/features/fitness/hooks';
import { useLiveSession } from '@/features/fitness/session-store';
import { isWorkout, weekCompletion } from '@/features/fitness/stats';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function OverviewSection({ header, onOpenTrain, onLogWorkout }: { header: ReactNode; onOpenTrain: () => void; onLogWorkout: () => void }) {
  const { colors } = useTheme();
  const entries = useRecentFitness();
  const readiness = useReadiness();
  const { session } = useLiveSession();
  const fitnessColor = moduleColors.fitness;

  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const workouts = useMemo(() => list.filter(isWorkout), [list]);
  const week = useMemo(() => weekCompletion(list), [list]);
  const recentWorkouts = useMemo(() => workouts.slice(0, 3), [workouts]);
  const doneThisWeek = week.filter((day) => day.done).length;

  const score = readiness.data?.score ?? 0;
  const scoreColor = score >= 85 ? colors.success : score >= 75 ? colors.warning : colors.danger;

  return (
    <Screen onRefresh={() => Promise.all([entries.refetch(), readiness.refetch()])} refreshing={entries.isRefetching || readiness.isRefetching}>
      {header}

      <GlassCard glowColor={fitnessColor} style={{ gap: spacing.sm }}>
        <SectionLabel>Today</SectionLabel>
        <Text variant="heading">{session ? `${session.title} is in progress` : 'Ready to train?'}</Text>
        <Button title={session ? 'Resume workout' : 'Start workout'} onPress={onOpenTrain} />
      </GlassCard>

      <GlassCard glowColor={readiness.data ? scoreColor : undefined} style={{ gap: spacing.md }}>
        <SectionLabel>Recovery & readiness</SectionLabel>
        {readiness.isPending ? <Text muted>Checking…</Text> : null}
        {readiness.data ? (
          <>
            <View style={styles.scoreRow}>
              <Text variant="title" style={{ color: scoreColor }}>
                {readiness.data.score}
              </Text>
              <Text muted>{readiness.data.status}</Text>
            </View>
            <ProgressBar percent={readiness.data.score} color={scoreColor} />
            <Text variant="caption" muted>
              {readiness.data.recommendation}
            </Text>
          </>
        ) : null}
        {readiness.isError ? <Text muted>Readiness is unavailable right now.</Text> : null}
      </GlassCard>

      <GlassCard style={{ gap: spacing.md }}>
        <View style={styles.weekHeader}>
          <SectionLabel>This week</SectionLabel>
          <Text variant="caption" style={{ color: fitnessColor, fontWeight: '600' }}>
            {doneThisWeek} {doneThisWeek === 1 ? 'workout' : 'workouts'}
          </Text>
        </View>
        <View style={styles.weekRow}>
          {week.map((day, index) => (
            <View
              key={day.iso}
              accessible
              accessibilityLabel={`${day.iso} ${day.done ? 'trained' : 'no workout'}`}
              style={[
                styles.dayDot,
                {
                  backgroundColor: day.done ? fitnessColor : colors.cardMuted,
                  borderWidth: day.isToday ? 2 : 0,
                  borderColor: colors.text,
                  opacity: day.isFuture ? 0.5 : 1,
                },
              ]}>
              <Text variant="label" style={{ color: day.done ? '#ffffff' : colors.textMuted }}>
                {DAY_LABELS[index]}
              </Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <FitnessSummary entries={workouts} />

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Recent workouts</SectionLabel>
        {entries.isPending ? <Text muted>Loading…</Text> : null}
        {!entries.isPending && recentWorkouts.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title="No workouts logged yet"
            description="Start a live workout, or log one you already did."
            actionTitle="Log a workout"
            onAction={onLogWorkout}
            color={fitnessColor}
          />
        ) : null}
        {recentWorkouts.map((entry) => (
          <WorkoutCard key={entry.id} entry={entry} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDot: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
