import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Heading, RingCard } from '@/components/fitness/section-kit';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useDeleteFitness, useSaveFitness } from '@/features/fitness/hooks';
import { volumeOf } from '@/features/fitness/stats';
import {
  INTENSITIES,
  MEASUREMENTS,
  MOODS,
  WORKOUT_TYPES,
  intensityLabel,
  measurementLabel,
  moodLabel,
  workoutTypeLabel,
  type EntryType,
  type FitnessEntry,
  type FitnessInput,
} from '@/features/fitness/types';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';


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
  const { t } = useTranslation('fitness');
  const errorMessage = useErrorMessage();
  const typeOptions: { value: EntryType; label: string }[] = [
    { value: 'workout', label: t('entry.typeWorkout') },
    { value: 'measurement', label: t('entry.typeMeasurement') },
    { value: 'goal', label: t('entry.typeGoal') },
  ];
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
      if (numbers.duration === null) found.duration = t('entry.errorNonNegative');
      if (numbers.caloriesBurned === null) found.calories = t('entry.errorNonNegative');
      if (numbers.distance === null) found.distance = t('entry.errorNonNegative');
      input.workoutType = workoutType;
      input.duration = numbers.duration == null ? undefined : Math.round(numbers.duration);
      input.caloriesBurned = numbers.caloriesBurned == null ? undefined : Math.round(numbers.caloriesBurned);
      input.distance = numbers.distance ?? undefined;
      input.intensity = intensity || undefined;
      input.mood = mood || undefined;
    } else if (type === 'measurement') {
      const value = toOptionalNumber(measurementValue);
      if (value === undefined) found.measurementValue = t('entry.errorMeasurementRequired');
      else if (value === null) found.measurementValue = t('entry.errorNonNegative');
      else input.measurementValue = value;
      input.measurementType = measurementType;
      input.measurementUnit = measurementUnit.trim() || undefined;
    } else if (!notes.trim()) {
      found.notes = t('entry.errorGoalRequired');
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      haptics.warning();
      return;
    }

    try {
      await save.mutateAsync({ id: existing?.id, input });
      notify.success(existing ? t('entry.updated') : t('entry.added'));
      if (!existing) analytics.track('fitness_entry_logged');
      router.back();
    } catch (e) {
      notify.error(errorMessage(e, t('entry.saveFailed')));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: t('entry.deleteTitle'),
      message: t('entry.deleteMessage'),
      confirmLabel: t('actions.delete'),
      cancelLabel: t('actions.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success(t('entry.deleted'));
      router.back();
    } catch (e) {
      notify.error(errorMessage(e, t('entry.deleteFailed')));
    }
  }

  const volume = volumeOf(existing?.exercises);

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? t('entry.editTitle') : t('entry.newTitle') }} />

      {existing ? null : <Segmented options={typeOptions} value={type} onChange={setType} accessibilityLabel={t('entry.typeLabel')} />}

      {type === 'workout' ? (
        <>
          <RingCard style={{ gap: spacing.md }}>
            <Heading title={t('entry.activity')} />
            <ChipGroup>
              {WORKOUT_TYPES.map((name) => (
                <Chip key={name} label={workoutTypeLabel(name)} selected={workoutType === name.toLowerCase()} accent="fitness" onPress={() => setWorkoutType(name.toLowerCase())} />
              ))}
            </ChipGroup>
          </RingCard>

          <RingCard style={{ gap: spacing.md }}>
            <Heading title={t('entry.numbers')} subtitle={t('entry.allOptional')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              <Input
                containerStyle={{ flexGrow: 1, flexBasis: 96 }}
                label={t('entry.duration')}
                value={duration}
                onChangeText={edit('duration', setDuration)}
                keyboardType="number-pad"
                placeholder="45"
                error={errors.duration}
              />
              <Input
                containerStyle={{ flexGrow: 1, flexBasis: 96 }}
                label={t('entry.calories')}
                value={calories}
                onChangeText={edit('calories', setCalories)}
                keyboardType="number-pad"
                placeholder="300"
                error={errors.calories}
              />
              <Input
                containerStyle={{ flexGrow: 1, flexBasis: 96 }}
                label={t('entry.distance')}
                value={distance}
                onChangeText={edit('distance', setDistance)}
                keyboardType="decimal-pad"
                placeholder="0"
                error={errors.distance}
              />
            </View>
          </RingCard>

          <RingCard style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text variant="overline" color="textMuted">
                {t('entry.intensity')}
              </Text>
              <ChipGroup>
                {INTENSITIES.map((value) => (
                  <Chip
                    key={value}
                    label={intensityLabel(value)}
                    selected={intensity === value}
                    accent="fitness"
                    onPress={() => setIntensity(intensity === value ? '' : value)}
                  />
                ))}
              </ChipGroup>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text variant="overline" color="textMuted">
                {t('entry.mood')}
              </Text>
              <ChipGroup>
                {MOODS.map((value) => (
                  <Chip key={value} label={moodLabel(value)} selected={mood === value} accent="fitness" onPress={() => setMood(mood === value ? '' : value)} />
                ))}
              </ChipGroup>
            </View>
          </RingCard>

          {existing?.exercises && existing.exercises.length > 0 ? (
            <RingCard style={{ gap: spacing.sm }}>
              <Heading title={t('entry.exercises')} subtitle={volume > 0 ? t('entry.totalVolume', { value: Math.round(volume).toLocaleString(getDeviceLocale()) }) : undefined} />
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
                    {ex.weight ? t('card.atWeight', { value: ex.weight }) : ''}
                  </Text>
                </View>
              ))}
            </RingCard>
          ) : null}
        </>
      ) : null}

      {type === 'measurement' ? (
        <RingCard style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="overline" color="textMuted">
              {t('entry.metric')}
            </Text>
            <ChipGroup>
              {MEASUREMENTS.map((item) => (
                <Chip key={item.value} label={measurementLabel(item.value)} selected={measurementType === item.value} accent="fitness" onPress={() => pickMeasurement(item.value)} />
              ))}
            </ChipGroup>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            <Input
              containerStyle={{ flexGrow: 2, flexBasis: 140 }}
              label={t('entry.value')}
              value={measurementValue}
              onChangeText={edit('measurementValue', setMeasurementValue)}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus={!existing}
              error={errors.measurementValue}
            />
            <Input containerStyle={{ flexGrow: 1, flexBasis: 96 }} label={t('entry.unit')} value={measurementUnit} onChangeText={setMeasurementUnit} autoCapitalize="none" autoCorrect={false} />
          </View>
        </RingCard>
      ) : null}

      <RingCard style={{ gap: spacing.md }}>
        <DateField label={t('entry.date')} value={date} onChange={(next) => next && setDate(next)} maximumDate={new Date()} />

        <Input
          label={type === 'goal' ? t('entry.goalTarget') : t('entry.notesOptional')}
          value={notes}
          onChangeText={edit('notes', setNotes)}
          multiline
          placeholder={type === 'goal' ? t('entry.goalPlaceholder') : t('entry.notesPlaceholder')}
          autoCapitalize="sentences"
          error={errors.notes}
          style={{ minHeight: 72 }}
        />
      </RingCard>

      <View style={{ gap: spacing.sm }}>
        <Button title={existing ? t('actions.saveChanges') : t('entry.add')} leftIcon="checkmark" onPress={submit} loading={save.isPending} />
        {existing ? <Button title={t('entry.deleteButton')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
      </View>
    </Screen>
  );
}
