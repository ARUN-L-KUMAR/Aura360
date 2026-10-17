import { memo, useEffect, useId, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { useVizTones } from '@/components/viz/tones';
import { areaPath, cleanSeries, pathLengthBound, seriesPoints, smoothLinePath, trendOf, zeroLineY } from '@/features/viz/geometry';
import { duration, easing, spacing, useTheme, type ModuleKey } from '@/theme';

/**
 * A smooth trend line with a soft fill and a dot on the latest value.
 *
 * ```tsx
 * <Sparkline values={last7Days} accent="finance" height={48} label={t('trendUp', { percent: 12, days: 7 })} />
 * ```
 *
 * - Fills the width of its parent unless `width` is given.
 * - Flat and single-value series draw on the middle line; negative values get a faint zero line.
 * - `negativeIsBad`: a falling series turns the error colour (the label should still say it fell: never colour alone).
 * - `label` is the spoken summary ("up 12 percent over 7 days"), written by the caller. Without it the chart is hidden
 *   from screen readers (it is decoration next to a number).
 * - On mount and when the data changes the line draws on from the start and the fill and dot fade in. Paint props of the
 *   SVG animate on the UI thread; with reduce-motion on the final state is drawn at once.
 */
export type SparklineProps = {
  values: readonly number[];
  /** Fixed width; otherwise the width of the parent. */
  width?: number;
  /** Default 48. */
  height?: number;
  accent?: ModuleKey;
  negativeIsBad?: boolean;
  /** Soft fill under the line. Default true. */
  fill?: boolean;
  /** Dot on the last point. Default true. */
  showDot?: boolean;
  /** Spoken summary of the trend. */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DEFAULT_HEIGHT = spacing.xxxl;
const STROKE = spacing.xs / 2;
const DOT_RADIUS = spacing.xs;
const DOT_RING = STROKE;
const PAD = DOT_RADIUS + DOT_RING;
const FILL_TOP_OPACITY = 0.28;

function SparklineImpl({ values, width, height = DEFAULT_HEIGHT, accent, negativeIsBad = false, fill = true, showDot = true, label, style }: SparklineProps) {
  const { colors, reduceMotion } = useTheme();
  const tones = useVizTones(accent);
  const gradientId = useId().replace(/\W/g, '');
  const [measured, setMeasured] = useState(0);
  const w = width ?? measured;

  const series = useMemo(() => cleanSeries(values), [values]);
  const seriesKey = series.join(',');
  const trend = useMemo(() => trendOf(series), [series]);
  const geometry = useMemo(() => {
    const points = seriesPoints(series, { width: w, height, padX: PAD, padY: PAD });
    return {
      points,
      line: smoothLinePath(points),
      area: fill ? areaPath(points, height) : '',
      length: pathLengthBound(points),
      zeroY: zeroLineY(series, { height, padY: PAD }),
    };
  }, [series, w, height, fill]);

  // 0 -> 1 reveal. Re-armed whenever the data (or the measured width) changes.
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      reveal.set(1);
      return;
    }
    reveal.set(0);
    reveal.set(withTiming(1, { duration: duration.slow * 2, easing: Easing.bezier(...easing.standard) }));
  }, [seriesKey, w, reduceMotion, reveal]);

  const length = Math.max(geometry.length, 1);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - reveal.get()) }));
  const areaProps = useAnimatedProps(() => ({ opacity: reveal.get() }));
  const dotProps = useAnimatedProps(() => ({ opacity: Math.max(0, (reveal.get() - 0.6) / 0.4) }));

  const stroke = negativeIsBad && trend.direction === 'down' ? colors.error : tones.solid;
  const last = geometry.points[geometry.points.length - 1];
  const hasLine = geometry.points.length > 1;

  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      onLayout={width === undefined ? (e: LayoutChangeEvent) => setMeasured(Math.round(e.nativeEvent.layout.width)) : undefined}
      style={[{ height, width: width ?? '100%' }, style]}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={FILL_TOP_OPACITY} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {geometry.zeroY !== null ? <Line x1={PAD} x2={w - PAD} y1={geometry.zeroY} y2={geometry.zeroY} stroke={tones.track} strokeWidth={STROKE / 2} strokeDasharray={[DOT_RADIUS, DOT_RADIUS]} /> : null}
          {geometry.area ? <AnimatedPath d={geometry.area} fill={`url(#${gradientId})`} animatedProps={areaProps} /> : null}
          {hasLine ? (
            <AnimatedPath
              d={geometry.line}
              stroke={stroke}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={[length, length]}
              strokeDashoffset={reduceMotion ? 0 : length}
              animatedProps={lineProps}
            />
          ) : null}
          {showDot && last ? <AnimatedCircle cx={last.x} cy={last.y} r={DOT_RADIUS} fill={stroke} stroke={colors.card} strokeWidth={DOT_RING} animatedProps={dotProps} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}

export const Sparkline = memo(SparklineImpl);
