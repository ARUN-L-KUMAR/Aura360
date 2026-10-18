import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, type ComponentProps } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { useListMotion } from '@/components/ui/motion';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { MiniBars } from '@/components/viz/mini-bars';
import { useDeleteFitnessEntry } from '@/features/fitness/hooks';
import { volumeOf } from '@/features/fitness/stats';
import { intensityLabel, workoutTitle, type Exercise, type FitnessEntry } from '@/features/fitness/types';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { formatDay } from '@/lib/format';
import { useNotify } from '@/providers/notify';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** An icon for the kind of workout; kinds the app does not know get the barbell. */
export function workoutIcon(kind: string | null | undefined): IconName {
  switch ((kind ?? '').trim().toLowerCase()) {
    case 'cardio':
      return 'heart-outline';
    case 'hiit':
      return 'flash-outline';
    case 'yoga':
    case 'mobility':
      return 'body-outline';
    case 'walking':
      return 'walk-outline';
    case 'running':
      return 'speedometer-outline';
    case 'cycling':
      return 'bicycle-outline';
    case 'sports':
      return 'football-outline';
    default:
      return 'barbell-outline';
  }
}

const ICON_CHIP = spacing.xxl + spacing.md; // 44
const CHART_HEIGHT = spacing.xxl;

/** Total kg lifted by one exercise (same formula as `volumeOf`). */
const volumeOfExercise = (ex: Exercise) => (ex.sets || 1) * (ex.reps || 1) * (ex.weight || 0);

type Props = {
  entry: FitnessEntry;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
  /** Show the date under the title. Turn off under a day heading that already says it. Default true. */
  showDate?: boolean;
};

/**
 * A logged workout: an accent icon for the kind of session, its duration / volume / calories as chips, a small bar chart
 * of volume per exercise, the exercise list and edit / delete actions. The header and the details each read as one
 * element; the two actions stay separate buttons.
 */
export const WorkoutCard = memo(function WorkoutCard({ entry, index = 0, showDate = true }: Props) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('fitness');
  const router = useRouter();
  const notify = useNotify();
  const errorMessage = useErrorMessage();
  const deleteMutation = useDeleteFitnessEntry();
  const motion = useListMotion(index);
  const fitness = accent('fitness');

  const exercises = entry.exercises ?? [];
  const title = workoutTitle(entry);
  const intensity = entry.intensity ? String(entry.intensity) : null;
  const kind = entry.workoutType || entry.type;
  const hard = intensity === 'high' || intensity === 'extreme';
  const volume = volumeOf(exercises);
  const volumeText = t('units.kg', { value: Math.round(volume).toLocaleString(getDeviceLocale()) });
  const exerciseVolumes = exercises.map(volumeOfExercise);
  const showChart = exerciseVolumes.length >= 2 && exerciseVolumes.some((v) => v > 0);

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

  const hasDetails = !!entry.duration || !!entry.caloriesBurned || volume > 0 || !!entry.distance || !!intensity || exercises.length > 0;
  const spokenDetails = [
    entry.duration ? t('units.min', { value: entry.duration }) : null,
    volume > 0 ? volumeText : null,
    entry.caloriesBurned ? t('units.kcal', { value: entry.caloriesBurned }) : null,
    entry.distance ? t('units.km', { value: Number(entry.distance) }) : null,
    intensity ? t('card.intensityTag', { intensity: intensityLabel(intensity) }) : null,
    exercises.length > 0 ? t('card.exercisesList', { count: exercises.length, names: exercises.map((ex) => ex.name).join(', ') }) : null,
    entry.notes ? t('card.notes', { notes: entry.notes }) : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Animated.View {...motion}>
      <Card rounded="xl" style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View accessible accessibilityRole="header" accessibilityLabel={t('card.headline', { title, date: formatDay(entry.date) })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: ICON_CHIP, height: ICON_CHIP, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: fitness.soft }}>
              <Ionicons name={workoutIcon(kind)} size={spacing.xl} color={fitness.text} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs / 2 }}>
              <Text variant="title" weight="bold" numberOfLines={2}>
                {title}
              </Text>
              {showDate ? (
                <Text variant="caption" color="textMuted">
                  {formatDay(entry.date)}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton icon="pencil-outline" size="sm" accessibilityLabel={t('card.edit', { title })} onPress={openEdit} />
            <IconButton icon="trash-outline" size="sm" destructive accessibilityLabel={t('card.delete', { title })} onPress={confirmDelete} disabled={deleteMutation.isPending} />
          </View>
        </View>

        {hasDetails ? (
          <View accessible accessibilityLabel={spokenDetails} style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
              {entry.duration ? <Tag label={t('units.min', { value: entry.duration })} icon="time-outline" size="md" accent="fitness" /> : null}
              {volume > 0 ? <Tag label={volumeText} icon="barbell-outline" size="md" accent="fitness" /> : null}
              {entry.caloriesBurned ? <Tag label={t('units.kcal', { value: entry.caloriesBurned })} icon="flame-outline" size="md" /> : null}
              {entry.distance ? <Tag label={t('units.km', { value: Number(entry.distance) })} icon="navigate-outline" size="md" /> : null}
              {intensity ? (
                <Tag
                  label={t('card.intensityTag', { intensity: intensityLabel(intensity) })}
                  icon={hard ? 'flame' : undefined}
                  size="md"
                  tone={hard ? 'accent' : 'neutral'}
                  accent={hard ? 'fitness' : undefined}
                />
              ) : null}
            </View>

            {exercises.length > 0 ? (
              <View style={{ backgroundColor: colors.cardMuted, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md }}>
                {showChart ? (
                  <View style={{ gap: spacing.xs }}>
                    <Text variant="overline" color="textMuted">
                      {t('card.volumeByExercise')}
                    </Text>
                    <MiniBars values={exerciseVolumes} accent="fitness" height={CHART_HEIGHT} />
                  </View>
                ) : null}
                <View style={{ gap: spacing.sm }}>
                  {exercises.map((ex, idx) => {
                    const detail = [ex.sets ? t('card.sets', { count: ex.sets }) : null, ex.reps ? t('card.reps', { count: Number(ex.reps) }) : null].filter(Boolean).join(' × ');
                    return (
                      <View key={`${ex.name}-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
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
              </View>
            ) : null}

            {entry.notes ? (
              <Text variant="caption" color="textSecondary">
                {t('card.notes', { notes: entry.notes })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
});

/** Placeholder with the shape of a `WorkoutCard`: icon chip, title lines, chips and a block of exercises. */
export function WorkoutCardSkeleton() {
  const { t } = useTranslation('fitness');
  return (
    <Card rounded="xl">
      <SkeletonGroup label={t('card.loading')} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Skeleton shape="box" width={ICON_CHIP} height={ICON_CHIP} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton shape="line" width="55%" />
            <Skeleton shape="line" width="30%" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Skeleton shape="box" width={72} height={spacing.xxl - spacing.xs} rounded="pill" />
          <Skeleton shape="box" width={88} height={spacing.xxl - spacing.xs} rounded="pill" />
        </View>
        <Skeleton shape="box" height={ICON_CHIP + spacing.xl} />
      </SkeletonGroup>
    </Card>
  );
}
