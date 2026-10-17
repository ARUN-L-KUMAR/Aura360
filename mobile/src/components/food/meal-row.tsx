import { useRouter } from 'expo-router';
import { memo } from 'react';

import { ListItem } from '@/components/ui/list-item';
import type { Meal, MealType } from '@/features/food/types';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation('food');
  const grams = { protein: Math.round(Number(meal.protein)), carbs: Math.round(Number(meal.carbs)), fats: Math.round(Number(meal.fats)) };
  const macros = [
    meal.protein ? t('macros.protein', { value: grams.protein }) : null,
    meal.carbs ? t('macros.carbs', { value: grams.carbs }) : null,
    meal.fats ? t('macros.fats', { value: grams.fats }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  // What a screen reader says: whole words instead of "P 12g".
  const macrosSpoken = [
    meal.protein ? t('macros.proteinSpoken', { count: grams.protein }) : null,
    meal.carbs ? t('macros.carbsSpoken', { count: grams.carbs }) : null,
    meal.fats ? t('macros.fatsSpoken', { count: grams.fats }) : null,
  ]
    .filter(Boolean)
    .join(', ');
  const serving = portion(meal);
  const detail = [serving, macros].filter(Boolean).join(' · ');
  const calories = meal.calories ?? 0;

  return (
    <ListItem
      title={meal.foodName}
      subtitle={detail || undefined}
      meta={t('units.kcal', { value: calories })}
      divider={divider}
      accessibilityLabel={[meal.foodName, t('row.caloriesSpoken', { count: calories }), serving, macrosSpoken].filter(Boolean).join(', ')}
      accessibilityHint={t('row.openHint')}
      onPress={() => openMeal(router, { meal })}
    />
  );
});
