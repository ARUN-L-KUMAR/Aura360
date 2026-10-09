import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { Meal, MealType } from '@/features/food/types';
import { spacing } from '@/theme';

export function openMeal(router: ReturnType<typeof useRouter>, options: { meal?: Meal; mealType?: MealType; date?: string } = {}) {
  router.push({
    pathname: '/food/meal' as any,
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

export function MealRow({ meal }: { meal: Meal }) {
  const router = useRouter();
  const macros = [
    meal.protein ? `P ${Math.round(Number(meal.protein))}g` : null,
    meal.carbs ? `C ${Math.round(Number(meal.carbs))}g` : null,
    meal.fats ? `F ${Math.round(Number(meal.fats))}g` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meal.foodName}, ${meal.calories ?? 0} calories`}
      onPress={() => openMeal(router, { meal })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1}>{meal.foodName}</Text>
        <Text variant="caption" muted numberOfLines={1}>
          {[portion(meal), macros].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={{ fontWeight: '600' }}>{meal.calories ?? 0} kcal</Text>
    </Pressable>
  );
}
