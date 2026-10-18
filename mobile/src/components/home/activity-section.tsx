import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { activitySeries, initialOf, streakOf, todayIndexOf } from '@/components/home/derive';
import { IconTile } from '@/components/home/icon-tile';
import { Section, SectionHead } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Text } from '@/components/ui/text';
import { MiniBars } from '@/components/viz/mini-bars';
import { StreakDots } from '@/components/viz/streak-dots';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { useTranslation } from '@/i18n';
import { todayIso, weekdayShort } from '@/lib/format';
import { layout, spacing } from '@/theme';

const BAR_AREA = layout.minTouchTarget * 2; // 88
const STREAK_TILE = layout.minTouchTarget - spacing.xs; // 40

/**
 * Seven days of activity as bars (today highlighted by tone, a dot and a bold label), and under them which of those
 * days had any activity as a row of dots with the running streak. Both come from `chart`; nothing is invented.
 */
export const ActivitySection = memo(function ActivitySection({ chart, index }: { chart: Dashboard['chart']; index: number }) {
  const { t } = useTranslation('home');

  const model = useMemo(() => {
    const series = activitySeries(chart);
    const todayIndex = todayIndexOf(chart, todayIso());
    const days = chart.map((point) => weekdayShort(point.date));
    const done = series.map((value) => value > 0);
    return { series, todayIndex, days, labels: days.map(initialOf), done, doneCount: done.filter(Boolean).length, streak: streakOf(series, todayIndex) };
  }, [chart]);

  const summary = model.series.map((value, i) => t('activity.point', { day: model.days[i], value })).join(t('activity.separator'));
  const dotsLabel = t('activity.streak.dotsLabel', {
    done: model.doneCount,
    total: model.series.length,
    day: model.todayIndex >= 0 ? model.days[model.todayIndex] : '',
  });

  return (
    <Section index={index}>
      <SectionHead title={t('activity.title')} description={t('activity.subtitle')} />
      <Card rounded="xl" padding="md" style={{ gap: spacing.lg }}>
        <MiniBars
          values={model.series}
          highlightIndex={model.todayIndex >= 0 ? model.todayIndex : undefined}
          labels={model.labels}
          showValues
          height={BAR_AREA}
          accessibilityLabel={t('activity.chartLabel', { count: model.series.length, summary })}
        />
        <Divider />
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconTile icon={model.streak > 0 ? 'flame' : 'flame-outline'} accent="fitness" size={STREAK_TILE} />
            <View style={{ flex: 1, gap: spacing.xs / 2 }}>
              <Text variant="label" weight="bold" numberOfLines={2}>
                {model.streak > 0 ? t('activity.streak.current', { count: model.streak }) : t('activity.streak.title')}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={2}>
                {t('activity.streak.summary', { done: model.doneCount, total: model.series.length })}
              </Text>
            </View>
          </View>
          <StreakDots done={model.done} todayIndex={model.todayIndex >= 0 ? model.todayIndex : undefined} size={spacing.lg + spacing.xs} accessibilityLabel={dotsLabel} />
        </View>
      </Card>
    </Section>
  );
});
