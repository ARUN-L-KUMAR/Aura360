import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { ProgressRing } from '@/components/viz/progress-ring';
import type { MacroTargets, MealTotals } from '@/features/food/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { spacing, useTheme } from '@/theme';

const RING_SIZE = spacing.xxxl * 2 + spacing.lg; // 112, the same ring as the Fitness weekly goal
const RING_THICKNESS = spacing.md;

const percentOf = (current: number, target: number) => (target > 0 ? Math.round((current / target) * 100) : 0);

/**
 * Calorie ring with the day's status beside it, and a quiet bar per macro. Everything is one Food amber: the labels
 * name each macro, so colour never has to. The ring and the rows read as one spoken summary.
 */
export function MacroRings({ totals, targets }: { totals: MealTotals; targets: MacroTargets }) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('food');
  const food = accent('food');
  const number = (value: number) => value.toLocaleString(getDeviceLocale());

  const macros = [
    { key: 'protein', label: t('rings.protein'), current: totals.protein, target: targets.protein },
    { key: 'carbs', label: t('rings.carbs'), current: totals.carbs, target: targets.carbs },
    { key: 'fats', label: t('rings.fats'), current: totals.fats, target: targets.fats },
  ] as const;

  const eaten = Math.round(totals.calories);
  const remaining = Math.round(targets.calories - totals.calories);
  const over = remaining < 0;
  const calPercent = percentOf(totals.calories, targets.calories);

  const spoken = [
    over ? t('rings.overSpoken', { count: Math.abs(remaining) }) : t('rings.remainingSpoken', { count: remaining }),
    t('rings.ofKcalSpoken', { label: t('rings.calories'), current: eaten, target: targets.calories }),
    ...macros.map((m) => t('rings.ofGramsSpoken', { label: m.label, current: Math.round(m.current), target: targets[m.key] })),
  ].join('. ');

  return (
    <View accessible accessibilityLabel={spoken} style={{ gap: spacing.xl }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg }}>
        <ProgressRing
          value={totals.calories}
          max={targets.calories > 0 ? targets.calories : 1}
          size={RING_SIZE}
          thickness={RING_THICKNESS}
          accent="food"
          label={t('rings.calories')}
          valueText={t('rings.ofKcalSpoken', { label: t('rings.calories'), current: eaten, target: targets.calories })}>
          <AnimatedNumber value={calPercent} format={(n) => t('rings.percent', { value: n })} variant="title" weight="bold" />
        </ProgressRing>
        <View style={{ flex: 1, flexBasis: 140, gap: spacing.xs }}>
          <Text variant="overline" color="textMuted">
            {t('rings.calories')}
          </Text>
          <Text variant="body" weight="bold" numeric>
            {t('rings.kcalOfTarget', { eaten: number(eaten), target: number(targets.calories) })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name={over ? 'alert-circle' : 'flag-outline'} size={spacing.lg} color={over ? colors.errorText : food.text} />
            <Text variant="caption" weight="semiBold" numeric style={{ flexShrink: 1, color: over ? colors.errorText : food.text }}>
              {over ? t('rings.kcalOverBy', { value: number(Math.abs(remaining)) }) : t('rings.kcalLeftOf', { value: number(remaining) })}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ gap: spacing.lg }}>
        {macros.map((macro) => {
          const pct = percentOf(macro.current, macro.target);
          return (
            <View key={macro.key} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text variant="overline" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {macro.label}
                </Text>
                <Text variant="label" weight="semiBold" numeric numberOfLines={1}>
                  {t('rings.gramsOfTarget', { current: Math.round(macro.current), target: macro.target })}
                </Text>
              </View>
              <ProgressBar percent={Math.min(100, pct)} accent="food" height={spacing.sm - 2} />
            </View>
          );
        })}
      </View>
    </View>
  );
}
