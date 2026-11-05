import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { withAlpha } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { DonutChart } from '@/components/viz/donut-chart';
import { useDonutColors } from '@/components/viz/tones';
import { useTranslation, getDeviceLocale } from '@/i18n';
import { formatMoney, monthLabel } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing } from '@/theme';
import { Overline, TrendPill } from './finance-ui';
import { percentChange, type SpendSlice } from './insights';
import { categoryLabel } from './labels';

type Props = {
  /** Spending per category, largest first (see `spendByCategory`). */
  slices: SpendSlice[];
  /** Sum of the slices; shown in the middle of the ring. */
  total: number;
  /** "YYYY-MM" the figures belong to. */
  month: string;
  /** Spending in the month before, for the comparison pill. `null` while unknown. */
  previousTotal: number | null;
  /** Set when only the latest expenses could be loaded: how many the chart is based on. */
  partialCount: number | null;
  /** When set, a selected category offers "See transactions" and calls this with the stored category name. */
  onOpenCategory?: (category: string) => void;
};

const DONUT_SIZE = spacing.xxxl * 3;
const DONUT_THICKNESS = spacing.lg + 2;
const DOT = spacing.sm + 2;
/** Above this system font scale the legend moves under the ring instead of beside it. */
const STACK_FONT_SCALE = 1.15;

/**
 * "Where it went": one card with a donut of this month's spending by category and, beside it, a legend that names every
 * slice (name and share). A legend row is the touch target for its slice: it is focused in the ring, the centre shows its
 * amount and "See <category> transactions" opens the ledger for it. The first (largest) category starts focused; tapping
 * it again, or "Show all", clears the focus. All numbers are sums of the loaded transactions.
 */
export function SpendingBreakdown({ slices, total, month, previousTotal, partialCount, onOpenCategory }: Props) {
  const { t } = useTranslation('finance');
  const { fontScale } = useWindowDimensions();
  const palette = useDonutColors(slices.length, 'finance');
  const [selected, setSelected] = useState<number | null>(0);
  const percent = useMemo(() => new Intl.NumberFormat(getDeviceLocale(), { style: 'percent', maximumFractionDigits: 0 }), []);
  const stacked = fontScale > STACK_FONT_SCALE;

  const rows = slices.map((slice, i) => ({
    key: slice.category ?? '__rest__',
    label: slice.category === null ? t('overview.otherCategories') : categoryLabel(slice.category),
    value: slice.value,
    share: total > 0 ? slice.value / total : 0,
    color: palette[i],
  }));
  const focus = selected !== null ? (rows[selected] ?? null) : null;
  const focusCategory = selected !== null ? (slices[selected]?.category ?? null) : null;

  const change = previousTotal === null ? null : percentChange(total, previousTotal);
  const lessThanBefore = change !== null && change < 0;

  const spoken = [
    t('overview.spendingA11y', { total: formatMoney(total) }),
    change !== null && change !== 0 ? (lessThanBefore ? t('overview.lessThanLast', { percent: Math.abs(change) }) : t('overview.moreThanLast', { percent: change })) : null,
    partialCount !== null ? t('overview.partial', { count: partialCount }) : null,
  ]
    .filter(Boolean)
    .join('. ');

  const donut = (
    <DonutChart
      segments={rows.map((r) => ({ label: r.label, value: r.value }))}
      size={DONUT_SIZE}
      thickness={DONUT_THICKNESS}
      accent="finance"
      selectedIndex={selected}
      label={spoken}>
      <Text variant="title" weight="bold" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {formatMoney(focus ? focus.value : total, { compact: true })}
      </Text>
      <Text variant="overline" color={focus ? 'primaryAccent' : 'textMuted'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {focus ? t('overview.centerShare', { category: focus.label, percent: percent.format(focus.share) }) : t('overview.spent')}
      </Text>
    </DonutChart>
  );

  const legend = (
    <View style={{ flex: stacked ? undefined : 1, alignSelf: 'stretch', gap: spacing.xs }}>
      {rows.map((r, i) => {
        const active = selected === i;
        return (
          <PressableScale
            key={r.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t('overview.sliceA11y', { name: r.label, percent: percent.format(r.share), amount: formatMoney(r.value) })}
            accessibilityHint={t('overview.sliceHint')}
            scaleTo={1}
            ringRadius={radius.md}
            hitSlop={{ top: 2, bottom: 2 }}
            onPress={() => {
              haptics.select();
              setSelected((current) => (current === i ? null : i));
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              minHeight: layout.minTouchTarget - spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: active ? withAlpha(r.color, 0.45) : 'transparent',
              backgroundColor: active ? withAlpha(r.color, 0.14) : 'transparent',
              opacity: selected === null || active ? 1 : 0.7,
            }}>
            <View style={{ width: DOT, height: DOT, borderRadius: radius.pill, backgroundColor: r.color }} />
            <Text variant="label" weight={active ? 'bold' : 'regular'} numberOfLines={2} style={{ flex: 1 }}>
              {r.label}
            </Text>
            <Text variant="caption" weight={active ? 'bold' : 'semiBold'} numeric color={active ? 'text' : 'textSecondary'}>
              {percent.format(r.share)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );

  return (
    <Card rounded="xl" padding="none" style={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md }}>
        <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2} style={{ flexShrink: 1 }}>
          {t('overview.whereItWent')}
        </Text>
        <Overline style={{ flexShrink: 0 }}>{monthLabel(month)}</Overline>
      </View>

      {change !== null && change !== 0 ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          <TrendPill text={`${Math.abs(change)}%`} direction={lessThanBefore ? 'down' : 'up'} good={lessThanBefore} />
          <Text variant="caption" color="textSecondary">
            {t('overview.vsLastMonth')}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: 'center', gap: spacing.lg }}>
        {donut}
        {legend}
      </View>

      {focus ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: stacked ? 'column' : 'row', gap: spacing.sm }}>
          {onOpenCategory && focusCategory ? (
            <Button
              title={t('overview.seeCategory', { category: focus.label })}
              size="md"
              variant="primary"
              rightIcon="arrow-forward"
              onPress={() => onOpenCategory(focusCategory)}
              style={{ flex: stacked ? undefined : 1 }}
            />
          ) : null}
          <Button
            title={t('overview.showAll')}
            size="md"
            variant="tertiary"
            fullWidth={stacked || !(onOpenCategory && focusCategory)}
            onPress={() => setSelected(null)}
          />
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
