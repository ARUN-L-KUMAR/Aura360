import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { volumeOf } from '@/features/fitness/stats';
import type { FitnessEntry } from '@/features/fitness/types';
import { formatDay } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export function openEntry(router: ReturnType<typeof useRouter>, entry?: FitnessEntry) {
  router.push({ pathname: '/fitness/entry', params: entry ? { entry: JSON.stringify(entry) } : {} });
}

function describe(entry: FitnessEntry) {
  if (entry.type === 'measurement') {
    const value = entry.measurementValue === null ? '' : `${Number(entry.measurementValue)}${entry.measurementUnit ? ` ${entry.measurementUnit}` : ''}`;
    return { title: (entry.measurementType ?? 'Measurement').replace('_', ' '), detail: value };
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
    title: entry.workoutType ? `${entry.workoutType[0].toUpperCase()}${entry.workoutType.slice(1)} workout` : 'Workout',
    detail: [parts.join(' · '), exerciseNames].filter(Boolean).join('\n'),
  };
}

const ICON = { workout: 'barbell-outline', measurement: 'scale-outline', goal: 'flag-outline' } as const;

export function EntryRow({ entry, showDate = true }: { entry: FitnessEntry; showDate?: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { title, detail } = describe(entry);
  const icon = ICON[entry.type as keyof typeof ICON] ?? 'barbell-outline';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatDay(entry.date)}`}
      onPress={() => openEntry(router, entry)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: `${moduleColors.fitness}22`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={moduleColors.fitness} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ textTransform: 'capitalize' }} numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text variant="caption" muted numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      {showDate ? (
        <Text variant="caption" color={colors.textMuted}>
          {formatDay(entry.date)}
        </Text>
      ) : null}
    </Pressable>
  );
}
