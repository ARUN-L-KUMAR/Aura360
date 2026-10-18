import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FAB_CLEARANCE, MetricCell, MetricGrid, PeriodStepper, QueryError, RingCard } from '@/components/fitness/section-kit';
import { FoodHeading, FoodStat, HeroFigure, type FoodTrend } from '@/components/food/food-kit';
import { MacroRings } from '@/components/food/macro-rings';
import { MealRow, openMeal } from '@/components/food/meal-row';
import { directionOf, percentChange, shiftIsoDay, weekStats } from '@/components/food/week-stats';
import { WaterCard } from '@/components/food/water-card';
import { Card } from '@/components/ui/card';
import { toIsoDay } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { PremiumHero } from '@/components/ui/premium-hero';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { useMeals } from '@/features/food/hooks';
import { useTargets, useWater } from '@/features/food/prefs';
import { MEAL_TYPES, suggestMealType, sumMeals, type Meal } from '@/features/food/types';
import { getDeviceLocale, i18n, useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme } from '@/theme';

function dayTitle(isoDay: string) {
  const today = toIsoDay(new Date());
  if (isoDay === today) return i18n.t('food:today.today');
  if (isoDay === shiftIsoDay(today, -1)) return i18n.t('food:today.yesterday');
  const [year, month, day] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(getDeviceLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

export function TodaySection({ header, onOpenAi }: { header: ReactNode; onOpenAi: () => void }) {
  const router = useRouter();
  const { t } = useTranslation('food');
  const today = toIsoDay(new Date());
  const [day, setDay] = useState(today);

  const meals = useMeals(day, day);
  // The last two weeks, for the "Last 7 days" cards (the same endpoint, a wider range).
  const recent = useMeals(shiftIsoDay(today, -13), today);
  const { targets } = useTargets();
  const { waterMl, addWater } = useWater(day);
  const heroMotion = useBlockMotion(0);
  const nutritionMotion = useBlockMotion(60);
  const waterMotion = useBlockMotion(120);

  const list = useMemo(() => meals.data ?? [], [meals.data]);
  const totals = useMemo(() => sumMeals(list), [list]);
  const bySlot = useMemo(() => MEAL_TYPES.map((slot) => list.filter((meal) => meal.mealType === slot.value)), [list]);
  const week = useMemo(() => weekStats(recent.data ?? [], today), [recent.data, today]);
  const failed = meals.isError && !meals.data;
  const loading = meals.isPending;
  const ready = !loading && !failed;
  const isToday = day === today;
  const logMeal = () => openMeal(router, { mealType: suggestMealType(), date: day });

  const number = (value: number) => Math.round(value).toLocaleString(getDeviceLocale());
  const eaten = Math.round(totals.calories);
  const left = Math.round(targets.calories - totals.calories);
  const proteinLeft = Math.round(targets.protein - totals.protein);
  const heroSubtitle = !ready
    ? t('hero.subtitleIdle')
    : left < 0
      ? t('hero.subtitleOver', { over: number(-left), target: number(targets.calories) })
      : eaten === 0
        ? t('hero.subtitleNone', { target: number(targets.calories) })
        : proteinLeft > 0
          ? t('hero.subtitleLeftProtein', { remaining: number(left), target: number(targets.calories), protein: number(proteinLeft) })
          : t('hero.subtitleLeft', { remaining: number(left), target: number(targets.calories) });

  const macros = [
    { key: 'protein', icon: 'barbell-outline', label: t('rings.protein'), current: totals.protein, target: targets.protein },
    { key: 'carbs', icon: 'leaf-outline', label: t('rings.carbs'), current: totals.carbs, target: targets.carbs },
    { key: 'fats', icon: 'water-outline', label: t('rings.fats'), current: totals.fats, target: targets.fats },
  ] as const;

  const percentTrend = (now: number, before: number): FoodTrend | undefined => {
    const pct = percentChange(now, before);
    return pct === null ? undefined : { text: t('stats.deltaPercent', { value: Math.abs(pct) }), direction: directionOf(pct) };
  };
  const countTrend = (now: number, before: number): FoodTrend | undefined =>
    now !== before ? { text: String(Math.abs(now - before)), direction: directionOf(now - before) } : undefined;
  const showWeek = ready && !!recent.data && (week.latest.meals > 0 || week.before.meals > 0);

  const refresh = () => Promise.all([meals.refetch(), recent.refetch()]);

  return (
    <Screen onRefresh={refresh} refreshing={meals.isRefetching} contentContainerStyle={{ paddingBottom: FAB_CLEARANCE }}>
      {header}

      <PeriodStepper
        accent="food"
        label={dayTitle(day)}
        previousLabel={t('today.previousDay')}
        nextLabel={t('today.nextDay')}
        onPrevious={() => setDay(shiftIsoDay(day, -1))}
        onNext={() => setDay(shiftIsoDay(day, 1))}
        nextDisabled={day >= today}
        onLabelPress={day !== today ? () => setDay(today) : undefined}
        labelHint={t('today.jumpHint')}
      />

      <Animated.View {...heroMotion}>
        <PremiumHero
          chip={{ icon: 'restaurant', label: dayTitle(day) }}
          title={ready ? t('units.kcal', { value: number(eaten) }) : t('hero.titleIdle')}
          accentWord={ready ? (isToday ? t('hero.eatenToday') : t('hero.eaten')) : undefined}
          subtitle={heroSubtitle}
          actions={[
            { label: t('hero.logMeal'), icon: 'add', variant: 'solid', onPress: logMeal },
            ...(isToday ? [{ label: t('hero.describeWithAi'), icon: 'sparkles' as const, variant: 'glass' as const, onPress: onOpenAi }] : []),
          ]}>
          {ready ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {macros.map((macro) => (
                <HeroFigure
                  key={macro.key}
                  icon={macro.icon}
                  value={t('units.grams', { value: Math.round(macro.current) })}
                  caption={t('rings.ofTarget', { value: t('units.grams', { value: macro.target }) })}
                  label={macro.label}
                  spoken={t('rings.tileGramsSpoken', {
                    label: macro.label,
                    current: Math.round(macro.current),
                    target: macro.target,
                    pct: macro.target > 0 ? Math.min(100, Math.round((macro.current / macro.target) * 100)) : 0,
                  })}
                />
              ))}
            </View>
          ) : null}
        </PremiumHero>
      </Animated.View>

      {meals.isError ? <QueryError error={meals.error} hasData={!!meals.data} retrying={meals.isFetching} onRetry={() => meals.refetch()} /> : null}

      {loading ? <SkeletonCard media lines={1} /> : null}

      {ready ? (
        <Animated.View {...nutritionMotion}>
          <RingCard>
            <FoodHeading
              overline={t('today.nutritionOverline')}
              title={t('today.dailyNutrition')}
              actionLabel={t('today.editTargets')}
              actionAccessibilityLabel={t('today.editTargetsLabel')}
              onActionPress={() => router.push('/food/targets' as never)}
            />
            <MacroRings totals={totals} targets={targets} />
          </RingCard>
        </Animated.View>
      ) : null}

      <Animated.View {...waterMotion}>
        <WaterCard key={day} waterMl={waterMl} targetMl={targets.waterMl} onAdd={addWater} />
      </Animated.View>

      {loading ? <SkeletonList count={3} /> : null}

      {ready ? (
        <View style={{ gap: spacing.md }}>
          <FoodHeading overline={t('today.mealsOverline')} title={isToday ? t('today.mealsToday') : t('today.meals')} count={list.length > 0 ? list.length : undefined} />

          {list.length === 0 ? (
            <EmptyState
              accent="food"
              icon="restaurant-outline"
              title={isToday ? t('today.emptyToday') : t('today.emptyDay')}
              description={t('today.emptyDescription')}
              actionTitle={t('actions.logFood')}
              onAction={logMeal}
              secondaryActionTitle={isToday ? t('today.describeWithAi') : undefined}
              onSecondaryAction={isToday ? onOpenAi : undefined}
            />
          ) : (
            MEAL_TYPES.map((slot, index) => <MealSlotCard key={slot.value} slot={slot} index={index} items={bySlot[index]} day={day} />)
          )}
        </View>
      ) : null}

      {showWeek ? (
        <View style={{ gap: spacing.md }}>
          <FoodHeading overline={t('stats.overline')} title={t('stats.title')} subtitle={t('stats.subtitle')} />
          <MetricGrid>
            <MetricCell>
              <FoodStat
                label={t('stats.avgCalories')}
                icon="flame-outline"
                value={week.latest.averageCalories}
                format={(n) => t('units.kcal', { value: number(n) })}
                trend={percentTrend(week.latest.averageCalories, week.before.averageCalories)}
              />
            </MetricCell>
            <MetricCell>
              <FoodStat
                label={t('stats.avgProtein')}
                icon="barbell-outline"
                value={week.latest.averageProtein}
                format={(n) => t('units.grams', { value: number(n) })}
                trend={percentTrend(week.latest.averageProtein, week.before.averageProtein)}
              />
            </MetricCell>
            <MetricCell>
              <FoodStat label={t('stats.meals')} icon="restaurant-outline" value={week.latest.meals} trend={countTrend(week.latest.meals, week.before.meals)} />
            </MetricCell>
            <MetricCell>
              <FoodStat label={t('stats.daysLogged')} icon="calendar-outline" value={week.latest.days} caption={t('stats.ofDays')} trend={countTrend(week.latest.days, week.before.days)} />
            </MetricCell>
          </MetricGrid>
        </View>
      ) : null}
    </Screen>
  );
}

type SlotProps = { slot: (typeof MEAL_TYPES)[number]; items: Meal[]; day: string; index: number };

function MealSlotCard({ slot, items, day, index }: SlotProps) {
  const router = useRouter();
  const { t } = useTranslation('food');
  const { colors, accent } = useTheme();
  const food = accent('food');
  const motion = useListMotion(index);

  const kcal = items.reduce((sum, meal) => sum + (meal.calories ?? 0), 0);
  const sum = (key: 'protein' | 'carbs' | 'fats') => Math.round(items.reduce((total, meal) => total + (meal[key] ? Number(meal[key]) : 0), 0));
  const protein = sum('protein');
  const carbs = sum('carbs');
  const fats = sum('fats');
  const macros = protein > 0 || carbs > 0 || fats > 0 ? ` · ${t('macros.protein', { value: protein })} · ${t('macros.carbs', { value: carbs })} · ${t('macros.fats', { value: fats })}` : '';
  const subtitle = items.length === 0 ? t('today.slotEmpty') : `${t('units.kcal', { value: kcal })}${macros}`;
  const add = () => openMeal(router, { mealType: slot.value, date: day });
  const rule = <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;

  return (
    <Animated.View {...motion}>
      <Card rounded="xl" padding="none" style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
          <IconTile icon={slot.icon} accent="food" />
          <View accessible accessibilityLabel={`${slot.label}, ${subtitle}`} style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="title" weight="bold" numberOfLines={1}>
              {slot.label}
            </Text>
            <Text variant="caption" color="textSecondary" numeric numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          {items.length > 0 ? <IconButton icon="add" variant="tonal" size="sm" accessibilityLabel={t('today.addTo', { slot: slot.label })} onPress={add} /> : null}
        </View>
        {rule}
        {items.length === 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('today.addTo', { slot: slot.label })}
            haptic="tap"
            scaleTo={1}
            ringRadius={radius.sm}
            onPress={add}
            style={{ minHeight: layout.minTouchTarget + spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
            <Ionicons name="add-circle-outline" size={20} color={food.text} />
            <Text variant="label" weight="semiBold" style={{ color: food.text }}>
              {t('today.addSlot', { slot: slot.label })}
            </Text>
          </PressableScale>
        ) : (
          items.map((meal, i) => (
            <MealMotion key={meal.id}>
              <MealRow meal={meal} divider={i < items.length - 1} />
            </MealMotion>
          ))
        )}
      </Card>
    </Animated.View>
  );
}

/** Fades a logged food in when it appears, out when it is deleted, and slides the rows below up to close the gap. */
function MealMotion({ children }: { children: ReactNode }) {
  const motion = useListMotion(0);
  return <Animated.View {...motion}>{children}</Animated.View>;
}
