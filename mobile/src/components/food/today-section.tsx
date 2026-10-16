import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { MacroRings } from '@/components/food/macro-rings';
import { MealRow, openMeal } from '@/components/food/meal-row';
import { WaterCard } from '@/components/food/water-card';
import { FAB_CLEARANCE, PeriodStepper, QueryError, useEnter } from '@/components/fitness/section-kit';
import { Card } from '@/components/ui/card';
import { toIsoDay } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { useMeals } from '@/features/food/hooks';
import { useTargets, useWater } from '@/features/food/prefs';
import { MEAL_TYPES, suggestMealType, sumMeals, type Meal } from '@/features/food/types';
import { spacing } from '@/theme';

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

export function TodaySection({ header, onOpenAi }: { header: ReactNode; onOpenAi: () => void }) {
  const router = useRouter();
  const today = toIsoDay(new Date());
  const [day, setDay] = useState(today);

  const meals = useMeals(day, day);
  const { targets } = useTargets();
  const { waterMl, addWater } = useWater(day);

  const list = useMemo(() => meals.data ?? [], [meals.data]);
  const totals = useMemo(() => sumMeals(list), [list]);
  const failed = meals.isError && !meals.data;
  const loading = meals.isPending;

  return (
    <Screen onRefresh={() => meals.refetch()} refreshing={meals.isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      <PeriodStepper
        accent="food"
        label={dayTitle(day)}
        previousLabel="Previous day"
        nextLabel="Next day"
        onPrevious={() => setDay(shiftDay(day, -1))}
        onNext={() => setDay(shiftDay(day, 1))}
        nextDisabled={day >= today}
        onLabelPress={day !== today ? () => setDay(today) : undefined}
        labelHint="Jumps back to today"
      />

      {meals.isError ? <QueryError error={meals.error} hasData={!!meals.data} retrying={meals.isFetching} onRetry={() => meals.refetch()} /> : null}

      {loading ? <SkeletonCard media lines={1} /> : null}

      {!loading && !failed ? (
        <Card style={{ gap: spacing.md }}>
          <SectionHeader
            title="Daily nutrition"
            actionLabel="Edit targets"
            actionAccessibilityLabel="Edit daily nutrition targets"
            onActionPress={() => router.push('/food/targets' as never)}
          />
          <MacroRings totals={totals} targets={targets} />
        </Card>
      ) : null}

      <WaterCard waterMl={waterMl} targetMl={targets.waterMl} onAdd={addWater} />

      {loading ? <SkeletonList count={3} /> : null}

      {!loading && !failed ? (
        <View style={{ gap: spacing.md }}>
          <SectionHeader title={day === today ? "Today's meals" : 'Meals'} count={list.length > 0 ? list.length : undefined} />

          {list.length === 0 ? (
            <EmptyState
              accent="food"
              icon="restaurant-outline"
              title={day === today ? 'Nothing logged today' : 'Nothing logged this day'}
              description="Add what you ate to see your calories and macros fill in."
              actionTitle="Log food"
              onAction={() => openMeal(router, { mealType: suggestMealType(), date: day })}
              secondaryActionTitle={day === today ? 'Describe a meal with AI' : undefined}
              onSecondaryAction={day === today ? onOpenAi : undefined}
            />
          ) : (
            MEAL_TYPES.map((slot, index) => (
              <MealSlotCard key={slot.value} slot={slot} index={index} items={list.filter((meal) => meal.mealType === slot.value)} day={day} />
            ))
          )}
        </View>
      ) : null}
    </Screen>
  );
}

type SlotProps = { slot: (typeof MEAL_TYPES)[number]; items: Meal[]; day: string; index: number };

function MealSlotCard({ slot, items, day, index }: SlotProps) {
  const router = useRouter();
  const entering = useEnter(index);

  const kcal = items.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);
  const sum = (key: 'protein' | 'carbs' | 'fats') => Math.round(items.reduce((total, meal) => total + (meal[key] ? Number(meal[key]) : 0), 0));
  const protein = sum('protein');
  const carbs = sum('carbs');
  const fats = sum('fats');
  const macros = protein > 0 || carbs > 0 || fats > 0 ? ` · P ${protein}g · C ${carbs}g · F ${fats}g` : '';

  return (
    <Animated.View entering={entering}>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <ListItem
          title={slot.label}
          subtitle={items.length === 0 ? 'Nothing logged' : `${kcal} kcal${macros}`}
          icon={slot.icon}
          accent="food"
          divider={items.length > 0}
          accessible={false}
          trailing={
            <IconButton
              icon="add"
              variant="tonal"
              size="sm"
              accessibilityLabel={`Add to ${slot.label}`}
              onPress={() => openMeal(router, { mealType: slot.value, date: day })}
            />
          }
        />
        {items.map((meal, i) => (
          <MealRow key={meal.id} meal={meal} divider={i < items.length - 1} />
        ))}
      </Card>
    </Animated.View>
  );
}
