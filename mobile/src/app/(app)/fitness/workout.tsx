import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Heading, IconTile, RingCard } from '@/components/fitness/section-kit';
import { DateField } from '@/components/ui/date-field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { useCreateFitnessEntry, useUpdateFitnessEntry } from '@/features/fitness/hooks';
import { volumeOf } from '@/features/fitness/stats';
import type { Exercise, FitnessEntry, WorkoutIntensity } from '@/features/fitness/types';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { useTranslation } from '@/i18n';
import { todayIso } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';



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
  const { t } = useTranslation('fitness');
  const errorMessage = useErrorMessage();
  const typeOptions = [
    { value: 'strength', label: t('workoutTypes.strength') },
    { value: 'cardio', label: t('workoutTypes.cardio') },
    { value: 'hiit', label: t('workoutTypes.hiit') },
    { value: 'mobility', label: t('workoutTypes.mobility') },
  ];
  const intensityOptions: { value: WorkoutIntensity; label: string }[] = [
    { value: 'low', label: t('intensity.low') },
    { value: 'medium', label: t('intensity.medium') },
    { value: 'high', label: t('intensity.high') },
    { value: 'extreme', label: t('intensity.extremeShort') },
  ];
  const params = useLocalSearchParams<{ entry?: string }>();

  const initialEntry = useMemo(() => parseEntry(params.entry), [params.entry]);
  const isEditing = Boolean(initialEntry);

  const [date, setDate] = useState(initialEntry?.date ?? todayIso());
  // The server's `type` is workout | measurement | goal. What kind of workout it is (strength, cardio…)
  // is `workoutType`, and the name the user typed is kept in `metadata.name`.
  const [workoutName, setWorkoutName] = useState(typeof initialEntry?.metadata?.name === 'string' ? initialEntry.metadata.name : '');
  const [type, setType] = useState(initialEntry?.workoutType && ['strength', 'cardio', 'hiit', 'mobility'].includes(initialEntry.workoutType) ? initialEntry.workoutType : 'strength');
  const [duration, setDuration] = useState(initialEntry?.duration ? String(initialEntry.duration) : '45');
  const [calories, setCalories] = useState(initialEntry?.caloriesBurned ? String(initialEntry.caloriesBurned) : '');
  const [intensity, setIntensity] = useState<WorkoutIntensity>((initialEntry?.intensity as WorkoutIntensity) ?? 'medium');
  const [notes, setNotes] = useState(initialEntry?.notes ?? '');
  const [exercises, setExercises] = useState<Exercise[]>(initialEntry?.exercises && initialEntry.exercises.length > 0 ? initialEntry.exercises : [blankExercise()]);
  const [errors, setErrors] = useState<Errors>({});

  const createMutation = useCreateFitnessEntry();
  const updateMutation = useUpdateFitnessEntry();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const namedExercises = exercises.filter((e) => e.name.trim().length > 0).length;
  const totalVolume = Math.round(volumeOf(exercises.filter((e) => e.name.trim().length > 0)));

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
    if (durationNum === null) found.duration = t('workout.errorMinutes');
    if (caloriesNum === null) found.calories = t('workout.errorKcal');
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
      notify.success(isEditing ? t('workout.updated') : t('workout.logged'));
      if (!isEditing) analytics.track('fitness_entry_logged');
      router.back();
    } catch (e) {
      notify.error(errorMessage(e, t('workout.saveFailed')));
    }
  };

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: isEditing ? t('workout.editTitle') : t('workout.newTitle') }} />

      <RingCard
        accessible
        accessibilityLabel={t('workout.summarySpoken', { count: namedExercises, volume: totalVolume })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <IconTile icon="barbell-outline" />
        <View style={{ flex: 1, gap: spacing.xs / 2 }}>
          <Text variant="title" weight="bold" numberOfLines={2}>
            {workoutName.trim() || (isEditing ? t('workout.editTitle') : t('workout.newTitle'))}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('workout.summaryExercises', { count: namedExercises })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AnimatedNumber value={totalVolume} variant="headline" />
          <Text variant="overline" color="textMuted">
            {t('workout.summaryVolume')}
          </Text>
        </View>
      </RingCard>

      <RingCard style={{ gap: spacing.md }}>
        <DateField label={t('entry.date')} value={date} onChange={setDate} />
        <Input
          label={t('train.workoutName')}
          placeholder={t('workout.namePlaceholder')}
          value={workoutName}
          onChangeText={setWorkoutName}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
      </RingCard>

      <RingCard style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textMuted">
            {t('workout.type')}
          </Text>
          <Segmented options={typeOptions} value={type} onChange={setType} accessibilityLabel={t('workout.typeLabel')} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textMuted">
            {t('entry.intensity')}
          </Text>
          <Segmented options={intensityOptions} value={intensity} onChange={setIntensity} accessibilityLabel={t('entry.intensity')} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <Input
            containerStyle={{ flexGrow: 1, flexBasis: 120 }}
            label={t('entry.duration')}
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
            label={t('entry.calories')}
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
      </RingCard>

      <RingCard style={{ gap: spacing.lg }}>
        <Heading title={t('entry.exercises')} count={exercises.length} />

        {exercises.map((ex, index) => (
          <View key={index} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <Input
                containerStyle={{ flex: 1 }}
                label={t('workout.exerciseN', { n: index + 1 })}
                placeholder={t('workout.exercisePlaceholder')}
                value={ex.name}
                onChangeText={(val) => updateExercise(index, { name: val })}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {exercises.length > 1 ? (
                <IconButton icon="trash-outline" destructive accessibilityLabel={t('workout.removeExercise', { n: index + 1 })} onPress={() => removeExercise(index)} style={{ marginBottom: spacing.xs }} />
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Input
                containerStyle={{ flex: 1 }}
                label={t('workout.sets')}
                keyboardType="number-pad"
                placeholder="3"
                value={ex.sets ? String(ex.sets) : ''}
                onChangeText={(val) => updateExercise(index, { sets: Number.parseInt(val, 10) || 0 })}
              />
              <Input
                containerStyle={{ flex: 1 }}
                label={t('stats.reps')}
                keyboardType="number-pad"
                placeholder="10"
                value={ex.reps ? String(ex.reps) : ''}
                onChangeText={(val) => updateExercise(index, { reps: Number.parseInt(val, 10) || 0 })}
              />
              <Input
                containerStyle={{ flex: 1 }}
                label={t('stats.weightKg')}
                keyboardType="decimal-pad"
                placeholder="60"
                value={ex.weight ? String(ex.weight) : ''}
                onChangeText={(val) => updateExercise(index, { weight: Number.parseFloat(val) || 0 })}
              />
            </View>
          </View>
        ))}

        <Button title={t('train.addExercise')} variant="secondary" leftIcon="add" haptic={false} onPress={addExercise} />
      </RingCard>

      <Input
        label={t('workout.notes')}
        placeholder={t('workout.notesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
        multiline
        autoCapitalize="sentences"
        style={{ minHeight: 72 }}
      />

      <Button title={isEditing ? t('actions.saveChanges') : t('workout.newTitle')} leftIcon="checkmark" onPress={handleSave} loading={isPending} />
    </Screen>
  );
}
