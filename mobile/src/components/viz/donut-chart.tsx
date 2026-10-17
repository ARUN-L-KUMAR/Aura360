import { memo, useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useDonutColors, useVizTones } from '@/components/viz/tones';
import { donutArcs, ringRadius } from '@/features/viz/geometry';
import { getDeviceLocale } from '@/i18n';
import { duration, easing, spacing, useTheme, type ModuleKey } from '@/theme';

export { useDonutColors } from '@/components/viz/tones';

/**
 * Segmented ring for a breakdown (budget by category).
 *
 * ```tsx
 * const colors = useDonutColors(categories.length, 'finance');   // same tones for the legend dots
 * <DonutChart segments={categories.map((c) => ({ label: c.name, value: c.spent }))} total={budget}
 *             accent="finance" label={t('spendByCategory')}>
 *   <Text variant="title">{money}</Text>
 * </DonutChart>
 * ```
 *
 * - Values are shares, not percentages: they are scaled to fill the ring. Pass `total` (a budget) to leave the unspent
 *   remainder empty instead.
 * - Zero, negative and non-finite values draw nothing. Segments are separated by a gap; tiny slices stay visible.
 * - Segments are never identified by colour alone: show a legend (label + amount) beside it. The spoken label lists
 *   every segment with its share.
 * - It fades and scales in once (opacity / transform); nothing moves under reduce-motion.
 */
export type DonutSegment = {
  label: string;
  value: number;
  /** Overrides the colour from `useDonutColors`. */
  color?: string;
};

export type DonutChartProps = {
  segments: readonly DonutSegment[];
  /** Whole amount the ring stands for. Default: the sum of the segments. */
  total?: number;
  /** Outer diameter in points. Default 144. */
  size?: number;
  /** Stroke width in points. Default 16. */
  thickness?: number;
  /** Space between segments along the ring, in points. Default 4. */
  gap?: number;
  /** Starting tone for the segment colours. */
  accent?: ModuleKey;
  /** Centre slot. */
  children?: ReactNode;
  /** Spoken name of the chart; the segments and their shares are appended. */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_SIZE = spacing.xxxl * 3;
const DEFAULT_THICKNESS = spacing.lg;
const DEFAULT_GAP = spacing.xs;
const START_SCALE = 0.92;

function DonutChartImpl({ segments, total, size = DEFAULT_SIZE, thickness = DEFAULT_THICKNESS, gap = DEFAULT_GAP, accent, children, label, style }: DonutChartProps) {
  const { reduceMotion } = useTheme();
  const tones = useVizTones(accent);
  const palette = useDonutColors(segments.length, accent);

  const r = ringRadius(size, thickness);
  const mid = size / 2;
  const values = segments.map((s) => s.value);
  const valuesKey = values.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the numbers, not on the array identity.
  const arcs = useMemo(() => donutArcs(values, { radius: r, gap, total }), [valuesKey, r, gap, total]);

  const spoken = useMemo(() => {
    const percent = new Intl.NumberFormat(getDeviceLocale(), { style: 'percent', maximumFractionDigits: 0 });
    const list = segments
      .map((s, i) => ((arcs[i]?.fraction ?? 0) > 0 ? `${s.label} ${percent.format(arcs[i].fraction)}` : null))
      .filter(Boolean)
      .join(', ');
    return [label, list].filter(Boolean).join(': ');
  }, [segments, arcs, label]);

  const enter = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    enter.set(reduceMotion ? 1 : withTiming(1, { duration: duration.slow, easing: Easing.bezier(...easing.decelerate) }));
  }, [reduceMotion, enter]);
  const enterStyle = useAnimatedStyle(() => ({ opacity: enter.get(), transform: [{ scale: START_SCALE + (1 - START_SCALE) * enter.get() }] }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={spoken}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View style={enterStyle}>
        {/* Circles start at 3 o'clock; turn the drawing so the first segment starts at 12. */}
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Svg width={size} height={size}>
            <Circle cx={mid} cy={mid} r={r} stroke={tones.track} strokeWidth={thickness} fill="none" />
            {arcs.map((arc, i) =>
              arc.drawnSweepDeg > 0 ? (
                <Circle
                  key={i}
                  cx={mid}
                  cy={mid}
                  r={r}
                  stroke={segments[i].color ?? palette[i]}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={arc.dashArray}
                  strokeDashoffset={arc.dashOffset}
                />
              ) : null,
            )}
          </Svg>
        </View>
      </Animated.View>
      {children ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: thickness + spacing.xs }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

export const DonutChart = memo(DonutChartImpl);
