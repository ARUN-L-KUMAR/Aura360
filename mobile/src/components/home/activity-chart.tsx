import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { weekdayShort } from '@/lib/format';
import { duration, easing, radius, spacing, useTheme, type ModuleKey } from '@/theme';

/** Height of the tallest bar. A chart dimension, not text, so it can stay fixed. */
const BAR_AREA_HEIGHT = 112;
const BAR_MAX_WIDTH = spacing.xl;
const MIN_BAR = spacing.sm;
const STAGGER_MS = 40;

type Point = { date: string; activities: number };

type BarProps = { height: number; fill: string; index: number; reduceMotion: boolean };

/** One bar. Grows from the baseline with scaleY (transform only); static when motion is reduced. */
function Bar({ height, fill, index, reduceMotion }: BarProps) {
  const grow = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      grow.value = 1;
      return;
    }
    grow.value = withDelay(index * STAGGER_MS, withTiming(1, { duration: duration.slow, easing: Easing.bezier(...easing.decelerate) }));
  }, [reduceMotion, index, grow]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));

  return (
    <Animated.View
      style={[
        {
          height,
          width: '100%',
          maxWidth: BAR_MAX_WIDTH,
          transformOrigin: 'bottom',
          borderTopLeftRadius: radius.sm,
          borderTopRightRadius: radius.sm,
          borderBottomLeftRadius: spacing.xs / 2,
          borderBottomRightRadius: spacing.xs / 2,
          backgroundColor: fill,
        },
        style,
      ]}
    />
  );
}

/**
 * Seven-day activity bars in a module accent ramp: earlier days use the soft border tone, today the solid fill, so
 * the highlight does not depend on colour alone (today's value and day name are also bold). Read as one image by
 * screen readers with every value in the label.
 */
export const ActivityChart = memo(function ActivityChart({ data, accent: accentKey = 'ai' }: { data: Point[]; accent?: ModuleKey }) {
  const { colors, accent, reduceMotion } = useTheme();
  const a = accent(accentKey);
  const max = Math.max(1, ...data.map((d) => d.activities));
  const summary = data.map((d) => `${weekdayShort(d.date)} ${d.activities}`).join(', ');

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Activity over the last ${data.length} days: ${summary}`}
      style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.xs }}>
      {data.map((point, index) => {
        const isToday = index === data.length - 1;
        const height = point.activities === 0 ? MIN_BAR : Math.max(spacing.lg, (point.activities / max) * BAR_AREA_HEIGHT);
        return (
          <View key={point.date} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
            <Text
              variant="caption"
              numeric
              weight={isToday ? 'bold' : 'medium'}
              color={isToday ? 'text' : 'textSecondary'}
              maxFontSizeMultiplier={1.2}>
              {point.activities}
            </Text>
            <View style={{ height: BAR_AREA_HEIGHT, width: '100%', alignItems: 'center', justifyContent: 'flex-end' }}>
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: '100%',
                  maxWidth: BAR_MAX_WIDTH,
                  height: BAR_AREA_HEIGHT,
                  borderRadius: radius.sm,
                  backgroundColor: colors.cardMuted,
                }}
              />
              <Bar height={height} fill={isToday ? a.solid : a.border} index={index} reduceMotion={reduceMotion} />
            </View>
            <Text variant="caption" weight={isToday ? 'bold' : 'medium'} color={isToday ? 'text' : 'textSecondary'} maxFontSizeMultiplier={1.2}>
              {weekdayShort(point.date)}
            </Text>
          </View>
        );
      })}
    </View>
  );
});
