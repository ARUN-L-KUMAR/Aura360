import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BalanceHero } from '@/components/finance/balance-hero';
import { BudgetOverviewCard } from '@/components/finance/budget-overview-card';
import { BreakdownSkeleton, HeroSkeleton } from '@/components/finance/finance-skeletons';
import { dailySpend, spendByCategory } from '@/components/finance/insights';
import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { IconTile, SectionHead } from '@/components/finance/finance-ui';
import { FinanceMetricsGrid } from '@/components/finance/finance-metrics-grid';
import type { LedgerFilter } from '@/components/finance/history-section';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { ReceiptScanSheet } from '@/components/finance/receipt-scan-sheet';
import { MonthStats } from '@/components/finance/month-stats';
import { SpendingBreakdown } from '@/components/finance/spending-breakdown';
import { NO_DESCRIPTION, openTransaction, TransactionRow } from '@/components/finance/transaction-row';
import { useCountUpOnce } from '@/components/finance/use-count-up-once';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useBalances, useBudgets, useTransactions } from '@/features/finance/hooks';
import { useMonthExpenses } from '@/features/finance/use-month-expenses';
import { OVERALL_BUDGET } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { monthKey, shiftMonth } from '@/lib/format';
import { spacing } from '@/theme';

type Props = {
  header: ReactNode;
  /** Jump to the budgets section ("See all"). */
  onSeeBudgets?: () => void;
  /** Jump to the history section ("See all"). */
  onSeeHistory?: () => void;
  /** Open the ledger already filtered (a figure card or a category was tapped). */
  onOpenLedger?: (filter: LedgerFilter) => void;
};

export function OverviewSection({ header, onSeeBudgets, onSeeHistory, onOpenLedger }: Props) {
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
  const { query: spend, rows: spendRows, loadingMore: spendLoadingMore } = useMonthExpenses(month);
  const [scanning, setScanning] = useState(false);
  const previous = useTransactions({ type: 'expense', search: '', month: shiftMonth(month, -1) });

  const countUp = useCountUpOnce(!!balances.data);

  const refreshing = dashboard.isRefetching || balances.isRefetching || budgets.isRefetching || recent.isRefetching || (spend.isRefetching && !spend.isFetchingNextPage);
  const refreshAll = () => Promise.all([dashboard.refetch(), balances.refetch(), budgets.refetch(), recent.refetch(), spend.refetch(), previous.refetch()]);

  const monthStats = dashboard.data?.month;
  const visibleBalances = (balances.data?.data ?? []).filter((b) => Number(b.currentBalance) !== 0);
  const overallBudget = useMemo(() => (budgets.data?.data ?? []).find((b) => b.category === OVERALL_BUDGET), [budgets.data]);
  const closeToLimit = useMemo(
    () =>
      (budgets.data?.data ?? [])
        .filter((b) => b.category !== OVERALL_BUDGET)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3),
    [budgets.data],
  );
  const recentItems = recent.data?.pages[0]?.data.slice(0, 5) ?? [];

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

      {/* Balance hero (money on hand, net flow, spending per day), then the month's figures */}
      {balances.isPending && dashboard.isPending ? (
        <HeroSkeleton />
      ) : balances.isError && !balances.data ? (
        <LoadError size="inline" error={balances.error} title={t('overview.balancesError')} onRetry={() => void balances.refetch()} retrying={balances.isRefetching} />
      ) : (
        <Animated.View {...heroMotion} style={{ gap: spacing.md }}>
          <BalanceHero
            balance={Number(balances.data?.totalBalance ?? 0)}
            income={monthStats?.income ?? 0}
            expense={monthStats?.expense ?? breakdown.total}
            daily={daily}
            month={month}
            loading={spendBusy}
            countUp={countUp}
            onEditBalances={() => router.push('/finance/balances')}
          />
          <FinanceMetricsGrid
            income={monthStats?.income ?? 0}
            expense={monthStats?.expense ?? breakdown.total}
            investment={monthStats?.investment ?? 0}
            availableBalance={Number(balances.data?.totalBalance ?? 0)}
            bankBalance={visibleBalances
              .filter((b) => b.paymentMethod === 'upi' || b.paymentMethod === 'bank_transfer' || b.paymentMethod === 'card')
              .reduce((acc, b) => acc + Number(b.currentBalance), 0)}
            cashBalance={visibleBalances
              .filter((b) => b.paymentMethod === 'cash')
              .reduce((acc, b) => acc + Number(b.currentBalance), 0)}
            isSyncing={refreshing}
            onSync={() => void refreshAll()}
            onScanReceipt={() => setScanning(true)}
            onAddTransaction={() => openTransaction(router)}
            onEditBalances={() => router.push('/finance/balances')}
            onSelectFlowFilter={(flowType) => {
              if (onOpenLedger) onOpenLedger({ type: flowType, month: 'this' });
              else onSeeHistory?.();
            }}
          />
        </Animated.View>
      )}

      {dashboard.isError && !dashboard.data ? (
        <LoadError size="inline" error={dashboard.error} title={t('overview.monthError')} onRetry={() => void dashboard.refetch()} retrying={dashboard.isRefetching} />
      ) : null}

      {/* Where the money went, then the month's highlights */}
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
            month={month}
            previousTotal={previousTotal}
            partialCount={spendPartial ? spendRows.length : null}
            onOpenCategory={onOpenLedger ? (category) => onOpenLedger({ type: 'expense', category, month: 'this' }) : undefined}
          />
        </Animated.View>
      )}

      {!spendBusy && !dashboard.isPending && (breakdown.slices.length > 0 || monthStats) ? (
        <View style={{ gap: spacing.md }}>
          <SectionHead title={t('overview.thisMonth')} />
          <MonthStats month={monthStats} slices={breakdown.slices} largest={largest} />
        </View>
      ) : null}

      {/* Budgets this month and the categories closest to their limit */}
      {budgets.isPending ? (
        <SkeletonCard lines={3} />
      ) : (budgets.data?.summary && (budgets.data.summary.overallCap > 0 || closeToLimit.length > 0)) ? (
        <Animated.View {...budgetMotion}>
          <BudgetOverviewCard summary={budgets.data.summary} categories={closeToLimit} overall={overallBudget} onSeeBudgets={onSeeBudgets} />
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
      <ReceiptScanSheet visible={scanning} onClose={() => setScanning(false)} />
    </Screen>
  );
}
