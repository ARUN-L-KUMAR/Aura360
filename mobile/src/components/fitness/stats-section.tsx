import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { QueryError } from '@/components/fitness/section-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useRecentFitness, useSaveFitness } from '@/features/fitness/hooks';
import { estimateOneRepMax, isWorkout, volumeOf } from '@/features/fitness/stats';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { formatDay } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { spacing, useTheme } from '@/theme';

const PERCENTAGES = [
  { pct: 95, reps: 2 },
  { pct: 90, reps: 4 },
  { pct: 85, reps: 6 },
  { pct: 80, reps: 8 },
  { pct: 75, reps: 10 },
  { pct: 70, reps: 12 },
];

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

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

export function StatsSection({ header, onOpenTrain }: { header: ReactNode; onOpenTrain: () => void }) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('fitness');
  const notify = useNotify();
  const errorMessage = useErrorMessage();
  const entries = useRecentFitness(365);
  const save = useSaveFitness();

  const [weightText, setWeightText] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [liftWeight, setLiftWeight] = useState('60');
  const [liftReps, setLiftReps] = useState('8');
  const [plateTarget, setPlateTarget] = useState('100');

  const list = useMemo(() => entries.data ?? [], [entries.data]);

  const volumes = useMemo(
    () =>
      list
        .filter(isWorkout)
        .slice(0, 10)
        .map((entry) => ({ id: entry.id, date: entry.date, minutes: entry.duration ?? 0, volume: volumeOf(entry.exercises) }))
        .reverse(),
    [list],
  );
  const maxVolume = Math.max(1, ...volumes.map((v) => v.volume));

  const weights = useMemo(() => list.filter((entry) => entry.type === 'measurement' && entry.measurementType === 'weight'), [list]);
  const latestWeight = weights[0] ? Number(weights[0].measurementValue) : null;
  const previousWeight = weights[1] ? Number(weights[1].measurementValue) : null;
  const change = latestWeight !== null && previousWeight !== null ? latestWeight - previousWeight : null;

  const liftValue = parse(liftWeight);
  const repsValue = Number.parseInt(liftReps, 10);
  const oneRm = estimateOneRepMax(liftValue, repsValue);
  const plateValue = parse(plateTarget);
  const plateResult = platesPerSide(plateValue, 20);
  const kg = (value: number | string) => t('units.kg', { value });

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

      {loading ? <SkeletonCard lines={4} /> : null}

      {!loading && !failed ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={t('stats.volumeTitle')} subtitle={volumes.length > 0 ? t('stats.volumeSubtitle') : undefined} />
          {volumes.length === 0 ? (
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
            volumes.map((item) => {
              const text = item.volume > 0 ? kg(Math.round(item.volume).toLocaleString(getDeviceLocale())) : t('stats.noWeights');
              return (
                <View
                  key={item.id}
                  accessible
                  accessibilityLabel={[formatDay(item.date), item.minutes ? t('stats.minutesSpoken', { count: item.minutes }) : null, text].filter(Boolean).join(', ')}
                  style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                    <Text variant="caption" color="textSecondary" numeric style={{ flexShrink: 1 }}>
                      {item.minutes ? t('stats.dateAndMinutes', { date: formatDay(item.date), value: t('units.min', { value: item.minutes }) }) : formatDay(item.date)}
                    </Text>
                    <Text variant="caption" weight="semiBold" numeric>
                      {item.volume > 0 ? text : '—'}
                    </Text>
                  </View>
                  <ProgressBar percent={(item.volume / maxVolume) * 100} color={accent('fitness').solid} />
                </View>
              );
            })
          )}
        </Card>
      ) : null}

      {!loading && !failed ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title={t('stats.bodyWeight')} />
          {latestWeight !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm }}>
              <Text variant="headline" numeric>
                {kg(latestWeight)}
              </Text>
              {change !== null ? (
                <View
                  accessible
                  accessibilityLabel={t(change > 0 ? 'stats.changeUp' : change < 0 ? 'stats.changeDown' : 'stats.changeNone', { value: Math.abs(change).toFixed(1) })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Ionicons name={change > 0 ? 'arrow-up' : change < 0 ? 'arrow-down' : 'remove'} size={14} color={change > 0 ? colors.warningText : colors.successText} />
                  <Text variant="label" numeric color={change > 0 ? 'warningText' : 'successText'}>
                    {change > 0 ? '+' : ''}
                    {kg(change.toFixed(1))}
                  </Text>
                </View>
              ) : null}
            </View>
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
              <Text variant="label" color="textSecondary" accessibilityRole="header">
                {t('stats.recentWeighIns')}
              </Text>
              {weights.slice(0, 5).map((entry) => (
                <Row key={entry.id} label={formatDay(entry.date)} value={kg(Number(entry.measurementValue))} />
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title={t('stats.oneRmTitle')} subtitle={t('stats.oneRmSubtitle')} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input containerStyle={{ flex: 1 }} label={t('stats.weightKg')} value={liftWeight} onChangeText={setLiftWeight} keyboardType="decimal-pad" returnKeyType="done" />
          <Input containerStyle={{ flex: 1 }} label={t('stats.reps')} value={liftReps} onChangeText={setLiftReps} keyboardType="number-pad" />
        </View>
        <View accessible accessibilityLabel={oneRm > 0 ? t('stats.oneRmSpoken', { value: oneRm }) : t('stats.oneRmPrompt')} accessibilityLiveRegion="polite">
          <Text variant="display" numeric style={{ color: accent('fitness').text }}>
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
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title={t('stats.plateTitle')} subtitle={t('stats.plateSubtitle')} />
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
      </Card>
    </Screen>
  );
}
