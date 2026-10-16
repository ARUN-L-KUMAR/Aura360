import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useCreateFitnessEntry, useUpdateFitnessEntry } from '@/features/fitness/hooks';
import type { Exercise, FitnessEntry, WorkoutIntensity } from '@/features/fitness/types';
import { todayIso } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';

const TYPES = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'mobility', label: 'Mobility' },
];

const INTENSITIES: { value: WorkoutIntensity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'extreme', label: 'Max' },
];

const blankExercise = (): Exercise => ({ name: '', sets: 3, reps: 10, weight: 0 });

function parseEntry(raw?: string): FitnessEntry | null {
  try {
    return raw ? (JSON.parse(raw) as FitnessEntry) : null;
  } catch {
    return null;
  }
}

/** Whole number >= 0 from the field, undefined when empty, null when it is not a valid number. */
function toWholeNumber(text: string): number | undefined | null {
  if (!text.trim()) return undefined;
  if (!/^\d+$/.test(text.trim())) return null;
  return Number.parseInt(text, 10);
}

type Errors = Partial<Record<'duration' | 'calories', string>>;

export default function WorkoutModalScreen() {
  const router = useRouter();
  const notify = useNotify();
  const params = useLocalSearchParams<{ entry?: string }>();

  const initialEntry = useMemo(() => parseEntry(params.entry), [params.entry]);
  const isEditing = Boolean(initialEntry);

  const [date, setDate] = useState(initialEntry?.date ?? todayIso());
  // The server's `type` is workout | measurement | goal. What kind of workout it is (strength, cardio…)
  // is `workoutType`, and the name the user typed is kept in `metadata.name`.
  const [workoutName, setWorkoutName] = useState(typeof initialEntry?.metadata?.name === 'string' ? initialEntry.metadata.name : '');
  const [type, setType] = useState(initialEntry?.workoutType && TYPES.some((t) => t.value === initialEntry.workoutType) ? initialEntry.workoutType : 'strength');
  const [duration, setDuration] = useState(initialEntry?.duration ? String(initialEntry.duration) : '45');
  const [calories, setCalories] = useState(initialEntry?.caloriesBurned ? String(initialEntry.caloriesBurned) : '');
  const [intensity, setIntensity] = useState<WorkoutIntensity>((initialEntry?.intensity as WorkoutIntensity) ?? 'medium');
  const [notes, setNotes] = useState(initialEntry?.notes ?? '');
  const [exercises, setExercises] = useState<Exercise[]>(initialEntry?.exercises && initialEntry.exercises.length > 0 ? initialEntry.exercises : [blankExercise()]);
  const [errors, setErrors] = useState<Errors>({});

  const createMutation = useCreateFitnessEntry();
  const updateMutation = useUpdateFitnessEntry();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const addExercise = () => {
    haptics.tap();
    setExercises((prev) => [...prev, blankExercise()]);
  };

  const updateExercise = (index: number, patch: Partial<Exercise>) => {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  };

  const removeExercise = (index: number) => {
    haptics.tap();
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const durationNum = toWholeNumber(duration);
    const caloriesNum = toWholeNumber(calories);
    const found: Errors = {};
    if (durationNum === null) found.duration = 'Enter whole minutes.';
    if (caloriesNum === null) found.calories = 'Enter whole kcal.';
    setErrors(found);
    if (Object.keys(found).length > 0 || !date) {
      haptics.warning();
      return;
    }

    // Only exercises with a name are saved.
    const validExercises = exercises
      .filter((e) => e.name.trim().length > 0)
      .map((e) => ({
        name: e.name.trim(),
        sets: Number(e.sets) || undefined,
        reps: Number(e.reps) || undefined,
        weight: Number(e.weight) || undefined,
      }));

    try {
      if (isEditing && initialEntry) {
        await updateMutation.mutateAsync({
          id: initialEntry.id,
          date,
          type: 'workout',
          workoutType: type,
          metadata: { ...(initialEntry.metadata ?? {}), name: workoutName.trim() || undefined },
          duration: durationNum ?? undefined,
          caloriesBurned: caloriesNum ?? undefined,
          intensity,
          exercises: validExercises,
          notes: notes.trim() || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          date,
          type: 'workout',
          workoutType: type,
          metadata: workoutName.trim() ? { name: workoutName.trim() } : undefined,
          duration: durationNum ?? undefined,
          caloriesBurned: caloriesNum ?? undefined,
          intensity,
          exercises: validExercises,
          notes: notes.trim() || undefined,
        });
      }
      notify.success(isEditing ? 'Workout updated' : 'Workout logged');
      router.back();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Could not save the workout.');
    }
  };

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: isEditing ? 'Edit workout' : 'Log workout' }} />

      <Card style={{ gap: spacing.md }}>
        <DateField label="Date" value={date} onChange={setDate} />
        <Input
          label="Workout name"
          placeholder="For example, chest and triceps, leg day, 5K run"
          value={workoutName}
          onChangeText={setWorkoutName}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textSecondary">
            Type
          </Text>
          <Segmented options={TYPES} value={type} onChange={setType} accessibilityLabel="Workout type" />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textSecondary">
            Intensity
          </Text>
          <Segmented options={INTENSITIES} value={intensity} onChange={setIntensity} accessibilityLabel="Intensity" />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <Input
            containerStyle={{ flexGrow: 1, flexBasis: 120 }}
            label="Duration (min)"
            keyboardType="number-pad"
            placeholder="45"
            value={duration}
            onChangeText={(text) => {
              setDuration(text);
              if (errors.duration) setErrors((current) => ({ ...current, duration: undefined }));
            }}
            error={errors.duration}
          />
          <Input
            containerStyle={{ flexGrow: 1, flexBasis: 120 }}
            label="Calories (kcal)"
            keyboardType="number-pad"
            placeholder="350"
            value={calories}
            onChangeText={(text) => {
              setCalories(text);
              if (errors.calories) setErrors((current) => ({ ...current, calories: undefined }));
            }}
            error={errors.calories}
          />
        </View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <SectionHeader title="Exercises" count={exercises.length} />

        {exercises.map((ex, index) => (
          <View key={index} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <Input
                containerStyle={{ flex: 1 }}
                label={`Exercise ${index + 1}`}
                placeholder="For example, barbell bench press"
                value={ex.name}
                onChangeText={(val) => updateExercise(index, { name: val })}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {exercises.length > 1 ? (
                <IconButton icon="trash-outline" destructive accessibilityLabel={`Remove exercise ${index + 1}`} onPress={() => removeExercise(index)} style={{ marginBottom: spacing.xs }} />
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Input
                containerStyle={{ flex: 1 }}
                label="Sets"
                keyboardType="number-pad"
                placeholder="3"
                value={ex.sets ? String(ex.sets) : ''}
                onChangeText={(val) => updateExercise(index, { sets: Number.parseInt(val, 10) || 0 })}
              />
              <Input
                containerStyle={{ flex: 1 }}
                label="Reps"
                keyboardType="number-pad"
                placeholder="10"
                value={ex.reps ? String(ex.reps) : ''}
                onChangeText={(val) => updateExercise(index, { reps: Number.parseInt(val, 10) || 0 })}
              />
              <Input
                containerStyle={{ flex: 1 }}
                label="Weight (kg)"
                keyboardType="decimal-pad"
                placeholder="60"
                value={ex.weight ? String(ex.weight) : ''}
                onChangeText={(val) => updateExercise(index, { weight: Number.parseFloat(val) || 0 })}
              />
            </View>
          </View>
        ))}

        <Button title="Add exercise" variant="secondary" leftIcon="add" haptic={false} onPress={addExercise} />
      </Card>

      <Input
        label="Notes"
        placeholder="How did the session feel? Any personal bests?"
        value={notes}
        onChangeText={setNotes}
        multiline
        autoCapitalize="sentences"
        style={{ minHeight: 72 }}
      />

      <Button title={isEditing ? 'Save changes' : 'Log workout'} leftIcon="checkmark" onPress={handleSave} loading={isPending} />
    </Screen>
  );
}
