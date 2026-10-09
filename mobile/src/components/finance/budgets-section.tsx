import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useBudgets } from '@/features/finance/hooks';
import { OVERALL_BUDGET, type Budget } from '@/features/finance/types';
import { formatMoney, monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export function openBudget(router: ReturnType<typeof useRouter>, month: string, budget?: Budget) {
  router.push({ pathname: '/finance/budget', params: { month, ...(budget ? { budget: JSON.stringify(budget) } : {}) } });
}

export function BudgetsSection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const [month, setMonth] = useState(monthKey());
  const { data, isPending, isError, error, refetch, isRefetching } = useBudgets(month);

  const categories = (data?.data ?? []).filter((b) => b.category !== OVERALL_BUDGET);
  const overall = (data?.data ?? []).find((b) => b.category === OVERALL_BUDGET);
  const summary = data?.summary;
  const isCurrent = month === monthKey();

  const statusColor = (b: { isOverBudget: boolean; isNearLimit: boolean }) =>
    b.isOverBudget ? colors.danger : b.isNearLimit ? colors.warning : colors.success;

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
      {header}

      {/* Month Navigator */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setMonth(shiftMonth(month, -1))}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.cardMuted : 'transparent',
          })}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="calendar-outline" size={16} color={moduleColors.finance} />
          <Text variant="heading" style={{ fontSize: 16 }}>
            {monthLabel(month)}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setMonth(shiftMonth(month, 1))}
          disabled={isCurrent}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isCurrent ? 0.3 : 1,
            backgroundColor: pressed ? colors.cardMuted : 'transparent',
          })}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {isError ? (
        <Card>
          <Text muted>{error instanceof Error ? error.message : "Couldn't load budgets."}</Text>
        </Card>
      ) : null}

      {summary ? (
        <GlassCard
          glowColor={summary.isOverBudget ? colors.danger : moduleColors.finance}
          style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="heading" style={{ fontSize: 16 }}>
              {summary.hasOverallBudget ? 'Overall Monthly Budget' : 'Total Monthly Budget'}
            </Text>
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: summary.isOverBudget ? `${colors.danger}25` : `${moduleColors.finance}25`,
              }}>
              <Text
                variant="caption"
                style={{
                  color: summary.isOverBudget ? colors.danger : moduleColors.finance,
                  fontWeight: '700',
                }}>
                {summary.percentage}% used
              </Text>
            </View>
          </View>

          <Text variant="display" color={summary.isOverBudget ? 'danger' : 'text'} style={{ fontSize: 32, lineHeight: 36 }}>
            {formatMoney(summary.totalSpent)}
          </Text>

          <ProgressBar percent={summary.percentage} color={summary.isOverBudget ? colors.danger : colors.success} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs }}>
            <Text variant="caption" muted>
              {summary.overallCap > 0
                ? `${formatMoney(summary.remaining)} remaining of ${formatMoney(summary.overallCap)}`
                : 'No budgets configured for this month yet.'}
            </Text>
            {overall ? (
              <Pressable onPress={() => openBudget(router, month, overall)} hitSlop={8}>
                <Text variant="caption" style={{ color: moduleColors.finance, fontWeight: '700' }}>
                  Edit limit
                </Text>
              </Pressable>
            ) : null}
          </View>
        </GlassCard>
      ) : isPending ? (
        <Card>
          <Text muted>Loading…</Text>
        </Card>
      ) : null}

      {categories.map((b) => (
        <Pressable key={b.id} accessibilityRole="button" onPress={() => openBudget(router, month, b)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          <GlassCard style={{ gap: spacing.sm }} glowColor={b.isOverBudget ? colors.danger : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" style={{ fontWeight: '700' }}>
                {b.category}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                  backgroundColor: `${statusColor(b)}20`,
                }}>
                <Text variant="caption" style={{ color: statusColor(b), fontWeight: '700' }}>
                  {b.isOverBudget ? 'Over budget' : b.isNearLimit ? 'Near limit' : `${b.percentage}%`}
                </Text>
              </View>
            </View>

            <ProgressBar percent={b.percentage} color={statusColor(b)} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" muted>
                {formatMoney(b.spent)} spent
              </Text>
              <Text variant="caption" muted>
                {formatMoney(b.amount)} cap
              </Text>
            </View>
          </GlassCard>
        </Pressable>
      ))}

      {!isPending && categories.length === 0 && !isError ? (
        <EmptyState
          icon="pie-chart-outline"
          title="No Category Budgets"
          description="Set monthly spending limits for categories like Food, Fuel, or Shopping to avoid overspending."
        />
      ) : null}

      <Button title="+ Create Budget Category" variant="secondary" onPress={() => openBudget(router, month)} />
    </Screen>
  );
}

