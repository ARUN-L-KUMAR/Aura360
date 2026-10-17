import { memo, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { activitySeries, streakOf, timeOfDay, todayIndexOf } from '@/components/home/derive';
import { HeroBanner } from '@/components/illustrations/hero-banner';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { todayIso } from '@/lib/format';
import { layout, spacing, useTheme } from '@/theme';

type Props = {
  title: string;
  subtitle: string;
  scrollY: SharedValue<number>;
  /** Without data (loading, error, offline) the hero shows the greeting only. */
  data?: Dashboard;
};

type HeroStat = { key: string; label: string; value: number };

/** Narrowest a headline number may get before the row wraps (two columns instead of three). */
const STAT_MIN_WIDTH = layout.minTouchTarget * 2;

const HeroStatItem = memo(function HeroStatItem({ label, value }: { label: string; value: number }) {
  const { t } = useTranslation('home');
  const { accent } = useTheme();
  const spoken = t('hero.statLabel', { label, value: value.toLocaleString(getDeviceLocale()) });
  return (
    <View accessible accessibilityLabel={spoken} style={{ flexGrow: 1, flexBasis: 0, minWidth: STAT_MIN_WIDTH }}>
      <AnimatedNumber value={value} variant="title" weight="bold" color={accent('ai').text} />
      <Text variant="caption" color="textSecondary" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
});

/**
 * Greeting hero: the `home-hero` scene in the variant for the local hour (chosen when the screen opens), the greeting as
 * its heading and, under it, up to three headline numbers: activities today, the current streak and the month total.
 */
export const HomeHero = memo(function HomeHero({ title, subtitle, scrollY, data }: Props) {
  const { t } = useTranslation('home');
  const [variant] = useState(() => timeOfDay());

  const stats = useMemo<HeroStat[]>(() => {
    if (!data) return [];
    const series = activitySeries(data.chart);
    const todayIndex = todayIndexOf(data.chart, todayIso());
    const streak = streakOf(series, todayIndex);
    const list: HeroStat[] = [{ key: 'today', label: t('hero.today'), value: todayIndex >= 0 ? series[todayIndex] : 0 }];
    if (streak > 0) list.push({ key: 'streak', label: t('hero.streak'), value: streak });
    list.push({ key: 'month', label: t('hero.month'), value: data.totalActivities });
    return list;
  }, [data, t]);

  return (
    <HeroBanner scene="home-hero" variant={variant} title={title} subtitle={subtitle} scrollY={scrollY}>
      {stats.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {stats.map((stat) => (
            <HeroStatItem key={stat.key} label={stat.label} value={stat.value} />
          ))}
        </View>
      ) : null}
    </HeroBanner>
  );
});
