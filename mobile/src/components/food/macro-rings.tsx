import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { withAlpha } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import type { MacroTargets, MealTotals } from '@/features/food/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

const SIZE = 208;
const STROKE = 10;
const GAP = 4;

type Ring = { key: string; label: string; color: string; current: number; target: number; unit: string };

/** Four concentric rings (calories outermost) plus a tile per macro. Colours come from the theme, never literals. */
export function MacroRings({ totals, targets }: { totals: MealTotals; targets: MacroTargets }) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('food');
  const number = (value: number) => value.toLocaleString(getDeviceLocale());

  const rings: Ring[] = [
    { key: 'calories', label: t('rings.calories'), color: accent('food').solid, current: totals.calories, target: targets.calories, unit: 'kcal' as const },
    { key: 'protein', label: t('rings.protein'), color: colors.secondary, current: totals.protein, target: targets.protein, unit: 'g' },
    { key: 'carbs', label: t('rings.carbs'), color: colors.success, current: totals.carbs, target: targets.carbs, unit: 'g' },
    { key: 'fats', label: t('rings.fats'), color: colors.tertiary, current: totals.fats, target: targets.fats, unit: 'g' },
  ];

  const remaining = Math.round(targets.calories - totals.calories);
  const over = remaining < 0;
  const calPercent = targets.calories > 0 ? Math.round((totals.calories / targets.calories) * 100) : 0;

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{ alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}
        accessible
        accessibilityLabel={[
          over ? t('rings.overSpoken', { count: Math.abs(remaining) }) : t('rings.remainingSpoken', { count: remaining }),
          ...rings.map((r) => t(r.unit === 'g' ? 'rings.ofGramsSpoken' : 'rings.ofKcalSpoken', { label: r.label, current: Math.round(r.current), target: r.target })),
        ].join('. ')}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Svg width={SIZE} height={SIZE}>
            {rings.map((ring, index) => {
              const ringRadius = SIZE / 2 - STROKE / 2 - index * (STROKE + GAP);
              const circumference = 2 * Math.PI * ringRadius;
              const progress = ring.target > 0 ? Math.min(1, ring.current / ring.target) : 0;
              return (
                <G key={ring.key}>
                  <Circle cx={SIZE / 2} cy={SIZE / 2} r={ringRadius} stroke={withAlpha(ring.color, 0.2)} strokeWidth={STROKE} fill="none" />
                  <Circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={ringRadius}
                    stroke={ring.color}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference * (1 - progress)}
                  />
                </G>
              );
            })}
          </Svg>
        </View>

        {/* Centre text sits inside the innermost ring (about 100pt across). */}
        <View style={{ position: 'absolute', alignItems: 'center', maxWidth: 96 }}>
          <Text variant="headline" numeric color={over ? 'errorText' : 'text'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {number(Math.abs(remaining))}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={2} style={{ textAlign: 'center' }}>
            {over ? t('rings.kcalOver') : t('rings.kcalLeft')}
          </Text>
        </View>
      </View>

      <View style={{ alignSelf: 'center' }}>
        <Tag label={t('rings.percentOfGoal', { value: calPercent })} accent="food" size="md" />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {rings.map((ring) => {
          const pct = ring.target > 0 ? Math.min(100, Math.round((ring.current / ring.target) * 100)) : 0;
          return (
            <View
              key={ring.key}
              accessible
              accessibilityLabel={t(ring.unit === 'g' ? 'rings.tileGramsSpoken' : 'rings.tileKcalSpoken', { label: ring.label, current: Math.round(ring.current), target: ring.target, pct })}
              style={{
                flexGrow: 1,
                flexBasis: 72,
                gap: spacing.xs,
                padding: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: colors.cardMuted,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: spacing.sm, height: spacing.sm, borderRadius: radius.pill, backgroundColor: ring.color }} />
                <Text variant="caption" weight="semiBold" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {ring.label}
                </Text>
              </View>
              <Text variant="label" weight="semiBold" numeric numberOfLines={1}>
                {ring.unit === 'g' ? t('units.grams', { value: Math.round(ring.current) }) : Math.round(ring.current)}
              </Text>
              <ProgressBar percent={pct} color={ring.color} height={4} />
              <Text variant="caption" numeric color="textSecondary" numberOfLines={1}>
                {t('rings.ofTarget', { value: ring.unit === 'g' ? t('units.grams', { value: ring.target }) : ring.target })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
