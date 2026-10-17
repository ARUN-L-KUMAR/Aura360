import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { DonutChart } from '@/components/viz/donut-chart';
import { Sparkline } from '@/components/viz/sparkline';
import { useDonutColors } from '@/components/viz/tones';
import { useTranslation, getDeviceLocale } from '@/i18n';
import { formatDay, formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';
import { categoryIcon } from './category-icons';
import { percentChange, type SpendSlice } from './insights';
import { categoryLabel } from './labels';

type Props = {
  /** Spending per category, largest first (see `spendByCategory`). */
  slices: SpendSlice[];
  /** Sum of the slices; shown in the middle of the ring. */
  total: number;
  /** Spending per day of `month`, day 1 first, up to today. */
  daily: number[];
  /** "YYYY-MM" the figures belong to. */
  month: string;
  /** Spending in the month before, for the comparison pill. `null` while unknown. */
  previousTotal: number | null;
  /** Set when only the latest expenses could be loaded: how many the chart is based on. */
  partialCount: number | null;
  /** Count the centre number up (first view in the session). */
  countUp: boolean;
};

const DONUT_SIZE = spacing.xxxl * 3 + spacing.lg;
const DONUT_THICKNESS = spacing.lg + 2;
const DOT = spacing.sm + 2;
const ICON = spacing.lg + 2;
const SPARK_HEIGHT = spacing.xxxl + spacing.sm;

/**
 * "Where it went": a donut of this month's spending by category with a legend that names every slice (icon, name,
 * share and amount, so the chart is never colour only), a line of daily spending and a comparison with last month.
 * All numbers are sums of the loaded transactions. The card reads as one sentence to a screen reader.
 */
export function SpendingBreakdown({ slices, total, daily, month, previousTotal, partialCount, countUp }: Props) {
  const { t } = useTranslation('finance');
  const { colors } = useTheme();
  const palette = useDonutColors(slices.length, 'finance');
  const percent = useMemo(() => new Intl.NumberFormat(getDeviceLocale(), { style: 'percent', maximumFractionDigits: 0 }), []);

  const rows = slices.map((slice, i) => ({
    key: slice.category ?? '__rest__',
    label: slice.category === null ? t('overview.otherCategories') : categoryLabel(slice.category),
    icon: slice.category === null ? ('ellipsis-horizontal-circle-outline' as const) : categoryIcon(slice.category),
    value: slice.value,
    share: total > 0 ? slice.value / total : 0,
    color: palette[i],
  }));

  const change = previousTotal === null ? null : percentChange(total, previousTotal);
  const lessThanBefore = change !== null && change < 0;

  const peakValue = daily.reduce((max, v) => Math.max(max, v), 0);
  const peakIndex = daily.indexOf(peakValue);
  const showTrend = daily.length >= 3 && peakValue > 0;
  const average = daily.length > 0 ? total / daily.length : 0;
  const peakDay = formatDay(`${month}-${String(peakIndex + 1).padStart(2, '0')}`);

  const spoken = [
    t('overview.spendingA11y', { total: formatMoney(total) }),
    rows.map((r) => t('overview.sliceA11y', { name: r.label, percent: percent.format(r.share), amount: formatMoney(r.value) })).join(', '),
    change !== null && change !== 0 ? (lessThanBefore ? t('overview.lessThanLast', { percent: Math.abs(change) }) : t('overview.moreThanLast', { percent: change })) : null,
    showTrend ? t('overview.trendA11y', { peak: formatMoney(peakValue), day: peakDay, average: formatMoney(Math.round(average)) }) : null,
    partialCount !== null ? t('overview.partial', { count: partialCount }) : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Card accessible accessibilityLabel={spoken} style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <DonutChart
          segments={rows.map((r) => ({ label: r.label, value: r.value }))}
          size={DONUT_SIZE}
          thickness={DONUT_THICKNESS}
          accent="finance"
          label={t('overview.spendingChart')}>
          <AnimatedNumber
            value={total}
            from={countUp ? 0 : total}
            format={(n) => formatMoney(Math.round(n), { compact: true })}
            variant="title"
            accessibilityLabel={formatMoney(total)}
          />
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {t('overview.spent')}
          </Text>
        </DonutChart>

        {change !== null && change !== 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.pill,
              backgroundColor: lessThanBefore ? colors.successContainer : colors.errorContainer,
            }}>
            <Ionicons name={lessThanBefore ? 'arrow-down' : 'arrow-up'} size={14} color={lessThanBefore ? colors.onSuccessContainer : colors.onErrorContainer} />
            <Text variant="caption" weight="semiBold" style={{ color: lessThanBefore ? colors.onSuccessContainer : colors.onErrorContainer, flexShrink: 1 }}>
              {lessThanBefore ? t('overview.lessThanLast', { percent: Math.abs(change) }) : t('overview.moreThanLast', { percent: change })}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }}>
        {rows.map((r) => (
          <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: DOT, height: DOT, borderRadius: radius.pill, backgroundColor: r.color }} />
            <Ionicons name={r.icon} size={ICON} color={colors.textSecondary} />
            <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {r.label}
            </Text>
            <Text variant="caption" weight="semiBold" numeric color="textSecondary">
              {percent.format(r.share)}
            </Text>
            <View style={{ minWidth: spacing.xxxl + spacing.xl, alignItems: 'flex-end' }}>
              <Text variant="label" numeric numberOfLines={1}>
                {formatMoney(r.value, { compact: true })}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {showTrend ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" weight="semiBold" color="textSecondary">
            {t('overview.dailyTitle')}
          </Text>
          <Sparkline values={daily} accent="finance" height={SPARK_HEIGHT} />
          <Text variant="caption" numeric color="textSecondary">
            {t('overview.trendNote', { peak: formatMoney(peakValue, { compact: true }), day: peakDay, average: formatMoney(Math.round(average), { compact: true }) })}
          </Text>
        </View>
      ) : null}

      {partialCount !== null ? (
        <Text variant="caption" color="textSecondary">
          {t('overview.partial', { count: partialCount })}
        </Text>
      ) : null}
    </Card>
  );
}
