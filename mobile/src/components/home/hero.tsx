import { useRouter } from 'expo-router';
import { memo, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

import { activeDays, activitySeries, streakOf, todayIndexOf } from '@/components/home/derive';
import { budgetPercent, percentOf } from '@/components/home/today';
import { WEEKLY_GOAL_MINUTES } from '@/components/fitness/activity';
import { PremiumHero } from '@/components/ui/premium-hero';
import { PressableScale } from '@/components/ui/pressable-scale';
import { HeroFigure } from '@/components/ui/section-kit';
import { Text } from '@/components/ui/text';
import { ProgressRing } from '@/components/viz/progress-ring';
import type { Dashboard, DashboardToday } from '@/features/dashboard/use-dashboard';
import { useTargets } from '@/features/food/prefs';
import type { ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { formatMoney, greeting, todayIso } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  /** First name of the signed-in person; empty falls back to a neutral word. */
  name: string;
  /** Without data (loading, error, offline) the hero shows the greeting only. */
  data?: Dashboard;
};

const RING = spacing.xxxl + spacing.xl; // 72
const RING_THICKNESS = spacing.sm - 1;

type RingTileProps = {
  accent: ModuleKey;
  value: number;
  max: number;
  /** Short text inside the ring. */
  center: string;
  label: string;
  /** Muted line under the label ("1,450 kcal"). */
  caption: string;
  /** Full sentence for screen readers. */
  spoken: string;
  hint: string;
  onPress: () => void;
};

/** One frosted goal ring on the hero. The whole tile is a button into the module it measures. */
function RingTile({ accent, value, max, center, label, caption, spoken, hint, onPress }: RingTileProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${spoken}`}
      accessibilityHint={hint}
      haptic="tap"
      ringRadius={radius.lg}
      onPress={onPress}
      style={{ flexGrow: 1, flexBasis: 0, minWidth: spacing.xxxl * 2, alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.heroChip }}>
      <ProgressRing value={value} max={max} size={RING} thickness={RING_THICKNESS} accent={accent} label={label} valueText={spoken}>
        <Text variant="label" weight="bold" numeric style={{ color: colors.onHero }}>
          {center}
        </Text>
      </ProgressRing>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text variant="overline" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
          {label}
        </Text>
        <Text variant="caption" weight="semiBold" numeric numberOfLines={1} style={{ color: colors.onHero }}>
          {caption}
        </Text>
      </View>
    </PressableScale>
  );
}

function TodayRings({ today }: { today: DashboardToday }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { targets } = useTargets();
  const { calories } = today.food;
  const { minutesWeek } = today.fitness;
  const budget = budgetPercent(today.finance);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <RingTile
        accent="food"
        value={calories}
        max={targets.calories}
        center={t('today.rings.percent', { value: percentOf(calories, targets.calories) })}
        label={t('today.rings.calories')}
        caption={t('today.rings.kcalShort', { value: Math.round(calories).toLocaleString() })}
        spoken={t('today.rings.caloriesValue', { done: Math.round(calories), goal: targets.calories })}
        hint={t('today.rings.ringHint', { module: t('today.rings.calories') })}
        onPress={() => router.push('/food')}
      />
      <RingTile
        accent="fitness"
        value={minutesWeek}
        max={WEEKLY_GOAL_MINUTES}
        center={t('today.rings.percent', { value: percentOf(minutesWeek, WEEKLY_GOAL_MINUTES) })}
        label={t('today.rings.move')}
        caption={t('today.rings.minShort', { value: Math.round(minutesWeek) })}
        spoken={t('today.rings.moveValue', { done: Math.round(minutesWeek), goal: WEEKLY_GOAL_MINUTES })}
        hint={t('today.rings.ringHint', { module: t('today.rings.move') })}
        onPress={() => router.push('/fitness')}
      />
      <RingTile
        accent="finance"
        value={budget ?? 0}
        max={100}
        center={budget === null ? '–' : t('today.rings.percent', { value: budget })}
        label={t('today.rings.budget')}
        caption={budget === null ? t('today.rings.setBudget') : formatMoney(today.finance.budgetSpent, { compact: true })}
        spoken={budget === null ? t('today.rings.budgetNone') : t('today.rings.budgetValue', { percent: budget })}
        hint={t('today.rings.ringHint', { module: t('today.rings.budget') })}
        onPress={() => router.push(budget === null ? '/finance/budget' : '/finance')}
      />
    </View>
  );
}

/** What the hero says under the name: today's meals and spending, or a nudge when nothing is logged. */
function subtitleFor(today: DashboardToday, t: ReturnType<typeof useTranslation<'home'>>['t']): string {
  const parts: string[] = [];
  if (today.food.meals > 0) parts.push(t('today.subtitleMeals', { count: today.food.meals }));
  if (today.finance.spentToday > 0) parts.push(t('today.subtitleSpent', { amount: formatMoney(today.finance.spentToday, { compact: true }) }));
  return parts.length > 0 ? parts.join(' · ') : t('today.subtitleQuiet');
}

type HeroStat = { key: string; label: string; value: number };

/**
 * The web dashboard's hero: a greeting chip, "Welcome back," with the first name in a gradient, a line about today and
 * three tappable goal rings (calories, active minutes this week, budget used). A server without the `today` block gets
 * the older three figures (today's activity, streak, active days) instead.
 */
export const HomeHero = memo(function HomeHero({ name, data }: Props) {
  const { t } = useTranslation('home');

  const stats = useMemo<HeroStat[]>(() => {
    if (!data || data.today) return [];
    const series = activitySeries(data.chart);
    const todayIndex = todayIndexOf(data.chart, todayIso());
    const streak = streakOf(series, todayIndex);
    const list: HeroStat[] = [{ key: 'today', label: t('hero.today'), value: todayIndex >= 0 ? series[todayIndex] : 0 }];
    if (streak > 0) list.push({ key: 'streak', label: t('hero.streak'), value: streak });
    list.push({ key: 'week', label: t('hero.week'), value: activeDays(series) });
    return list;
  }, [data, t]);

  let body: ReactNode = null;
  if (data?.today) body = <TodayRings today={data.today} />;
  else if (stats.length > 0)
    body = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {stats.map((stat) => (
          <HeroFigure key={stat.key} label={stat.label} value={stat.value} />
        ))}
      </View>
    );

  return (
    <PremiumHero
      chip={{ icon: 'flash', label: greeting() }}
      title={t('hero.title')}
      accentWord={name || t('hero.fallbackName')}
      subtitle={data?.today ? subtitleFor(data.today, t) : data ? t('hero.subtitle', { count: data.totalActivities }) : t('hero.subtitleIdle')}>
      {body}
    </PremiumHero>
  );
});
