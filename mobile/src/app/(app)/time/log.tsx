import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { failureMessage } from '@/components/finance/failure-message';
import { FormCard } from '@/components/finance/form-parts';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteTimeLog, useSaveTimeLog } from '@/features/time/hooks';
import { DURATION_PRESETS, TIME_CATEGORIES, categoryColor, formatMinutes, timeCategoryLabel, type TimeLog } from '@/features/time/types';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
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
  const { t } = useTranslation('time');
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
  const activityError = activity.trim() ? null : t('form.activityNeeded');
  const durationError = hasMinutes ? null : t('form.durationNeeded');

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
      if (!existing) analytics.track('time_logged');
      notify.success(existing ? t('form.updated') : t('form.added'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.save')));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: t('form.deleteTitle'),
      message: existing.activity,
      confirmLabel: t('form.confirmDelete'),
      cancelLabel: t('form.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success(t('form.deleted'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.delete')));
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? t('form.titleEdit') : t('form.titleNew') }} />

      <FormCard>
        <Input
          label={t('form.activity')}
          value={activity}
          onChangeText={setActivity}
          placeholder={t('form.activityPlaceholder')}
          autoFocus={!existing}
          autoCapitalize="sentences"
          returnKeyType="next"
          error={submitted ? activityError : null}
          onSubmitEditing={() => durationRef.current?.focus()}
        />
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textSecondary" accessibilityRole="header">
            {t('form.category')}
          </Text>
          <ChipGroup>
            {TIME_CATEGORIES.map((name) => (
              <Chip key={name} label={timeCategoryLabel(name)} selected={category === name} color={categoryColor(name)} onPress={() => setCategory(category === name ? '' : name)} />
            ))}
            <Chip label={t('categories.custom')} icon="create-outline" accent="time" selected={category === CUSTOM} onPress={() => setCategory(CUSTOM)} />
          </ChipGroup>
          {category === CUSTOM ? (
            <Input
              label={t('form.customName')}
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder={t('form.customPlaceholder')}
              autoCapitalize="words"
              returnKeyType="done"
            />
          ) : null}
        </View>
      </FormCard>

      <FormCard title={t('form.durationTitle')} icon="timer-outline">
        <Input
          ref={durationRef}
          label={t('form.minutes')}
          value={duration}
          onChangeText={(text) => setDuration(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="60"
          returnKeyType="done"
          style={{ fontVariant: tabularNums }}
          helper={hasMinutes ? t('form.minutesHelper', { duration: formatMinutes(minutes) }) : undefined}
          error={submitted ? durationError : null}
        />
        <ChipGroup>
          {DURATION_PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={formatMinutes(preset)}
              accent="time"
              selected={duration === String(preset)}
              onPress={() => setDuration(String(preset))}
              accessibilityHint={t('form.presetHint', { duration: formatMinutes(preset) })}
            />
          ))}
        </ChipGroup>
      </FormCard>

      <FormCard title={t('form.ratingTitle')} icon="sparkles-outline">
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
                accessibilityHint={t('form.ratingHint', { value })}
              />
            );
          })}
        </ChipGroup>
        <Text variant="caption" color="textSecondary">
          {t('form.ratingHelp')}
        </Text>
      </FormCard>

      <FormCard>
        <DateField label={t('form.date')} value={date} onChange={(next) => next && setDate(next)} maximumDate={new Date()} />
        <Input
          label={t('form.notes')}
          value={description}
          onChangeText={setDescription}
          multiline
          autoCapitalize="sentences"
          placeholder={t('form.notesPlaceholder')}
          style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </FormCard>

      <Button title={existing ? t('form.saveChanges') : t('form.add')} onPress={submit} loading={save.isPending} />
      {existing ? <Button title={t('form.delete')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
