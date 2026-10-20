import { useRouter } from 'expo-router';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { WEEKLY_GOAL_MINUTES } from '@/components/fitness/activity';
import { openMeal } from '@/components/food/meal-row';
import { Section } from '@/components/home/section';
import { nextActions, type NextAction } from '@/components/home/today';
import { Chip } from '@/components/ui/chip';
import { withAlpha } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import type { DashboardToday } from '@/features/dashboard/use-dashboard';
import { suggestMealType } from '@/features/food/types';
import type { IconName, ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing, useTheme } from '@/theme';

const LOOK: Record<NextAction, { icon: IconName; accent: ModuleKey }> = {
  logMeal: { icon: 'restaurant-outline', accent: 'food' },
  workout: { icon: 'barbell-outline', accent: 'fitness' },
  startTimer: { icon: 'timer-outline', accent: 'time' },
  logSpending: { icon: 'cash-outline', accent: 'finance' },
};

/**
 * Suggestions for right now, each a real shortcut: log a meal (with the meal type for the time of day), start a workout,
 * start tracking time, add the day's spending. Built from what has already been logged today, so a suggestion goes away
 * once it is done; with nothing left it says so instead of leaving a blank. The first suggestion is the bar's headline
 * with a button; any others are chips under it.
 */
export const UpNext = memo(function UpNext({ today, timerRunning, index, allowed }: { today: DashboardToday; timerRunning: boolean; index: number; allowed?: readonly NextAction[] }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { colors, scheme, shades } = useTheme();

  const actions = useMemo(
    () => nextActions(today, { hour: new Date().getHours(), timerRunning, weeklyGoalMinutes: WEEKLY_GOAL_MINUTES, allowed }),
    [today, timerRunning, allowed],
  );

  const run = (action: NextAction) => {
    if (action === 'logMeal') openMeal(router, { mealType: suggestMealType() });
    else if (action === 'workout') router.push('/fitness/workout');
    else if (action === 'startTimer') router.push('/time');
    else router.push('/finance/transaction');
  };

  const dark = scheme === 'dark';
  const [first, ...rest] = actions;

  return (
    <Section index={index}>
      <View
        style={{
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: withAlpha(shades.primary[400], dark ? 0.4 : 0.35),
          backgroundColor: withAlpha(shades.primary[500], dark ? 0.2 : 0.09),
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          gap: spacing.sm,
        }}>
        <Text variant="overline" style={{ color: colors.primaryAccent }}>
          {t('upNext.title')}
        </Text>
        {first ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t(`upNext.${first}.label`)}
            accessibilityHint={t(`upNext.${first}.hint`)}
            haptic="tap"
            scaleTo={0.98}
            ringRadius={radius.lg}
            onPress={() => run(first)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouchTarget }}>
            <Text variant="body" weight="semiBold" numberOfLines={2} style={{ flex: 1 }}>
              {t(`upNext.${first}.label`)}
            </Text>
            <View
              style={{
                minHeight: layout.minTouchTarget,
                minWidth: layout.minTouchTarget + spacing.lg,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primary,
              }}>
              <Text variant="label" weight="bold" numberOfLines={1} style={{ color: colors.primaryText }}>
                {t(`upNext.${first}.cta`)}
              </Text>
            </View>
          </PressableScale>
        ) : (
          <Text variant="body" color="textSecondary">
            {t('upNext.allDone')}
          </Text>
        )}
        {rest.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {rest.map((action) => (
              <Chip
                key={action}
                size="md"
                selectable={false}
                icon={LOOK[action].icon}
                accent={LOOK[action].accent}
                label={t(`upNext.${action}.label`)}
                accessibilityHint={t(`upNext.${action}.hint`)}
                onPress={() => run(action)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Section>
  );
});
