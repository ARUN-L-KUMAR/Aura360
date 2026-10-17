import type { TFunction } from 'i18next';
import { useRouter } from 'expo-router';
import { memo } from 'react';

import { ListItem } from '@/components/ui/list-item';
import { volumeOf } from '@/features/fitness/stats';
import { measurementLabel, workoutTypeLabel, type FitnessEntry } from '@/features/fitness/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { formatDay } from '@/lib/format';

export function openEntry(router: ReturnType<typeof useRouter>, entry?: FitnessEntry) {
  router.push({ pathname: '/fitness/entry', params: entry ? { entry: JSON.stringify(entry) } : {} });
}

function describe(entry: FitnessEntry, t: TFunction<'fitness'>) {
  if (entry.type === 'measurement') {
    const value = entry.measurementValue === null ? '' : `${Number(entry.measurementValue)}${entry.measurementUnit ? ` ${entry.measurementUnit}` : ''}`;
    return { title: measurementLabel(entry.measurementType ?? 'measurement'), detail: value };
  }
  if (entry.type === 'goal') {
    return { title: t('entry.goal'), detail: entry.notes ?? '' };
  }
  const exerciseNames = entry.exercises?.map((ex) => ex.name).join(' · ');
  const volume = volumeOf(entry.exercises);
  const parts = [
    entry.duration ? t('units.min', { value: entry.duration }) : null,
    entry.caloriesBurned ? t('units.kcal', { value: entry.caloriesBurned }) : null,
    volume > 0 ? t('units.kg', { value: Math.round(volume).toLocaleString(getDeviceLocale()) }) : null,
    entry.distance ? t('units.km', { value: Number(entry.distance) }) : null,
  ].filter(Boolean);
  return {
    title: entry.workoutType ? t('workoutTitle', { kind: workoutTypeLabel(entry.workoutType) }) : t('workoutTitleGeneric'),
    detail: [parts.join(' · '), exerciseNames].filter(Boolean).join('\n'),
  };
}

const ICON = { workout: 'barbell-outline', measurement: 'scale-outline', goal: 'flag-outline' } as const;

/** A measurement, goal or workout as a tappable list row that opens the entry form. */
export const EntryRow = memo(function EntryRow({ entry, showDate = true, divider }: { entry: FitnessEntry; showDate?: boolean; divider?: boolean }) {
  const router = useRouter();
  const { t } = useTranslation('fitness');
  const { title, detail } = describe(entry, t);
  const icon = ICON[entry.type as keyof typeof ICON] ?? 'barbell-outline';

  return (
    <ListItem
      icon={icon}
      accent="fitness"
      title={title}
      subtitle={detail || undefined}
      meta={showDate ? formatDay(entry.date) : undefined}
      divider={divider}
      accessibilityLabel={[title, detail.replace('\n', ', '), formatDay(entry.date)].filter(Boolean).join(', ')}
      accessibilityHint={t('entry.openHint')}
      onPress={() => openEntry(router, entry)}
    />
  );
});
