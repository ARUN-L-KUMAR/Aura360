import { useRouter } from 'expo-router';
import { useEffect, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BudgetRing } from '@/components/finance/budget-ring';
import { BreakdownSkeleton, HeroSkeleton, StatGridSkeleton } from '@/components/finance/finance-skeletons';
import { budgetLevel, dailySpend, spendByCategory } from '@/components/finance/insights';
import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { IconTile, SectionHead } from '@/components/finance/finance-ui';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { MoneyHero } from '@/components/finance/money-hero';
import { MonthStats } from '@/components/finance/month-stats';
import { SpendingBreakdown } from '@/components/finance/spending-breakdown';
import { NO_DESCRIPTION, openTransaction, TransactionRow } from '@/components/finance/transaction-row';
import { useCountUpOnce } from '@/components/finance/use-count-up-once';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useBalances, useBudgets, useTransactions } from '@/features/finance/hooks';
import { OVERALL_BUDGET } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney, monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { radius, spacing } from '@/theme';
import { categoryLabel } from './labels';

type Props = {
  header: ReactNode;
  /** Jump to the budgets section ("See all"). */
  onSeeBudgets?: () => void;
  /** Jump to the history section ("See all"). */
  onSeeHistory?: () => void;
};

/** The spending chart reads every expense of the month, 25 per page; this many pages is plenty (and bounds the requests). */
const MAX_SPEND_PAGES = 12;

export function OverviewSection({ header, onSeeBudgets, onSeeHistory }: Props) {
  const router = useRouter();
  const { t } = useTranslation('finance');
  const month = monthKey();
  const heroMotion = useBlockMotion();
  const spendMotion = useBlockMotion(80);
  const budgetMotion = useBlockMotion(160);

  const dashboard = useDashboard();
  const balances = useBalances();
  const budgets = useBudgets(month);
  const recent = useTransactions({ type: 'all', search: '', month: 'all' });
  const spend = useTransactions({ type: 'expense', search: '', month });
  const previous = useTransactions({ type: 'expense', search: '', month: shiftMonth(month, -1) });

  const countUp = useCountUpOnce(!!balances.data);

  // The ring needs every expense of the month, so keep loading pages until there are no more (or the cap is hit).
  const { fetchNextPage } = spend;
  const spendPages = spend.data?.pages.length ?? 0;
  const spendLoadingMore = spend.hasNextPage && !spend.isFetchNextPageError && spendPages < MAX_SPEND_PAGES;
  useEffect(() => {
    if (spendLoadingMore && !spend.isFetchingNextPage) void fetchNextPage();
  }, [spendLoadingMore, spend.isFetchingNextPage, fetchNextPage]);

  const refreshing = dashboard.isRefetching || balances.isRefetching || budgets.isRefetching || recent.isRefetching || (spend.isRefetching && !spend.isFetchingNextPage);
  const refreshAll = () => Promise.all([dashboard.refetch(), balances.refetch(), budgets.refetch(), recent.refetch(), spend.refetch(), previous.refetch()]);

  const monthStats = dashboard.data?.month;
  const visibleBalances = (balances.data?.data ?? []).filter((b) => Number(b.currentBalance) !== 0);
  const closeToLimit = useMemo(
    () =>
      (budgets.data?.data ?? [])
        .filter((b) => b.category !== OVERALL_BUDGET)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3),
    [budgets.data],
  );
  const recentItems = recent.data?.pages[0]?.data.slice(0, 5) ?? [];

  const spendRows = useMemo(() => spend.data?.pages.flatMap((page) => page.data) ?? [], [spend.data]);
  const breakdown = useMemo(() => spendByCategory(spendRows), [spendRows]);
  const daily = useMemo(() => dailySpend(spendRows, month, new Date().getDate()), [spendRows, month]);
  const largest = useMemo(() => {
    let best: (typeof spendRows)[number] | null = null;
    for (const row of spendRows) if (!best || Number(row.amount) > Number(best.amount)) best = row;
    return best ? { amount: Number(best.amount), description: best.description === NO_DESCRIPTION ? t('row.noDescription') : best.description } : null;
  }, [spendRows, t]);
  const spendPartial = !!spend.hasNextPage && !spendLoadingMore;
  const previousTotal = previous.data && !spendPartial ? (previous.data.pages[0]?.totalAmount ?? 0) : null;
  const spendBusy = spend.isPending || spendLoadingMore;

  // Everything on screen came from the cache and the latest refresh failed: one row says so, with a way to retry.
  const staleError = [dashboard, balances, budgets, recent, spend].find((q) => q.isError && q.data !== undefined)?.error;
  const offline = balances.isPending && balances.fetchStatus === 'paused' && dashboard.isPending && dashboard.fetchStatus === 'paused';

  if (offline) {
    return (
      <Screen onRefresh={refreshAll} refreshing={refreshing} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
        {header}
        <OfflineState description={t('offline.finance')} onRetry={() => void refreshAll()} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refreshAll} refreshing={refreshing} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      {staleError ? <RefreshError error={staleError} onRetry={() => void refreshAll()} retrying={refreshing} /> : null}

      {/* Money on hand */}
      {balances.isPending ? (
        <HeroSkeleton />
      ) : balances.isError && !balances.data ? (
        <LoadError size="inline" error={balances.error} title={t('overview.balancesError')} onRetry={() => void balances.refetch()} retrying={balances.isRefetching} />
      ) : (
        <Animated.View {...heroMotion}>
          <MoneyHero
            total={Number(balances.data?.totalBalance ?? 0)}
            balances={visibleBalances}
            month={monthStats}
            monthLoading={dashboard.isPending}
            onAdjust={() => router.push('/finance/balances')}
            onAddTransaction={() => openTransaction(router)}
          />
        </Animated.View>
      )}

      {dashboard.isError && !dashboard.data ? (
        <LoadError size="inline" error={dashboard.error} title={t('overview.monthError')} onRetry={() => void dashboard.refetch()} retrying={dashboard.isRefetching} />
      ) : null}

      {/* This month: the numbers, then where the money went */}
      <View style={{ gap: spacing.md }}>
        <SectionHead overline={monthLabel(month)} title={t('overview.thisMonth')} />
        {spendBusy || dashboard.isPending ? (
          <StatGridSkeleton />
        ) : (
          <MonthStats month={monthStats} slices={breakdown.slices} spendTotal={breakdown.total} previousTotal={previousTotal} largest={largest} />
        )}
        {spendBusy ? (
          <BreakdownSkeleton />
        ) : spend.isError && !spend.data ? (
          <LoadError size="inline" error={spend.error} title={t('overview.spendError')} onRetry={() => void spend.refetch()} retrying={spend.isRefetching} />
        ) : breakdown.slices.length === 0 ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconTile icon="leaf-outline" tone="neutral" />
            <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
              {t('overview.noSpending')}
            </Text>
          </Card>
        ) : (
          <Animated.View {...spendMotion}>
            <SpendingBreakdown
              slices={breakdown.slices}
              total={breakdown.total}
              daily={daily}
              month={month}
              previousTotal={previousTotal}
              partialCount={spendPartial ? spendRows.length : null}
              countUp={countUp}
            />
          </Animated.View>
        )}
      </View>

      {/* Budgets closest to their limit */}
      {budgets.isPending ? (
        <SkeletonCard lines={3} />
      ) : closeToLimit.length > 0 ? (
        <Animated.View {...budgetMotion} style={{ gap: spacing.sm }}>
          <SectionHead
            overline={t('overview.budgetsOverline')}
            title={t('overview.budgetsTitle')}
            actionLabel={onSeeBudgets ? t('overview.seeAll') : undefined}
            actionAccessibilityLabel={t('overview.seeAllBudgets')}
            onActionPress={onSeeBudgets}
          />
          <Card style={{ gap: spacing.xs }}>
            {closeToLimit.map((b) => {
              const level = budgetLevel(b);
              const category = categoryLabel(b.category);
              const values = { category, spent: formatMoney(b.spent), limit: formatMoney(b.amount), percent: b.percentage };
              const spoken = level === 'over' ? t('budgets.cardLabelOver', values) : level === 'near' ? t('budgets.cardLabelNear', values) : t('budgets.cardLabel', values);
              return (
                <PressableScale
                  key={b.id}
                  accessibilityRole="button"
                  accessibilityLabel={spoken}
                  accessibilityHint={t('overview.budgetRowHint')}
                  disabled={!onSeeBudgets}
                  haptic="select"
                  ringRadius={radius.md}
                  onPress={onSeeBudgets}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: spacing.xxxl + spacing.lg, paddingVertical: spacing.xs }}>
                  <BudgetRing budget={b} size={spacing.xxxl + spacing.md} thickness={spacing.sm - 1} />
                  <View style={{ flex: 1, gap: spacing.xs / 2 }}>
                    <Text variant="body" weight="bold" numberOfLines={1}>
                      {category}
                    </Text>
                    <Text variant="caption" numeric color="textSecondary">
                      {t('overview.budgetUsage', { spent: formatMoney(b.spent, { compact: true }), limit: formatMoney(b.amount, { compact: true }) })}
                    </Text>
                  </View>
                  {level === 'over' ? (
                    <Badge severity="error" label={t('budgets.overBudget')} size="sm" style={{ alignSelf: 'center' }} />
                  ) : level === 'near' ? (
                    <Badge severity="warning" label={t('budgets.nearLimit')} size="sm" style={{ alignSelf: 'center' }} />
                  ) : (
                    <Text variant="label" weight="bold" numeric color="textSecondary">
                      {b.percentage}%
                    </Text>
                  )}
                </PressableScale>
              );
            })}
          </Card>
        </Animated.View>
      ) : null}

      {/* Recent activity */}
      <View style={{ gap: spacing.sm }}>
        <SectionHead
          overline={t('overview.recentOverline')}
          title={t('overview.recentTitle')}
          actionLabel={onSeeHistory ? t('overview.seeAll') : undefined}
          actionAccessibilityLabel={t('overview.seeAllTransactions')}
          onActionPress={onSeeHistory}
        />
        <Card padding="none" style={{ overflow: 'hidden' }}>
          {recent.isPending ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <SkeletonList count={3} trailing />
            </View>
          ) : recent.isError && !recent.data ? (
            <LoadError
              size="inline"
              error={recent.error}
              title={t('overview.recentError')}
              onRetry={() => void recent.refetch()}
              retrying={recent.isRefetching}
              style={{ margin: spacing.md }}
            />
          ) : recentItems.length === 0 ? (
            <EmptyState
              accent="finance"
              icon="receipt-outline"
              title={t('overview.recentEmptyTitle')}
              description={t('overview.recentEmptyBody')}
              actionTitle={t('actions.addTransaction')}
              onAction={() => openTransaction(router)}
            />
          ) : (
            recentItems.map((tx, i) => <TransactionRow key={tx.id} tx={tx} divider={i < recentItems.length - 1} />)
          )}
        </Card>
      </View>
    </Screen>
  );
}
