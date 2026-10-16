import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { useListMotion } from '@/components/ui/motion';
import { Text } from '@/components/ui/text';
import { useDeleteFitnessEntry } from '@/features/fitness/hooks';
import { workoutTitle, type FitnessEntry } from '@/features/fitness/types';
import { formatDay } from '@/lib/format';
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme } from '@/theme';

type Props = { entry: FitnessEntry; /** Position in the list, used to stagger the entrance animation. */ index?: number };

/** A logged workout: type and intensity tags, metrics, exercise list, notes, and edit / delete actions. */
export const WorkoutCard = memo(function WorkoutCard({ entry, index = 0 }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const notify = useNotify();
  const deleteMutation = useDeleteFitnessEntry();
  const motion = useListMotion(index);

  const exercises = entry.exercises ?? [];
  const title = workoutTitle(entry);
  const intensity = entry.intensity ? String(entry.intensity) : null;
  const kind = entry.workoutType || entry.type;

  const confirmDelete = async () => {
    const ok = await notify.confirm({
      title: 'Delete this workout?',
      message: `${title} on ${formatDay(entry.date)} will be removed. This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(entry.id);
      notify.success('Workout deleted');
    } catch (e) {
      notify.error(e instanceof Error ? e : "Couldn't delete the workout. Try again.");
    }
  };

  const openEdit = () => {
    router.push({
      pathname: '/fitness/workout' as never,
      params: { entry: JSON.stringify(entry) },
    });
  };

  return (
    <Animated.View {...motion}>
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
              <Tag label={kind[0].toUpperCase() + kind.slice(1)} icon="barbell-outline" accent="fitness" />
              {intensity ? (
                <Tag
                  label={`${intensity[0].toUpperCase()}${intensity.slice(1)} intensity`}
                  icon={intensity === 'high' || intensity === 'extreme' ? 'flame' : undefined}
                  tone={intensity === 'high' || intensity === 'extreme' ? 'accent' : 'neutral'}
                  accent={intensity === 'high' || intensity === 'extreme' ? 'fitness' : undefined}
                />
              ) : null}
            </View>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="caption" color="textSecondary">
              {formatDay(entry.date)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton icon="pencil-outline" size="sm" accessibilityLabel={`Edit ${title}`} onPress={openEdit} />
            <IconButton
              icon="trash-outline"
              size="sm"
              destructive
              accessibilityLabel={`Delete ${title}`}
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
            />
          </View>
        </View>

        {entry.duration || entry.caloriesBurned || exercises.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.lg, rowGap: spacing.xs }}>
            {entry.duration ? <Metric icon="time-outline" text={`${entry.duration} min`} /> : null}
            {entry.caloriesBurned ? <Metric icon="flame-outline" text={`${entry.caloriesBurned} kcal`} /> : null}
            {exercises.length > 0 ? <Metric icon="list-outline" text={`${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'}`} /> : null}
          </View>
        ) : null}

        {exercises.length > 0 ? (
          <View style={{ backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }}>
            {exercises.map((ex, idx) => (
              <View key={`${ex.name}-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                <Text variant="label" numberOfLines={2} style={{ flex: 1 }}>
                  {ex.name}
                </Text>
                <Text variant="caption" numeric color="textSecondary" style={{ flexShrink: 1, textAlign: 'right' }}>
                  {[ex.sets ? `${ex.sets} sets` : null, ex.reps ? `${ex.reps} reps` : null].filter(Boolean).join(' × ')}
                  {ex.weight ? ` @ ${ex.weight} kg` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {entry.notes ? (
          <Text variant="caption" color="textSecondary">
            {`"${entry.notes}"`}
          </Text>
        ) : null}
      </Card>
    </Animated.View>
  );
});

function Metric({ icon, text }: { icon: 'time-outline' | 'flame-outline' | 'list-outline'; text: string }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={text} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text variant="caption" weight="semiBold" numeric>
        {text}
      </Text>
    </View>
  );
}
