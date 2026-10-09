import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useDeleteFitness, useSaveFitness } from '@/features/fitness/hooks';
import { volumeOf } from '@/features/fitness/stats';
import { INTENSITIES, MEASUREMENTS, MOODS, WORKOUT_TYPES, type EntryType, type FitnessEntry, type FitnessInput } from '@/features/fitness/types';
import { ApiError } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const TYPE_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'workout', label: 'Workout' },
  { value: 'measurement', label: 'Measurement' },
  { value: 'goal', label: 'Goal' },
];

function parseEntry(raw?: string): FitnessEntry | null {
  try {
    return raw ? (JSON.parse(raw) as FitnessEntry) : null;
  } catch {
    return null;
  }
}

const toText = (value: string | number | null | undefined) => (value === null || value === undefined ? '' : String(Number(value)));

function toOptionalNumber(text: string): number | undefined | null {
  if (!text.trim()) return undefined;
  const value = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export default function FitnessEntryScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ entry?: string }>();
  const existing = useMemo(() => parseEntry(params.entry), [params.entry]);

  const initialType: EntryType = existing?.type === 'measurement' || existing?.type === 'goal' ? existing.type : 'workout';

  const [type, setType] = useState<EntryType>(initialType);
  const [workoutType, setWorkoutType] = useState(existing?.workoutType ? existing.workoutType.toLowerCase() : 'strength');
  const [duration, setDuration] = useState(toText(existing?.duration));
  const [calories, setCalories] = useState(toText(existing?.caloriesBurned));
  const [distance, setDistance] = useState(toText(existing?.distance));
  const [intensity, setIntensity] = useState(existing?.intensity ?? '');
  const [mood, setMood] = useState(existing?.mood ?? '');
  const [measurementType, setMeasurementType] = useState(existing?.measurementType ?? 'weight');
  const [measurementValue, setMeasurementValue] = useState(toText(existing?.measurementValue));
  const [measurementUnit, setMeasurementUnit] = useState(existing?.measurementUnit ?? 'kg');
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? toIsoDay(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useSaveFitness();
  const remove = useDeleteFitness();

  function pickMeasurement(value: string) {
    setMeasurementType(value);
    const preset = MEASUREMENTS.find((m) => m.value === value);
    if (preset) setMeasurementUnit(preset.unit);
  }

  async function submit() {
    const input: FitnessInput = { date, type, notes: notes.trim() || undefined };

    if (type === 'workout') {
      const numbers = { duration: toOptionalNumber(duration), caloriesBurned: toOptionalNumber(calories), distance: toOptionalNumber(distance) };
      if (Object.values(numbers).some((value) => value === null)) return setError('Numbers must be 0 or more.');
      input.workoutType = workoutType;
      input.duration = numbers.duration === undefined ? undefined : Math.round(numbers.duration as number);
      input.caloriesBurned = numbers.caloriesBurned === undefined ? undefined : Math.round(numbers.caloriesBurned as number);
      input.distance = (numbers.distance as number | undefined) ?? undefined;
      input.intensity = intensity || undefined;
      input.mood = mood || undefined;
    } else if (type === 'measurement') {
      const value = toOptionalNumber(measurementValue);
      if (value === undefined || value === null) return setError('Enter the measurement value.');
      input.measurementType = measurementType;
      input.measurementValue = value;
      input.measurementUnit = measurementUnit.trim() || undefined;
    } else if (!notes.trim()) {
      return setError('Describe your goal.');
    }

    setError(null);
    try {
      await save.mutateAsync({ id: existing?.id, input });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete this entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(existing.id);
            router.back();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Could not delete. Try again.');
          }
        },
      },
    ]);
  }

  const volume = volumeOf(existing?.exercises);

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit entry' : 'New entry' }} />

      {existing ? null : <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} />}

      {type === 'workout' ? (
        <>
          {/* Workout Type Chips */}
          <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons name="barbell-outline" size={16} color={moduleColors.fitness} />
              <Text variant="label" muted>
                Activity Type
              </Text>
            </View>
            <ChipGroup>
              {WORKOUT_TYPES.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={workoutType === name.toLowerCase()}
                  color={moduleColors.fitness}
                  onPress={() => setWorkoutType(name.toLowerCase())}
                />
              ))}
            </ChipGroup>
          </GlassCard>

          {/* Metrics Grid */}
          <GlassCard
            glowColor={moduleColors.fitness}
            style={{
              gap: spacing.md,
              padding: spacing.md,
              backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
            }}>
            <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
              WORKOUT STATS
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input label="Duration (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="45" style={{ fontWeight: '700', fontSize: 18 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Calories (kcal)" value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholder="300" style={{ fontWeight: '700', fontSize: 18 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Distance (km)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="0" style={{ fontWeight: '700', fontSize: 18 }} />
              </View>
            </View>
          </GlassCard>

          {/* Intensity & Mood */}
          <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="label" muted>
                Intensity
              </Text>
              <ChipGroup>
                {INTENSITIES.map((value) => (
                  <Chip
                    key={value}
                    label={value[0].toUpperCase() + value.slice(1)}
                    selected={intensity === value}
                    color={moduleColors.fitness}
                    onPress={() => setIntensity(intensity === value ? '' : value)}
                  />
                ))}
              </ChipGroup>
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text variant="label" muted>
                How did it feel?
              </Text>
              <ChipGroup>
                {MOODS.map((value) => (
                  <Chip
                    key={value}
                    label={value}
                    selected={mood === value}
                    color={moduleColors.fitness}
                    onPress={() => setMood(mood === value ? '' : value)}
                  />
                ))}
              </ChipGroup>
            </View>
          </GlassCard>

          {existing?.exercises && existing.exercises.length > 0 ? (
            <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
              <Text variant="label" muted>
                Exercises{volume > 0 ? ` · ${Math.round(volume).toLocaleString()} kg total volume` : ''}
              </Text>
              {existing.exercises.map((ex) => (
                <View key={ex.name} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs }}>
                  <Text style={{ flex: 1, fontWeight: '600' }}>{ex.name}</Text>
                  <Text muted>
                    {ex.sets ?? '-'} × {ex.reps ?? '-'}
                    {ex.weight ? ` @ ${ex.weight} kg` : ''}
                  </Text>
                </View>
              ))}
            </GlassCard>
          ) : null}
        </>
      ) : null}

      {type === 'measurement' ? (
        <GlassCard
          glowColor={moduleColors.fitness}
          style={{
            gap: spacing.md,
            padding: spacing.md,
            backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
          }}>
          <View style={{ gap: spacing.xs }}>
            <Text variant="label" muted>
              Metric
            </Text>
            <ChipGroup>
              {MEASUREMENTS.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  selected={measurementType === item.value}
                  color={moduleColors.fitness}
                  onPress={() => pickMeasurement(item.value)}
                />
              ))}
            </ChipGroup>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 2 }}>
              <Input
                label="Value"
                value={measurementValue}
                onChangeText={setMeasurementValue}
                keyboardType="decimal-pad"
                placeholder="0"
                autoFocus={!existing}
                style={{ fontSize: 24, fontWeight: '700' }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Unit" value={measurementUnit} onChangeText={setMeasurementUnit} autoCapitalize="none" />
            </View>
          </View>
        </GlassCard>
      ) : null}

      {/* Date & Notes */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <DateField label="Date" value={date} onChange={(next) => next && setDate(next)} maximumDate={new Date()} />

        <Input
          label={type === 'goal' ? 'Goal Target' : 'Notes (optional)'}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder={type === 'goal' ? 'e.g. Bench 80 kg by December, 10 pullups' : 'Rest intervals, form notes, comments…'}
          style={{ minHeight: 72, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </GlassCard>

      {error ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: `${colors.danger}18`,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
          }}>
          <Text color="danger" style={{ fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button title={existing ? 'Save changes' : 'Add entry'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete entry" variant="ghost" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
