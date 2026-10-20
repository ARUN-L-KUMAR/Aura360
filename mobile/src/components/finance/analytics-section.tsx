import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  PieChart as PieIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';

import { FAB_CLEARANCE } from '@/components/finance/list-helpers';
import { LoadError, OfflineState } from '@/components/finance/load-error';
import { getCategoryLucideIcon } from '@/components/finance/lucide-category-icons';
import { spendByCategory } from '@/components/finance/insights';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useDashboard } from '@/features/dashboard/use-dashboard';
import { useMonthExpenses } from '@/features/finance/use-month-expenses';
import { formatMoney, monthKey, monthLabel } from '@/lib/format';
import { useTranslation } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';
import { categoryLabel } from './labels';

type Props = {
  header: ReactNode;
  /** Open the ledger on one expense category (a category card was tapped). */
  onOpenCategory?: (category: string) => void;
};

export function AnalyticsSection({ header, onOpenCategory }: Props) {
  const { colors, shades } = useTheme();
  const { t } = useTranslation('finance');
  const heroMotion = useBlockMotion();
  const month = monthKey();

  const dashboard = useDashboard();
  // Every expense of the month (not just the first page), so the category totals and shares add up.
  const { query: spend, rows: spendRows, loadingMore } = useMonthExpenses(month);
  const breakdown = useMemo(() => spendByCategory(spendRows), [spendRows]);

  const monthStats = dashboard.data?.month;
  const income = monthStats?.income ?? 0;
  const expense = monthStats?.expense ?? breakdown.total;
  // Negative when spending is above income, so an overspent month is not shown as 0% saved.
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const overspent = savings < 0;

  const dayOfMonth = new Date().getDate();
  const dailyBurn = dayOfMonth > 0 ? Math.round(expense / dayOfMonth) : 0;

  const offline = (dashboard.isPending && dashboard.fetchStatus === 'paused') || (spend.isPending && spend.fetchStatus === 'paused');
  const busy = dashboard.isPending || spend.isPending || loadingMore;

  if (offline) {
    return (
      <Screen contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
        {header}
        <OfflineState description={t('offline.finance')} onRetry={() => void Promise.all([dashboard.refetch(), spend.refetch()])} />
      </Screen>
    );
  }

  if ((dashboard.isError && !dashboard.data) || (spend.isError && !spend.data)) {
    const failed = dashboard.isError && !dashboard.data ? dashboard : spend;
    return (
      <Screen contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
        {header}
        <LoadError error={failed.error} title={t('overview.monthError')} onRetry={() => void Promise.all([dashboard.refetch(), spend.refetch()])} retrying={failed.isRefetching} />
      </Screen>
    );
  }

  if (busy) {
    return (
      <Screen contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
        {header}
        <SkeletonCard lines={3} />
        <SkeletonList count={4} />
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={() => Promise.all([dashboard.refetch(), spend.refetch()])}
      refreshing={dashboard.isRefetching || spend.isRefetching}
      contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      {/* Cashflow & Savings Rate Hero */}
      <Animated.View {...heroMotion}>
        <Card style={[styles.heroCard, { backgroundColor: colors.heroSurface }]}>
          <View style={styles.heroTop}>
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Activity size={14} color={shades.success[400]} />
                <Text variant="overline" style={{ color: colors.onHeroMuted }}>
                  {t('analyticsView.savingsRate')}
                </Text>
              </View>
              <Text variant="hero" style={{ color: colors.onHero }}>
                {income > 0 ? `${savingsRate}%` : '–'}
              </Text>
              <Text variant="caption" style={{ color: colors.onHeroMuted }}>
                {income <= 0 ? t('analyticsView.noIncome') : overspent ? t('analyticsView.rateNegative') : t('analyticsView.ratePositive')}
              </Text>
            </View>

            <View style={[styles.rateBadge, { backgroundColor: (overspent ? shades.error[500] : shades.success[500]) + '26' }]}>
              {overspent ? <TrendingDown size={16} color={shades.error[400]} /> : <TrendingUp size={16} color={shades.success[400]} />}
              <Text variant="caption" weight="bold" style={{ color: overspent ? shades.error[400] : shades.success[400] }}>
                {overspent ? t('analyticsView.overspent', { amount: formatMoney(Math.abs(savings)) }) : t('analyticsView.saved', { amount: formatMoney(savings) })}
              </Text>
            </View>
          </View>

          {/* Quick Flow Comparison Bar */}
          <View style={styles.flowRow}>
            <View style={[styles.flowCell, { backgroundColor: colors.heroChip }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <ArrowDownRight size={13} color={shades.success[400]} />
                <Text variant="caption" style={{ color: colors.onHeroMuted }}>
                  {t('analyticsView.income')}
                </Text>
              </View>
              <Text variant="label" weight="bold" numeric style={{ color: colors.onHero }}>
                {formatMoney(income)}
              </Text>
            </View>

            <View style={[styles.flowCell, { backgroundColor: colors.heroChip }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <ArrowUpRight size={13} color={shades.error[400]} />
                <Text variant="caption" style={{ color: colors.onHeroMuted }}>
                  {t('analyticsView.spent')}
                </Text>
              </View>
              <Text variant="label" weight="bold" numeric style={{ color: colors.onHero }}>
                {formatMoney(expense)}
              </Text>
            </View>

            <View style={[styles.flowCell, { backgroundColor: colors.heroChip }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Flame size={13} color={shades.warning[400]} />
                <Text variant="caption" style={{ color: colors.onHeroMuted }}>
                  {t('analyticsView.dailyBurn')}
                </Text>
              </View>
              <Text variant="label" weight="bold" numeric style={{ color: colors.onHero }}>
                {t('analyticsView.perDay', { amount: formatMoney(dailyBurn) })}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Category Spending Breakdown */}
      <View style={{ gap: spacing.md }}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <PieIcon size={16} color={colors.primary} />
            <Text variant="label" weight="bold">
              {t('analyticsView.categoryDist')}
            </Text>
          </View>
          <Text variant="caption" color="textMuted">
            {monthLabel(month)}
          </Text>
        </View>
        {breakdown.slices.length > 0 && onOpenCategory ? (
          <Text variant="caption" color="textSecondary">
            {t('analyticsView.tapHint')}
          </Text>
        ) : null}

        {breakdown.slices.length === 0 ? (
          <EmptyState
            title={t('analyticsView.emptyTitle')}
            description={t('analyticsView.emptyDesc')}
          />
        ) : (
          breakdown.slices.map((slice, index) => {
            const catName = slice.category ?? 'Other';
            const Icon = getCategoryLucideIcon(catName);
            const percent = breakdown.total > 0 ? Math.round((slice.value / breakdown.total) * 100) : 0;
            const sliceColor = [
              shades.primary[500],
              shades.secondary[500],
              shades.success[500],
              shades.warning[500],
              shades.info[500],
              colors.primaryAccent,
            ][index % 6];
            return (
              <Card
                key={catName + index}
                onPress={onOpenCategory && slice.category ? () => onOpenCategory(slice.category as string) : undefined}
                accessibilityLabel={t('analyticsView.rowLabel', { category: categoryLabel(catName), amount: formatMoney(slice.value), percent })}
                accessibilityHint={onOpenCategory && slice.category ? t('analyticsView.rowHint') : undefined}
                style={[styles.catCard, { borderColor: colors.border }]}>
                <View style={styles.catHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={[styles.catIconWrap, { backgroundColor: sliceColor + '1A' }]}>
                      <Icon size={16} color={sliceColor} />
                    </View>
                    <View>
                      <Text variant="label" weight="bold">
                        {categoryLabel(catName)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="label" weight="bold" numeric>
                      {formatMoney(slice.value)}
                    </Text>
                    <Text variant="caption" weight="semiBold" numeric style={{ color: sliceColor }}>
                      {percent}%
                    </Text>
                  </View>
                </View>

                {/* Progress Visual Bar */}
                <View style={[styles.barTrack, { backgroundColor: colors.cardMuted }]}>
                  <View style={[styles.barFill, { width: `${Math.min(100, percent)}%`, backgroundColor: sliceColor }]} />
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  flowRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flowCell: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  catCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
