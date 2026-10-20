import { View } from 'react-native';

import { Heading, MetricCard, MetricCell, MetricGrid } from '@/components/fitness/section-kit';
import type { FitnessEntry } from '@/features/fitness/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { spacing } from '@/theme';

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
      <Heading title={t('summary.title')} subtitle={t('summary.sessions', { count: totalWorkouts })} />
      <MetricGrid>
        <MetricCell>
          <MetricCard label={t('summary.sessionsLabel')} icon="barbell-outline" value={totalWorkouts} />
        </MetricCell>
        <MetricCell>
          <MetricCard label={t('summary.duration')} icon="time-outline" value={totalDuration} format={durationText} />
        </MetricCell>
        <MetricCell>
          <MetricCard label={t('summary.burnedKcal')} icon="flame-outline" value={totalCalories} format={(n) => Math.round(n).toLocaleString(getDeviceLocale())} />
        </MetricCell>
        <MetricCell>
          <MetricCard label={t('summary.averageSession')} icon="speedometer-outline" value={average} format={(n) => t('units.min', { value: n })} />
        </MetricCell>
      </MetricGrid>
    </View>
  );
}
