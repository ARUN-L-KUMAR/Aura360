import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useDeleteFitness, useSaveFitness } from '@/features/fitness/hooks';
import { volumeOf } from '@/features/fitness/stats';
import { INTENSITIES, MEASUREMENTS, MOODS, WORKOUT_TYPES, type EntryType, type FitnessEntry, type FitnessInput } from '@/features/fitness/types';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';

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

type Errors = Partial<Record<'duration' | 'calories' | 'distance' | 'measurementValue' | 'notes', string>>;

export default function FitnessEntryScreen() {
  const router = useRouter();
  const notify = useNotify();
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
  const [errors, setErrors] = useState<Errors>({});

  const save = useSaveFitness();
  const remove = useDeleteFitness();

  /** Edits a field and clears that field's error. */
  const edit = (key: keyof Errors, set: (value: string) => void) => (value: string) => {
    set(value);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function pickMeasurement(value: string) {
    setMeasurementType(value);
    const preset = MEASUREMENTS.find((m) => m.value === value);
    if (preset) setMeasurementUnit(preset.unit);
  }

  async function submit() {
    const input: FitnessInput = { date, type, notes: notes.trim() || undefined };
    const found: Errors = {};

    if (type === 'workout') {
      const numbers = { duration: toOptionalNumber(duration), caloriesBurned: toOptionalNumber(calories), distance: toOptionalNumber(distance) };
      if (numbers.duration === null) found.duration = 'Enter 0 or more.';
      if (numbers.caloriesBurned === null) found.calories = 'Enter 0 or more.';
      if (numbers.distance === null) found.distance = 'Enter 0 or more.';
      input.workoutType = workoutType;
      input.duration = numbers.duration == null ? undefined : Math.round(numbers.duration);
      input.caloriesBurned = numbers.caloriesBurned == null ? undefined : Math.round(numbers.caloriesBurned);
      input.distance = numbers.distance ?? undefined;
      input.intensity = intensity || undefined;
      input.mood = mood || undefined;
    } else if (type === 'measurement') {
      const value = toOptionalNumber(measurementValue);
      if (value === undefined) found.measurementValue = 'Enter the measurement value.';
      else if (value === null) found.measurementValue = 'Enter 0 or more.';
      else input.measurementValue = value;
      input.measurementType = measurementType;
      input.measurementUnit = measurementUnit.trim() || undefined;
    } else if (!notes.trim()) {
      found.notes = 'Describe your goal.';
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      haptics.warning();
      return;
    }

    try {
      await save.mutateAsync({ id: existing?.id, input });
      notify.success(existing ? 'Entry updated' : 'Entry added');
      router.back();
    } catch (e) {
      notify.error(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: 'Delete this entry?',
      message: "This can't be undone.",
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success('Entry deleted');
      router.back();
    } catch (e) {
      notify.error(e instanceof ApiError ? e.message : 'Could not delete. Try again.');
    }
  }

  const volume = volumeOf(existing?.exercises);

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit entry' : 'New entry' }} />

      {existing ? null : <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} accessibilityLabel="Entry type" />}

      {type === 'workout' ? (
        <>
          <Card style={{ gap: spacing.md }}>
            <SectionHeader title="Activity" />
            <ChipGroup>
              {WORKOUT_TYPES.map((name) => (
                <Chip key={name} label={name} selected={workoutType === name.toLowerCase()} accent="fitness" onPress={() => setWorkoutType(name.toLowerCase())} />
              ))}
            </ChipGroup>
          </Card>

          <Card style={{ gap: spacing.md }}>
            <SectionHeader title="Numbers" subtitle="All optional" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              <Input
                containerStyle={{ flexGrow: 1, flexBasis: 96 }}
                label="Duration (min)"
                value={duration}
                onChangeText={edit('duration', setDuration)}
                keyboardType="number-pad"
                placeholder="45"
                error={errors.duration}
              />
              <Input
                containerStyle={{ flexGrow: 1, flexBasis: 96 }}
                label="Calories (kcal)"
                value={calories}
                onChangeText={edit('calories', setCalories)}
                keyboardType="number-pad"
                placeholder="300"
                error={errors.calories}
              />
              <Input
                containerStyle={{ flexGrow: 1, flexBasis: 96 }}
                label="Distance (km)"
                value={distance}
                onChangeText={edit('distance', setDistance)}
                keyboardType="decimal-pad"
                placeholder="0"
                error={errors.distance}
              />
            </View>
          </Card>

          <Card style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" color="textSecondary">
                Intensity
              </Text>
              <ChipGroup>
                {INTENSITIES.map((value) => (
                  <Chip
                    key={value}
                    label={value[0].toUpperCase() + value.slice(1)}
                    selected={intensity === value}
                    accent="fitness"
                    onPress={() => setIntensity(intensity === value ? '' : value)}
                  />
                ))}
              </ChipGroup>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text variant="label" color="textSecondary">
                How did it feel?
              </Text>
              <ChipGroup>
                {MOODS.map((value) => (
                  <Chip key={value} label={value} selected={mood === value} accent="fitness" onPress={() => setMood(mood === value ? '' : value)} />
                ))}
              </ChipGroup>
            </View>
          </Card>

          {existing?.exercises && existing.exercises.length > 0 ? (
            <Card style={{ gap: spacing.sm }}>
              <SectionHeader title="Exercises" subtitle={volume > 0 ? `${Math.round(volume).toLocaleString()} kg total volume` : undefined} />
              {existing.exercises.map((ex, index) => (
                <View
                  key={`${ex.name}-${index}`}
                  accessible
                  style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs }}>
                  <Text variant="body" weight="semiBold" style={{ flex: 1 }}>
                    {ex.name}
                  </Text>
                  <Text variant="body" numeric color="textSecondary">
                    {ex.sets ?? '-'} × {ex.reps ?? '-'}
                    {ex.weight ? ` @ ${ex.weight} kg` : ''}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {type === 'measurement' ? (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color="textSecondary">
              Metric
            </Text>
            <ChipGroup>
              {MEASUREMENTS.map((item) => (
                <Chip key={item.value} label={item.label} selected={measurementType === item.value} accent="fitness" onPress={() => pickMeasurement(item.value)} />
              ))}
            </ChipGroup>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            <Input
              containerStyle={{ flexGrow: 2, flexBasis: 140 }}
              label="Value"
              value={measurementValue}
              onChangeText={edit('measurementValue', setMeasurementValue)}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus={!existing}
              error={errors.measurementValue}
            />
            <Input containerStyle={{ flexGrow: 1, flexBasis: 96 }} label="Unit" value={measurementUnit} onChangeText={setMeasurementUnit} autoCapitalize="none" autoCorrect={false} />
          </View>
        </Card>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <DateField label="Date" value={date} onChange={(next) => next && setDate(next)} maximumDate={new Date()} />

        <Input
          label={type === 'goal' ? 'Goal target' : 'Notes (optional)'}
          value={notes}
          onChangeText={edit('notes', setNotes)}
          multiline
          placeholder={type === 'goal' ? 'For example, bench 80 kg by December' : 'Rest intervals, form notes, comments'}
          autoCapitalize="sentences"
          error={errors.notes}
          style={{ minHeight: 72 }}
        />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button title={existing ? 'Save changes' : 'Add entry'} leftIcon="checkmark" onPress={submit} loading={save.isPending} />
        {existing ? <Button title="Delete entry" variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
      </View>
    </Screen>
  );
}
