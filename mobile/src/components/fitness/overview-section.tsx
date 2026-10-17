import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { currentStreak, lastDays, todayIndexOf, WEEKLY_GOAL_MINUTES, weekMinutes, type ActivityItem } from '@/components/fitness/activity';
import { CountUp } from '@/components/fitness/count-up';
import { FitnessSummary } from '@/components/fitness/fitness-summary';
import { FAB_CLEARANCE, QueryError } from '@/components/fitness/section-kit';
import { StartCta } from '@/components/fitness/start-cta';
import { WorkoutCard, WorkoutCardSkeleton } from '@/components/fitness/workout-card';
import { HeroBanner } from '@/components/illustrations/hero-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { MiniBars } from '@/components/viz/mini-bars';
import { ProgressRing } from '@/components/viz/progress-ring';
import { StreakDots } from '@/components/viz/streak-dots';
import { useReadiness, useRecentFitness } from '@/features/fitness/hooks';
import { useLiveSession } from '@/features/fitness/session-store';
import { isWorkout, volumeOf, weekCompletion } from '@/features/fitness/stats';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { formatDay } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const RING_SIZE = spacing.xxxl * 2 + spacing.lg; // 112
const RING_THICKNESS = spacing.md;
const BARS_HEIGHT = spacing.xxxl + spacing.lg;
const CHIP_ICON = spacing.xl + spacing.xs; // 28
const CHIP_BASIS = 88;

/** One-letter weekday for a day like "2026-10-09", in the phone's language. */
function narrowWeekday(isoDay: string) {
  const [year, month, day] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(getDeviceLocale(), { weekday: 'narrow' });
}

function readinessTone(score: number) {
  if (score >= 85) return { color: 'success', text: 'successText', icon: 'checkmark-circle' } as const;
  if (score >= 75) return { color: 'warning', text: 'warningText', icon: 'alert-circle' } as const;
  return { color: 'error', text: 'errorText', icon: 'warning' } as const;
}

type HeadlineProps = { id: string; icon: IconName; value: number; label: string; spoken: string };

/** A headline number in the hero: icon, count-up number and a short label. One spoken sentence. */
function HeadlineChip({ id, icon, value, label, spoken }: HeadlineProps) {
  const { colors, accent } = useTheme();
  const fitness = accent('fitness');
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        flexGrow: 1,
        flexBasis: CHIP_BASIS,
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: fitness.border,
        backgroundColor: colors.card,
      }}>
      <View style={{ width: CHIP_ICON, height: CHIP_ICON, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: fitness.soft }}>
        <Ionicons name={icon} size={spacing.lg} color={fitness.text} />
      </View>
      <CountUp id={id} value={value} variant="title" />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

/** Same footprint as three `HeadlineChip`s while the entries load. */
function HeadlineSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={{ flexDirection: 'row', gap: spacing.sm }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: CHIP_BASIS }}>
          <Skeleton shape="box" height={spacing.xxxl + spacing.xl} rounded="md" />
        </View>
      ))}
    </SkeletonGroup>
  );
}

export function OverviewSection({ header, onOpenTrain, onLogWorkout }: { header: ReactNode; onOpenTrain: () => void; onLogWorkout: () => void }) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('fitness');
  const entries = useRecentFitness();
  const readiness = useReadiness();
  const { session } = useLiveSession();
  const fitness = accent('fitness');
  const heroMotion = useBlockMotion(0);
  const ctaMotion = useBlockMotion(60);
  const weekMotion = useBlockMotion(120);
  const streakMotion = useBlockMotion(180);
  const readinessMotion = useBlockMotion(240);

  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const workouts = useMemo(() => list.filter(isWorkout), [list]);
  const week = useMemo(() => weekCompletion(list), [list]);
  const recentWorkouts = useMemo(() => workouts.slice(0, 3), [workouts]);
  const doneThisWeek = week.filter((day) => day.done).length;

  const items = useMemo<ActivityItem[]>(() => workouts.map((entry) => ({ date: entry.date, minutes: entry.duration ?? 0, volume: volumeOf(entry.exercises) })), [workouts]);
  const minutesPerDay = useMemo(() => weekMinutes(items), [items]);
  const weekTotal = minutesPerDay.reduce((sum, value) => sum + value, 0);
  const todayIndex = todayIndexOf();
  const workoutDays = useMemo(() => new Set(workouts.map((entry) => entry.date.slice(0, 10))), [workouts]);
  const streak = useMemo(() => currentStreak(workoutDays), [workoutDays]);
  const streakDays = useMemo(() => lastDays(workoutDays, 7), [workoutDays]);
  const workedOutToday = streakDays[streakDays.length - 1]?.done ?? false;

  const goalPercent = Math.round((weekTotal / WEEKLY_GOAL_MINUTES) * 100);
  const goalReached = weekTotal >= WEEKLY_GOAL_MINUTES;
  const minutesLeft = Math.max(0, WEEKLY_GOAL_MINUTES - weekTotal);

  const score = readiness.data?.score ?? 0;
  // Status is also spelled out in text and with an icon, so the colour is never the only signal.
  const tone = readinessTone(score);

  const refresh = () => Promise.all([entries.refetch(), readiness.refetch()]);
  const loading = entries.isPending;
  const failed = entries.isError && !entries.data;
  const ready = !loading && !failed;

  const heroTitle = session ? t('overview.inProgress', { title: session.title }) : workedOutToday ? t('overview.heroDone') : doneThisWeek > 0 ? t('overview.heroKeepGoing') : t('overview.heroStart');

  const weekSummary = [
    t('overview.barsSummary', { total: weekTotal }),
    ...week.map((day) =>
      t(day.isToday ? 'overview.dayToday' : 'overview.day', { date: formatDay(day.iso), status: day.done ? t('overview.dayDone') : day.isFuture ? t('overview.dayUpcoming') : t('overview.dayNone') }),
    ),
  ].join('. ');

  return (
    <Screen onRefresh={refresh} refreshing={entries.isRefetching || readiness.isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      <Animated.View {...heroMotion}>
        <HeroBanner scene="fitness-hero" accent="fitness" eyebrow={t('overview.today')} title={heroTitle} subtitle={session ? undefined : t('overview.heroSubtitle')}>
          {ready ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <HeadlineChip id="week-workouts" icon="barbell-outline" value={doneThisWeek} label={t('overview.chipWorkouts')} spoken={t('overview.spokenWorkouts', { count: doneThisWeek })} />
              <HeadlineChip id="week-minutes" icon="time-outline" value={weekTotal} label={t('overview.chipMinutes')} spoken={t('overview.spokenMinutes', { count: weekTotal })} />
              <HeadlineChip id="streak" icon="flame-outline" value={streak} label={t('overview.chipStreak')} spoken={t('overview.spokenStreak', { count: streak })} />
            </View>
          ) : loading ? (
            <HeadlineSkeleton label={t('overview.loadingWeek')} />
          ) : null}
        </HeroBanner>
      </Animated.View>

      <Animated.View {...ctaMotion}>
        <StartCta
          title={session ? t('actions.resumeWorkout') : t('actions.startWorkout')}
          subtitle={session ? session.title : t('overview.ctaSubtitle')}
          icon={session ? 'play' : 'barbell-outline'}
          onPress={onOpenTrain}
        />
      </Animated.View>

      {entries.isError ? <QueryError error={entries.error} hasData={!!entries.data} retrying={entries.isFetching} onRetry={() => entries.refetch()} /> : null}

      {loading ? (
        <>
          <Card>
            <SkeletonGroup label={t('overview.loadingWeek')} style={{ gap: spacing.md }}>
              <Skeleton shape="line" width="40%" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <Skeleton shape="circle" size={RING_SIZE} />
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <Skeleton shape="line" width="60%" />
                  <Skeleton shape="line" width="80%" />
                </View>
              </View>
              <Skeleton shape="box" height={BARS_HEIGHT} />
            </SkeletonGroup>
          </Card>
          <WorkoutCardSkeleton />
        </>
      ) : null}

      {ready ? (
        <Animated.View {...weekMotion}>
          <Card style={{ gap: spacing.lg }}>
            <SectionHeader title={t('overview.thisWeek')} subtitle={t('overview.workoutsCount', { count: doneThisWeek })} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg }}>
              <ProgressRing
                value={weekTotal}
                max={WEEKLY_GOAL_MINUTES}
                size={RING_SIZE}
                thickness={RING_THICKNESS}
                accent="fitness"
                label={t('overview.goalTitle')}
                valueText={t('overview.goalProgress', { done: weekTotal, goal: WEEKLY_GOAL_MINUTES })}>
                <CountUp id="goal-percent" value={goalPercent} format={(n) => t('overview.percent', { value: n })} variant="title" />
              </ProgressRing>
              <View style={{ flex: 1, flexBasis: 140, gap: spacing.xs }}>
                <Text variant="label" weight="semiBold">
                  {t('overview.goalTitle')}
                </Text>
                <Text variant="caption" color="textSecondary" numeric>
                  {t('overview.goalProgress', { done: weekTotal, goal: WEEKLY_GOAL_MINUTES })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Ionicons name={goalReached ? 'trophy' : 'flag-outline'} size={spacing.lg} color={goalReached ? fitness.text : colors.textSecondary} />
                  <Text variant="caption" weight="semiBold" style={{ flexShrink: 1, color: goalReached ? fitness.text : colors.textSecondary }}>
                    {goalReached ? t('overview.goalReached') : t('overview.goalLeft', { count: minutesLeft })}
                  </Text>
                </View>
              </View>
            </View>
            <MiniBars
              values={minutesPerDay}
              highlightIndex={todayIndex}
              labels={week.map((day) => narrowWeekday(day.iso))}
              accent="fitness"
              height={BARS_HEIGHT}
              accessibilityLabel={weekSummary}
            />
          </Card>
        </Animated.View>
      ) : null}

      {ready ? (
        <Animated.View {...streakMotion}>
          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="flame" size={spacing.xl} color={streak > 0 ? fitness.text : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text variant="title" accessibilityRole="header">
                  {t('overview.streakTitle')}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {streak > 0 ? t('overview.streakDays', { count: streak }) : t('overview.streakNone')}
                </Text>
              </View>
            </View>
            <StreakDots
              done={streakDays.map((day) => day.done)}
              todayIndex={streakDays.length - 1}
              labels={streakDays.map((day) => narrowWeekday(day.iso))}
              accent="fitness"
              size={spacing.xl + spacing.xs}
              accessibilityLabel={t('overview.streakSummary', { done: streakDays.filter((day) => day.done).length, total: streakDays.length })}
            />
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View {...readinessMotion}>
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={t('overview.readinessTitle')} />
          {readiness.isPending ? (
            <SkeletonGroup label={t('overview.readinessLoading')} style={{ gap: spacing.sm }}>
              <Skeleton shape="line" width="30%" height={spacing.xl} />
              <Skeleton shape="line" height={spacing.sm} />
              <Skeleton shape="line" width="70%" />
            </SkeletonGroup>
          ) : null}
          {readiness.data ? (
            <View style={{ gap: spacing.md }}>
              <View accessible accessibilityLabel={t('overview.readinessLabel', { score: readiness.data.score, status: readiness.data.status })} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
                <CountUp id="readiness" value={readiness.data.score} variant="headline" color={tone.text} />
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
                {t('overview.readinessUnavailable')}
              </Text>
              <Button title={t('actions.tryAgain')} variant="tertiary" size="sm" fullWidth={false} loading={readiness.isFetching} onPress={() => readiness.refetch()} />
            </View>
          ) : null}
        </Card>
      </Animated.View>

      {ready ? <FitnessSummary entries={workouts} /> : null}

      {ready ? (
        <View style={{ gap: spacing.md }}>
          <SectionHeader title={t('overview.recent')} />
          {recentWorkouts.length === 0 ? (
            <EmptyState
              accent="fitness"
              icon="barbell-outline"
              title={t('overview.emptyTitle')}
              description={t('overview.emptyDescription')}
              actionTitle={t('actions.logWorkout')}
              onAction={onLogWorkout}
              secondaryActionTitle={t('overview.startLive')}
              onSecondaryAction={onOpenTrain}
            />
          ) : (
            recentWorkouts.map((entry, index) => <WorkoutCard key={entry.id} entry={entry} index={index} />)
          )}
        </View>
      ) : null}
    </Screen>
  );
}
