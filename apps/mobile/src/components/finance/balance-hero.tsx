import { ArrowDown, ArrowUp, Minus, Pencil } from 'lucide-react-native';
import { memo, useMemo, useState } from 'react';
import { View } from 'react-native';

import { withAlpha } from '@/components/ui/logic';
import { Glow } from '@/components/ui/glow';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { lastDays, netFlow, seriesStats } from '@/components/viz/scrub';
import { ScrubChart, type ScrubChartTones } from '@/components/viz/scrub-chart';
import { useTranslation } from '@/i18n';
import { formatDay, formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { categoryAccent, layout, palettes, radius, spacing, useTheme } from '@/theme';

type Range = 'week' | 'month';

type Props = {
  /** Money on hand across the accounts. */
  balance: number;
  /** This month's income and spending; their difference is the net-flow pill. */
  income: number;
  expense: number;
  /** Spending per day of `month`, day 1 first, up to today. */
  daily: number[];
  /** "YYYY-MM" the daily figures belong to. */
  month: string;
  /** The month's spending is still loading, so the curve is not final. */
  loading?: boolean;
  /** Count the balance up (first view in the session). */
  countUp: boolean;
  onEditBalances?: () => void;
};

const WEEK = 7;
const GLOW = 220;
/** A balance this long no longer fits the hero size next to the pill on a narrow phone. */
const LONG_BALANCE = 11;
const ARROW = 14;

/**
 * The Finance overview hero: money on hand in large type, the month's net flow as a pill (arrow and colour, never colour
 * alone) and a curve of what was spent each day, which the finger can scrub. It is the dark glass card of the other
 * module heroes (see PremiumHero), so it is dark in both themes and uses the dark palette for everything drawn on it.
 * The curve is spending per day, not a history of the balance: the balance is not stored per day.
 */
export const BalanceHero = memo(function BalanceHero({ balance, income, expense, daily, month, loading, countUp, onEditBalances }: Props) {
  const { t } = useTranslation('finance');
  const { colors, accent } = useTheme();
  const [range, setRange] = useState<Range>('month');

  // Everything drawn on the card comes from the dark palette, because the card is dark whatever the theme is.
  const onDark = palettes.dark;
  const brand = categoryAccent('finance', 'dark');
  const frame = accent('finance').solid;

  const canNarrow = daily.length > WEEK;
  const active: Range = canNarrow ? range : 'month';
  const slice = useMemo(() => (active === 'week' ? lastDays(daily, WEEK) : { values: daily, offset: 0 }), [active, daily]);
  const stats = useMemo(() => seriesStats(slice.values), [slice.values]);
  const dayLabel = (index: number) => formatDay(`${month}-${String(slice.offset + index + 1).padStart(2, '0')}`);

  const net = netFlow(income, expense);
  const netTone = net.direction === 'up' ? onDark.successText : net.direction === 'down' ? onDark.errorText : colors.onHeroMuted;
  const netBackground = net.direction === 'up' ? withAlpha(onDark.success, 0.18) : net.direction === 'down' ? withAlpha(onDark.error, 0.18) : colors.heroChip;
  const NetIcon = net.direction === 'up' ? ArrowUp : net.direction === 'down' ? ArrowDown : Minus;
  const netText = formatMoney(Math.abs(net.amount), { compact: true });
  const netSpoken = net.direction === 'up' ? t('hero.netUpA11y', { amount: formatMoney(Math.abs(net.amount)) }) : net.direction === 'down' ? t('hero.netDownA11y', { amount: formatMoney(Math.abs(net.amount)) }) : t('hero.netFlatA11y');

  const balanceText = formatMoney(Math.round(balance));
  const hasSpending = stats.peak > 0;
  const chartLabel = hasSpending
    ? t('hero.chartA11y', {
        range: active === 'week' ? t('hero.rangeWeekA11y') : t('hero.rangeMonthA11y'),
        peak: formatMoney(stats.peak),
        day: dayLabel(stats.peakIndex),
        average: formatMoney(Math.round(stats.average)),
      })
    : t('hero.chartEmptyA11y');

  const tones: ScrubChartTones = {
    line: brand.solid,
    fill: brand.solid,
    guide: withAlpha(colors.onHero, 0.35),
    halo: withAlpha(brand.solid, 0.3),
    dot: colors.onHero,
    tooltipBackground: colors.onHero,
    tooltipText: colors.heroSurface,
  };

  return (
    <View
      style={{
        borderRadius: radius.xl,
        backgroundColor: colors.heroSurface,
        borderWidth: 1,
        borderColor: withAlpha(frame, 0.45),
        overflow: 'hidden',
        padding: spacing.xl,
        gap: spacing.lg,
      }}>
      <Glow color={frame} opacity={0.42} size={GLOW} style={{ top: -GLOW * 0.35, end: -GLOW * 0.35 }} />
      <Glow color={colors.heroGlowB} opacity={0.2} size={GLOW} style={{ bottom: -GLOW * 0.4, start: -GLOW * 0.4 }} />

      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.md }}>
          <Text variant="overline" numberOfLines={2} accessibilityRole="header" style={{ color: colors.onHeroMuted, flexShrink: 1 }}>
            {t('hero.availableBalance')}
          </Text>
          {onEditBalances ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('metrics.editBalancesA11y')}
              haptic="select"
              ringRadius={radius.pill}
              onPress={onEditBalances}
              style={{
                minHeight: layout.minTouchTarget,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: colors.heroChip,
                borderWidth: 1,
                borderColor: colors.heroChipBorder,
              }}>
              <Pencil size={ARROW} color={colors.onHero} />
              <Text variant="caption" weight="bold" style={{ color: colors.onHero }}>
                {t('metrics.editBalances')}
              </Text>
            </PressableScale>
          ) : null}
        </View>

        <View
          accessible
          accessibilityLabel={`${t('hero.balanceA11y', { amount: formatMoney(balance) })}. ${netSpoken}`}
          style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.md, rowGap: spacing.sm }}>
          <AnimatedNumber
            value={balance}
            from={countUp ? 0 : balance}
            format={(n) => formatMoney(Math.round(n))}
            variant={balanceText.length >= LONG_BALANCE ? 'display' : 'hero'}
            color={colors.onHero}
            accessibilityLabel={formatMoney(balance)}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.pill,
              backgroundColor: netBackground,
            }}>
            <NetIcon size={ARROW} color={netTone} strokeWidth={3} />
            <Text variant="caption" weight="bold" numeric numberOfLines={1} style={{ color: netTone }}>
              {t('hero.netPill', { amount: netText })}
            </Text>
          </View>
        </View>
      </View>

      <ScrubChart
        // A new range starts again from its latest day.
        key={active}
        values={slice.values}
        tooltip={(index) => t('hero.tooltip', { day: dayLabel(index), amount: formatMoney(slice.values[index] ?? 0) })}
        tones={tones}
        label={chartLabel}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.md, rowGap: spacing.sm }}>
        <View style={{ flexShrink: 1, flexGrow: 1, flexBasis: layout.minTouchTarget * 3, gap: 2 }}>
          <Text variant="label" weight="semiBold" style={{ color: colors.onHero }}>
            {t('hero.spendingPerDay')}
          </Text>
          <Text variant="caption" style={{ color: colors.onHeroMuted }}>
            {loading ? t('hero.loading') : hasSpending ? t('hero.scrubHint') : t('hero.noSpending')}
          </Text>
        </View>
        {canNarrow ? (
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('hero.rangeLabel')}
            style={{ flexDirection: 'row', gap: spacing.xs, padding: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.heroChip }}>
            {(['week', 'month'] as const).map((value) => {
              const selected = value === active;
              return (
                <PressableScale
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={value === 'week' ? t('hero.rangeWeekA11y') : t('hero.rangeMonthA11y')}
                  accessibilityState={{ checked: selected }}
                  scaleTo={1}
                  ringRadius={radius.pill}
                  hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
                  onPress={() => {
                    if (selected) return;
                    haptics.select();
                    setRange(value);
                  }}
                  style={{
                    minHeight: layout.minTouchTarget - spacing.sm,
                    minWidth: layout.minTouchTarget,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    backgroundColor: selected ? brand.solid : 'transparent',
                  }}>
                  <Text variant="caption" weight="bold" style={{ color: selected ? brand.onSolid : colors.onHeroMuted }}>
                    {value === 'week' ? t('hero.rangeWeek') : t('hero.rangeMonth')}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
});
