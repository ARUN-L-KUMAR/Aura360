import { memo, useEffect, useId, useMemo, useState } from 'react';
import { View, type AccessibilityActionEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { scrubIndex, tooltipStart } from '@/components/viz/scrub';
import { areaPath, cleanSeries, pathLengthBound, seriesPoints, smoothLinePath } from '@/features/viz/geometry';
import { duration, easing, radius, spacing, useTheme } from '@/theme';

/** Colours of the chart, chosen by the caller because the chart sits on a surface of the caller's choosing. */
export type ScrubChartTones = {
  line: string;
  /** Top colour of the soft fill under the line (drawn at `fillOpacity`, fading to nothing). */
  fill: string;
  guide: string;
  halo: string;
  dot: string;
  tooltipBackground: string;
  tooltipText: string;
};

export type ScrubChartProps = {
  values: readonly number[];
  /** Text of the tooltip for a point, for example "Oct 14 · ₹1,240". Also the spoken value of the chart. */
  tooltip: (index: number) => string;
  tones: ScrubChartTones;
  /** Spoken summary of the chart (it is decoration for the eye, so the data is also offered as text). */
  label: string;
  /** Height of the drawing, not counting the tooltip row. Default 96. */
  height?: number;
  /** Point selected at first. Default the last one. */
  initialIndex?: number;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_HEIGHT = spacing.xxxl * 2;
const PAD_X = spacing.md;
const PAD_Y = spacing.md;
const STROKE = spacing.xs - 1;
const DOT_RADIUS = spacing.sm - 2;
const HALO_RADIUS = spacing.md - 1;
const FILL_TOP_OPACITY = 0.45;
const GUIDE_STROKE = 1;
const TOOLTIP_MIN_HEIGHT = spacing.xl + spacing.xs;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * A smooth line you can press and drag along. A dashed guide, a dot and a tooltip follow the finger (and a tap picks a
 * point), so the exact value of any point is readable.
 *
 * - Drawn left to right in every language (time runs that way on a chart), so it stays physical LTR inside an RTL layout.
 * - The drag is horizontal only: it activates after a few points sideways and gives up when the finger moves
 *   vertically, so the page still scrolls over it.
 * - Values are plotted from 0, so a day with nothing sits on the baseline.
 * - For screen readers the chart is one adjustable element: swipe up / down changes the point and the value is the tooltip text.
 * - The line draws on once; with reduce-motion it is simply drawn.
 */
function ScrubChartImpl({ values, tooltip, tones, label, height = DEFAULT_HEIGHT, initialIndex, style }: ScrubChartProps) {
  const { reduceMotion } = useTheme();
  const gradientId = useId().replace(/\W/g, '');
  const series = useMemo(() => cleanSeries(values), [values]);
  const count = series.length;
  const [width, setWidth] = useState(0);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: TOOLTIP_MIN_HEIGHT });
  const [picked, setPicked] = useState(initialIndex ?? count - 1);
  const index = Math.min(Math.max(0, picked), Math.max(0, count - 1));

  const geometry = useMemo(() => {
    const peak = series.reduce((max, v) => Math.max(max, v), 0);
    const points = seriesPoints(series, { width, height, padX: PAD_X, padY: PAD_Y, min: 0, max: peak > 0 ? peak : 1 });
    return { points, line: smoothLinePath(points), area: areaPath(points, height), length: pathLengthBound(points) };
  }, [series, width, height]);

  const seriesKey = series.join(',');
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      reveal.set(1);
      return;
    }
    reveal.set(0);
    reveal.set(withTiming(1, { duration: duration.slow * 2, easing: Easing.bezier(...easing.standard) }));
  }, [seriesKey, width, reduceMotion, reveal]);

  const length = Math.max(geometry.length, 1);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - reveal.get()) }));
  const areaProps = useAnimatedProps(() => ({ opacity: reveal.get() }));

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-6, 6])
      .failOffsetY([-12, 12])
      .onStart((e) => setPicked(scrubIndex(e.x, width, count, PAD_X)))
      .onUpdate((e) => setPicked(scrubIndex(e.x, width, count, PAD_X)));
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(12)
      .onEnd((e, success) => {
        if (success) setPicked(scrubIndex(e.x, width, count, PAD_X));
      });
    return Gesture.Race(pan, tap);
  }, [width, count]);

  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') setPicked(Math.min(count - 1, index + 1));
    else if (e.nativeEvent.actionName === 'decrement') setPicked(Math.max(0, index - 1));
  };

  const point = geometry.points[index];
  const hasLine = geometry.points.length > 1;
  const tipStart = point ? tooltipStart(point.x, tooltipSize.width, width) : 0;

  if (count === 0) return <View style={[{ height }, style]} />;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: tooltip(index) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}
      style={[{ direction: 'ltr' }, style]}>
      <GestureDetector gesture={gesture} touchAction="pan-y">
        <View
          collapsable={false}
          onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
          style={{ marginTop: tooltipSize.height + spacing.xs, height }}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={tones.fill} stopOpacity={FILL_TOP_OPACITY} />
                  <Stop offset="1" stopColor={tones.fill} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {geometry.area ? <AnimatedPath d={geometry.area} fill={`url(#${gradientId})`} animatedProps={areaProps} /> : null}
              {hasLine ? (
                <AnimatedPath
                  d={geometry.line}
                  stroke={tones.line}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={[length, length]}
                  strokeDashoffset={reduceMotion ? 0 : length}
                  animatedProps={lineProps}
                />
              ) : null}
              {point ? (
                <>
                  <Line x1={point.x} x2={point.x} y1={0} y2={height} stroke={tones.guide} strokeWidth={GUIDE_STROKE} strokeDasharray={[spacing.xs - 1, spacing.xs]} />
                  <Circle cx={point.x} cy={point.y} r={HALO_RADIUS} fill={tones.halo} />
                  <Circle cx={point.x} cy={point.y} r={DOT_RADIUS} fill={tones.dot} />
                </>
              ) : null}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>

      {point ? (
        <View
          pointerEvents="none"
          onLayout={(e: LayoutChangeEvent) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setTooltipSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: Math.max(h, TOOLTIP_MIN_HEIGHT) }));
          }}
          style={{
            position: 'absolute',
            top: 0,
            start: 0,
            transform: [{ translateX: tipStart }],
            opacity: tooltipSize.width > 0 ? 1 : 0,
            borderRadius: radius.md,
            backgroundColor: tones.tooltipBackground,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
          }}>
          <Text variant="label" weight="bold" numeric numberOfLines={1} style={{ color: tones.tooltipText }}>
            {tooltip(index)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const ScrubChart = memo(ScrubChartImpl);
