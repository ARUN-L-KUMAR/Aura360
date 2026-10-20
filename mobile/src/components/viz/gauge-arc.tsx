import { memo, useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { withAlpha } from '@/components/ui/logic';
import { clamp } from '@/features/viz/geometry';
import { duration, easing, useTheme } from '@/theme';

export type GaugeArcProps = {
  /** Progress from 0 to 100. Values outside the range are clamped (a goal past its target reads as full). */
  percent: number;
  /** Start colour of the sweep (left end). Defaults to the brand indigo. */
  from?: string;
  /** End colour of the sweep (right end). Defaults to the brand sky. */
  to?: string;
  /** Colour of the empty part of the arc. Defaults to the hero chip fill, which reads on the dark hero surface. */
  trackColor?: string;
  /** Centre slot, anchored to the bottom middle of the arc (the headline number and its caption). */
  children?: ReactNode;
  /** Spoken summary ("Day score 73 percent: calories 45, ..."), written by the caller. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The drawing's own coordinate space; the view scales it to its width, so the stroke keeps its proportions.
const WIDTH = 330;
const HEIGHT = 166;
const CX = WIDTH / 2;
const CY = 150;
const RADIUS = 135;
const STROKE = 16;
const GLOW_EXTRA = 10;
const TIP = 9;
const TIP_HALO = 16;
const VISIBLE = 0.001;
const LENGTH = Math.PI * RADIUS;
const ARC = `M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`;

/**
 * A half-circle gauge: a faint track, a rounded gradient sweep with a soft glow under it, and a bright dot at the tip.
 * The sweep and the dot animate on the UI thread (and jump straight to the value under reduce-motion). Put the
 * headline number in `children`. The drawing is decorative and hidden from screen readers; `accessibilityLabel`
 * carries the same facts, so pair it with a legend that names what the score is made of.
 */
function GaugeArcImpl({ percent, from, to, trackColor, children, accessibilityLabel, style }: GaugeArcProps) {
  const { colors, shades, reduceMotion } = useTheme();
  const id = useId();
  const start = from ?? shades.primary[400];
  const end = to ?? shades.secondary[400];
  const fraction = clamp(Number.isFinite(percent) ? percent / 100 : 0, 0, 1);

  const progress = useSharedValue(reduceMotion ? fraction : 0);
  useEffect(() => {
    progress.set(reduceMotion ? fraction : withTiming(fraction, { duration: duration.slow, easing: Easing.bezier(...easing.decelerate) }));
  }, [fraction, reduceMotion, progress]);

  const sweep = useAnimatedProps(() => ({
    strokeDashoffset: LENGTH * (1 - progress.get()),
    strokeOpacity: progress.get() > VISIBLE ? 1 : 0,
  }));
  const glow = useAnimatedProps(() => ({
    strokeDashoffset: LENGTH * (1 - progress.get()),
    strokeOpacity: progress.get() > VISIBLE ? 0.22 : 0,
  }));
  // The tip rides the arc: at progress p it sits p of the way round the half circle, starting at the left end.
  const tip = useAnimatedProps(() => {
    const angle = Math.PI * progress.get();
    return { cx: CX - RADIUS * Math.cos(angle), cy: CY - RADIUS * Math.sin(angle), opacity: progress.get() > VISIBLE ? 1 : 0 };
  });
  const halo = useAnimatedProps(() => {
    const angle = Math.PI * progress.get();
    return { cx: CX - RADIUS * Math.cos(angle), cy: CY - RADIUS * Math.sin(angle), opacity: progress.get() > VISIBLE ? 1 : 0 };
  });

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[{ width: '100%', aspectRatio: WIDTH / HEIGHT }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={start} />
            <Stop offset="1" stopColor={end} />
          </LinearGradient>
        </Defs>
        <Path d={ARC} fill="none" stroke={trackColor ?? colors.heroChip} strokeWidth={STROKE} strokeLinecap="round" />
        <AnimatedPath
          d={ARC}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={STROKE + GLOW_EXTRA}
          strokeLinecap="round"
          strokeDasharray={[LENGTH, LENGTH]}
          strokeDashoffset={LENGTH * (1 - (reduceMotion ? fraction : 0))}
          animatedProps={glow}
        />
        <AnimatedPath
          d={ARC}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={[LENGTH, LENGTH]}
          strokeDashoffset={LENGTH * (1 - (reduceMotion ? fraction : 0))}
          animatedProps={sweep}
        />
        <AnimatedCircle r={TIP_HALO} cx={CX - RADIUS} cy={CY} opacity={0} fill={withAlpha(end, 0.3)} animatedProps={halo} />
        <AnimatedCircle r={TIP} cx={CX - RADIUS} cy={CY} opacity={0} fill={colors.onHero} animatedProps={tip} />
      </Svg>
      {children ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-end' }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

export const GaugeArc = memo(GaugeArcImpl);
