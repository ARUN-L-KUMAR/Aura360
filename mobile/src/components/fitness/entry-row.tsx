import { useRouter } from 'expo-router';
import { memo } from 'react';

import { ListItem } from '@/components/ui/list-item';
import { volumeOf } from '@/features/fitness/stats';
import type { FitnessEntry } from '@/features/fitness/types';
import { formatDay } from '@/lib/format';

export function openEntry(router: ReturnType<typeof useRouter>, entry?: FitnessEntry) {
  router.push({ pathname: '/fitness/entry', params: entry ? { entry: JSON.stringify(entry) } : {} });
}

const sentence = (text: string) => (text ? text[0].toUpperCase() + text.slice(1) : text);

function describe(entry: FitnessEntry) {
  if (entry.type === 'measurement') {
    const value = entry.measurementValue === null ? '' : `${Number(entry.measurementValue)}${entry.measurementUnit ? ` ${entry.measurementUnit}` : ''}`;
    return { title: sentence((entry.measurementType ?? 'measurement').replace('_', ' ')), detail: value };
  }
  if (entry.type === 'goal') {
    return { title: 'Goal', detail: entry.notes ?? '' };
  }
  const exerciseNames = entry.exercises?.map((ex) => ex.name).join(' · ');
  const volume = volumeOf(entry.exercises);
  const parts = [
    entry.duration ? `${entry.duration} min` : null,
    entry.caloriesBurned ? `${entry.caloriesBurned} kcal` : null,
    volume > 0 ? `${Math.round(volume).toLocaleString()} kg` : null,
    entry.distance ? `${Number(entry.distance)} km` : null,
  ].filter(Boolean);
  return {
    title: entry.workoutType ? `${sentence(entry.workoutType)} workout` : 'Workout',
    detail: [parts.join(' · '), exerciseNames].filter(Boolean).join('\n'),
  };
}

const ICON = { workout: 'barbell-outline', measurement: 'scale-outline', goal: 'flag-outline' } as const;

/** A measurement, goal or workout as a tappable list row that opens the entry form. */
export const EntryRow = memo(function EntryRow({ entry, showDate = true, divider }: { entry: FitnessEntry; showDate?: boolean; divider?: boolean }) {
  const router = useRouter();
  const { title, detail } = describe(entry);
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
      accessibilityHint="Opens the entry to edit"
      onPress={() => openEntry(router, entry)}
    />
  );
});
