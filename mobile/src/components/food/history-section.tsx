import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE, MetricCell, MetricGrid, PeriodStepper, QueryError } from '@/components/fitness/section-kit';
import { FoodHeading, FoodStat } from '@/components/food/food-kit';
import { MealRow, openMeal } from '@/components/food/meal-row';
import { summarizeMeals } from '@/components/food/week-stats';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useListMotion } from '@/components/ui/motion';
import { useRefreshControl } from '@/components/ui/pull-to-refresh';
import { useScreenPadding } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useMeals } from '@/features/food/hooks';
import { MEAL_TYPES, suggestMealType, type Meal } from '@/features/food/types';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { formatDay, monthKey, monthLabel, shiftMonth, todayIso } from '@/lib/format';
import { layout, spacing, useTheme } from '@/theme';

function lastDayOf(month: string) {
  const [year, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(year, m, 0).getDate()).padStart(2, '0')}`;
}

type DayGroup = [day: string, items: Meal[]];

const keyOf = (group: DayGroup) => group[0];
const Separator = () => <View style={{ height: layout.itemGap }} />;

export function HistorySection({ header }: { header: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation('food');
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
  const summary = useMemo(() => summarizeMeals(meals.data ?? [], `${month}-01`, lastDayOf(month)), [meals.data, month]);
  // "of 12 days": the days of the month so far (all of them for a past month).
  const daysSoFar = isCurrent ? Number(todayIso().slice(8, 10)) : Number(lastDayOf(month).slice(8, 10));
  const number = (value: number) => value.toLocaleString(getDeviceLocale());

  const listHeader = (
    <View style={{ gap: layout.sectionGap }}>
      {header}

      <PeriodStepper
        accent="food"
        label={monthLabel(month)}
        previousLabel={t('history.previousMonth')}
        nextLabel={t('history.nextMonth')}
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        nextDisabled={isCurrent}
      />

      {meals.isPending ? <SkeletonList count={4} /> : null}

      {meals.isError ? <QueryError error={meals.error} hasData={!!meals.data} retrying={meals.isFetching} onRetry={() => meals.refetch()} /> : null}

      {!empty && !meals.isPending && days.length > 0 ? (
        <>
          <FoodHeading overline={t('history.summaryOverline')} title={t('history.summaryTitle')} subtitle={t('history.summarySubtitle')} />
          <MetricGrid>
            <MetricCell>
              <FoodStat label={t('stats.avgCalories')} icon="flame-outline" value={summary.averageCalories} format={(n) => t('units.kcal', { value: number(n) })} />
            </MetricCell>
            <MetricCell>
              <FoodStat label={t('stats.avgProtein')} icon="barbell-outline" value={summary.averageProtein} format={(n) => t('units.grams', { value: number(n) })} />
            </MetricCell>
            <MetricCell>
              <FoodStat label={t('stats.meals')} icon="restaurant-outline" value={summary.meals} />
            </MetricCell>
            <MetricCell>
              <FoodStat label={t('stats.daysLogged')} icon="calendar-outline" value={summary.days} caption={t('history.ofDays', { count: daysSoFar })} />
            </MetricCell>
          </MetricGrid>
          <FoodHeading overline={t('history.logOverline')} title={t('history.logTitle')} count={days.length} />
        </>
      ) : null}

      {empty ? (
        <EmptyState
          accent="food"
          icon="nutrition-outline"
          title={t('history.emptyTitle', { month: monthLabel(month) })}
          description={t('history.emptyDescription')}
          actionTitle={t('actions.logFood')}
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
      initialNumToRender={6}
      windowSize={7}
      contentContainerStyle={[padding, { paddingBottom: FAB_CLEARANCE }]}
    />
  );
}

const DayCard = memo(function DayCard({ day, items, index }: { day: string; items: Meal[]; index: number }) {
  // Days are never added or removed from here (meals are edited on their own screen), so only the entrance is used.
  const { t } = useTranslation('food');
  const { colors } = useTheme();
  const { entering } = useListMotion(index);
  const kcal = items.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);
  const kcalText = kcal.toLocaleString(getDeviceLocale());
  const [year, month, date] = day.split('-').map(Number);
  const weekday = new Date(year, month - 1, date).toLocaleDateString(getDeviceLocale(), { weekday: 'long' });
  const total = t('history.dayTotal', { kcal, count: items.length });
  const groups = MEAL_TYPES.map((slot) => ({ slot, meals: items.filter((meal) => meal.mealType === slot.value) })).filter((group) => group.meals.length > 0);

  return (
    <Animated.View entering={entering}>
      <Card rounded="xl" padding="none" style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: spacing.lg }}>
          <View style={{ flexShrink: 1, gap: spacing.xs }}>
            <Text variant="overline" color="textMuted" numberOfLines={1}>
              {weekday}
            </Text>
            <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={1}>
              {formatDay(day)}
            </Text>
          </View>
          <View accessible accessibilityLabel={total} style={{ alignItems: 'flex-end', gap: spacing.xs }}>
            <Text variant="label" weight="bold" numeric>
              {t('units.kcal', { value: kcalText })}
            </Text>
            <Text variant="caption" color="textSecondary" numeric>
              {t('history.itemCount', { count: items.length })}
            </Text>
          </View>
        </View>
        {groups.map(({ slot, meals }) => (
          <View key={slot.value}>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
            <Text variant="overline" color="textMuted" style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
              {slot.label}
            </Text>
            {meals.map((meal, i) => (
              <MealRow key={meal.id} meal={meal} divider={i < meals.length - 1} />
            ))}
          </View>
        ))}
      </Card>
    </Animated.View>
  );
});
