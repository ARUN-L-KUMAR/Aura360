import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { activitySeries, dayDelta, sharePercent, todayIndexOf, totalEntries } from '@/components/home/derive';
import { Decor } from '@/components/home/decor';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { ProgressRing } from '@/components/viz/progress-ring';
import { StatTile, type StatTileDelta } from '@/components/viz/stat-tile';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { modules, type IconName } from '@/features/modules';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { todayIso } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { layout, spacing, useTheme } from '@/theme';

type GlanceModule = { key: 'finance' | 'fitness' | 'food'; icon: IconName };

const GLANCE: GlanceModule[] = [
  { key: 'finance', icon: 'wallet-outline' },
  { key: 'fitness', icon: 'barbell-outline' },
  { key: 'food', icon: 'restaurant-outline' },
];

const RING_SIZE = spacing.xxxl + spacing.lg; // 64
/** Three tiles per row on a normal phone; they wrap (and grow) when text is large or the screen is narrow. */
const TILE_MIN_WIDTH = layout.minTouchTarget * 2;

type TileProps = { moduleKey: GlanceModule['key']; icon: IconName; value: number; percent: number; onOpen: (href: string) => void };

/** One module headline: a ring for its share of all entries around the module icon, the count and the label. */
const GlanceTile = memo(function GlanceTile({ moduleKey, icon, value, percent, onOpen }: TileProps) {
  const { t } = useTranslation('home');
  const { accent } = useTheme();
  const a = accent(moduleKey);
  const info = modules[moduleKey];
  const label = t(`overview.${moduleKey}.label`);

  return (
    <Card
      accent={moduleKey}
      padding="sm"
      accessibilityLabel={t('overview.tileLabel', { label, value: value.toLocaleString(getDeviceLocale()), percent })}
      accessibilityHint={t('overview.tileHint', { module: info.label })}
      onPress={() => {
        haptics.tap();
        onOpen(info.href);
      }}
      style={{ flexGrow: 1, flexBasis: 0, minWidth: TILE_MIN_WIDTH, alignItems: 'center', gap: spacing.sm }}>
      <Decor>
        <ProgressRing value={percent} max={100} size={RING_SIZE} accent={moduleKey}>
          <Ionicons name={icon} size={22} color={a.text} />
        </ProgressRing>
      </Decor>
      <AnimatedNumber value={value} variant="title" />
      <Text variant="caption" weight="medium" numberOfLines={2} style={{ textAlign: 'center' }}>
        {label}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={2} style={{ textAlign: 'center' }}>
        {t('overview.share', { percent })}
      </Text>
    </Card>
  );
});

/**
 * Today at a glance: the month's activity total with its last-7-days line and a day-on-day change, then finance,
 * fitness and food, each as a ring (its share of all your entries) around the module icon with the count. Module tiles
 * open their module. Everything is computed from the dashboard payload.
 */
export const OverviewStats = memo(function OverviewStats({ data, index }: { data: Dashboard; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();

  const total = useMemo(() => {
    const series = activitySeries(data.chart);
    const todayIndex = todayIndexOf(data.chart, todayIso());
    const change = dayDelta(series, todayIndex);
    const delta: StatTileDelta | undefined = change
      ? { direction: change.direction, text: t('overview.total.delta', { value: change.amount.toLocaleString(getDeviceLocale()) }) }
      : undefined;
    return { series, delta, today: todayIndex >= 0 ? series[todayIndex] : 0 };
  }, [data.chart, t]);

  const entries = totalEntries(data.counts);
  const open = (href: string) => router.push(href as Href);

  return (
    <Section index={index}>
      <SectionHeader title={t('overview.title')} />
      <StatTile
        label={t('overview.total.label')}
        value={data.totalActivities}
        icon="pulse-outline"
        delta={total.delta}
        sparkline={total.series}
        chartLabel={t('overview.total.today', { count: total.today })}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {GLANCE.map((item) => (
          <GlanceTile
            key={item.key}
            moduleKey={item.key}
            icon={item.icon}
            value={data.counts[item.key]}
            percent={sharePercent(data.counts[item.key], entries)}
            onOpen={open}
          />
        ))}
      </View>
    </Section>
  );
});
