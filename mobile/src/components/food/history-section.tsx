import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { MealRow } from '@/components/food/meal-row';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useMeals } from '@/features/food/hooks';
import { MEAL_TYPES, type Meal } from '@/features/food/types';
import { formatDay, monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

function lastDayOf(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}`;
}

export function HistorySection({ header }: { header: ReactNode }) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const [month, setMonth] = useState(monthKey());
  const meals = useMeals(`${month}-01`, lastDayOf(month));
  const isCurrent = month === monthKey();

  const days = useMemo(() => {
    const byDay = new Map<string, Meal[]>();
    for (const meal of meals.data ?? []) {
      const key = meal.date.slice(0, 10);
      byDay.set(key, [...(byDay.get(key) ?? []), meal]);
    }
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [meals.data]);

  return (
    <Screen onRefresh={() => meals.refetch()} refreshing={meals.isRefetching}>
      {header}

      {/* Month Navigator */}
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
          accessibilityLabel="Previous month"
          onPress={() => setMonth(shiftMonth(month, -1))}
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="calendar-outline" size={16} color={moduleColors.food} />
          <Text variant="heading" style={{ fontSize: 16 }}>
            {monthLabel(month)}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setMonth(shiftMonth(month, 1))}
          disabled={isCurrent}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isCurrent ? 0.3 : 1,
            backgroundColor: pressed ? colors.cardMuted : 'transparent',
          })}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {meals.isPending ? (
        <Card>
          <Text muted>Loading…</Text>
        </Card>
      ) : null}

      {meals.isError ? (
        <Card>
          <Text muted>{meals.error instanceof Error ? meals.error.message : "Couldn't load meals."}</Text>
        </Card>
      ) : null}

      {!meals.isPending && !meals.isError && days.length === 0 ? (
        <EmptyState
          icon="nutrition-outline"
          title={`No meals logged in ${monthLabel(month)}`}
          description="Log meals through the Today tab or using AI Log."
        />
      ) : null}

      {days.map(([day, items]) => {
        const kcal = items.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);
        return (
          <GlassCard key={day} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" style={{ fontWeight: '700' }}>
                {formatDay(day)}
              </Text>
              <View
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                  backgroundColor: `${moduleColors.food}20`,
                }}>
                <Text variant="caption" style={{ color: moduleColors.food, fontWeight: '700' }}>
                  {kcal} kcal · {items.length} {items.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>
            {MEAL_TYPES.map((slot) => {
              const slotItems = items.filter((meal) => meal.mealType === slot.value);
              if (slotItems.length === 0) return null;
              return (
                <View key={slot.value} style={{ marginTop: spacing.xs }}>
                  <Text variant="caption" muted style={{ fontWeight: '600', marginBottom: 2 }}>
                    {slot.label}
                  </Text>
                  {slotItems.map((meal) => (
                    <MealRow key={meal.id} meal={meal} />
                  ))}
                </View>
              );
            })}
          </GlassCard>
        );
      })}
    </Screen>
  );
}

