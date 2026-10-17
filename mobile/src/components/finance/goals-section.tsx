import { useRouter } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useGoals } from '@/features/finance/hooks';
import type { Goal } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { radius, spacing } from '@/theme';
import { categoryLabel } from './labels';

export function openGoal(router: ReturnType<typeof useRouter>, goal?: Goal) {
  router.push({ pathname: '/finance/goal', params: goal ? { goal: JSON.stringify(goal) } : {} });
}

const GoalCard = memo(function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const router = useRouter();
  const motion = useListMotion(index);
  const { t } = useTranslation('finance');

  const deadline = goal.isCompleted
    ? t('goals.reached')
    : goal.daysRemaining === null
      ? null
      : goal.daysRemaining < 0
        ? t('goals.overdue', { count: Math.abs(goal.daysRemaining) })
        : goal.daysRemaining === 0
          ? t('goals.dueToday')
          : t('goals.daysLeft', { count: goal.daysRemaining });
  const overdue = !goal.isCompleted && goal.daysRemaining !== null && goal.daysRemaining < 0;
  const progress = t('goals.progress', { current: formatMoney(goal.currentAmount), target: formatMoney(goal.targetAmount) });
  const category = categoryLabel(goal.category);
  const label = deadline
    ? t('goals.cardLabelDeadline', { title: goal.title, category, percent: goal.percentage, progress, deadline })
    : t('goals.cardLabel', { title: goal.title, category, percent: goal.percentage, progress });

  return (
    <Animated.View {...motion}>
      <Card style={{ gap: spacing.md }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={t('goals.cardHint')}
          onPress={() => openGoal(router, goal)}
          ringRadius={radius.md}
          style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body" weight="semiBold" numberOfLines={1}>
                {goal.title}
              </Text>
              <Text variant="caption" color={overdue ? 'errorText' : 'textSecondary'} numberOfLines={1}>
                {deadline ? t('goals.categoryDeadline', { category, deadline }) : category}
              </Text>
            </View>
            <Text variant="title" numeric>
              {goal.percentage}%
            </Text>
          </View>
          <ProgressBar percent={goal.percentage} color={goal.color} />
          <Text variant="caption" numeric color="textSecondary">
            {progress}
          </Text>
        </PressableScale>
        {goal.isCompleted ? (
          <Badge severity="success" label={t('goals.reached')} size="sm" />
        ) : (
          <Button
            title={t('goals.addMoney')}
            size="sm"
            variant="secondary"
            leftIcon="add"
            fullWidth={false}
            style={{ alignSelf: 'flex-start' }}
            accessibilityLabel={t('goals.addMoneyTo', { title: goal.title })}
            onPress={() => router.push({ pathname: '/finance/contribute', params: { goal: JSON.stringify(goal) } })}
          />
        )}
      </Card>
    </Animated.View>
  );
});

export function GoalsSection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation('finance');
  const blockMotion = useBlockMotion();
  const { data, isPending, fetchStatus, isError, error, refetch, isRefetching } = useGoals();
  const summary = data?.summary;
  const goals = data?.data ?? [];
  const offline = isPending && fetchStatus === 'paused';

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      {isPending && !offline ? (
        <View style={{ gap: spacing.md }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </View>
      ) : offline ? (
        <OfflineState description={t('offline.goals')} onRetry={() => void refetch()} />
      ) : isError && !data ? (
        <LoadError error={error} title={t('goals.error')} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : (
        <>
          {isError ? <RefreshError error={error} onRetry={() => void refetch()} retrying={isRefetching} /> : null}

          {summary && summary.totalGoals > 0 ? (
            <Animated.View {...blockMotion}>
              <Card variant="tinted" accent="finance" gradient="finance" style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                  <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
                    {t('goals.savingsTitle')}
                  </Text>
                  <Tag label={t('goals.reachedCount', { done: summary.completedCount, total: summary.totalGoals })} icon="flag" accent="finance" />
                </View>
                <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {formatMoney(summary.totalSaved)}
                </Text>
                <ProgressBar percent={summary.overallProgress} accent="finance" showLabel label={t('goals.overallProgress')} />
                <Text variant="caption" numeric color="textSecondary">
                  {t('goals.savedToward', { target: formatMoney(summary.totalTarget) })}
                </Text>
              </Card>
            </Animated.View>
          ) : null}

          {goals.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              {goals.map((goal, i) => (
                <GoalCard key={goal.id} goal={goal} index={i} />
              ))}
            </View>
          ) : (
            <EmptyState
              accent="finance"
              icon="flag-outline"
              title={t('goals.emptyTitle')}
              description={t('goals.emptyBody')}
              actionTitle={t('goals.create')}
              onAction={() => openGoal(router)}
            />
          )}

          {goals.length > 0 ? <Button title={t('goals.new')} variant="secondary" leftIcon="add" onPress={() => openGoal(router)} /> : null}
        </>
      )}
    </Screen>
  );
}
