import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { currentStreak, directionOf, lastDays, percentChange, rollingWeeks, todayIndexOf, WEEKLY_GOAL_MINUTES, weekMinutes, type ActivityItem } from '@/components/fitness/activity';
import { CountUp } from '@/components/fitness/count-up';
import { openEntry } from '@/components/fitness/entry-row';
import { FitnessSummary } from '@/components/fitness/fitness-summary';
import { FAB_CLEARANCE, Heading, HeroButtons, IconTile, MetricCard, MetricCell, MetricGrid, QueryError, RingCard, type Trend } from '@/components/fitness/section-kit';
import { WorkoutCard, WorkoutCardSkeleton } from '@/components/fitness/workout-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import { PremiumHero } from '@/components/ui/premium-hero';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
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

/** A frosted stat chip in the hero: icon, count-up number and a tiny tracked label. One spoken sentence. */
function HeadlineChip({ id, icon, value, label, spoken }: HeadlineProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        flexGrow: 1,
        flexBasis: CHIP_BASIS,
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.heroChipBorder,
        backgroundColor: colors.heroChip,
      }}>
      <Ionicons name={icon} size={spacing.lg} color={colors.onHeroMuted} />
      <CountUp id={id} value={value} variant="headline" color="onHero" />
      <Text variant="overline" numberOfLines={2} style={{ color: colors.onHeroMuted }}>
        {label}
      </Text>
    </View>
  );
}

/** Same footprint as three `HeadlineChip`s while the entries load, drawn in the hero's own frosted tone. */
function HeadlineSkeleton({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <SkeletonGroup label={label} style={{ flexDirection: 'row', gap: spacing.sm }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: CHIP_BASIS, height: spacing.xxxl + spacing.xl, borderRadius: radius.lg, backgroundColor: colors.heroChip }} />
      ))}
    </SkeletonGroup>
  );
}

export function OverviewSection({ header, onOpenTrain, onLogWorkout }: { header: ReactNode; onOpenTrain: () => void; onLogWorkout: () => void }) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('fitness');
  const router = useRouter();
  const entries = useRecentFitness();
  const readiness = useReadiness();
  const { session } = useLiveSession();
  const fitness = accent('fitness');
  const heroMotion = useBlockMotion(0);
  const statsMotion = useBlockMotion(60);
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

  // The last 7 days against the 7 days before: rolling windows compare like with like.
  const [before, latest] = useMemo(() => rollingWeeks(items, 2), [items]);
  const averageNow = latest.sessions > 0 ? Math.round(latest.minutes / latest.sessions) : 0;
  const averageBefore = before.sessions > 0 ? Math.round(before.minutes / before.sessions) : 0;

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

  const percentTrend = (now: number, then: number): Trend | undefined => {
    const pct = percentChange(now, then);
    return pct === null ? undefined : { text: t('stats.deltaPercent', { value: Math.abs(pct) }), direction: directionOf(pct) };
  };
  const workoutsTrend: Trend | undefined =
    latest.sessions > 0 || before.sessions > 0 ? { text: String(Math.abs(latest.sessions - before.sessions)), direction: directionOf(latest.sessions - before.sessions) } : undefined;
  const numberText = (n: number) => Math.round(n).toLocaleString(getDeviceLocale());

  const heroLead = session
    ? t('overview.inProgress', { title: session.title })
    : workedOutToday
      ? t('overview.heroDoneLead')
      : doneThisWeek > 0
        ? t('overview.heroKeepGoingLead')
        : t('overview.heroStartLead');
  const heroAccent = session ? undefined : workedOutToday ? t('overview.heroDoneAccent') : doneThisWeek > 0 ? t('overview.heroKeepGoingAccent') : t('overview.heroStartAccent');
  const heroSubtitle = session
    ? t('overview.ctaSubtitle')
    : ready && (doneThisWeek > 0 || weekTotal > 0)
      ? t('overview.heroSummary', { workouts: t('overview.workoutsCount', { count: doneThisWeek }), minutes: t('units.min', { value: weekTotal }) })
      : t('overview.heroSubtitle');

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
        <PremiumHero accent="fitness"
          chip={{ icon: 'flash', label: t('overview.thisWeek') }}
          title={heroLead}
          accentWord={heroAccent}
          subtitle={heroSubtitle}>
          <HeroButtons
            actions={[
              { label: session ? t('actions.resumeWorkout') : t('actions.startWorkout'), icon: 'play', variant: 'solid', onPress: onOpenTrain },
              { label: t('overview.logEntry'), icon: 'add', variant: 'glass', onPress: () => openEntry(router) },
            ]}
          />
          {ready ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <HeadlineChip id="week-workouts" icon="barbell-outline" value={doneThisWeek} label={t('overview.chipWorkouts')} spoken={t('overview.spokenWorkouts', { count: doneThisWeek })} />
              <HeadlineChip id="week-minutes" icon="time-outline" value={weekTotal} label={t('overview.chipMinutes')} spoken={t('overview.spokenMinutes', { count: weekTotal })} />
              <HeadlineChip id="streak" icon="flame-outline" value={streak} label={t('overview.chipStreak')} spoken={t('overview.spokenStreak', { count: streak })} />
            </View>
          ) : loading ? (
            <HeadlineSkeleton label={t('overview.loadingWeek')} />
          ) : null}
        </PremiumHero>
      </Animated.View>

      {entries.isError ? <QueryError error={entries.error} hasData={!!entries.data} retrying={entries.isFetching} onRetry={() => entries.refetch()} /> : null}

      {loading ? (
        <>
          <RingCard>
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
          </RingCard>
          <WorkoutCardSkeleton />
        </>
      ) : null}

      {ready ? (
        <Animated.View {...statsMotion} style={{ gap: spacing.md }}>
          <Heading overline={t('overview.statsOverline')} title={t('overview.statsTitle')} subtitle={t('overview.statsSubtitle')} />
          <MetricGrid>
            <MetricCell>
              <MetricCard label={t('stats.tileWorkouts')} icon="calendar-outline" value={latest.sessions} trend={workoutsTrend} />
            </MetricCell>
            <MetricCell>
              <MetricCard label={t('stats.tileMinutes')} icon="time-outline" value={latest.minutes} format={(n) => t('units.min', { value: numberText(n) })} trend={percentTrend(latest.minutes, before.minutes)} />
            </MetricCell>
            <MetricCell>
              <MetricCard label={t('stats.tileVolume')} icon="barbell-outline" value={latest.volume} format={(n) => t('units.kg', { value: numberText(n) })} trend={percentTrend(latest.volume, before.volume)} />
            </MetricCell>
            <MetricCell>
              <MetricCard label={t('summary.averageSession')} icon="speedometer-outline" value={averageNow} format={(n) => t('units.min', { value: n })} trend={percentTrend(averageNow, averageBefore)} />
            </MetricCell>
          </MetricGrid>
        </Animated.View>
      ) : null}

      {ready ? (
        <Animated.View {...weekMotion}>
          <RingCard>
            <Heading overline={t('overview.goalTitle')} title={t('overview.thisWeek')} subtitle={t('overview.workoutsCount', { count: doneThisWeek })} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg }}>
              <ProgressRing
                value={weekTotal}
                max={WEEKLY_GOAL_MINUTES}
                size={RING_SIZE}
                thickness={RING_THICKNESS}
                accent="fitness"
                label={t('overview.goalTitle')}
                valueText={t('overview.goalProgress', { done: weekTotal, goal: WEEKLY_GOAL_MINUTES })}>
                <CountUp id="goal-percent" value={goalPercent} format={(n) => t('overview.percent', { value: n })} variant="title" weight="bold" />
              </ProgressRing>
              <View style={{ flex: 1, flexBasis: 140, gap: spacing.xs }}>
                <Text variant="body" weight="bold" numeric>
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
            <View style={{ gap: spacing.sm }}>
              <Text variant="overline" color="textMuted">
                {t('overview.minutesByDay')}
              </Text>
              <MiniBars
                values={minutesPerDay}
                highlightIndex={todayIndex}
                labels={week.map((day) => narrowWeekday(day.iso))}
                accent="fitness"
                height={BARS_HEIGHT}
                accessibilityLabel={weekSummary}
              />
            </View>
          </RingCard>
        </Animated.View>
      ) : null}

      {ready ? (
        <Animated.View {...streakMotion}>
          <RingCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <IconTile icon="flame-outline" />
              <View style={{ flex: 1 }}>
                <Heading overline={t('overview.streakTitle')} title={streak > 0 ? t('overview.streakDays', { count: streak }) : t('overview.streakNone')} />
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
          </RingCard>
        </Animated.View>
      ) : null}

      <Animated.View {...readinessMotion}>
        <RingCard style={{ gap: spacing.md }}>
          <Heading overline={t('overview.readinessOverline')} title={t('overview.readinessTitle')} />
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
                <CountUp id="readiness" value={readiness.data.score} variant="display" color={tone.text} />
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
        </RingCard>
      </Animated.View>

      {ready ? <FitnessSummary entries={workouts} /> : null}

      {ready ? (
        <View style={{ gap: spacing.md }}>
          <Heading overline={t('overview.recentOverline')} title={t('overview.recent')} />
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
