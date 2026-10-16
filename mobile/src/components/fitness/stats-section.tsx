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
import { formatDay } from '@/lib/format';
import { useNotify } from '@/providers/notify';
import { haptics } from '@/lib/haptics';
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
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
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
  const notify = useNotify();
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

  async function logWeight() {
    const value = parse(weightText);
    if (!Number.isFinite(value) || value <= 0) {
      haptics.warning();
      return setWeightError('Enter a weight above 0.');
    }
    setWeightError(null);
    try {
      await save.mutateAsync({ input: { date: toIsoDay(new Date()), type: 'measurement', measurementType: 'weight', measurementValue: value, measurementUnit: 'kg' } });
      setWeightText('');
      notify.success(`Logged ${value} kg`);
    } catch (e) {
      notify.error(e instanceof Error ? e : 'Could not save your weight. Try again.');
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
          <SectionHeader title="Volume per workout" subtitle={volumes.length > 0 ? 'Your last 10 workouts' : undefined} />
          {volumes.length === 0 ? (
            <EmptyState
              accent="fitness"
              icon="stats-chart-outline"
              title="No volume to chart yet"
              description="Finish a workout with logged sets to see your volume trend."
              actionTitle="Start a workout"
              onAction={onOpenTrain}
              style={{ paddingVertical: spacing.lg }}
            />
          ) : (
            volumes.map((item) => {
              const text = item.volume > 0 ? `${Math.round(item.volume).toLocaleString()} kg` : 'No weights logged';
              return (
                <View
                  key={item.id}
                  accessible
                  accessibilityLabel={`${formatDay(item.date)}${item.minutes ? `, ${item.minutes} minutes` : ''}, ${text}`}
                  style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                    <Text variant="caption" color="textSecondary" numeric style={{ flexShrink: 1 }}>
                      {formatDay(item.date)}
                      {item.minutes ? ` · ${item.minutes} min` : ''}
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
          <SectionHeader title="Body weight" />
          {latestWeight !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm }}>
              <Text variant="headline" numeric>
                {latestWeight} kg
              </Text>
              {change !== null ? (
                <View accessible accessibilityLabel={`${change > 0 ? 'Up' : change < 0 ? 'Down' : 'No change'} ${Math.abs(change).toFixed(1)} kilograms since last weigh-in`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Ionicons name={change > 0 ? 'arrow-up' : change < 0 ? 'arrow-down' : 'remove'} size={14} color={change > 0 ? colors.warningText : colors.successText} />
                  <Text variant="label" numeric color={change > 0 ? 'warningText' : 'successText'}>
                    {change > 0 ? '+' : ''}
                    {change.toFixed(1)} kg
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text variant="body" color="textSecondary">
              No weigh-ins yet. Log your first one below.
            </Text>
          )}

          <Input
            label="Today's weight"
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
                kg
              </Text>
            }
            error={weightError}
          />
          <Button title="Log weight" leftIcon="add" onPress={logWeight} loading={save.isPending} />

          {weights.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" color="textSecondary">
                Recent weigh-ins
              </Text>
              {weights.slice(0, 5).map((entry) => (
                <Row key={entry.id} label={formatDay(entry.date)} value={`${Number(entry.measurementValue)} kg`} />
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="One-rep max estimator" subtitle="Epley formula" />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input containerStyle={{ flex: 1 }} label="Weight (kg)" value={liftWeight} onChangeText={setLiftWeight} keyboardType="decimal-pad" returnKeyType="done" />
          <Input containerStyle={{ flex: 1 }} label="Reps" value={liftReps} onChangeText={setLiftReps} keyboardType="number-pad" />
        </View>
        <View accessible accessibilityLabel={oneRm > 0 ? `Estimated one-rep max ${oneRm} kilograms` : 'Enter weight and reps for an estimate'} accessibilityLiveRegion="polite">
          <Text variant="display" numeric style={{ color: accent('fitness').text }}>
            {oneRm > 0 ? `${oneRm} kg` : '—'}
          </Text>
          <Text variant="caption" color="textSecondary">
            Estimated one-rep max
          </Text>
        </View>
        {oneRm > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {PERCENTAGES.map((row) => (
              <Row key={row.pct} label={`${row.pct}% · about ${row.reps} reps`} value={`${Math.round(oneRm * (row.pct / 100))} kg`} strong />
            ))}
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Plate calculator" subtitle="Based on a 20 kg bar" />
        <Input
          label="Target weight (kg)"
          value={plateTarget}
          onChangeText={setPlateTarget}
          keyboardType="decimal-pad"
          returnKeyType="done"
          error={plateTarget.trim() && !(plateValue > 0) ? 'Enter a weight above 0.' : null}
        />
        {plateValue > 0 && plateValue <= 20 ? (
          <Text variant="body" color="textSecondary">
            Just the bar.
          </Text>
        ) : plateValue > 20 ? (
          <View style={{ gap: spacing.sm }}>
            <View
              accessible
              accessibilityLabel={`Plates on each side: ${plateResult.plates.join(', ')} kilograms`}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {plateResult.plates.map((plate, index) => (
                <Tag key={`${plate}-${index}`} label={`${plate} kg`} size="md" accent="fitness" />
              ))}
            </View>
            <Text variant="caption" color="textSecondary">
              On each side{plateResult.leftover > 0 ? ` · ${plateResult.leftover} kg short of the target with these plates` : ''}
            </Text>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
