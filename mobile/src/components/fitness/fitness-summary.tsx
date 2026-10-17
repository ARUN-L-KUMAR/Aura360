import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import type { FitnessEntry } from '@/features/fitness/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

type TileProps = { label: string; value: string; unit?: string; background: string; foreground: string };

function Tile({ label, value, unit, background, foreground }: TileProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      style={{ flexGrow: 1, flexBasis: 96, minWidth: 96, gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: background }}>
      <Text variant="caption" style={{ color: foreground }}>
        {label}
      </Text>
      <Text variant="title" numeric style={{ color: colors.text }}>
        {value}
        {unit ? (
          <Text variant="caption" color="textSecondary">
            {` ${unit}`}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

/** Totals across a set of workouts: sessions, time, calories and average session length. */
export function FitnessSummary({ entries }: { entries: FitnessEntry[] }) {
  const { accent, colors } = useTheme();
  const { t } = useTranslation('fitness');
  const fitness = accent('fitness');
  const time = accent('time');

  const totalWorkouts = entries.length;
  const totalDuration = entries.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalCalories = entries.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0);

  const hours = Math.floor(totalDuration / 60);
  const mins = totalDuration % 60;
  const durationText = hours > 0 ? t('summary.hoursMinutes', { hours, minutes: mins }) : t('summary.minutesOnly', { minutes: mins });
  const average = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

  return (
    <Card variant="tinted" accent="fitness" style={{ gap: spacing.md }}>
      <SectionHeader title={t('summary.title')} subtitle={t('summary.sessions', { count: totalWorkouts })} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Tile label={t('summary.duration')} value={durationText} background={colors.card} foreground={fitness.text} />
        <Tile label={t('summary.burned')} value={totalCalories.toLocaleString(getDeviceLocale())} unit={t('units.kcalUnit')} background={colors.card} foreground={colors.successText} />
        <Tile label={t('summary.averageSession')} value={String(average)} unit={t('units.minUnit')} background={colors.card} foreground={time.text} />
      </View>
    </Card>
  );
}
