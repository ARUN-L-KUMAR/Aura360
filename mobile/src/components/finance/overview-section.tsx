import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { openTransaction, TransactionRow } from '@/components/finance/transaction-row';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
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
import { OVERALL_BUDGET, type PaymentMethod } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney, monthKey } from '@/lib/format';
import { spacing } from '@/theme';
import { categoryLabel, paymentMethodLabel } from './labels';

type IconName = ComponentProps<typeof Ionicons>['name'];

const METHOD_ICON: Record<PaymentMethod, IconName> = {
  cash: 'cash-outline',
  upi: 'phone-portrait-outline',
  card: 'card-outline',
  bank_transfer: 'business-outline',
  other: 'wallet-outline',
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
  const { t } = useTranslation('finance');
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

  // Everything on screen came from the cache and the latest refresh failed: one row says so, with a way to retry.
  const staleError = [dashboard, balances, budgets, recent].find((q) => q.isError && q.data !== undefined)?.error;
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
        <SkeletonCard lines={2} />
      ) : balances.isError && !balances.data ? (
        <LoadError size="inline" error={balances.error} title={t('overview.balancesError')} onRetry={() => void balances.refetch()} retrying={balances.isRefetching} />
      ) : (
        <Animated.View {...heroMotion}>
          <Card variant="tinted" accent="finance" gradient="finance" style={{ gap: spacing.sm }}>
            <SectionHeader
              title={t('overview.moneyOnHand')}
              actionLabel={t('overview.adjust')}
              actionAccessibilityLabel={t('overview.adjustA11y')}
              onActionPress={() => router.push('/finance/balances')}
            />
            <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(balances.data?.totalBalance ?? 0)}
            </Text>
            {visibleBalances.length > 0 ? (
              <View>
                {visibleBalances.map((b) => (
                  <ListItem
                    key={b.id}
                    icon={METHOD_ICON[b.paymentMethod] ?? 'wallet-outline'}
                    accent="finance"
                    title={b.paymentMethod in METHOD_ICON ? t(`paymentGroup.${b.paymentMethod}` as const) : paymentMethodLabel(b.paymentMethod)}
                    meta={formatMoney(b.currentBalance)}
                    style={{ paddingHorizontal: 0 }}
                  />
                ))}
              </View>
            ) : (
              <Text variant="caption" color="textSecondary">
                {t('overview.balancesEmpty')}
              </Text>
            )}
          </Card>
        </Animated.View>
      )}

      {/* This month */}
      <View style={{ gap: spacing.md }}>
        <SectionHeader title={t('overview.thisMonth')} />
        {dashboard.isPending ? (
          <SkeletonCard lines={1} />
        ) : dashboard.isError && !dashboard.data ? (
          <LoadError size="inline" error={dashboard.error} title={t('overview.monthError')} onRetry={() => void dashboard.refetch()} retrying={dashboard.isRefetching} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <StatCard label={t('overview.income')} icon="arrow-down" accent="finance" value={formatMoney(monthStats?.income ?? 0, { compact: true })} />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <StatCard label={t('overview.spent')} icon="arrow-up" accent="finance" value={formatMoney(monthStats?.expense ?? 0, { compact: true })} />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <StatCard
                label={t('overview.netSavings')}
                icon="trending-up"
                accent="finance"
                value={formatMoney(net, { compact: true })}
                trend={{ value: net >= 0 ? t('overview.surplus') : t('overview.deficit'), isPositive: net >= 0 }}
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
            title={t('overview.budgetsTitle')}
            actionLabel={onSeeBudgets ? t('overview.seeAll') : undefined}
            actionAccessibilityLabel={t('overview.seeAllBudgets')}
            onActionPress={onSeeBudgets}
          />
          {closeToLimit.map((b) => (
            <View key={b.id} style={{ gap: spacing.xs }}>
              <ProgressBar label={categoryLabel(b.category)} percent={b.percentage} autoThresholdColor showLabel />
              <Text variant="caption" numeric color="textSecondary">
                {t('overview.budgetUsage', { spent: formatMoney(b.spent, { compact: true }), limit: formatMoney(b.amount, { compact: true }) })}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Recent activity */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <SectionHeader
            title={t('overview.recentTitle')}
            actionLabel={onSeeHistory ? t('overview.seeAll') : undefined}
            actionAccessibilityLabel={t('overview.seeAllTransactions')}
            onActionPress={onSeeHistory}
          />
        </View>
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
    </Screen>
  );
}
