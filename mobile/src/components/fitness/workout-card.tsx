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
import { intensityLabel, workoutTitle, workoutTypeLabel, type FitnessEntry } from '@/features/fitness/types';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { useTranslation } from '@/i18n';
import { formatDay } from '@/lib/format';
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme } from '@/theme';

type Props = { entry: FitnessEntry; /** Position in the list, used to stagger the entrance animation. */ index?: number };

/** A logged workout: type and intensity tags, metrics, exercise list, notes, and edit / delete actions. */
export const WorkoutCard = memo(function WorkoutCard({ entry, index = 0 }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation('fitness');
  const router = useRouter();
  const notify = useNotify();
  const errorMessage = useErrorMessage();
  const deleteMutation = useDeleteFitnessEntry();
  const motion = useListMotion(index);

  const exercises = entry.exercises ?? [];
  const title = workoutTitle(entry);
  const intensity = entry.intensity ? String(entry.intensity) : null;
  const kind = entry.workoutType || entry.type;
  const hard = intensity === 'high' || intensity === 'extreme';

  const confirmDelete = async () => {
    const ok = await notify.confirm({
      title: t('card.deleteTitle'),
      message: t('card.deleteMessage', { title, date: formatDay(entry.date) }),
      confirmLabel: t('actions.delete'),
      cancelLabel: t('actions.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(entry.id);
      notify.success(t('card.deleted'));
    } catch (e) {
      notify.error(errorMessage(e, t('card.deleteFailed')));
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
              <Tag label={workoutTypeLabel(kind)} icon="barbell-outline" accent="fitness" />
              {intensity ? (
                <Tag
                  label={t('card.intensityTag', { intensity: intensityLabel(intensity) })}
                  icon={hard ? 'flame' : undefined}
                  tone={hard ? 'accent' : 'neutral'}
                  accent={hard ? 'fitness' : undefined}
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
            <IconButton icon="pencil-outline" size="sm" accessibilityLabel={t('card.edit', { title })} onPress={openEdit} />
            <IconButton
              icon="trash-outline"
              size="sm"
              destructive
              accessibilityLabel={t('card.delete', { title })}
              onPress={confirmDelete}
              disabled={deleteMutation.isPending}
            />
          </View>
        </View>

        {entry.duration || entry.caloriesBurned || exercises.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.lg, rowGap: spacing.xs }}>
            {entry.duration ? <Metric icon="time-outline" text={t('units.min', { value: entry.duration })} /> : null}
            {entry.caloriesBurned ? <Metric icon="flame-outline" text={t('units.kcal', { value: entry.caloriesBurned })} /> : null}
            {exercises.length > 0 ? <Metric icon="list-outline" text={t('card.exercises', { count: exercises.length })} /> : null}
          </View>
        ) : null}

        {exercises.length > 0 ? (
          <View style={{ backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }}>
            {exercises.map((ex, idx) => {
              const detail = [ex.sets ? t('card.sets', { count: ex.sets }) : null, ex.reps ? t('card.reps', { count: Number(ex.reps) }) : null].filter(Boolean).join(' × ');
              return (
                <View key={`${ex.name}-${idx}`} accessible style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                  <Text variant="label" numberOfLines={2} style={{ flex: 1 }}>
                    {ex.name}
                  </Text>
                  <Text variant="caption" numeric color="textSecondary" style={{ flexShrink: 1, textAlign: 'auto' }}>
                    {detail}
                    {ex.weight ? t('card.atWeight', { value: ex.weight }) : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {entry.notes ? (
          <Text variant="caption" color="textSecondary">
            {t('card.notes', { notes: entry.notes })}
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
