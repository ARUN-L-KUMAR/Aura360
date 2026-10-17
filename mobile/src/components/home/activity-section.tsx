import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { activitySeries, initialOf, streakOf, todayIndexOf } from '@/components/home/derive';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { MiniBars } from '@/components/viz/mini-bars';
import { StreakDots } from '@/components/viz/streak-dots';
import { useVizTones } from '@/components/viz/tones';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { useTranslation } from '@/i18n';
import { todayIso, weekdayShort } from '@/lib/format';
import { radius, spacing, layout } from '@/theme';

const BAR_AREA = layout.minTouchTarget * 2; // 88
const CHIP = spacing.xl + spacing.sm; // 32

/**
 * Seven days of activity as bars (today highlighted by tone, a dot and a bold label), and under them which of those
 * days had any activity as a row of dots with the running streak. Both come from `chart`; nothing is invented.
 */
export const ActivitySection = memo(function ActivitySection({ chart, index }: { chart: Dashboard['chart']; index: number }) {
  const { t } = useTranslation('home');
  const tones = useVizTones('ai');

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
      <SectionHeader title={t('activity.title')} subtitle={t('activity.subtitle')} />
      <Card style={{ gap: spacing.md }}>
        <MiniBars
          values={model.series}
          highlightIndex={model.todayIndex >= 0 ? model.todayIndex : undefined}
          labels={model.labels}
          showValues
          height={BAR_AREA}
          accent="ai"
          accessibilityLabel={t('activity.chartLabel', { count: model.series.length, summary })}
        />
        <Divider />
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: CHIP, height: CHIP, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: tones.soft }}>
              <Ionicons name={model.streak > 0 ? 'flame' : 'flame-outline'} size={spacing.lg + 2} color={tones.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" weight="semiBold" numberOfLines={2}>
                {model.streak > 0 ? t('activity.streak.current', { count: model.streak }) : t('activity.streak.title')}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={2}>
                {t('activity.streak.summary', { done: model.doneCount, total: model.series.length })}
              </Text>
            </View>
          </View>
          <StreakDots done={model.done} todayIndex={model.todayIndex >= 0 ? model.todayIndex : undefined} accent="ai" size={spacing.lg + spacing.xs} accessibilityLabel={dotsLabel} />
        </View>
      </Card>
    </Section>
  );
});
