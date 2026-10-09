import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import type { FitnessEntry } from '@/features/fitness/types';
import { modules } from '@/features/modules';
import { radius, spacing, useTheme } from '@/theme';

export function FitnessSummary({ entries }: { entries: FitnessEntry[] }) {
  const { colors } = useTheme();
  const fitnessColor = modules.fitness.color;

  const totalWorkouts = entries.length;
  const totalDuration = entries.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalCalories = entries.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0);

  const hours = Math.floor(totalDuration / 60);
  const mins = totalDuration % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <GlassCard glowColor={fitnessColor} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dotRow}>
          <View style={[styles.dot, { backgroundColor: fitnessColor }]} />
          <Text variant="caption" muted style={styles.sectionLabel}>
            TOTAL STATS
          </Text>
        </View>
        <Text variant="caption" style={{ color: fitnessColor, fontWeight: '600' }}>
          {totalWorkouts} {totalWorkouts === 1 ? 'Session' : 'Sessions'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: `${fitnessColor}12` }]}>
          <Text variant="caption" muted style={{ fontSize: 11 }}>
            Duration
          </Text>
          <Text variant="heading" style={[styles.statValue, { color: colors.text }]}>
            {durationText}
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: `${colors.success}12` }]}>
          <Text variant="caption" muted style={{ fontSize: 11 }}>
            Burned
          </Text>
          <Text variant="heading" style={[styles.statValue, { color: colors.text }]}>
            {totalCalories.toLocaleString()} <Text variant="caption" muted>kcal</Text>
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: `${modules.time.color}12` }]}>
          <Text variant="caption" muted style={{ fontSize: 11 }}>
            Avg Time
          </Text>
          <Text variant="heading" style={[styles.statValue, { color: colors.text }]}>
            {totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0} <Text variant="caption" muted>m</Text>
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    gap: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
