import { useMemo } from 'react';
import { View } from 'react-native';

import { useTranslation, getDeviceLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { spacing } from '@/theme';
import { categoryIcon } from './category-icons';
import { FinStatCard } from './finance-ui';
import { percentChange, type SpendSlice } from './insights';
import { categoryLabel } from './labels';

type Props = {
  /** This month's income and spending from the dashboard; `undefined` while loading or when it could not be loaded. */
  month: { income: number; expense: number } | undefined;
  /** Spending per category, largest first. */
  slices: SpendSlice[];
  /** Sum of the slices. */
  spendTotal: number;
  /** Spending in the month before; `null` while unknown or when only part of this month is loaded. */
  previousTotal: number | null;
  /** The largest single expense this month, if any rows are loaded. */
  largest: { amount: number; description: string } | null;
};

/**
 * Four web-style stat cards for the month: spending (with the change since last month), the share of income kept, the
 * biggest category and the biggest single expense. Every number is a sum of rows the screen already loaded.
 */
export function MonthStats({ month, slices, spendTotal, previousTotal, largest }: Props) {
  const { t } = useTranslation('finance');
  const percent = useMemo(() => new Intl.NumberFormat(getDeviceLocale(), { style: 'percent', maximumFractionDigits: 0 }), []);

  const spent = month ? month.expense : spendTotal;
  const change = previousTotal === null ? null : percentChange(spendTotal, previousTotal);
  const lessThanBefore = change !== null && change < 0;

  const net = month ? month.income - month.expense : 0;
  const rate = month && month.income > 0 ? net / month.income : null;
  const top = slices.find((s) => s.category !== null) ?? null;
  const topLabel = top?.category ? categoryLabel(top.category) : '';

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      <FinStatCard
        label={t('overview.spent')}
        value={formatMoney(spent, { compact: true })}
        icon="trending-down"
        tone="error"
        trend={change !== null && change !== 0 ? { text: `${Math.abs(change)}%`, direction: lessThanBefore ? 'down' : 'up', good: lessThanBefore } : undefined}
        note={change !== null && change !== 0 ? t('overview.vsLastMonth') : t('overview.thisMonth')}
        accessibilityLabel={[
          t('overview.spentA11y', { amount: formatMoney(spent) }),
          change !== null && change !== 0 ? (lessThanBefore ? t('overview.lessThanLast', { percent: Math.abs(change) }) : t('overview.moreThanLast', { percent: change })) : null,
        ]
          .filter(Boolean)
          .join(', ')}
      />
      {rate !== null && month ? (
        <FinStatCard
          label={t('overview.savingsRate')}
          value={percent.format(rate)}
          icon={rate >= 0 ? 'leaf' : 'alert-circle'}
          tone={rate >= 0 ? 'success' : 'warning'}
          note={rate >= 0 ? t('overview.keptOfIncome', { net: formatMoney(net, { compact: true }), income: formatMoney(month.income, { compact: true }) }) : t('overview.overIncome')}
          accessibilityLabel={t('overview.savingsRateA11y', { percent: percent.format(rate), net: formatMoney(Math.abs(net)), income: formatMoney(month.income) })}
        />
      ) : null}
      {top ? (
        <FinStatCard
          label={t('overview.topCategory')}
          value={formatMoney(top.value, { compact: true })}
          icon={categoryIcon(top.category ?? '')}
          tone="info"
          note={topLabel}
          accessibilityLabel={t('overview.topCategoryA11y', { category: topLabel, amount: formatMoney(top.value) })}
        />
      ) : null}
      {largest ? (
        <FinStatCard
          label={t('overview.biggestExpense')}
          value={formatMoney(largest.amount, { compact: true })}
          icon="receipt"
          tone="warning"
          note={largest.description}
          accessibilityLabel={t('overview.biggestExpenseA11y', { description: largest.description, amount: formatMoney(largest.amount) })}
        />
      ) : null}
    </View>
  );
}
