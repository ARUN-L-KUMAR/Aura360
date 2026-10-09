import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import type { MacroTargets, MealTotals } from '@/features/food/types';
import { radius, spacing, useTheme } from '@/theme';

const SIZE = 190;
const STROKE = 13;
const GAP = 5;

type Ring = { key: string; label: string; color: string; current: number; target: number; unit: string };

export function MacroRings({ totals, targets }: { totals: MealTotals; targets: MacroTargets }) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';

  const rings: Ring[] = [
    { key: 'calories', label: 'Calories', color: '#f97316', current: totals.calories, target: targets.calories, unit: 'kcal' },
    { key: 'protein', label: 'Protein', color: '#3b82f6', current: totals.protein, target: targets.protein, unit: 'g' },
    { key: 'carbs', label: 'Carbs', color: '#eab308', current: totals.carbs, target: targets.carbs, unit: 'g' },
    { key: 'fats', label: 'Fats', color: '#ec4899', current: totals.fats, target: targets.fats, unit: 'g' },
  ];

  const remaining = Math.round(targets.calories - totals.calories);
  const calPercent = targets.calories > 0 ? Math.round((totals.calories / targets.calories) * 100) : 0;

  return (
    <View style={{ gap: spacing.lg }}>
      <View
        style={{ alignItems: 'center', justifyContent: 'center' }}
        accessible
        accessibilityLabel={rings.map((r) => `${r.label} ${Math.round(r.current)} of ${r.target} ${r.unit}`).join(', ')}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Svg width={SIZE} height={SIZE}>
            {rings.map((ring, index) => {
              const ringRadius = SIZE / 2 - STROKE / 2 - index * (STROKE + GAP);
              const circumference = 2 * Math.PI * ringRadius;
              const progress = ring.target > 0 ? Math.min(1, ring.current / ring.target) : 0;
              return (
                <G key={ring.key}>
                  <Circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={ringRadius}
                    stroke={ring.color}
                    strokeOpacity={isDark ? 0.16 : 0.12}
                    strokeWidth={STROKE}
                    fill="none"
                  />
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

        <View style={{ position: 'absolute', alignItems: 'center', gap: 2 }}>
          <Text variant="display" color={remaining < 0 ? 'danger' : 'text'} style={{ fontSize: 28, lineHeight: 32 }}>
            {Math.abs(remaining).toLocaleString()}
          </Text>
          <Text variant="caption" muted style={{ fontWeight: '500' }}>
            {remaining < 0 ? 'kcal over' : 'kcal remaining'}
          </Text>
          <View
            style={{
              marginTop: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radius.pill,
              backgroundColor: `${rings[0].color}20`,
            }}>
            <Text variant="caption" style={{ color: rings[0].color, fontWeight: '700', fontSize: 11 }}>
              {calPercent}% goal
            </Text>
          </View>
        </View>
      </View>

      {/* Macro Pills Grid */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {rings.map((ring) => {
          const pct = ring.target > 0 ? Math.min(100, Math.round((ring.current / ring.target) * 100)) : 0;
          return (
            <View
              key={ring.key}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.sm,
                paddingHorizontal: 4,
                borderRadius: radius.md,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderWidth: 1,
                borderColor: `${ring.color}25`,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ring.color }} />
                <Text variant="caption" muted style={{ fontSize: 11, fontWeight: '600' }}>
                  {ring.label}
                </Text>
              </View>
              <Text variant="label" style={{ fontWeight: '700', fontSize: 13 }}>
                {Math.round(ring.current)}
                <Text variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                  {ring.unit === 'g' ? 'g' : ''}
                </Text>
              </Text>
              {/* Mini progress bar */}
              <View
                style={{
                  width: '80%',
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  marginTop: 4,
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    borderRadius: 1.5,
                    backgroundColor: ring.color,
                  }}
                />
              </View>
              <Text variant="caption" muted style={{ fontSize: 10, marginTop: 2 }}>
                /{ring.target}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

