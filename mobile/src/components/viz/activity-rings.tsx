import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useVizTones } from '@/components/viz/tones';
import { circumferenceOf, dashOffsetFor, ringLaps } from '@/features/viz/geometry';
import { duration, easing, useTheme, type ModuleKey } from '@/theme';

/** One ring of the set: how far along (`value` of `max`) and which module colour it wears. */
export type ActivityRing = {
  value: number;
  max: number;
  accent: ModuleKey;
};

export type ActivityRingsProps = {
  /** Outermost ring first. Two to four rings read well. */
  rings: readonly ActivityRing[];
  /** Outer diameter in points. Default 164. */
  size?: number;
  /** Stroke width of each ring. Default 11. */
  thickness?: number;
  /** Space between rings. Default 4. */
  gap?: number;
  /** Colour of the empty part of every ring. Defaults to the theme track colour. */
  trackColor?: string;
  /** Centre slot. */
  children?: ReactNode;
  /** Spoken summary of every ring ("Calories 45 percent, Move 100 percent..."), written by the caller. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const VISIBLE = 0.001;

type ArcProps = { cx: number; r: number; thickness: number; fraction: number; color: string; track: string };

/** One ring: a faint full circle and a rounded arc that sweeps to its fraction on the UI thread. */
function Arc({ cx, r, thickness, fraction, color, track }: ArcProps) {
  const { reduceMotion } = useTheme();
  const c = circumferenceOf(r);
  const progress = useSharedValue(reduceMotion ? fraction : 0);

  useEffect(() => {
    progress.set(reduceMotion ? fraction : withTiming(fraction, { duration: duration.slow, easing: Easing.bezier(...easing.decelerate) }));
  }, [fraction, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - progress.get()),
    strokeOpacity: progress.get() > VISIBLE ? 1 : 0,
  }));

  return (
    <>
      <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={thickness} fill="none" />
      <AnimatedCircle
        cx={cx}
        cy={cx}
        r={r}
        stroke={color}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={[c, c]}
        strokeDashoffset={dashOffsetFor(c, reduceMotion ? fraction : 0)}
        animatedProps={animatedProps}
      />
    </>
  );
}

function RingColor({ accent, children }: { accent: ModuleKey; children: (color: string) => ReactNode }) {
  const tones = useVizTones(accent);
  return <>{children(tones.solid)}</>;
}

/**
 * Concentric progress rings (like an activity ring set): the first ring is the outermost. Each ring fills to
 * `value / max` (a ring past its goal stays full), in its module colour, over a faint track. Put the headline number in
 * the centre. The drawing is decorative and hidden from screen readers; `accessibilityLabel` carries the same facts, so
 * pair every ring with a legend that names it (colour alone never says which ring is which).
 */
function ActivityRingsImpl({ rings, size = 164, thickness = 11, gap = 4, trackColor, children, accessibilityLabel, style }: ActivityRingsProps) {
  const { colors } = useTheme();
  const mid = size / 2;
  const track = trackColor ?? colors.heroChip;

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Circles start at 3 o'clock; turn the drawing so every ring starts at 12. */}
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          {rings.map((ring, i) => {
            const r = mid - thickness / 2 - i * (thickness + gap);
            if (r <= thickness / 2) return null;
            return (
              <RingColor key={i} accent={ring.accent}>
                {(color) => <Arc cx={mid} r={r} thickness={thickness} fraction={ringLaps(ring.value, ring.max).first} color={color} track={track} />}
              </RingColor>
            );
          })}
        </Svg>
      </View>
      {children ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: rings.length * (thickness + gap) }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

export const ActivityRings = memo(ActivityRingsImpl);
