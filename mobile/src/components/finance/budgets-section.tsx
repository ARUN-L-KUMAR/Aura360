import { useRouter } from 'expo-router';
import { memo, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BudgetRing, budgetRingAccent } from '@/components/finance/budget-ring';
import { RingCardSkeleton } from '@/components/finance/finance-skeletons';
import { budgetLevel, daysLeftInMonth } from '@/components/finance/insights';
import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { MonthSwitcher } from '@/components/finance/month-switcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ProgressRing } from '@/components/viz/progress-ring';
import { useBudgets } from '@/features/finance/hooks';
import { OVERALL_BUDGET, type Budget } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney, monthKey } from '@/lib/format';
import { spacing } from '@/theme';
import { categoryLabel } from './labels';

export function openBudget(router: ReturnType<typeof useRouter>, month: string, budget?: Budget) {
  router.push({ pathname: '/finance/budget', params: { month, ...(budget ? { budget: JSON.stringify(budget) } : {}) } });
}

const CARD_RING = spacing.xxxl + spacing.xl;
const CARD_RING_THICKNESS = spacing.sm;
const SUMMARY_RING = spacing.xxxl * 2 + spacing.sm;
const SUMMARY_RING_THICKNESS = spacing.md - 2;

function BudgetStatus({ budget }: { budget: Pick<Budget, 'isOverBudget' | 'isNearLimit' | 'percentage'> }) {
  const { t } = useTranslation('finance');
  const level = budgetLevel(budget);
  if (level === 'over') return <Badge severity="error" label={t('budgets.overBudget')} size="sm" />;
  if (level === 'near') return <Badge severity="warning" label={t('budgets.nearLimit')} size="sm" />;
  return null;
}

/** "12 days left · about ₹400 a day", for the month in progress only. */
function usePaceHint(daysLeft: number | null, remaining: number) {
  const { t } = useTranslation('finance');
  if (daysLeft === null) return null;
  const days = t('budgets.daysLeftMonth', { count: daysLeft });
  return remaining > 0 && daysLeft > 0 ? t('budgets.paceHint', { days, amount: formatMoney(Math.floor(remaining / daysLeft), { compact: true }) }) : days;
}

const BudgetCard = memo(function BudgetCard({ budget, month, index, daysLeft }: { budget: Budget; month: string; index: number; daysLeft: number | null }) {
  const router = useRouter();
  const motion = useListMotion(index);
  const { t } = useTranslation('finance');
  const category = categoryLabel(budget.category);
  const level = budgetLevel(budget);
  const pace = usePaceHint(daysLeft, budget.remaining);
  const labelValues = { category, spent: formatMoney(budget.spent), limit: formatMoney(budget.amount), percent: budget.percentage };
  const label = level === 'over' ? t('budgets.cardLabelOver', labelValues) : level === 'near' ? t('budgets.cardLabelNear', labelValues) : t('budgets.cardLabel', labelValues);
  const left = level === 'over' ? t('budgets.overBy', { amount: formatMoney(Math.abs(budget.remaining)) }) : t('budgets.left', { amount: formatMoney(Math.max(0, budget.remaining)) });
  const spoken = [label, left, pace].filter(Boolean).join(', ');

  return (
    <Animated.View {...motion}>
      <Card
        onPress={() => openBudget(router, month, budget)}
        accessibilityLabel={spoken}
        accessibilityHint={t('budgets.cardHint')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <BudgetRing budget={budget} size={CARD_RING} thickness={CARD_RING_THICKNESS} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="body" weight="semiBold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {category}
            </Text>
            <BudgetStatus budget={budget} />
          </View>
          <Text variant="label" numeric>
            {t('budgets.usage', { spent: formatMoney(budget.spent), limit: formatMoney(budget.amount) })}
          </Text>
          <Text variant="caption" numeric color={level === 'over' ? 'errorText' : 'textSecondary'}>
            {t('budgets.leftWithPercent', { left, percent: budget.percentage })}
          </Text>
          {pace ? (
            <Text variant="caption" numeric color="textSecondary">
              {pace}
            </Text>
          ) : null}
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
  const daysLeft = daysLeftInMonth(month, new Date());
  const summaryLevel = summary ? (summary.isOverBudget ? 'over' : summary.percentage >= 80 ? 'near' : 'ok') : 'ok';
  const summaryPace = usePaceHint(daysLeft, summary?.remaining ?? 0);

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      <MonthSwitcher month={month} onChange={setMonth} />

      {isPending && !offline ? (
        <View style={{ gap: spacing.md }}>
          <RingCardSkeleton summary />
          <RingCardSkeleton />
          <RingCardSkeleton />
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
              <Card variant="tinted" accent="finance" gradient="finance" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                <ProgressRing
                  value={summary.percentage}
                  size={SUMMARY_RING}
                  thickness={SUMMARY_RING_THICKNESS}
                  accent={budgetRingAccent(summaryLevel)}
                  label={summary.hasOverallBudget ? t('budgets.overallTitle') : t('budgets.totalTitle')}
                  valueText={t('budgets.summaryValue', { spent: formatMoney(summary.totalSpent), percent: summary.percentage })}>
                  <Text variant="title" numeric>
                    {summary.percentage}%
                  </Text>
                </ProgressRing>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
                    <Text variant="label" weight="semiBold" color="textSecondary" accessibilityRole="header" style={{ flexShrink: 1 }}>
                      {summary.hasOverallBudget ? t('budgets.overallTitle') : t('budgets.totalTitle')}
                    </Text>
                    {summary.isOverBudget ? <Badge severity="error" label={t('budgets.overBudget')} size="sm" /> : null}
                  </View>
                  <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} color={summary.isOverBudget ? 'errorText' : 'text'}>
                    {formatMoney(summary.totalSpent)}
                  </Text>
                  <Text variant="caption" numeric color="textSecondary">
                    {summary.overallCap > 0
                      ? t('budgets.remaining', { remaining: formatMoney(summary.remaining), cap: formatMoney(summary.overallCap) })
                      : t('budgets.noneSet')}
                  </Text>
                  {summaryPace ? (
                    <Text variant="caption" numeric color="textSecondary">
                      {summaryPace}
                    </Text>
                  ) : null}
                  {overall ? (
                    <Button
                      title={t('budgets.editLimit')}
                      accessibilityLabel={t('budgets.editLimitA11y')}
                      size="sm"
                      variant="tertiary"
                      leftIcon="create-outline"
                      fullWidth={false}
                      style={{ alignSelf: 'flex-start' }}
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
                <BudgetCard key={b.id} budget={b} month={month} index={i} daysLeft={daysLeft} />
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
