import { useRouter } from 'expo-router';
import { memo } from 'react';

import { ListItem } from '@/components/ui/list-item';
import type { Meal, MealType } from '@/features/food/types';

export function openMeal(router: ReturnType<typeof useRouter>, options: { meal?: Meal; mealType?: MealType; date?: string } = {}) {
  router.push({
    pathname: '/food/meal' as never,
    params: {
      ...(options.meal ? { meal: JSON.stringify(options.meal) } : {}),
      ...(options.mealType ? { mealType: options.mealType } : {}),
      ...(options.date ? { date: options.date } : {}),
    },
  });
}

function portion(meal: Meal) {
  if (meal.quantity === null || meal.quantity === undefined) return null;
  const quantity = Number(meal.quantity);
  if (!Number.isFinite(quantity)) return null;
  return `${quantity}${meal.unit ? ` ${meal.unit}` : ''}`;
}

/** One logged food as a tappable list row (opens the meal form). */
export const MealRow = memo(function MealRow({ meal, divider }: { meal: Meal; divider?: boolean }) {
  const router = useRouter();
  const macros = [
    meal.protein ? `P ${Math.round(Number(meal.protein))}g` : null,
    meal.carbs ? `C ${Math.round(Number(meal.carbs))}g` : null,
    meal.fats ? `F ${Math.round(Number(meal.fats))}g` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const detail = [portion(meal), macros].filter(Boolean).join(' · ');

  return (
    <ListItem
      title={meal.foodName}
      subtitle={detail || undefined}
      meta={`${meal.calories ?? 0} kcal`}
      divider={divider}
      accessibilityLabel={`${meal.foodName}, ${meal.calories ?? 0} calories${detail ? `, ${detail}` : ''}`}
      accessibilityHint="Opens the entry to edit"
      onPress={() => openMeal(router, { meal })}
    />
  );
});
