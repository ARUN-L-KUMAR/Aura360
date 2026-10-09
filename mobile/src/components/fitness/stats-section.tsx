import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionLabel } from '@/components/fitness/section-label';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useRecentFitness, useSaveFitness } from '@/features/fitness/hooks';
import { estimateOneRepMax, isWorkout, volumeOf } from '@/features/fitness/stats';
import { ApiError } from '@/lib/api';
import { formatDay } from '@/lib/format';
import { moduleColors, spacing } from '@/theme';

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

export function StatsSection({ header }: { header: ReactNode }) {
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

  const oneRm = estimateOneRepMax(parse(liftWeight), Number.parseInt(liftReps, 10));
  const plateResult = platesPerSide(parse(plateTarget), 20);

  async function logWeight() {
    const value = parse(weightText);
    if (!Number.isFinite(value) || value <= 0) return setWeightError('Enter a valid weight.');
    setWeightError(null);
    try {
      await save.mutateAsync({ input: { date: toIsoDay(new Date()), type: 'measurement', measurementType: 'weight', measurementValue: value, measurementUnit: 'kg' } });
      setWeightText('');
    } catch (e) {
      setWeightError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  return (
    <Screen onRefresh={() => entries.refetch()} refreshing={entries.isRefetching}>
      {header}

      <GlassCard style={{ gap: spacing.md }}>
        <SectionLabel>Volume per workout</SectionLabel>
        {volumes.length === 0 ? (
          <Text muted>Finish a workout in the Train tab to see your volume trend.</Text>
        ) : (
          volumes.map((item) => (
            <View key={item.id} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" muted>
                  {formatDay(item.date)}
                  {item.minutes ? ` · ${item.minutes} min` : ''}
                </Text>
                <Text variant="caption">{item.volume > 0 ? `${Math.round(item.volume).toLocaleString()} kg` : '—'}</Text>
              </View>
              <ProgressBar percent={(item.volume / maxVolume) * 100} color={moduleColors.fitness} />
            </View>
          ))
        )}
      </GlassCard>

      <GlassCard style={{ gap: spacing.md }}>
        <SectionLabel>Body weight</SectionLabel>
        {latestWeight !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <Text variant="title">{latestWeight} kg</Text>
            {change !== null ? (
              <Text color={change > 0 ? 'warning' : 'success'}>
                {change > 0 ? '+' : ''}
                {change.toFixed(1)} kg
              </Text>
            ) : null}
          </View>
        ) : (
          <Text muted>No weigh-ins yet.</Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input label="Today's weight (kg)" value={weightText} onChangeText={setWeightText} keyboardType="decimal-pad" placeholder="0.0" error={weightError} />
          </View>
          <Button title="Log" onPress={logWeight} loading={save.isPending} style={{ marginBottom: weightError ? 20 : 0 }} />
        </View>
        {weights.slice(0, 5).map((entry) => (
          <View key={entry.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" muted>
              {formatDay(entry.date)}
            </Text>
            <Text variant="caption">{Number(entry.measurementValue)} kg</Text>
          </View>
        ))}
      </GlassCard>

      <GlassCard style={{ gap: spacing.md }}>
        <SectionLabel>One-rep max estimator</SectionLabel>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Weight (kg)" value={liftWeight} onChangeText={setLiftWeight} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Reps" value={liftReps} onChangeText={setLiftReps} keyboardType="number-pad" />
          </View>
        </View>
        <Text variant="title" style={{ color: moduleColors.fitness }}>
          {oneRm > 0 ? `${oneRm} kg` : '—'}
        </Text>
        <Text variant="caption" muted>
          Estimated 1RM (Epley formula)
        </Text>
        {oneRm > 0
          ? PERCENTAGES.map((row) => (
              <View key={row.pct} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text muted>
                  {row.pct}% · ~{row.reps} reps
                </Text>
                <Text style={{ fontWeight: '600' }}>{Math.round(oneRm * (row.pct / 100))} kg</Text>
              </View>
            ))
          : null}
      </GlassCard>

      <GlassCard style={{ gap: spacing.md }}>
        <SectionLabel>Plate calculator (20 kg bar)</SectionLabel>
        <Input label="Target weight (kg)" value={plateTarget} onChangeText={setPlateTarget} keyboardType="decimal-pad" />
        {parse(plateTarget) <= 20 ? (
          <Text muted>Just the bar.</Text>
        ) : (
          <>
            <Text variant="heading">{plateResult.plates.length > 0 ? plateResult.plates.join(' + ') + ' kg' : '—'}</Text>
            <Text variant="caption" muted>
              on each side{plateResult.leftover > 0 ? ` · ${plateResult.leftover} kg short of the target with these plates` : ''}
            </Text>
          </>
        )}
      </GlassCard>
    </Screen>
  );
}
