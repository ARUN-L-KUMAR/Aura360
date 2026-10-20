import { useRouter } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { WEEKLY_GOAL_MINUTES } from '@/components/fitness/activity';
import { budgetPercent, dayScore } from '@/components/home/today';
import { withAlpha } from '@/components/ui/logic';
import { Gradient } from '@/components/ui/gradient';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { GaugeArc } from '@/components/viz/gauge-arc';
import type { DashboardToday } from '@/features/dashboard/use-dashboard';
import { useTargets } from '@/features/food/prefs';
import type { ScoreGoals } from '@/features/home/layout';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { categoryAccent, layout, radius, spacing, typeScale, useTheme, type ModuleKey } from '@/theme';

/** The big score is the hero size of the type scale, enlarged: it is the one number the card is about. */
const SCORE_SCALE = 1.5;
const SCORE_SIZE = typeScale.hero.fontSize * SCORE_SCALE;
const SCORE_LINE = typeScale.hero.lineHeight * SCORE_SCALE;

type Chip = {
  key: string;
  accent: ModuleKey;
  label: string;
  value: string;
  sub: string;
  spoken: string;
  hint: string;
  href: '/food' | '/fitness' | '/finance' | '/finance/budget';
};

/** One goal under the gauge: its name, how far along it is, and a tap into its module. */
function GoalChip({ chip, onPress }: { chip: Chip; onPress: () => void }) {
  const { colors } = useTheme();
  // The card is dark in both schemes, so the goal colours are the bright (dark-scheme) shades.
  const tone = categoryAccent(chip.accent, 'dark');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${chip.label}. ${chip.spoken}`}
      accessibilityHint={chip.hint}
      haptic="tap"
      scaleTo={0.97}
      ringRadius={radius.lg}
      onPress={onPress}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        minHeight: layout.minTouchTarget + spacing.xl,
        gap: spacing.xs / 2,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: withAlpha(tone.solid, 0.32),
        backgroundColor: withAlpha(tone.solid, 0.1),
      }}>
      <Text variant="overline" numberOfLines={1} style={{ color: tone.solid }}>
        {chip.label}
      </Text>
      <Text variant="title" weight="bold" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: colors.onHero }}>
        {chip.value}
      </Text>
      <Text variant="caption" numberOfLines={2} style={{ color: colors.onHeroMuted }}>
        {chip.sub}
      </Text>
    </PressableScale>
  );
}

/**
 * The day at a glance: a half-circle gauge with the day score (the average of the calorie, active-minute and budget
 * goals) and, under it, one tappable chip per goal. Dark in both themes, like the web's hero, so the gradient glows.
 */
export const DayGauge = memo(function DayGauge({ today, goals }: { today: DashboardToday; goals: ScoreGoals }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { colors, shades } = useTheme();
  const { targets } = useTargets();

  const budget = budgetPercent(today.finance);
  const calories = today.food.calories;
  const minutes = today.fitness.minutesWeek;
  const score = dayScore({ calories, calorieTarget: targets.calories, minutesWeek: minutes, weeklyGoalMinutes: WEEKLY_GOAL_MINUTES, budget, goals });

  const allChips: Chip[] = [
    {
      key: 'calories',
      accent: 'food',
      label: t('today.rings.calories'),
      value: Math.round(calories).toLocaleString(),
      sub: t('todayCard.caloriesGoal', { goal: targets.calories.toLocaleString() }),
      spoken: t('today.rings.caloriesValue', { done: Math.round(calories), goal: targets.calories }),
      hint: t('todayCard.hint', { module: t('today.rings.calories') }),
      href: '/food',
    },
    {
      key: 'move',
      accent: 'fitness',
      label: t('today.rings.move'),
      value: t('todayCard.moveValue', { done: Math.round(minutes) }),
      sub: t('todayCard.moveGoal', { goal: WEEKLY_GOAL_MINUTES }),
      spoken: t('today.rings.moveValue', { done: Math.round(minutes), goal: WEEKLY_GOAL_MINUTES }),
      hint: t('todayCard.hint', { module: t('today.rings.move') }),
      href: '/fitness',
    },
    {
      key: 'budget',
      accent: 'finance',
      label: t('today.rings.budget'),
      value: budget === null ? t('todayCard.budgetNone') : t('today.rings.percent', { value: budget }),
      sub: budget === null ? t('todayCard.budgetSet') : t('todayCard.budgetSpent', { amount: formatMoney(today.finance.budgetSpent, { compact: true }) }),
      spoken: budget === null ? t('today.rings.budgetNone') : t('today.rings.budgetValue', { percent: budget }),
      hint: t('todayCard.hint', { module: t('today.rings.budget') }),
      href: budget === null ? '/finance/budget' : '/finance',
    },
  ];

  // Only the goals whose module the person keeps on Home are shown and scored.
  const chips = allChips.filter((chip) => (chip.key === 'calories' ? goals.calories : chip.key === 'move' ? goals.move : goals.budget));

  const goalsText = t('gauge.goals', { closed: score.closed, total: score.total });
  const spoken = t('gauge.spoken', {
    percent: score.percent,
    goals: goalsText,
    details: chips.map((chip) => `${chip.label}: ${chip.spoken}`).join('. '),
  });

  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.heroChip,
        backgroundColor: colors.heroSurface,
        overflow: 'hidden',
        padding: spacing.lg,
        gap: spacing.lg,
      }}>
      <Gradient from={withAlpha(shades.primary[500], 0.34)} to={withAlpha(shades.secondary[400], 0)} direction="diagonal" />
      <GaugeArc percent={score.percent} accessibilityLabel={spoken}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <AnimatedNumber
            value={score.percent}
            variant="hero"
            color="onHero"
            style={{ fontSize: SCORE_SIZE, lineHeight: SCORE_LINE, letterSpacing: -SCORE_SIZE / 16 }}
          />
          <Text variant="title" weight="bold" style={{ color: colors.onHeroMuted }}>
            %
          </Text>
        </View>
        <Text variant="overline" numberOfLines={2} style={{ color: colors.onHeroMuted, textAlign: 'center', paddingTop: spacing.xs }}>
          {t('gauge.caption', { goals: goalsText })}
        </Text>
      </GaugeArc>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {chips.map((chip) => (
          <GoalChip key={chip.key} chip={chip} onPress={() => router.push(chip.href)} />
        ))}
      </View>
    </View>
  );
});
