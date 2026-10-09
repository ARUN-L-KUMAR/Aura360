import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { useDeleteFitnessEntry } from '@/features/fitness/hooks';
import { workoutTitle, type FitnessEntry } from '@/features/fitness/types';
import { modules } from '@/features/modules';
import { formatDay } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

export function WorkoutCard({ entry }: { entry: FitnessEntry }) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const router = useRouter();
  const deleteMutation = useDeleteFitnessEntry();
  const fitnessColor = modules.fitness.color;

  const exercises = entry.exercises ?? [];
  const title = workoutTitle(entry);

  const confirmDelete = () => {
    Alert.alert('Delete Workout', 'Are you sure you want to delete this workout entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(entry.id),
      },
    ]);
  };

  const openEdit = () => {
    router.push({
      pathname: '/fitness/workout' as any,
      params: { entry: JSON.stringify(entry) },
    });
  };

  return (
    <GlassCard style={styles.card}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: `${fitnessColor}18` },
              ]}>
              <Ionicons name="barbell-outline" size={13} color={fitnessColor} />
              <Text variant="caption" style={{ color: fitnessColor, fontWeight: '700' }}>
                {(entry.workoutType || entry.type).toUpperCase()}
              </Text>
            </View>

            {entry.intensity && (
              <View
                style={[
                  styles.intensityBadge,
                  {
                    backgroundColor:
                      entry.intensity === 'high' || entry.intensity === 'extreme'
                        ? `${colors.danger}18`
                        : `${colors.accent}`,
                  },
                ]}>
                <Text
                  variant="caption"
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color:
                      entry.intensity === 'high' || entry.intensity === 'extreme'
                        ? colors.danger
                        : colors.textMuted,
                  }}>
                  {String(entry.intensity).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text variant="heading" style={{ fontSize: 17, fontWeight: '700' }}>
            {title}
          </Text>
          <Text variant="caption" muted>
            {formatDay(entry.date)}
          </Text>
        </View>

        {/* Action icons */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit workout"
            onPress={openEdit}
            hitSlop={8}
            style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={17} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete workout"
            onPress={confirmDelete}
            hitSlop={8}
            style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        {entry.duration ? (
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" style={{ fontWeight: '600' }}>
              {entry.duration} mins
            </Text>
          </View>
        ) : null}

        {entry.caloriesBurned ? (
          <View style={styles.metricItem}>
            <Ionicons name="flame-outline" size={14} color={colors.warning} />
            <Text variant="caption" style={{ fontWeight: '600' }}>
              {entry.caloriesBurned} kcal
            </Text>
          </View>
        ) : null}

        {exercises.length > 0 ? (
          <View style={styles.metricItem}>
            <Ionicons name="list-outline" size={14} color={modules.time.color} />
            <Text variant="caption" style={{ fontWeight: '600' }}>
              {exercises.length} {exercises.length === 1 ? 'Exercise' : 'Exercises'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Exercises List */}
      {exercises.length > 0 && (
        <View style={[styles.exercisesBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }]}>
          {exercises.map((ex, idx) => (
            <View key={idx} style={styles.exerciseRow}>
              <View style={[styles.exBullet, { backgroundColor: fitnessColor }]} />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text variant="caption" muted style={{ fontWeight: '600' }}>
                {ex.sets ? `${ex.sets} sets` : ''}
                {ex.reps ? ` × ${ex.reps} reps` : ''}
                {ex.weight ? ` @ ${ex.weight}kg` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {entry.notes && (
        <Text variant="caption" muted style={{ fontStyle: 'italic', fontSize: 12 }}>
          {`"${entry.notes}"`}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md + 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  intensityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    padding: 6,
    borderRadius: radius.pill,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exercisesBox: {
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
