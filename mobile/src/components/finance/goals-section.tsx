import { useRouter } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE, useEntering } from '@/components/finance/list-helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useGoals } from '@/features/finance/hooks';
import type { Goal } from '@/features/finance/types';
import { formatMoney } from '@/lib/format';
import { radius, spacing } from '@/theme';

export function openGoal(router: ReturnType<typeof useRouter>, goal?: Goal) {
  router.push({ pathname: '/finance/goal', params: goal ? { goal: JSON.stringify(goal) } : {} });
}

function deadlineText(goal: Goal) {
  if (goal.isCompleted) return 'Goal reached';
  if (goal.daysRemaining === null) return null;
  if (goal.daysRemaining < 0) return `${Math.abs(goal.daysRemaining)} days overdue`;
  if (goal.daysRemaining === 0) return 'Due today';
  return `${goal.daysRemaining} days left`;
}

const GoalCard = memo(function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const router = useRouter();
  const entering = useEntering(index);
  const deadline = deadlineText(goal);
  const overdue = !goal.isCompleted && goal.daysRemaining !== null && goal.daysRemaining < 0;
  const progress = `${formatMoney(goal.currentAmount)} of ${formatMoney(goal.targetAmount)}`;

  return (
    <Animated.View entering={entering}>
      <Card style={{ gap: spacing.md }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${goal.title}, ${goal.category}, ${goal.percentage} percent, ${progress}${deadline ? `, ${deadline}` : ''}`}
          accessibilityHint="Opens this goal"
          onPress={() => router.push({ pathname: '/finance/goal', params: { goal: JSON.stringify(goal) } })}
          ringRadius={radius.md}
          style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body" weight="semiBold" numberOfLines={1}>
                {goal.title}
              </Text>
              <Text variant="caption" color={overdue ? 'errorText' : 'textSecondary'} numberOfLines={1}>
                {goal.category}
                {deadline ? ` · ${deadline}` : ''}
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
          <Badge severity="success" label="Goal reached" size="sm" />
        ) : (
          <Button
            title="Add money"
            size="sm"
            variant="secondary"
            leftIcon="add"
            fullWidth={false}
            style={{ alignSelf: 'flex-start' }}
            accessibilityLabel={`Add money to ${goal.title}`}
            onPress={() => router.push({ pathname: '/finance/contribute', params: { goal: JSON.stringify(goal) } })}
          />
        )}
      </Card>
    </Animated.View>
  );
});

export function GoalsSection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isRefetching } = useGoals();
  const summary = data?.summary;
  const goals = data?.data ?? [];

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      {isPending ? (
        <View style={{ gap: spacing.md }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </View>
      ) : isError && !data ? (
        <ErrorState error={error} title="Couldn't load goals" onRetry={() => refetch()} retrying={isRefetching} />
      ) : (
        <>
          {summary && summary.totalGoals > 0 ? (
            <Card variant="tinted" accent="finance" style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <Text variant="title" style={{ flex: 1 }}>
                  Savings goals
                </Text>
                <Tag label={`${summary.completedCount} of ${summary.totalGoals} reached`} icon="flag" accent="finance" />
              </View>
              <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatMoney(summary.totalSaved)}
              </Text>
              <ProgressBar percent={summary.overallProgress} accent="finance" showLabel label="Overall progress" />
              <Text variant="caption" numeric color="textSecondary">
                saved toward {formatMoney(summary.totalTarget)} in total
              </Text>
            </Card>
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
              title="No savings goals yet"
              description="Set a target for an emergency fund, a trip or something you are saving up for."
              actionTitle="Create a goal"
              onAction={() => openGoal(router)}
            />
          )}

          {goals.length > 0 ? <Button title="New goal" variant="secondary" leftIcon="add" onPress={() => openGoal(router)} /> : null}
        </>
      )}
    </Screen>
  );
}
