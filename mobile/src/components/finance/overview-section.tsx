import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { openTransaction, TransactionRow } from '@/components/finance/transaction-row';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useBalances, useBudgets, useTransactions } from '@/features/finance/hooks';
import { OVERALL_BUDGET } from '@/features/finance/types';
import { formatMoney, monthKey } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const METHOD_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  cash: { label: 'Cash in Hand', icon: 'cash-outline' },
  upi: { label: 'UPI / Wallet', icon: 'phone-portrait-outline' },
  card: { label: 'Debit/Credit Card', icon: 'card-outline' },
  bank_transfer: { label: 'Bank Account', icon: 'business-outline' },
  other: { label: 'Other', icon: 'wallet-outline' },
};

export function OverviewSection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const month = monthKey();

  const dashboard = useDashboard();
  const balances = useBalances();
  const budgets = useBudgets(month);
  const recent = useTransactions({ type: 'all', search: '', month: 'all' });

  const refreshing = dashboard.isRefetching || balances.isRefetching || budgets.isRefetching || recent.isRefetching;
  const refreshAll = () => Promise.all([dashboard.refetch(), balances.refetch(), budgets.refetch(), recent.refetch()]);

  const net = dashboard.data ? dashboard.data.month.income - dashboard.data.month.expense : 0;
  const visibleBalances = (balances.data?.data ?? []).filter((b) => Number(b.currentBalance) !== 0);
  const closeToLimit = (budgets.data?.data ?? [])
    .filter((b) => b.category !== OVERALL_BUDGET)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);
  const recentItems = recent.data?.pages[0]?.data.slice(0, 5) ?? [];

  return (
    <Screen onRefresh={refreshAll} refreshing={refreshing}>
      {header}

      {/* Hero Money on Hand Card */}
      <GlassCard glowColor={moduleColors.finance} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="wallet-outline" size={18} color={moduleColors.finance} />
            <Text variant="heading" style={{ fontSize: 16 }}>
              Total Liquidity
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/finance/balances')} hitSlop={8}>
            <Text variant="caption" style={{ color: moduleColors.finance, fontWeight: '700' }}>
              Adjust balances
            </Text>
          </Pressable>
        </View>

        <Text variant="display" style={{ fontSize: 34, lineHeight: 38, color: colors.text }}>
          {formatMoney(balances.data?.totalBalance ?? 0)}
        </Text>

        {visibleBalances.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
            {visibleBalances.map((b) => {
              const cfg = METHOD_CONFIG[b.paymentMethod] ?? { label: b.paymentMethod, icon: 'wallet-outline' };
              return (
                <View
                  key={b.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    borderRadius: radius.md,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                  <Ionicons name={cfg.icon} size={15} color={moduleColors.finance} />
                  <View>
                    <Text variant="caption" muted style={{ fontSize: 10 }}>
                      {cfg.label}
                    </Text>
                    <Text variant="label" style={{ fontWeight: '700', fontSize: 13 }}>
                      {formatMoney(b.currentBalance)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text variant="caption" muted>
            Set what you have in cash and bank / UPI to view breakdowns here.
          </Text>
        )}
      </GlassCard>

      {/* Monthly Cashflow Stats */}
      <GlassCard style={{ gap: spacing.md }}>
        <Text variant="heading" style={{ fontSize: 16 }}>
          Monthly Cashflow
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)',
              borderWidth: 1,
              borderColor: 'rgba(34,197,94,0.2)',
            }}>
            <Text variant="caption" muted style={{ color: colors.success, fontWeight: '600' }}>
              Income
            </Text>
            <Text variant="heading" style={{ color: colors.success, fontSize: 18, marginTop: 2 }} numberOfLines={1}>
              {formatMoney(dashboard.data?.month.income ?? 0, { compact: true })}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.2)',
            }}>
            <Text variant="caption" muted style={{ color: colors.danger, fontWeight: '600' }}>
              Spent
            </Text>
            <Text variant="heading" style={{ color: colors.text, fontSize: 18, marginTop: 2 }} numberOfLines={1}>
              {formatMoney(dashboard.data?.month.expense ?? 0, { compact: true })}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
              borderWidth: 1,
              borderColor: net >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            }}>
            <Text variant="caption" muted style={{ fontWeight: '600' }}>
              Net Savings
            </Text>
            <Text variant="heading" style={{ color: net >= 0 ? colors.success : colors.danger, fontSize: 18, marginTop: 2 }} numberOfLines={1}>
              {formatMoney(net, { compact: true })}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Near-Limit Budgets */}
      {closeToLimit.length > 0 ? (
        <GlassCard style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="heading" style={{ fontSize: 16 }}>
              Budget Alerts
            </Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/finance/budget' as any)} hitSlop={8}>
              <Text variant="caption" style={{ color: moduleColors.finance, fontWeight: '700' }}>
                All Budgets
              </Text>
            </Pressable>
          </View>
          {closeToLimit.map((b) => (
            <View key={b.id} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="label" style={{ fontWeight: '600' }}>
                  {b.category}
                </Text>
                <Text variant="caption" muted>
                  {formatMoney(b.spent, { compact: true })} / {formatMoney(b.amount, { compact: true })} ({b.percentage}%)
                </Text>
              </View>
              <ProgressBar percent={b.percentage} color={b.isOverBudget ? colors.danger : b.isNearLimit ? colors.warning : colors.success} />
            </View>
          ))}
        </GlassCard>
      ) : null}

      {/* Recent Activity */}
      <GlassCard style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="heading" style={{ fontSize: 16 }}>
            Recent Activity
          </Text>
          <Pressable accessibilityRole="button" onPress={() => openTransaction(router)} hitSlop={8}>
            <Text variant="caption" style={{ color: moduleColors.finance, fontWeight: '700' }}>
              + Add
            </Text>
          </Pressable>
        </View>
        {recent.isPending ? <Text muted>Loading…</Text> : null}
        {!recent.isPending && recentItems.length === 0 ? <Text muted>No transactions recorded yet.</Text> : null}
        {recentItems.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} compact />
        ))}
      </GlassCard>
    </Screen>
  );
}

