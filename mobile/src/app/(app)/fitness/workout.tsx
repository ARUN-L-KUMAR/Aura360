import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useCreateFitnessEntry, useUpdateFitnessEntry } from '@/features/fitness/hooks';
import type { Exercise, FitnessEntry, WorkoutIntensity } from '@/features/fitness/types';
import { modules } from '@/features/modules';
import { todayIso } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

const TYPES = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'mobility', label: 'Mobility' },
];

const INTENSITIES: { value: WorkoutIntensity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
  { value: 'extreme', label: 'Max' },
];

export default function WorkoutModalScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ entry?: string }>();
  const fitnessColor = modules.fitness.color;

  const initialEntry: FitnessEntry | null = params.entry ? JSON.parse(params.entry) : null;
  const isEditing = Boolean(initialEntry);

  const [date, setDate] = useState(initialEntry?.date ?? todayIso());
  // The server's `type` is workout | measurement | goal. What kind of workout it is (strength, cardio…)
  // is `workoutType`, and the name the user typed is kept in `metadata.name`.
  const [workoutType, setWorkoutType] = useState(typeof initialEntry?.metadata?.name === 'string' ? initialEntry.metadata.name : '');
  const [type, setType] = useState(initialEntry?.workoutType && TYPES.some((t) => t.value === initialEntry.workoutType) ? initialEntry.workoutType : 'strength');
  const [duration, setDuration] = useState(initialEntry?.duration ? String(initialEntry.duration) : '45');
  const [calories, setCalories] = useState(initialEntry?.caloriesBurned ? String(initialEntry.caloriesBurned) : '');
  const [intensity, setIntensity] = useState<WorkoutIntensity>((initialEntry?.intensity as WorkoutIntensity) ?? 'medium');
  const [notes, setNotes] = useState(initialEntry?.notes ?? '');
  const [exercises, setExercises] = useState<Exercise[]>(
    initialEntry?.exercises && initialEntry.exercises.length > 0
      ? initialEntry.exercises
      : [{ name: '', sets: 3, reps: 10, weight: 0 }]
  );
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateFitnessEntry();
  const updateMutation = useUpdateFitnessEntry();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const addExercise = () => {
    setExercises((prev) => [...prev, { name: '', sets: 3, reps: 10, weight: 0 }]);
  };

  const updateExercise = (index: number, patch: Partial<Exercise>) => {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!date) return setError('Please choose a date.');
    const durationNum = duration.trim() ? Number.parseInt(duration, 10) : undefined;
    const caloriesNum = calories.trim() ? Number.parseInt(calories, 10) : undefined;

    // Filter exercises with names
    const validExercises = exercises
      .filter((e) => e.name.trim().length > 0)
      .map((e) => ({
        name: e.name.trim(),
        sets: Number(e.sets) || undefined,
        reps: Number(e.reps) || undefined,
        weight: Number(e.weight) || undefined,
      }));

    setError(null);

    try {
      if (isEditing && initialEntry) {
        await updateMutation.mutateAsync({
          id: initialEntry.id,
          date,
          type: 'workout',
          workoutType: type,
          metadata: { ...(initialEntry.metadata ?? {}), name: workoutType.trim() || undefined },
          duration: durationNum,
          caloriesBurned: caloriesNum,
          intensity,
          exercises: validExercises,
          notes: notes.trim() || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          date,
          type: 'workout',
          workoutType: type,
          metadata: workoutType.trim() ? { name: workoutType.trim() } : undefined,
          duration: durationNum,
          caloriesBurned: caloriesNum,
          intensity,
          exercises: validExercises,
          notes: notes.trim() || undefined,
        });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save workout.');
    }
  };

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: isEditing ? 'Edit Workout' : 'Log Workout' }} />

      <DateField label="Date" value={date} onChange={setDate} />

      <Input
        label="Workout Name / Focus"
        placeholder="e.g. Chest & Triceps, Leg Day, 5K Run"
        value={workoutType}
        onChangeText={setWorkoutType}
      />

      <View style={{ gap: spacing.xs }}>
        <Text variant="caption" muted>
          Type
        </Text>
        <Segmented options={TYPES} value={type} onChange={setType} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Duration (mins)"
            keyboardType="number-pad"
            placeholder="45"
            value={duration}
            onChangeText={setDuration}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Calories (kcal)"
            keyboardType="number-pad"
            placeholder="350"
            value={calories}
            onChangeText={setCalories}
          />
        </View>
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text variant="caption" muted>
          Intensity
        </Text>
        <Segmented options={INTENSITIES} value={intensity} onChange={setIntensity} />
      </View>

      {/* Exercises Section */}
      <Card style={{ gap: spacing.md }}>
        <View style={styles.sectionHeader}>
          <Text variant="heading" style={{ fontSize: 16 }}>
            Exercises
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={addExercise}
            hitSlop={8}
            style={({ pressed }) => [
              styles.addExBtn,
              { backgroundColor: `${fitnessColor}18`, opacity: pressed ? 0.75 : 1 },
            ]}>
            <Ionicons name="add" size={16} color={fitnessColor} />
            <Text variant="caption" style={{ color: fitnessColor, fontWeight: '700' }}>
              Add Exercise
            </Text>
          </Pressable>
        </View>

        {exercises.map((ex, index) => (
          <View key={index} style={styles.exerciseCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={`Exercise ${index + 1}`}
                  placeholder="e.g. Barbell Bench Press"
                  value={ex.name}
                  onChangeText={(val) => updateExercise(index, { name: val })}
                />
              </View>
              {exercises.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove exercise"
                  onPress={() => removeExercise(index)}
                  hitSlop={8}
                  style={{ paddingTop: 18 }}>
                  <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
                </Pressable>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Sets"
                  keyboardType="number-pad"
                  placeholder="3"
                  value={ex.sets ? String(ex.sets) : ''}
                  onChangeText={(val) => updateExercise(index, { sets: Number.parseInt(val, 10) || 0 })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Reps"
                  keyboardType="number-pad"
                  placeholder="10"
                  value={ex.reps ? String(ex.reps) : ''}
                  onChangeText={(val) => updateExercise(index, { reps: Number.parseInt(val, 10) || 0 })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Weight (kg)"
                  keyboardType="decimal-pad"
                  placeholder="60"
                  value={ex.weight ? String(ex.weight) : ''}
                  onChangeText={(val) => updateExercise(index, { weight: Number.parseFloat(val) || 0 })}
                />
              </View>
            </View>
          </View>
        ))}
      </Card>

      <Input
        label="Notes"
        placeholder="How did the session feel? Any PRs?"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      {error && <Text color="danger">{error}</Text>}

      <Button
        title={isEditing ? 'Save Changes' : 'Log Workout'}
        onPress={handleSave}
        loading={isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  exerciseCard: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
});
