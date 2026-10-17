import { View } from 'react-native';

import { SectionHeader } from '@/components/ui/section-header';
import { StatTile } from '@/components/viz/stat-tile';
import type { FitnessEntry } from '@/features/fitness/types';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

/** Tiles share a row two by two on a phone and wrap to one column when the text is large. */
const TILE_BASIS = 140;

/** Totals across a set of workouts: sessions, time, calories and average session length. */
export function FitnessSummary({ entries }: { entries: FitnessEntry[] }) {
  const { t } = useTranslation('fitness');

  const totalWorkouts = entries.length;
  const totalDuration = entries.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalCalories = entries.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0);
  const average = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

  const durationText = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? t('summary.hoursMinutes', { hours, minutes: mins }) : t('summary.minutesOnly', { minutes: mins });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={t('summary.title')} subtitle={t('summary.sessions', { count: totalWorkouts })} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <View style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
          <StatTile label={t('summary.sessionsLabel')} icon="barbell-outline" accent="fitness" value={totalWorkouts} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
          <StatTile label={t('summary.duration')} icon="time-outline" accent="fitness" value={totalDuration} format={durationText} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
          <StatTile label={t('summary.burnedKcal')} icon="flame-outline" accent="fitness" value={totalCalories} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: TILE_BASIS }}>
          <StatTile label={t('summary.averageSession')} icon="speedometer-outline" accent="fitness" value={average} format={(n) => t('units.min', { value: n })} />
        </View>
      </View>
    </View>
  );
}
