import { memo, useEffect, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useVizTones } from '@/components/viz/tones';
import { barLayout, isFiniteNumber } from '@/features/viz/geometry';
import { duration, easing, radius, spacing, useTheme, type ModuleKey } from '@/theme';

/**
 * 5-14 small rounded bars, for example a week of activity.
 *
 * ```tsx
 * <MiniBars values={steps} highlightIndex={todayIndex} labels={weekdayInitials} accent="fitness"
 *           accessibilityLabel={t('stepsThisWeek', { total })} />
 * ```
 *
 * - `highlightIndex` (today) is shown by tone AND by a small dot under the bar plus a bolder label, so it is not colour-only.
 * - Zero values leave a short stub so the slot never looks missing.
 * - `showValues` prints each value above its bar (tabular digits); `formatValue` localises them.
 * - Bars grow from the bottom with a staggered scaleY (transform only). With reduce-motion on they appear at full height.
 * - Only the last 14 values are drawn.
 */
export type MiniBarsProps = {
  values: readonly number[];
  /** Index of the bar to emphasise (today). */
  highlightIndex?: number;
  /** One caption per bar (weekday initials). */
  labels?: readonly string[];
  /** Print each value above its bar. */
  showValues?: boolean;
  formatValue?: (value: number) => string;
  /** Height of the bar area in points. Default 48. */
  height?: number;
  accent?: ModuleKey;
  /** Value that fills the full height. Default: the largest value. */
  max?: number;
  /** Spoken summary of the whole chart. Without it the chart is hidden from screen readers. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const MAX_BARS = 14;
const DEFAULT_HEIGHT = spacing.xxxl;
const STUB = spacing.xs;
const MARKER = spacing.xs;
const STAGGER_MS = 40;

type BarProps = { index: number; height: number; color: string; replay: string };

/** One bar. Full size from the start; grows from its bottom edge by scaling, never by changing its height. */
function Bar({ index, height, color, replay }: BarProps) {
  const { reduceMotion } = useTheme();
  const grow = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      grow.set(1);
      return;
    }
    grow.set(0);
    grow.set(withDelay(index * STAGGER_MS, withTiming(1, { duration: duration.slow, easing: Easing.bezier(...easing.decelerate) })));
  }, [replay, index, reduceMotion, grow]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.get() }] }));
  return <Animated.View style={[{ height, borderRadius: radius.pill, backgroundColor: color, transformOrigin: '50% 100%' }, style]} />;
}

function MiniBarsImpl({ values, highlightIndex, labels, showValues = false, formatValue, height = DEFAULT_HEIGHT, accent, max, accessibilityLabel, style }: MiniBarsProps) {
  const { colors } = useTheme();
  const tones = useVizTones(accent);

  const shown = useMemo(() => values.slice(-MAX_BARS), [values]);
  const offset = values.length - shown.length;
  const bars = useMemo(() => barLayout(shown, { width: shown.length, height, minHeight: STUB, max }), [shown, height, max]);
  const replay = shown.map((v) => (isFiniteNumber(v) ? v : 0)).join(',');
  const hasHighlight = highlightIndex !== undefined && highlightIndex >= 0;
  const active = hasHighlight ? highlightIndex - offset : -1;

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }, style]}>
      {bars.map((bar) => {
        const isActive = bar.index === active;
        const raw = shown[bar.index];
        const color = hasHighlight && !isActive ? tones.muted : tones.solid;
        return (
          <View key={bar.index} style={{ flex: 1, gap: spacing.xs, alignItems: 'stretch' }}>
            {showValues ? (
              <Text variant="caption" numeric weight={isActive ? 'semiBold' : 'regular'} color={isActive ? 'text' : 'textSecondary'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ textAlign: 'center' }}>
                {isFiniteNumber(raw) ? (formatValue ? formatValue(raw) : String(raw)) : ''}
              </Text>
            ) : null}
            <View style={{ height, justifyContent: 'flex-end' }}>
              <Bar index={bar.index} height={bar.height} color={color} replay={replay} />
            </View>
            {labels ? (
              <Text variant="caption" weight={isActive ? 'semiBold' : 'regular'} color={isActive ? 'text' : 'textSecondary'} numberOfLines={1} style={{ textAlign: 'center' }}>
                {labels[bar.index + offset] ?? ''}
              </Text>
            ) : null}
            {hasHighlight ? (
              <View style={{ alignSelf: 'center', width: MARKER, height: MARKER, borderRadius: radius.full, backgroundColor: isActive ? colors.text : 'transparent' }} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export const MiniBars = memo(MiniBarsImpl);
