import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  directionOf,
  percentChange,
  personalBests,
  rollingWeeks,
  type ActivityItem,
  type LiftSample,
  type PersonalBest,
} from '@/components/fitness/activity';
import { Heading, QueryError, RingCard } from '@/components/fitness/section-kit';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { MiniBars } from '@/components/viz/mini-bars';
import { Sparkline } from '@/components/viz/sparkline';
import { StatTile, type StatTileDelta } from '@/components/viz/stat-tile';
import { useRecentFitness, useSaveFitness } from '@/features/fitness/hooks';
import { estimateOneRepMax, isWorkout, volumeOf } from '@/features/fitness/stats';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { formatDay } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme } from '@/theme';

const PERCENTAGES = [
  { pct: 95, reps: 2 },
  { pct: 90, reps: 4 },
  { pct: 85, reps: 6 },
  { pct: 80, reps: 8 },
  { pct: 75, reps: 10 },
  { pct: 70, reps: 12 },
];

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Weeks shown in the volume chart and in the tile trends. */
const WEEKS = 8;
/** Weigh-ins drawn in the body-weight trend. */
const WEIGH_INS = 14;
/** Sessions drawn in the per-workout volume trend. */
const SESSIONS = 10;
const TILE_BASIS = 140;
const CHIP = spacing.xxl + spacing.md; // 44
const RECORD_TREND_WIDTH = spacing.xxxl + spacing.xl + spacing.sm; // 80
const RECORD_TREND_HEIGHT = spacing.xl + spacing.sm; // 32

/** Plates needed on each side of the bar, heaviest first, plus any weight that can't be matched. */
function platesPerSide(target: number, bar: number) {
  let remaining = (target - bar) / 2;
  const plates: number[] = [];
  if (!(remaining > 0)) return { plates, leftover: 0 };
  for (const plate of PLATES) {
    while (remaining + 1e-9 >= plate) {
      plates.push(plate);
      remaining -= plate;
    }
  }
  return { plates, leftover: Math.round(remaining * 2 * 100) / 100 };
}

const parse = (text: string) => Number.parseFloat(text.replace(',', '.'));

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, minHeight: spacing.xl }}>
      <Text variant="body" color="textSecondary" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Text variant="body" weight={strong ? 'semiBold' : 'medium'} numeric>
        {value}
      </Text>
    </View>
  );
}

type RecordRowProps = { best: PersonalBest; index: number };

/** One personal record: a medal (a trophy on a fresh record), the lift, and the weight trend as a small line. */
const RecordRow = memo(function RecordRow({ best, index }: RecordRowProps) {
  const { accent } = useTheme();
  const { t } = useTranslation('fitness');
  const motion = useListMotion(index);
  const fitness = accent('fitness');

  const weight = t('units.kg', { value: best.weight });
  const detail = t('stats.recordDetail', { weight, reps: best.reps, date: formatDay(best.date) });
  const trend = best.series.length >= 2 ? t('stats.recordTrend', { n: best.series.length, first: best.series[0], last: best.series[best.series.length - 1] }) : null;

  return (
    <Animated.View
      {...motion}
      accessible
      accessibilityLabel={[best.name, detail, best.isNew ? t('stats.newRecord') : null, trend].filter(Boolean).join('. ')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: CHIP,
          height: CHIP,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: best.isNew ? fitness.solid : fitness.soft,
        }}>
        <Ionicons name={best.isNew ? 'trophy' : 'medal-outline'} size={spacing.xl} color={best.isNew ? fitness.onSolid : fitness.text} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs / 2 }}>
        <Text variant="label" weight="bold" numberOfLines={2}>
          {best.name}
        </Text>
        <Text variant="caption" color="textSecondary" numeric>
          {detail}
        </Text>
        {best.isNew ? <Tag label={t('stats.newRecord')} icon="sparkles" accent="fitness" /> : null}
      </View>
      {best.series.length >= 2 ? <Sparkline values={best.series} accent="fitness" width={RECORD_TREND_WIDTH} height={RECORD_TREND_HEIGHT} fill={false} /> : null}
    </Animated.View>
  );
});

export function StatsSection({ header, onOpenTrain }: { header: ReactNode; onOpenTrain: () => void }) {
  const { accent } = useTheme();
  const { t } = useTranslation('fitness');
  const notify = useNotify();
  const errorMessage = useErrorMessage();
  const entries = useRecentFitness(365);
  const save = useSaveFitness();
  const tilesMotion = useBlockMotion(0);
  const volumeMotion = useBlockMotion(60);
  const recordsMotion = useBlockMotion(120);

  const [weightText, setWeightText] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [liftWeight, setLiftWeight] = useState('60');
  const [liftReps, setLiftReps] = useState('8');
  const [plateTarget, setPlateTarget] = useState('100');

  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const workouts = useMemo(() => list.filter(isWorkout), [list]);

  const items = useMemo<ActivityItem[]>(() => workouts.map((entry) => ({ date: entry.date, minutes: entry.duration ?? 0, volume: volumeOf(entry.exercises) })), [workouts]);
  const weeks = useMemo(() => rollingWeeks(items, WEEKS), [items]);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  const weeklyVolumes = useMemo(() => weeks.map((week) => week.volume), [weeks]);
  const weeklySessions = useMemo(() => weeks.map((week) => week.sessions), [weeks]);
  const weeklyMinutes = useMemo(() => weeks.map((week) => week.minutes), [weeks]);

  // Newest first, like the API: the volume of each workout that has any, and the heaviest one.
  const sessionVolumes = useMemo(() => workouts.map((entry) => ({ date: entry.date, volume: volumeOf(entry.exercises) })).filter((s) => s.volume > 0), [workouts]);
  const trendVolumes = useMemo(() => sessionVolumes.slice(0, SESSIONS).map((s) => s.volume).reverse(), [sessionVolumes]);
  const bestSession = useMemo(() => sessionVolumes.reduce<{ date: string; volume: number } | null>((best, s) => (!best || s.volume > best.volume ? s : best), null), [sessionVolumes]);

  const bests = useMemo(() => {
    const samples: LiftSample[] = [];
    for (const entry of workouts) {
      for (const ex of entry.exercises ?? []) {
        if (ex.weight && ex.weight > 0) samples.push({ name: ex.name, date: entry.date, weight: ex.weight, reps: ex.reps || 1 });
      }
    }
    return personalBests(samples, 5);
  }, [workouts]);

  const weights = useMemo(() => list.filter((entry) => entry.type === 'measurement' && entry.measurementType === 'weight'), [list]);
  const latestWeight = weights[0] ? Number(weights[0].measurementValue) : null;
  const previousWeight = weights[1] ? Number(weights[1].measurementValue) : null;
  const change = latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null;
  const weightSeries = useMemo(
    () =>
      weights
        .slice(0, WEIGH_INS)
        .map((entry) => Number(entry.measurementValue))
        .filter((value) => Number.isFinite(value))
        .reverse(),
    [weights],
  );

  const liftValue = parse(liftWeight);
  const repsValue = Number.parseInt(liftReps, 10);
  const oneRm = estimateOneRepMax(liftValue, repsValue);
  const plateValue = parse(plateTarget);
  const plateResult = platesPerSide(plateValue, 20);
  const kg = (value: number | string) => t('units.kg', { value });
  const number = (value: number) => Math.round(value).toLocaleString(getDeviceLocale());

  // Deltas against the 7 days before. Colour and an arrow icon both say which way it went; the sentence spells it out.
  const percentDelta = (current: number, previous: number): StatTileDelta | undefined => {
    const pct = percentChange(current, previous);
    return pct === null ? undefined : { text: t('stats.deltaPercent', { value: Math.abs(pct) }), direction: directionOf(pct) };
  };
  const volumeDelta = lastWeek ? percentDelta(thisWeek.volume, lastWeek.volume) : undefined;
  const minutesDelta = lastWeek ? percentDelta(thisWeek.minutes, lastWeek.minutes) : undefined;
  const sessionsDelta: StatTileDelta | undefined =
    lastWeek && (thisWeek.sessions > 0 || lastWeek.sessions > 0)
      ? { text: String(Math.abs(thisWeek.sessions - lastWeek.sessions)), direction: directionOf(thisWeek.sessions - lastWeek.sessions) }
      : undefined;
  const weightDelta: StatTileDelta | undefined =
    change === null ? undefined : { text: t('units.kg', { value: Math.abs(change).toFixed(1) }), direction: directionOf(Math.round(change * 10)), good: change <= 0 };
  const trendLabel = t('stats.trendWeeks', { weeks: WEEKS });
  const weightSpoken =
    latestWeight === null
      ? undefined
      : change === null
        ? t('stats.latestWeightSpoken', { value: kg(latestWeight) })
        : `${t('stats.latestWeightSpoken', { value: kg(latestWeight) })}. ${t(change > 0 ? 'stats.changeUp' : change < 0 ? 'stats.changeDown' : 'stats.changeNone', { value: Math.abs(change).toFixed(1) })}`;
  const hasTrend = workouts.length > 0;

  async function logWeight() {
    const value = parse(weightText);
    if (!Number.isFinite(value) || value <= 0) {
      haptics.warning();
      return setWeightError(t('stats.weightError'));
    }
    setWeightError(null);
    try {
      await save.mutateAsync({ input: { date: toIsoDay(new Date()), type: 'measurement', measurementType: 'weight', measurementValue: value, measurementUnit: 'kg' } });
      setWeightText('');
      notify.success(t('stats.weightLogged', { value: kg(value) }));
      analytics.track('fitness_entry_logged');
    } catch (e) {
      notify.error(errorMessage(e, t('stats.weightFailed')));
    }
  }

  const loading = entries.isPending;
  const failed = entries.isError && !entries.data;

  return (
    <Screen onRefresh={() => entries.refetch()} refreshing={entries.isRefetching}>
      {header}

      {entries.isError ? <QueryError error={entries.error} hasData={!!entries.data} retrying={entries.isFetching} onRetry={() => entries.refetch()} /> : null}

      {loading ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
                <StatTile loading label="" value={0} />
              </View>
            ))}
          </View>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </>
      ) : null}

      {!loading && !failed && (hasTrend || latestWeight !== null) ? (
        <Animated.View {...tilesMotion} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {hasTrend ? (
            <>
              <View style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
                <StatTile
                  label={t('stats.tileVolume')}
                  icon="barbell-outline"
                  accent="fitness"
                  value={thisWeek.volume}
                  format={number}
                  delta={volumeDelta}
                  sparkline={weeklyVolumes}
                  chartLabel={trendLabel}
                />
              </View>
              <View style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
                <StatTile
                  label={t('stats.tileWorkouts')}
                  icon="calendar-outline"
                  accent="fitness"
                  value={thisWeek.sessions}
                  delta={sessionsDelta}
                  bars={weeklySessions}
                  highlightIndex={weeklySessions.length - 1}
                  chartLabel={trendLabel}
                />
              </View>
              <View style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
                <StatTile
                  label={t('stats.tileMinutes')}
                  icon="time-outline"
                  accent="fitness"
                  value={thisWeek.minutes}
                  delta={minutesDelta}
                  sparkline={weeklyMinutes}
                  chartLabel={trendLabel}
                />
              </View>
            </>
          ) : null}
          {latestWeight !== null ? (
            <View style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
              <StatTile
                label={t('stats.tileWeight')}
                icon="scale-outline"
                accent="fitness"
                value={latestWeight}
                format={(n) => n.toLocaleString(getDeviceLocale(), { maximumFractionDigits: 1 })}
                delta={weightDelta}
                sparkline={weightSeries.length >= 2 ? weightSeries : undefined}
                accessibilityLabel={weightSpoken}
              />
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      {!loading && !failed ? (
        <Animated.View {...volumeMotion}>
          <RingCard>
            <Heading overline={t('stats.overlineTrends')} title={t('stats.volumeTitle')} subtitle={hasTrend ? t('stats.volumeSubtitle', { weeks: WEEKS }) : undefined} />
            {!hasTrend ? (
              <EmptyState
                accent="fitness"
                icon="stats-chart-outline"
                title={t('stats.volumeEmptyTitle')}
                description={t('stats.volumeEmptyDescription')}
                actionTitle={t('actions.startWorkout')}
                onAction={onOpenTrain}
                style={{ paddingVertical: spacing.lg }}
              />
            ) : (
              <>
                <MiniBars
                  values={weeklyVolumes}
                  highlightIndex={weeklyVolumes.length - 1}
                  accent="fitness"
                  height={spacing.xxxl + spacing.xl}
                  accessibilityLabel={t('stats.volumeChartSummary', { weeks: WEEKS, latest: kg(number(thisWeek.volume)), best: kg(number(Math.max(...weeklyVolumes))) })}
                />
                {bestSession ? <Tag label={t('stats.bestSession', { value: kg(number(bestSession.volume)), date: formatDay(bestSession.date) })} icon="trophy" size="md" accent="fitness" /> : null}
                {trendVolumes.length >= 2 ? (
                  <View style={{ gap: spacing.xs }}>
                    <Text variant="overline" color="textMuted">
                      {t('stats.perWorkout')}
                    </Text>
                    <Sparkline
                      values={trendVolumes}
                      accent="fitness"
                      height={spacing.xxxl + spacing.sm}
                      label={t('stats.perWorkoutSummary', { n: trendVolumes.length, first: kg(number(trendVolumes[0])), last: kg(number(trendVolumes[trendVolumes.length - 1])) })}
                    />
                  </View>
                ) : null}
              </>
            )}
          </RingCard>
        </Animated.View>
      ) : null}

      {!loading && !failed && bests.length > 0 ? (
        <Animated.View {...recordsMotion}>
          <RingCard>
            <Heading overline={t('stats.overlineRecords')} title={t('stats.recordsTitle')} subtitle={t('stats.recordsSubtitle')} />
            {bests.map((best, index) => (
              <RecordRow key={best.name.toLowerCase()} best={best} index={index} />
            ))}
          </RingCard>
        </Animated.View>
      ) : null}

      {!loading && !failed ? (
        <RingCard>
          <Heading overline={t('stats.overlineBody')} title={t('stats.bodyWeight')} />
          {latestWeight !== null ? (
            weightSeries.length >= 2 ? (
              <Sparkline
                values={weightSeries}
                accent="fitness"
                height={spacing.xxxl + spacing.sm}
                label={t('stats.weightTrendSummary', { n: weightSeries.length, first: kg(weightSeries[0]), last: kg(weightSeries[weightSeries.length - 1]) })}
              />
            ) : null
          ) : (
            <Text variant="body" color="textSecondary">
              {t('stats.noWeighIns')}
            </Text>
          )}

          <Input
            label={t('stats.todaysWeight')}
            value={weightText}
            onChangeText={(text) => {
              setWeightText(text);
              if (weightError) setWeightError(null);
            }}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={logWeight}
            placeholder="0.0"
            rightAdornment={
              <Text variant="label" color="textSecondary">
                {t('units.kgUnit')}
              </Text>
            }
            error={weightError}
          />
          <Button title={t('stats.logWeight')} leftIcon="add" onPress={logWeight} loading={save.isPending} />

          {weights.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="overline" color="textMuted" accessibilityRole="header">
                {t('stats.recentWeighIns')}
              </Text>
              {weights.slice(0, 5).map((entry) => (
                <Row key={entry.id} label={formatDay(entry.date)} value={kg(Number(entry.measurementValue))} />
              ))}
            </View>
          ) : null}
        </RingCard>
      ) : null}

      <RingCard>
        <Heading overline={t('stats.overlineTools')} title={t('stats.oneRmTitle')} subtitle={t('stats.oneRmSubtitle')} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input containerStyle={{ flex: 1 }} label={t('stats.weightKg')} value={liftWeight} onChangeText={setLiftWeight} keyboardType="decimal-pad" returnKeyType="done" />
          <Input containerStyle={{ flex: 1 }} label={t('stats.reps')} value={liftReps} onChangeText={setLiftReps} keyboardType="number-pad" />
        </View>
        <View accessible accessibilityLabel={oneRm > 0 ? t('stats.oneRmSpoken', { value: oneRm }) : t('stats.oneRmPrompt')} accessibilityLiveRegion="polite">
          <Text variant="hero" numeric style={{ color: accent('fitness').text }}>
            {oneRm > 0 ? kg(oneRm) : '—'}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('stats.oneRmLabel')}
          </Text>
        </View>
        {oneRm > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {PERCENTAGES.map((row) => (
              <Row key={row.pct} label={t('stats.percentRow', { pct: row.pct, reps: row.reps })} value={kg(Math.round(oneRm * (row.pct / 100)))} strong />
            ))}
          </View>
        ) : null}
      </RingCard>

      <RingCard>
        <Heading overline={t('stats.overlineTools')} title={t('stats.plateTitle')} subtitle={t('stats.plateSubtitle')} />
        <Input
          label={t('stats.targetWeight')}
          value={plateTarget}
          onChangeText={setPlateTarget}
          keyboardType="decimal-pad"
          returnKeyType="done"
          error={plateTarget.trim() && !(plateValue > 0) ? t('stats.weightError') : null}
        />
        {plateValue > 0 && plateValue <= 20 ? (
          <Text variant="body" color="textSecondary">
            {t('stats.justTheBar')}
          </Text>
        ) : plateValue > 20 ? (
          <View style={{ gap: spacing.sm }}>
            <View
              accessible
              accessibilityLabel={t('stats.platesSpoken', { plates: plateResult.plates.join(', ') })}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {plateResult.plates.map((plate, index) => (
                <Tag key={`${plate}-${index}`} label={kg(plate)} size="md" accent="fitness" />
              ))}
            </View>
            <Text variant="caption" color="textSecondary">
              {plateResult.leftover > 0 ? t('stats.eachSideShort', { value: kg(plateResult.leftover) }) : t('stats.eachSide')}
            </Text>
          </View>
        ) : null}
      </RingCard>
    </Screen>
  );
}
