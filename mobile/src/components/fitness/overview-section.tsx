import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FitnessSummary } from '@/components/fitness/fitness-summary';
import { FAB_CLEARANCE, QueryError } from '@/components/fitness/section-kit';
import { WorkoutCard } from '@/components/fitness/workout-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useReadiness, useRecentFitness } from '@/features/fitness/hooks';
import { useLiveSession } from '@/features/fitness/session-store';
import { isWorkout, weekCompletion } from '@/features/fitness/stats';
import { formatDay } from '@/lib/format';
import { layout, radius, spacing, useTheme } from '@/theme';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_SIZE = layout.minTouchTarget - spacing.sm; // 36

function readinessTone(score: number) {
  if (score >= 85) return { color: 'success', text: 'successText', icon: 'checkmark-circle' } as const;
  if (score >= 75) return { color: 'warning', text: 'warningText', icon: 'alert-circle' } as const;
  return { color: 'error', text: 'errorText', icon: 'warning' } as const;
}

export function OverviewSection({ header, onOpenTrain, onLogWorkout }: { header: ReactNode; onOpenTrain: () => void; onLogWorkout: () => void }) {
  const { colors, accent } = useTheme();
  const entries = useRecentFitness();
  const readiness = useReadiness();
  const { session } = useLiveSession();
  const fitness = accent('fitness');
  const heroMotion = useBlockMotion(0);
  const readinessMotion = useBlockMotion(60);

  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const workouts = useMemo(() => list.filter(isWorkout), [list]);
  const week = useMemo(() => weekCompletion(list), [list]);
  const recentWorkouts = useMemo(() => workouts.slice(0, 3), [workouts]);
  const doneThisWeek = week.filter((day) => day.done).length;

  const score = readiness.data?.score ?? 0;
  // Status is also spelled out in text and with an icon, so the colour is never the only signal.
  const tone = readinessTone(score);

  const refresh = () => Promise.all([entries.refetch(), readiness.refetch()]);
  const loading = entries.isPending;
  const failed = entries.isError && !entries.data;

  return (
    <Screen onRefresh={refresh} refreshing={entries.isRefetching || readiness.isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      <Animated.View {...heroMotion}>
        <Card variant="tinted" accent="fitness" gradient="fitness" style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text variant="caption" weight="semiBold" style={{ color: fitness.text }}>
              TODAY
            </Text>
            <Text variant="title">{session ? `${session.title} is in progress` : 'Ready to train?'}</Text>
          </View>
          <Button title={session ? 'Resume workout' : 'Start workout'} leftIcon={session ? 'play' : 'barbell-outline'} onPress={onOpenTrain} />
        </Card>
      </Animated.View>

      <Animated.View {...readinessMotion}>
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title="Recovery and readiness" />
          {readiness.isPending ? (
            <SkeletonGroup label="Checking readiness" style={{ gap: spacing.sm }}>
              <Skeleton shape="line" width="30%" height={spacing.xl} />
              <Skeleton shape="line" height={spacing.sm} />
              <Skeleton shape="line" width="70%" />
            </SkeletonGroup>
          ) : null}
          {readiness.data ? (
            <View style={{ gap: spacing.md }}>
              <View accessible accessibilityLabel={`Readiness ${readiness.data.score} out of 100, ${readiness.data.status}`} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
                <Text variant="headline" numeric color={tone.text}>
                  {readiness.data.score}
                </Text>
                <Ionicons name={tone.icon} size={20} color={colors[tone.text]} />
                <Text variant="label" color="textSecondary" style={{ flexShrink: 1 }}>
                  {readiness.data.status}
                </Text>
              </View>
              <ProgressBar percent={readiness.data.score} color={colors[tone.color]} />
              <Text variant="caption" color="textSecondary">
                {readiness.data.recommendation}
              </Text>
            </View>
          ) : null}
          {readiness.isError && !readiness.data ? (
            <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
              <Text variant="body" color="textSecondary">
                Readiness is unavailable right now.
              </Text>
              <Button title="Try again" variant="tertiary" size="sm" fullWidth={false} loading={readiness.isFetching} onPress={() => readiness.refetch()} />
            </View>
          ) : null}
        </Card>
      </Animated.View>

      {entries.isError ? <QueryError error={entries.error} hasData={!!entries.data} retrying={entries.isFetching} onRetry={() => entries.refetch()} /> : null}

      {loading ? (
        <>
          <SkeletonCard lines={1} />
          <SkeletonCard lines={3} />
        </>
      ) : null}

      {!loading && !failed ? (
        <>
          <Card style={{ gap: spacing.md }}>
            <SectionHeader title="This week" subtitle={`${doneThisWeek} ${doneThisWeek === 1 ? 'workout' : 'workouts'}`} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {week.map((day, index) => (
                <View
                  key={day.iso}
                  accessible
                  accessibilityLabel={`${formatDay(day.iso)}${day.isToday ? ', today' : ''}: ${day.done ? 'workout done' : day.isFuture ? 'upcoming' : 'no workout'}`}
                  style={{ alignItems: 'center', gap: spacing.xs, opacity: day.isFuture ? 0.6 : 1 }}>
                  <View
                    style={{
                      width: DAY_SIZE,
                      height: DAY_SIZE,
                      borderRadius: radius.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: day.done ? fitness.solid : colors.cardMuted,
                      borderWidth: day.isToday ? 2 : 0,
                      borderColor: day.done ? fitness.text : colors.borderStrong,
                    }}>
                    {day.done ? <Ionicons name="checkmark" size={20} color={fitness.onSolid} /> : null}
                  </View>
                  <Text variant="caption" weight={day.isToday ? 'bold' : 'medium'} color={day.isToday ? 'text' : 'textSecondary'}>
                    {DAY_LABELS[index]}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <FitnessSummary entries={workouts} />

          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Recent workouts" />
            {recentWorkouts.length === 0 ? (
              <EmptyState
                accent="fitness"
                icon="barbell-outline"
                title="No workouts logged yet"
                description="Start a live workout, or log one you already did."
                actionTitle="Log a workout"
                onAction={onLogWorkout}
                secondaryActionTitle="Start a live workout"
                onSecondaryAction={onOpenTrain}
              />
            ) : (
              recentWorkouts.map((entry, index) => <WorkoutCard key={entry.id} entry={entry} index={index} />)
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
