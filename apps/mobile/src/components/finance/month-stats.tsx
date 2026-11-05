import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AlertCircle, Receipt, Sprout } from 'lucide-react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTranslation, getDeviceLocale } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { layout, spacing, useTheme } from '@/theme';
import { getCategoryLucideIcon } from './lucide-category-icons';
import { IconTile, type Tone } from './finance-ui';
import type { SpendSlice } from './insights';
import { categoryLabel } from './labels';

type Props = {
  /** This month's income and spending from the dashboard; `undefined` while loading or when it could not be loaded. */
  month: { income: number; expense: number } | undefined;
  /** Spending per category, largest first. */
  slices: SpendSlice[];
  /** The largest single expense this month, if any rows are loaded. */
  largest: { amount: number; description: string } | null;
};

type Row = {
  key: string;
  label: string;
  note: string;
  value: string;
  icon: Parameters<typeof IconTile>[0]['icon'];
  tone: Tone;
  spoken: string;
};

/**
 * Three quiet highlights of the month in one card: the share of income kept, the biggest category and the biggest single
 * expense. Spending itself and its change since last month are in the figure cards and "Where it went". Every number is a
 * sum of rows the screen already loaded; each row reads as one sentence to a screen reader.
 */
export function MonthStats({ month, slices, largest }: Props) {
  const { t } = useTranslation('finance');
  const { colors } = useTheme();
  const percent = useMemo(() => new Intl.NumberFormat(getDeviceLocale(), { style: 'percent', maximumFractionDigits: 0 }), []);

  const net = month ? month.income - month.expense : 0;
  const rate = month && month.income > 0 ? net / month.income : null;
  const top = slices.find((s) => s.category !== null) ?? null;
  const topLabel = top?.category ? categoryLabel(top.category) : '';

  const rows: Row[] = [];
  if (rate !== null && month) {
    rows.push({
      key: 'rate',
      label: t('overview.savingsRate'),
      note: rate >= 0 ? t('overview.keptOfIncome', { net: formatMoney(net, { compact: true }), income: formatMoney(month.income, { compact: true }) }) : t('overview.overIncome'),
      value: percent.format(rate),
      icon: rate >= 0 ? Sprout : AlertCircle,
      tone: rate >= 0 ? 'success' : 'warning',
      spoken: t('overview.savingsRateA11y', { percent: percent.format(rate), net: formatMoney(Math.abs(net)), income: formatMoney(month.income) }),
    });
  }
  if (top) {
    rows.push({
      key: 'top',
      label: t('overview.topCategory'),
      note: topLabel,
      value: formatMoney(top.value, { compact: true }),
      icon: getCategoryLucideIcon(top.category ?? ''),
      tone: 'info',
      spoken: t('overview.topCategoryA11y', { category: topLabel, amount: formatMoney(top.value) }),
    });
  }
  if (largest) {
    rows.push({
      key: 'largest',
      label: t('overview.biggestExpense'),
      note: largest.description,
      value: formatMoney(largest.amount, { compact: true }),
      icon: Receipt,
      tone: 'error',
      spoken: t('overview.biggestExpenseA11y', { description: largest.description, amount: formatMoney(largest.amount) }),
    });
  }

  if (rows.length === 0) return null;

  return (
    <Card rounded="xl" padding="none" style={{ paddingHorizontal: spacing.lg }}>
      {rows.map((row, i) => (
        <View
          key={row.key}
          accessible
          accessibilityLabel={row.spoken}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: layout.minTouchTarget + spacing.xl,
            paddingVertical: spacing.sm,
            borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
          }}>
          <IconTile icon={row.icon} tone={row.tone} size={layout.minTouchTarget - spacing.xs} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="overline" color="textMuted" numberOfLines={1}>
              {row.label}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={2}>
              {row.note}
            </Text>
          </View>
          <Text variant="title" weight="bold" numeric numberOfLines={1} style={{ flexShrink: 0 }}>
            {row.value}
          </Text>
        </View>
      ))}
    </Card>
  );
}
