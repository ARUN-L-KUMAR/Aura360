import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { openTransaction, TransactionRow } from '@/components/finance/transaction-row';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListItem } from '@/components/ui/list-item';
import { useBlockMotion } from '@/components/ui/motion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Text } from '@/components/ui/text';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useBalances, useBudgets, useTransactions } from '@/features/finance/hooks';
import { OVERALL_BUDGET } from '@/features/finance/types';
import { formatMoney, monthKey } from '@/lib/format';
import { spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const METHOD_CONFIG: Record<string, { label: string; icon: IconName }> = {
  cash: { label: 'Cash in hand', icon: 'cash-outline' },
  upi: { label: 'UPI and wallet', icon: 'phone-portrait-outline' },
  card: { label: 'Debit or credit card', icon: 'card-outline' },
  bank_transfer: { label: 'Bank account', icon: 'business-outline' },
  other: { label: 'Other', icon: 'wallet-outline' },
};

type Props = {
  header: ReactNode;
  /** Jump to the budgets section ("See all"). */
  onSeeBudgets?: () => void;
  /** Jump to the history section ("See all"). */
  onSeeHistory?: () => void;
};

export function OverviewSection({ header, onSeeBudgets, onSeeHistory }: Props) {
  const router = useRouter();
  const month = monthKey();
  const heroMotion = useBlockMotion();

  const dashboard = useDashboard();
  const balances = useBalances();
  const budgets = useBudgets(month);
  const recent = useTransactions({ type: 'all', search: '', month: 'all' });

  const refreshing = dashboard.isRefetching || balances.isRefetching || budgets.isRefetching || recent.isRefetching;
  const refreshAll = () => Promise.all([dashboard.refetch(), balances.refetch(), budgets.refetch(), recent.refetch()]);

  const monthStats = dashboard.data?.month;
  const net = monthStats ? monthStats.income - monthStats.expense : 0;
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

  return (
    <Screen onRefresh={refreshAll} refreshing={refreshing} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      {/* Money on hand */}
      {balances.isPending ? (
        <SkeletonCard lines={2} />
      ) : balances.isError && !balances.data ? (
        <ErrorState size="inline" error={balances.error} title="Couldn't load your balances" onRetry={() => balances.refetch()} retrying={balances.isRefetching} />
      ) : (
        <Animated.View {...heroMotion}>
          <Card variant="tinted" accent="finance" gradient="finance" style={{ gap: spacing.sm }}>
            <SectionHeader
              title="Money on hand"
              actionLabel="Adjust"
              actionAccessibilityLabel="Adjust balances"
              onActionPress={() => router.push('/finance/balances')}
            />
            <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(balances.data?.totalBalance ?? 0)}
            </Text>
            {visibleBalances.length > 0 ? (
              <View>
                {visibleBalances.map((b) => {
                  const cfg = METHOD_CONFIG[b.paymentMethod] ?? { label: b.paymentMethod, icon: 'wallet-outline' as const };
                  return <ListItem key={b.id} icon={cfg.icon} accent="finance" title={cfg.label} meta={formatMoney(b.currentBalance)} style={{ paddingHorizontal: 0 }} />;
                })}
              </View>
            ) : (
              <Text variant="caption" color="textSecondary">
                Add what you hold in cash and in your bank or UPI to see a breakdown here.
              </Text>
            )}
          </Card>
        </Animated.View>
      )}

      {/* This month */}
      <View style={{ gap: spacing.md }}>
        <SectionHeader title="This month" />
        {dashboard.isPending ? (
          <SkeletonCard lines={1} />
        ) : dashboard.isError && !dashboard.data ? (
          <ErrorState size="inline" error={dashboard.error} title="Couldn't load this month" onRetry={() => dashboard.refetch()} retrying={dashboard.isRefetching} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <StatCard label="Income" icon="arrow-down" accent="finance" value={formatMoney(monthStats?.income ?? 0, { compact: true })} />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <StatCard label="Spent" icon="arrow-up" accent="finance" value={formatMoney(monthStats?.expense ?? 0, { compact: true })} />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <StatCard
                label="Net savings"
                icon="trending-up"
                accent="finance"
                value={formatMoney(net, { compact: true })}
                trend={{ value: net >= 0 ? 'Surplus' : 'Deficit', isPositive: net >= 0 }}
              />
            </View>
          </View>
        )}
      </View>

      {/* Budgets closest to their limit */}
      {budgets.isPending ? (
        <SkeletonCard lines={3} />
      ) : closeToLimit.length > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader
            title="Budgets this month"
            actionLabel={onSeeBudgets ? 'See all' : undefined}
            actionAccessibilityLabel="See all budgets"
            onActionPress={onSeeBudgets}
          />
          {closeToLimit.map((b) => (
            <View key={b.id} style={{ gap: spacing.xs }}>
              <ProgressBar label={b.category} percent={b.percentage} autoThresholdColor showLabel />
              <Text variant="caption" numeric color="textSecondary">
                {formatMoney(b.spent, { compact: true })} of {formatMoney(b.amount, { compact: true })}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Recent activity */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <SectionHeader
            title="Recent activity"
            actionLabel={onSeeHistory ? 'See all' : undefined}
            actionAccessibilityLabel="See all transactions"
            onActionPress={onSeeHistory}
          />
        </View>
        {recent.isPending ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <SkeletonList count={3} trailing />
          </View>
        ) : recent.isError && !recent.data ? (
          <ErrorState size="inline" error={recent.error} title="Couldn't load transactions" onRetry={() => recent.refetch()} retrying={recent.isRefetching} style={{ margin: spacing.md }} />
        ) : recentItems.length === 0 ? (
          <EmptyState
            accent="finance"
            icon="receipt-outline"
            title="No transactions yet"
            description="Record an expense or some income and it will show up here."
            actionTitle="Add transaction"
            onAction={() => openTransaction(router)}
          />
        ) : (
          recentItems.map((tx, i) => <TransactionRow key={tx.id} tx={tx} divider={i < recentItems.length - 1} />)
        )}
      </Card>
    </Screen>
  );
}
