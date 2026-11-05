import { useRouter } from 'expo-router';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { MacroRings } from '@/components/food/macro-rings';
import { openMeal } from '@/components/food/meal-row';
import { GlassCard } from '@/components/home/glass-card';
import { Section, SectionHead } from '@/components/home/section';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Text } from '@/components/ui/text';
import type { DashboardToday } from '@/features/dashboard/use-dashboard';
import { useTargets } from '@/features/food/prefs';
import { suggestMealType, type MealTotals } from '@/features/food/types';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

/**
 * Food on Home: today's calories against the daily target and the three macros, drawn by the same rings as the Food tab
 * so the two always agree, with how many meals are logged and a button to log the next one. The figures are the ones the
 * dashboard already fetched for today, and the targets are the ones saved on this phone, so the card needs no request of
 * its own (and no loading state: Home shows its own until the dashboard is there).
 */
export const FoodHomeCard = memo(function FoodHomeCard({ index, food }: { index: number; food: DashboardToday['food'] }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { targets } = useTargets();
  const totals = useMemo<MealTotals>(
    () => ({ calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats }),
    [food.calories, food.protein, food.carbs, food.fats],
  );

  return (
    <Section index={index}>
      <SectionHead
        title={t('widgets.food.title')}
        description={t('widgets.food.description')}
        actionLabel={t('widgets.food.seeAll')}
        actionAccessibilityLabel={t('widgets.food.seeAllLabel')}
        onActionPress={() => router.push('/food')}
      />
      <GlassCard padding={0}>
        <View style={{ padding: spacing.lg }}>
          <MacroRings totals={totals} targets={targets} />
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            {food.meals > 0 ? t('widgets.food.meals', { count: food.meals }) : t('widgets.food.none')}
          </Text>
          <Button
            title={t('widgets.food.log')}
            variant="tertiary"
            size="sm"
            leftIcon="add"
            fullWidth={false}
            accessibilityHint={t('widgets.food.logHint')}
            onPress={() => openMeal(router, { mealType: suggestMealType() })}
          />
        </View>
      </GlassCard>
    </Section>
  );
});
