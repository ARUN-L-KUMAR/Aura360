import { useRouter } from 'expo-router';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { MonthSwitcher } from '@/components/finance/month-switcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBudgets } from '@/features/finance/hooks';
import { OVERALL_BUDGET, type Budget } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney, monthKey } from '@/lib/format';
import { spacing } from '@/theme';
import { categoryLabel } from './labels';

export function openBudget(router: ReturnType<typeof useRouter>, month: string, budget?: Budget) {
  router.push({ pathname: '/finance/budget', params: { month, ...(budget ? { budget: JSON.stringify(budget) } : {}) } });
}

function BudgetStatus({ budget }: { budget: Pick<Budget, 'isOverBudget' | 'isNearLimit'> }) {
  const { t } = useTranslation('finance');
  if (budget.isOverBudget) return <Badge severity="error" label={t('budgets.overBudget')} size="sm" />;
  if (budget.isNearLimit) return <Badge severity="warning" label={t('budgets.nearLimit')} size="sm" />;
  return null;
}

const BudgetCard = memo(function BudgetCard({ budget, month, index }: { budget: Budget; month: string; index: number }) {
  const router = useRouter();
  const motion = useListMotion(index);
  const { t } = useTranslation('finance');
  const category = categoryLabel(budget.category);
  const labelValues = { category, spent: formatMoney(budget.spent), limit: formatMoney(budget.amount), percent: budget.percentage };
  const label = budget.isOverBudget ? t('budgets.cardLabelOver', labelValues) : budget.isNearLimit ? t('budgets.cardLabelNear', labelValues) : t('budgets.cardLabel', labelValues);

  return (
    <Animated.View {...motion}>
      <Card onPress={() => openBudget(router, month, budget)} accessibilityLabel={label} accessibilityHint={t('budgets.cardHint')} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <Text variant="body" weight="semiBold" numberOfLines={1} style={{ flex: 1 }}>
            {category}
          </Text>
          <BudgetStatus budget={budget} />
        </View>
        <ProgressBar percent={budget.percentage} autoThresholdColor showLabel />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <Text variant="caption" numeric color="textSecondary">
            {t('budgets.spent', { amount: formatMoney(budget.spent) })}
          </Text>
          <Text variant="caption" numeric color="textSecondary">
            {t('budgets.limit', { amount: formatMoney(budget.amount) })}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
});

export function BudgetsSection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation('finance');
  const [month, setMonth] = useState(monthKey());
  const blockMotion = useBlockMotion();
  const { data, isPending, fetchStatus, isError, error, refetch, isRefetching } = useBudgets(month);

  const categories = useMemo(() => (data?.data ?? []).filter((b) => b.category !== OVERALL_BUDGET), [data]);
  const overall = useMemo(() => (data?.data ?? []).find((b) => b.category === OVERALL_BUDGET), [data]);
  const summary = data?.summary;
  const offline = isPending && fetchStatus === 'paused';

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      <MonthSwitcher month={month} onChange={setMonth} />

      {isPending && !offline ? (
        <View style={{ gap: spacing.md }}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </View>
      ) : offline ? (
        <OfflineState description={t('offline.budgets')} onRetry={() => void refetch()} />
      ) : isError && !data ? (
        <LoadError error={error} title={t('budgets.error')} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : (
        <>
          {isError ? <RefreshError error={error} onRetry={() => void refetch()} retrying={isRefetching} /> : null}

          {summary && (summary.overallCap > 0 || categories.length > 0) ? (
            <Animated.View {...blockMotion}>
              <Card variant="tinted" accent="finance" gradient="finance" style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                  <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
                    {summary.hasOverallBudget ? t('budgets.overallTitle') : t('budgets.totalTitle')}
                  </Text>
                  {summary.isOverBudget ? <Badge severity="error" label={t('budgets.overBudget')} size="sm" /> : null}
                </View>
                <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} color={summary.isOverBudget ? 'errorText' : 'text'}>
                  {formatMoney(summary.totalSpent)}
                </Text>
                <ProgressBar percent={summary.percentage} autoThresholdColor showLabel label={t('budgets.usedThisMonth')} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                  <Text variant="caption" numeric color="textSecondary" style={{ flex: 1 }}>
                    {summary.overallCap > 0
                      ? t('budgets.remaining', { remaining: formatMoney(summary.remaining), cap: formatMoney(summary.overallCap) })
                      : t('budgets.noneSet')}
                  </Text>
                  {overall ? (
                    <Button
                      title={t('budgets.editLimit')}
                      accessibilityLabel={t('budgets.editLimitA11y')}
                      size="sm"
                      variant="tertiary"
                      fullWidth={false}
                      onPress={() => openBudget(router, month, overall)}
                    />
                  ) : null}
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
              title={t('budgets.emptyTitle')}
              description={t('budgets.emptyBody')}
              actionTitle={t('budgets.create')}
              onAction={() => openBudget(router, month)}
            />
          )}

          {categories.length > 0 ? <Button title={t('budgets.new')} variant="secondary" leftIcon="add" onPress={() => openBudget(router, month)} /> : null}
        </>
      )}
    </Screen>
  );
}
