import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { FormCard, failureMessage } from '@/components/finance/form-parts';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteTimeLog, useSaveTimeLog } from '@/features/time/hooks';
import { DURATION_PRESETS, TIME_CATEGORIES, categoryColor, formatMinutes, type TimeLog } from '@/features/time/types';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing, tabularNums, useTheme } from '@/theme';

const CUSTOM = '__custom__';

function parseLog(raw?: string): TimeLog | null {
  try {
    return raw ? (JSON.parse(raw) as TimeLog) : null;
  } catch {
    return null;
  }
}

export default function TimeLogScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ log?: string }>();
  const existing = useMemo(() => parseLog(params.log), [params.log]);

  const knownCategory = !existing?.category || TIME_CATEGORIES.includes(existing.category);

  const [activity, setActivity] = useState(existing?.activity ?? '');
  const [category, setCategory] = useState(existing?.category ? (knownCategory ? existing.category : CUSTOM) : '');
  const [customCategory, setCustomCategory] = useState(existing?.category && !knownCategory ? existing.category : '');
  const [duration, setDuration] = useState(existing ? String(existing.duration) : '');
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? toIsoDay(new Date()));
  const [score, setScore] = useState<number | null>(existing?.productivityScore ?? null);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [submitted, setSubmitted] = useState(false);

  const durationRef = useRef<TextInput>(null);
  const save = useSaveTimeLog();
  const remove = useDeleteTimeLog();

  const finalCategory = category === CUSTOM ? customCategory.trim() : category;
  const minutes = Number.parseInt(duration, 10);
  const hasMinutes = Number.isFinite(minutes) && minutes > 0;
  const activityError = activity.trim() ? null : 'What did you do?';
  const durationError = hasMinutes ? null : 'Enter how many minutes it took.';

  async function submit() {
    setSubmitted(true);
    if (activityError || durationError) {
      haptics.warning();
      return;
    }

    try {
      await save.mutateAsync({
        id: existing?.id,
        input: {
          date,
          activity: activity.trim(),
          category: finalCategory || undefined,
          duration: minutes,
          description: description.trim() || undefined,
          productivityScore: score ?? undefined,
        },
      });
      notify.success(existing ? 'Time log updated' : 'Time log added');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not save. Try again.'));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: 'Delete this time log?',
      message: existing.activity,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success('Time log deleted');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not delete. Try again.'));
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit time log' : 'Add time log' }} />

      <FormCard>
        <Input
          label="Activity"
          value={activity}
          onChangeText={setActivity}
          placeholder="e.g. Deep work, learning Rust, client call"
          autoFocus={!existing}
          autoCapitalize="sentences"
          returnKeyType="next"
          error={submitted ? activityError : null}
          onSubmitEditing={() => durationRef.current?.focus()}
        />
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textSecondary">
            Category
          </Text>
          <ChipGroup>
            {TIME_CATEGORIES.map((name) => (
              <Chip key={name} label={name} selected={category === name} color={categoryColor(name)} onPress={() => setCategory(category === name ? '' : name)} />
            ))}
            <Chip label="Custom" icon="create-outline" accent="time" selected={category === CUSTOM} onPress={() => setCategory(CUSTOM)} />
          </ChipGroup>
          {category === CUSTOM ? (
            <Input label="Category name" value={customCategory} onChangeText={setCustomCategory} placeholder="e.g. Side project" autoCapitalize="words" returnKeyType="done" />
          ) : null}
        </View>
      </FormCard>

      <FormCard title="Duration" icon="timer-outline">
        <Input
          ref={durationRef}
          label="Minutes"
          value={duration}
          onChangeText={(text) => setDuration(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="60"
          returnKeyType="done"
          style={{ fontVariant: tabularNums }}
          helper={hasMinutes ? `That is ${formatMinutes(minutes)}.` : undefined}
          error={submitted ? durationError : null}
        />
        <ChipGroup>
          {DURATION_PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={preset >= 60 ? `${preset / 60}h` : `${preset}m`}
              accent="time"
              selected={duration === String(preset)}
              onPress={() => setDuration(String(preset))}
              accessibilityHint={`Sets the duration to ${formatMinutes(preset)}`}
            />
          ))}
        </ChipGroup>
      </FormCard>

      <FormCard title="Productivity rating (optional)" icon="sparkles-outline">
        <ChipGroup>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => {
            const tone = value <= 4 ? colors.error : value <= 7 ? colors.warning : colors.success;
            return (
              <Chip
                key={value}
                label={String(value)}
                color={tone}
                selected={score === value}
                onPress={() => setScore(score === value ? null : value)}
                accessibilityHint={`Rate this ${value} out of 10`}
              />
            );
          })}
        </ChipGroup>
        <Text variant="caption" color="textSecondary">
          1 is a low-focus session, 10 is your best. Tap again to clear.
        </Text>
      </FormCard>

      <FormCard>
        <DateField label="Date" value={date} onChange={(next) => next && setDate(next)} maximumDate={new Date()} />
        <Input
          label="Notes (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          autoCapitalize="sentences"
          placeholder="What did you achieve? Any blockers?"
          style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </FormCard>

      <Button title={existing ? 'Save changes' : 'Add time log'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete time log" variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
