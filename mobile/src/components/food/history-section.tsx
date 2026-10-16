import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { MealRow, openMeal } from '@/components/food/meal-row';
import { FAB_CLEARANCE, PeriodStepper, QueryError } from '@/components/fitness/section-kit';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMeals } from '@/features/food/hooks';
import { MEAL_TYPES, suggestMealType, type Meal } from '@/features/food/types';
import { formatDay, monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { layout, spacing } from '@/theme';

function lastDayOf(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}`;
}

type DayGroup = [day: string, items: Meal[]];

const keyOf = (group: DayGroup) => group[0];
const Separator = () => <View style={{ height: layout.itemGap }} />;

export function HistorySection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const [month, setMonth] = useState(monthKey());
  const meals = useMeals(`${month}-01`, lastDayOf(month));
  const isCurrent = month === monthKey();

  const padding = useScreenPadding();
  const refreshControl = useRefreshControl({ onRefresh: () => meals.refetch(), refreshing: meals.isRefetching });

  const days = useMemo(() => {
    const byDay = new Map<string, Meal[]>();
    for (const meal of meals.data ?? []) {
      const key = meal.date.slice(0, 10);
      byDay.set(key, [...(byDay.get(key) ?? []), meal]);
    }
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)) as DayGroup[];
  }, [meals.data]);

  const renderItem = useCallback(({ item, index }: { item: DayGroup; index: number }) => <DayCard day={item[0]} items={item[1]} index={index} />, []);

  const empty = !meals.isPending && !meals.isError && days.length === 0;

  const listHeader = (
    <View style={{ gap: layout.sectionGap }}>
      {header}

      <PeriodStepper
        accent="food"
        label={monthLabel(month)}
        previousLabel="Previous month"
        nextLabel="Next month"
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        nextDisabled={isCurrent}
      />

      {meals.isPending ? <SkeletonList count={4} /> : null}

      {meals.isError ? <QueryError error={meals.error} hasData={!!meals.data} retrying={meals.isFetching} onRetry={() => meals.refetch()} /> : null}

      {empty ? (
        <EmptyState
          accent="food"
          icon="nutrition-outline"
          title={`No meals logged in ${monthLabel(month)}`}
          description="Log meals from the Today tab or with the AI log."
          actionTitle="Log food"
          onAction={() => openMeal(router, { mealType: suggestMealType() })}
        />
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={days}
      keyExtractor={keyOf}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={listHeader}
      refreshControl={refreshControl}
      contentContainerStyle={[padding, { paddingBottom: FAB_CLEARANCE }]}
    />
  );
}

const DayCard = memo(function DayCard({ day, items, index }: { day: string; items: Meal[]; index: number }) {
  // Days are never added or removed from here (meals are edited on their own screen), so only the entrance is used.
  const { entering } = useListMotion(index);
  const kcal = items.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);

  return (
    <Animated.View entering={entering}>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm }}>
          <Text variant="title" accessibilityRole="header">
            {formatDay(day)}
          </Text>
          <Tag accent="food" label={`${kcal} kcal · ${items.length} ${items.length === 1 ? 'item' : 'items'}`} />
        </View>
        {MEAL_TYPES.map((slot) => {
          const slotItems = items.filter((meal) => meal.mealType === slot.value);
          if (slotItems.length === 0) return null;
          return (
            <View key={slot.value}>
              <Text variant="caption" weight="semiBold" color="textSecondary" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
                {slot.label}
              </Text>
              {slotItems.map((meal) => (
                <MealRow key={meal.id} meal={meal} />
              ))}
            </View>
          );
        })}
      </Card>
    </Animated.View>
  );
});
