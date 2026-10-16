import { useRouter } from 'expo-router';
import { memo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { MonthSwitcher } from '@/components/finance/month-switcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBudgets } from '@/features/finance/hooks';
import { OVERALL_BUDGET, type Budget } from '@/features/finance/types';
import { formatMoney, monthKey } from '@/lib/format';
import { spacing } from '@/theme';

export function openBudget(router: ReturnType<typeof useRouter>, month: string, budget?: Budget) {
  router.push({ pathname: '/finance/budget', params: { month, ...(budget ? { budget: JSON.stringify(budget) } : {}) } });
}

function BudgetStatus({ budget }: { budget: Pick<Budget, 'isOverBudget' | 'isNearLimit'> }) {
  if (budget.isOverBudget) return <Badge severity="error" label="Over budget" size="sm" />;
  if (budget.isNearLimit) return <Badge severity="warning" label="Near limit" size="sm" />;
  return null;
}

const BudgetCard = memo(function BudgetCard({ budget, month, index }: { budget: Budget; month: string; index: number }) {
  const router = useRouter();
  const motion = useListMotion(index);
  const status = budget.isOverBudget ? ', over budget' : budget.isNearLimit ? ', near limit' : '';

  return (
    <Animated.View {...motion}>
      <Card
        onPress={() => openBudget(router, month, budget)}
        accessibilityLabel={`${budget.category} budget, ${formatMoney(budget.spent)} spent of ${formatMoney(budget.amount)}, ${budget.percentage} percent${status}`}
        accessibilityHint="Opens this budget"
        style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <Text variant="body" weight="semiBold" numberOfLines={1} style={{ flex: 1 }}>
            {budget.category}
          </Text>
          <BudgetStatus budget={budget} />
        </View>
        <ProgressBar percent={budget.percentage} autoThresholdColor showLabel />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <Text variant="caption" numeric color="textSecondary">
            {formatMoney(budget.spent)} spent
          </Text>
          <Text variant="caption" numeric color="textSecondary">
            {formatMoney(budget.amount)} limit
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
});

export function BudgetsSection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const [month, setMonth] = useState(monthKey());
  const blockMotion = useBlockMotion();
  const { data, isPending, isError, error, refetch, isRefetching } = useBudgets(month);

  const categories = (data?.data ?? []).filter((b) => b.category !== OVERALL_BUDGET);
  const overall = (data?.data ?? []).find((b) => b.category === OVERALL_BUDGET);
  const summary = data?.summary;

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      <MonthSwitcher month={month} onChange={setMonth} />

      {isPending ? (
        <View style={{ gap: spacing.md }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </View>
      ) : isError && !data ? (
        <ErrorState error={error} title="Couldn't load budgets" onRetry={() => refetch()} retrying={isRefetching} />
      ) : (
        <>
          {summary && (summary.overallCap > 0 || categories.length > 0) ? (
            <Animated.View {...blockMotion}>
              <Card variant="tinted" accent="finance" gradient="finance" style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                  <Text variant="title" style={{ flex: 1 }}>
                    {summary.hasOverallBudget ? 'Overall monthly budget' : 'Total monthly budget'}
                  </Text>
                  {summary.isOverBudget ? <Badge severity="error" label="Over budget" size="sm" /> : null}
                </View>
                <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} color={summary.isOverBudget ? 'errorText' : 'text'}>
                  {formatMoney(summary.totalSpent)}
                </Text>
                <ProgressBar percent={summary.percentage} autoThresholdColor showLabel label="Used this month" />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                  <Text variant="caption" numeric color="textSecondary" style={{ flex: 1 }}>
                    {summary.overallCap > 0
                      ? `${formatMoney(summary.remaining)} remaining of ${formatMoney(summary.overallCap)}`
                      : 'No budgets set for this month yet.'}
                  </Text>
                  {overall ? <Button title="Edit limit" size="sm" variant="tertiary" fullWidth={false} onPress={() => openBudget(router, month, overall)} /> : null}
                </View>
              </Card>
            </Animated.View>
          ) : null}

          {categories.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              {categories.map((b, i) => (
                <BudgetCard key={b.id} budget={b} month={month} index={i} />
              ))}
            </View>
          ) : (
            <EmptyState
              accent="finance"
              icon="pie-chart-outline"
              title="No category budgets"
              description="Set monthly limits for things like food, fuel or shopping to keep spending in check."
              actionTitle="Create a budget"
              onAction={() => openBudget(router, month)}
            />
          )}

          {categories.length > 0 ? <Button title="New budget" variant="secondary" leftIcon="add" onPress={() => openBudget(router, month)} /> : null}
        </>
      )}
    </Screen>
  );
}
