import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useVizTones } from '@/components/viz/tones';
import { circumferenceOf, clamp, dashOffsetFor, ringLaps, ringRadius } from '@/features/viz/geometry';
import { duration, easing, spacing, useTheme, type ModuleKey } from '@/theme';

/**
 * Circular progress with an optional centre slot.
 *
 * ```tsx
 * <ProgressRing value={1450} max={2000} accent="food" label={t('goal')} valueText={t('kcalOfGoal', { ... })}>
 *   <AnimatedNumber value={1450} variant="title" />
 * </ProgressRing>
 * ```
 *
 * - `value` / `max`: past `max` the ring starts a second, lighter lap (up to two laps).
 * - `label` is the spoken name; `valueText` the spoken value ("1,450 of 2,000"). Both come from the caller's catalog.
 * - The sweep animates on mount and whenever `value` changes. It paints `strokeDashoffset` on the UI thread (an accepted
 *   exception to the transform / opacity rule for SVG paint props). With reduce-motion on, the final state is drawn at once.
 */
export type ProgressRingProps = {
  value: number;
  /** Value that equals one full lap. Default 100. */
  max?: number;
  /** Outer diameter in points. Default 96. */
  size?: number;
  /** Stroke width in points. Default 8. */
  thickness?: number;
  /** Module accent; the brand colour when omitted. */
  accent?: ModuleKey;
  /** Centre slot: a number, an icon, a label. */
  children?: ReactNode;
  /** Spoken name of what the ring measures. */
  label?: string;
  /** Spoken value, for example "1,450 of 2,000 calories". Defaults to the platform's percent reading. */
  valueText?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DEFAULT_SIZE = spacing.xxxl * 2;
const DEFAULT_THICKNESS = spacing.sm;
/** Below this the ring draws nothing (a round cap on a zero-length arc would show a dot). */
const VISIBLE = 0.001;

function ProgressRingImpl({ value, max = 100, size = DEFAULT_SIZE, thickness = DEFAULT_THICKNESS, accent, children, label, valueText, style }: ProgressRingProps) {
  const { reduceMotion } = useTheme();
  const tones = useVizTones(accent);

  const laps = ringLaps(value, max);
  const r = ringRadius(size, thickness);
  const c = circumferenceOf(r);
  const mid = size / 2;

  const progress = useSharedValue(reduceMotion ? laps.fraction : 0);
  useEffect(() => {
    progress.set(reduceMotion ? laps.fraction : withTiming(laps.fraction, { duration: duration.slow, easing: Easing.bezier(...easing.decelerate) }));
  }, [laps.fraction, reduceMotion, progress]);

  const firstLap = useAnimatedProps(() => {
    const f = Math.min(progress.get(), 1);
    return { strokeDashoffset: c * (1 - f), strokeOpacity: f > VISIBLE ? 1 : 0 };
  });
  const secondLap = useAnimatedProps(() => {
    const f = Math.min(Math.max(progress.get() - 1, 0), 1);
    return { strokeDashoffset: c * (1 - f), strokeOpacity: f > VISIBLE ? 1 : 0 };
  });

  const now = Math.round(clamp(Number.isFinite(value) ? value : 0, 0, max > 0 ? max : 0));
  const common = { cx: mid, cy: mid, r, strokeWidth: thickness, fill: 'none', strokeLinecap: 'round', strokeDasharray: [c, c] } as const;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: Math.round(max > 0 ? max : 0), now, text: valueText }}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Circles start at 3 o'clock; turn the whole drawing so the sweep starts at 12. */}
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle cx={mid} cy={mid} r={r} stroke={tones.track} strokeWidth={thickness} fill="none" />
          <AnimatedCircle {...common} stroke={tones.solid} strokeDashoffset={dashOffsetFor(c, reduceMotion ? laps.first : 0)} animatedProps={firstLap} />
          <AnimatedCircle {...common} stroke={tones.lap} strokeDashoffset={dashOffsetFor(c, reduceMotion ? laps.second : 0)} animatedProps={secondLap} />
        </Svg>
      </View>
      {children ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: thickness + spacing.xs }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

export const ProgressRing = memo(ProgressRingImpl);
