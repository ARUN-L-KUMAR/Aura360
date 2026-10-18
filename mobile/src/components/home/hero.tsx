import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { activeDays, activitySeries, streakOf, todayIndexOf } from '@/components/home/derive';
import { PremiumHero } from '@/components/ui/premium-hero';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import type { IconName } from '@/features/modules';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { greeting, todayIso } from '@/lib/format';
import { layout, radius, spacing, useTheme } from '@/theme';

type Props = {
  /** First name of the signed-in person; empty falls back to a neutral word. */
  name: string;
  /** Without data (loading, error, offline) the hero shows the greeting and the actions only. */
  data?: Dashboard;
};

type HeroStat = { key: string; label: string; value: number };

function HeroStatChip({ label, value }: Omit<HeroStat, 'key'>) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const spoken = t('hero.statLabel', { label, value: value.toLocaleString(getDeviceLocale()) });
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: spacing.xxxl * 2,
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.heroChip,
      }}>
      <AnimatedNumber value={value} variant="headline" color={colors.onHero} />
      <Text variant="overline" numberOfLines={2} style={{ color: colors.onHeroMuted }}>
        {label}
      </Text>
    </View>
  );
}

type HeroButtonProps = { label: string; hint: string; icon: IconName; solid?: boolean; onPress: () => void };

/**
 * The hero's two buttons sit side by side and share the row (the web's pair). PremiumHero's own `actions` size to their
 * label and wrap on a phone, so Home draws these two itself with the same look: solid is the primary call to action,
 * glass is the frosted one.
 */
function HeroButton({ label, hint, icon, solid, onPress }: HeroButtonProps) {
  const { colors, elevation } = useTheme();
  // The hero is dark in both themes, so the solid button is light on it in both (the theme's primary is dark in light mode).
  const textColor: string = solid ? colors.heroSurface : colors.onHero;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      haptic="tap"
      ringRadius={radius.lg}
      onPress={onPress}
      style={[
        {
          flexGrow: 1,
          flexBasis: 0,
          minWidth: spacing.xxxl * 2,
          minHeight: layout.minTouchTarget + spacing.md,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          backgroundColor: solid ? colors.onHero : colors.heroChip,
          borderWidth: solid ? 0 : 1,
          borderColor: colors.heroChipBorder,
        },
        solid ? elevation(3) : null,
      ]}>
      <Ionicons name={icon} size={20} color={textColor} />
      <Text variant="label" weight="bold" numberOfLines={1} style={{ color: textColor }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * The web dashboard's hero: a greeting chip, "Welcome back," with the first name in a gradient, the month's activity
 * count, the two main actions, and under them up to three frosted figures (today, streak, active days this week).
 */
export const HomeHero = memo(function HomeHero({ name, data }: Props) {
  const { t } = useTranslation('home');
  const router = useRouter();

  const stats = useMemo<HeroStat[]>(() => {
    if (!data) return [];
    const series = activitySeries(data.chart);
    const todayIndex = todayIndexOf(data.chart, todayIso());
    const streak = streakOf(series, todayIndex);
    const list: HeroStat[] = [{ key: 'today', label: t('hero.today'), value: todayIndex >= 0 ? series[todayIndex] : 0 }];
    if (streak > 0) list.push({ key: 'streak', label: t('hero.streak'), value: streak });
    list.push({ key: 'week', label: t('hero.week'), value: activeDays(series) });
    return list;
  }, [data, t]);

  return (
    <PremiumHero
      chip={{ icon: 'flash', label: greeting() }}
      title={t('hero.title')}
      accentWord={name || t('hero.fallbackName')}
      subtitle={data ? t('hero.subtitle', { count: data.totalActivities }) : t('hero.subtitleIdle')}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <HeroButton solid icon="add" label={t('quickActions.note.label')} hint={t('quickActions.note.hint')} onPress={() => router.push('/notes/edit')} />
        <HeroButton
          icon="cash-outline"
          label={t('quickActions.transaction.label')}
          hint={t('quickActions.transaction.hint')}
          onPress={() => router.push('/finance/transaction')}
        />
      </View>
      {stats.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {stats.map((stat) => (
            <HeroStatChip key={stat.key} label={stat.label} value={stat.value} />
          ))}
        </View>
      ) : null}
    </PremiumHero>
  );
});
