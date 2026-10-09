import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { MacroRings } from '@/components/food/macro-rings';
import { MealRow, openMeal } from '@/components/food/meal-row';
import { WaterCard } from '@/components/food/water-card';
import { Card } from '@/components/ui/card';
import { toIsoDay } from '@/components/ui/date-field';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useMeals } from '@/features/food/hooks';
import { useTargets, useWater } from '@/features/food/prefs';
import { MEAL_TYPES, sumMeals } from '@/features/food/types';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

function shiftDay(isoDay: string, delta: number) {
  const [year, month, day] = isoDay.split('-').map(Number);
  return toIsoDay(new Date(year, month - 1, day + delta));
}

function dayTitle(isoDay: string) {
  const today = toIsoDay(new Date());
  if (isoDay === today) return 'Today';
  if (isoDay === shiftDay(today, -1)) return 'Yesterday';
  const [year, month, day] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function TodaySection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const today = toIsoDay(new Date());
  const [day, setDay] = useState(today);

  const meals = useMeals(day, day);
  const { targets } = useTargets();
  const { waterMl, addWater } = useWater(day);

  const list = useMemo(() => meals.data ?? [], [meals.data]);
  const totals = useMemo(() => sumMeals(list), [list]);

  return (
    <Screen onRefresh={() => meals.refetch()} refreshing={meals.isRefetching}>
      {header}

      {/* Date Navigation Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          onPress={() => setDay(shiftDay(day, -1))}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.cardMuted : 'transparent',
          })}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setDay(today)}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="calendar-outline" size={16} color={moduleColors.food} />
          <Text variant="heading" style={{ fontSize: 16 }}>
            {dayTitle(day)}
          </Text>
          {day !== today ? (
            <View
              style={{
                marginLeft: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: `${moduleColors.food}25`,
              }}>
              <Text variant="caption" style={{ color: moduleColors.food, fontWeight: '700', fontSize: 10 }}>
                Jump to Today
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          onPress={() => setDay(shiftDay(day, 1))}
          disabled={day >= today}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: day >= today ? 0.3 : 1,
            backgroundColor: pressed ? colors.cardMuted : 'transparent',
          })}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Hero Macro Target Ring Card */}
      <GlassCard glowColor={moduleColors.food} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="nutrition-outline" size={18} color={moduleColors.food} />
            <Text variant="heading" style={{ fontSize: 16 }}>
              Daily Nutrition Target
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/food/targets' as any)} hitSlop={8}>
            <Text variant="caption" style={{ color: moduleColors.food, fontWeight: '700' }}>
              Edit targets
            </Text>
          </Pressable>
        </View>

        <MacroRings totals={totals} targets={targets} />
      </GlassCard>

      {/* Water Hydration Card */}
      <WaterCard waterMl={waterMl} targetMl={targets.waterMl} onAdd={addWater} />

      {meals.isError ? (
        <Card>
          <Text muted>{meals.error instanceof Error ? meals.error.message : "Couldn't load meals."}</Text>
        </Card>
      ) : null}

      {/* Meal Slots Section */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
        <Text variant="heading" style={{ fontSize: 18 }}>
          {"Today's Meals"}
        </Text>

        {MEAL_TYPES.map((slot) => {
          const items = list.filter((meal) => meal.mealType === slot.value);
          const kcal = items.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);
          const slotProt = Math.round(items.reduce((sum, meal) => sum + (meal.protein ? Number(meal.protein) : 0), 0));
          const slotCarbs = Math.round(items.reduce((sum, meal) => sum + (meal.carbs ? Number(meal.carbs) : 0), 0));
          const slotFats = Math.round(items.reduce((sum, meal) => sum + (meal.fats ? Number(meal.fats) : 0), 0));

          return (
            <GlassCard key={slot.value} style={{ gap: spacing.sm, paddingVertical: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.md,
                      backgroundColor: `${moduleColors.food}22`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name={slot.icon} size={18} color={moduleColors.food} />
                  </View>
                  <View>
                    <Text variant="label" style={{ fontWeight: '700' }}>
                      {slot.label}
                    </Text>
                    <Text variant="caption" muted>
                      {items.length === 0 ? 'No items logged' : `${kcal} kcal`}
                      {items.length > 0 && (slotProt > 0 || slotCarbs > 0 || slotFats > 0)
                        ? ` · P:${slotProt}g C:${slotCarbs}g F:${slotFats}g`
                        : ''}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add to ${slot.label}`}
                  onPress={() => openMeal(router, { mealType: slot.value, date: day })}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 32,
                    height: 32,
                    borderRadius: radius.pill,
                    backgroundColor: `${moduleColors.food}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Ionicons name="add" size={20} color={moduleColors.food} />
                </Pressable>
              </View>

              {items.length > 0 ? (
                <View style={{ marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs }}>
                  {items.map((meal) => (
                    <MealRow key={meal.id} meal={meal} />
                  ))}
                </View>
              ) : null}
            </GlassCard>
          );
        })}
      </View>
    </Screen>
  );
}

