import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { View } from 'react-native';

import { budgetPercent } from '@/components/home/today';
import { Section, SectionHead } from '@/components/home/section';
import { GlassCard, useGlass } from '@/components/home/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { DonutChart } from '@/components/viz/donut-chart';
import { useDonutColors } from '@/components/viz/tones';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { useSubscriptions } from '@/features/finance/hooks';
import type { Subscription } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, useTheme } from '@/theme';

const compact = (n: number) => formatMoney(n, { compact: true });
const DONUT = 156;

/** The next renewals that are due, soonest first (active ones only), at most `limit`. */
function upcomingOf(subs: Subscription[] | undefined, limit: number): Subscription[] {
  return (subs ?? [])
    .filter((sub) => sub.status === 'active' && typeof sub.daysUntilRenewal === 'number')
    .sort((a, b) => (a.daysUntilRenewal ?? 0) - (b.daysUntilRenewal ?? 0))
    .slice(0, limit);
}

/** One renewal as a quiet tile inside the glass "Upcoming" panel: amount, name and when. */
function UpcomingTile({ sub, onPress }: { sub: Subscription; onPress: () => void }) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const glass = useGlass();
  const days = sub.daysUntilRenewal ?? 0;
  const when = days === 0 ? t('upcoming.today') : days > 0 ? t('upcoming.inDays', { count: days }) : t('upcoming.overdueBy', { count: Math.abs(days) });
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('upcoming.tileLabel', { name: sub.name, amount: formatMoney(sub.amount), when })}
      accessibilityHint={t('upcoming.open')}
      haptic="tap"
      ringRadius={radius.lg}
      onPress={onPress}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: layout.minTouchTarget * 2,
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: glass.innerBorder,
        backgroundColor: glass.inner,
      }}>
      <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {compact(sub.amount)}
      </Text>
      <View style={{ gap: 2 }}>
        <Text variant="label" weight="semiBold" numberOfLines={1}>
          {sub.name}
        </Text>
        <Text variant="caption" numberOfLines={1} style={{ color: days < 0 ? colors.errorText : colors.textSecondary }}>
          {when}
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * This month's money: a donut of where income went (spent, invested, what is left) with what is left in the middle and a
 * legend you can tap to focus a slice; the budget bar when one exists; and a white "Upcoming" panel with the next
 * subscription renewals. The cards open Finance.
 */
export const MoneyCard = memo(function MoneyCard({ month, today, index }: { month: Dashboard['month']; today?: Dashboard['today']; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { colors } = useTheme();
  const subscriptions = useSubscriptions();
  const glass = useGlass();
  const [selected, setSelected] = useState<number | null>(null);

  const finance = today?.finance;
  const percent = finance ? budgetPercent(finance) : null;
  const over = finance ? finance.budgetSpent > finance.budgetTotal : false;
  const left = month.income - month.expense - month.investment;

  const parts = useMemo(
    () => [
      { key: 'spent', label: t('money.spentShort'), value: month.expense },
      { key: 'invested', label: t('money.investedShort'), value: month.investment },
      { key: 'left', label: t('money.left'), value: Math.max(0, left) },
    ],
    [t, month.expense, month.investment, left],
  );
  const palette = useDonutColors(parts.length, 'finance');
  const base = Math.max(month.income, month.expense + month.investment);
  const shown = selected === null ? null : parts[selected];
  const upcoming = upcomingOf(subscriptions.data?.data, 2);

  return (
    <Section index={index}>
      <SectionHead
        title={t('money.title')}
        description={t('money.description')}
        actionLabel={t('month.seeAll')}
        actionAccessibilityLabel={t('month.seeAllLabel')}
        onActionPress={() => router.push('/finance')}
      />
      <GlassCard padding={spacing.lg} style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <DonutChart
            segments={parts.map((part, i) => ({ label: part.label, value: part.value, color: palette[i] }))}
            total={base > 0 ? base : undefined}
            selectedIndex={selected}
            size={DONUT}
            thickness={20}
            accent="finance"
            label={t('money.donutLabel')}>
            <AnimatedNumber
              value={shown ? shown.value : Math.abs(left)}
              format={(n) => compact(Math.round(n))}
              variant="title"
              weight="bold"
              accessibilityLabel={compact(shown ? shown.value : Math.abs(left))}
            />
            <Text variant="overline" color="textMuted" numberOfLines={1}>
              {shown ? shown.label : left < 0 ? t('money.overspent') : t('money.left')}
            </Text>
          </DonutChart>
          <View style={{ flex: 1, gap: spacing.xs }}>
            {parts.map((part, i) => {
              const on = selected === i;
              return (
                <PressableScale
                  key={part.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t('money.selectedSummary', { label: part.label, amount: formatMoney(part.value), percent: base > 0 ? Math.round((part.value / base) * 100) : 0 })}
                  accessibilityHint={t('money.legendHint')}
                  scaleTo={0.98}
                  ringRadius={radius.md}
                  onPress={() => {
                    haptics.select();
                    setSelected(on ? null : i);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: layout.minTouchTarget, opacity: selected === null || on ? 1 : 0.45 }}>
                  <View style={{ width: spacing.md, height: spacing.md, borderRadius: radius.pill, backgroundColor: palette[i] }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="overline" color="textMuted" numberOfLines={1}>
                      {part.label}
                    </Text>
                    <Text variant="label" weight="bold" numeric numberOfLines={1}>
                      {compact(part.value)}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {percent !== null && finance ? (
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <Text variant="label" weight="semiBold">
                {t('money.budgetUsed', { percent })}
              </Text>
              <Text variant="caption" color="textSecondary" numeric>
                {over ? t('money.budgetOver', { amount: compact(finance.budgetSpent - finance.budgetTotal), total: compact(finance.budgetTotal) }) : t('money.budgetLeft', { amount: compact(finance.budgetTotal - finance.budgetSpent), total: compact(finance.budgetTotal) })}
              </Text>
            </View>
            <ProgressBar percent={percent} color={over ? colors.errorText : percent >= 80 ? colors.warningText : colors.successText} height={10} trackColor={glass.inner} />
          </View>
        ) : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('money.setBudget')}
            haptic="tap"
            ringRadius={radius.md}
            onPress={() => router.push('/finance/budget')}
            style={{ alignSelf: 'flex-start', minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primaryAccent} />
            <Text variant="label" weight="semiBold" color="primaryAccent">
              {t('money.setBudget')}
            </Text>
          </PressableScale>
        )}
      </GlassCard>

      {upcoming.length > 0 ? (
        <GlassCard padding={spacing.lg} style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md }}>
            <Text variant="title" weight="bold" accessibilityRole="header">
              {t('upcoming.title')}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {t('upcoming.description')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {upcoming.map((sub) => (
              <UpcomingTile key={sub.id} sub={sub} onPress={() => router.push('/finance?section=subscriptions')} />
            ))}
          </View>
        </GlassCard>
      ) : null}
    </Section>
  );
});
