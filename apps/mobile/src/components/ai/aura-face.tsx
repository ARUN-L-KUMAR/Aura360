import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

import {
  BARE_GLYPHS,
  BROWS,
  EYE_CENTERS,
  EYE_Y,
  EYES,
  FACES,
  GLYPHS,
  GLYPH_ANIM,
  LENS,
  MOUTHS,
  type Mood,
  type PropAnim,
} from '@/features/ai/mascot/face';
import { propFor, type ToolActivity } from '@/features/ai/mascot/mood';
import { useTheme } from '@/theme';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const TAU = Math.PI * 2;

// Numbers for the animation worklets (they cannot read a string mood).
const SLEEPING = 0;
const WAKING = 1;
const IDLE = 2;
const THINKING = 3;
const SEARCHING = 4;
const FOUND = 5;
const WORKING = 6;
const TALKING = 7;
const ASKING = 8;
const HAPPY = 9;
const OOPS = 10;

const MOOD_NUMBER: Record<Mood, number> = {
  sleeping: SLEEPING,
  waking: WAKING,
  idle: IDLE,
  thinking: THINKING,
  searching: SEARCHING,
  found: FOUND,
  working: WORKING,
  talking: TALKING,
  asking: ASKING,
  happy: HAPPY,
  oops: OOPS,
};

/** Moods that play one short move and then hold their pose. */
const ONE_SHOT_MS: Partial<Record<Mood, number>> = { waking: 700, found: 450, happy: 800, oops: 500 };
/** Moods whose eyes blink every few seconds. */
const BLINKS: ReadonlySet<Mood> = new Set<Mood>(['idle', 'thinking', 'searching', 'talking', 'asking', 'oops']);

const SWING = 0;
const BOB = 1;
const SPIN = 2;
const PULSE = 3;
const RISE = 4;
const HOP = 5;
const PROP_NUMBER: Record<PropAnim, number> = { swing: SWING, bob: BOB, spin: SPIN, pulse: PULSE, rise: RISE, hop: HOP };

const SCAN_AMPLITUDE = 3.8;

type Props = {
  mood: Mood;
  activity?: ToolActivity | null;
  /** Width and height of the face. */
  size: number;
  /** Colour of the eyes, brows and mouth: the contrast colour of whatever the face sits on. */
  color: string;
  /** Show the little icon above the head. */
  showProp?: boolean;
  /** Stop all looping motion (the bubble is hidden). The expression itself stays. */
  paused?: boolean;
};

/**
 * Aura's animated face for the floating bubble. It draws only the features (the parent supplies the round
 * background). Eyes, mouth and the body move on the UI thread through Reanimated shared values; under reduce-motion
 * the expression still changes with the mood but nothing moves. Decorative: the parent carries the accessibility label.
 */
function AuraFaceImpl({ mood, activity = null, size, color, showProp = true, paused = false }: Props) {
  const { accent, colors, reduceMotion } = useTheme();
  const ai = accent('ai');
  const face = FACES[mood];
  const eyes = EYES[face.eyes];
  const brow = face.brow ? BROWS[face.brow] : null;
  const prop = showProp ? propFor(mood, activity) : null;

  const fast = useSharedValue(0); // 1.2 s loop
  const slow = useSharedValue(0); // 3.6 s loop
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const scanAmp = useSharedValue(0);
  const blink = useSharedValue(0);
  const shot = useSharedValue(1);
  const kind = useSharedValue(MOOD_NUMBER[mood]);
  const propIn = useSharedValue(0);
  const propKind = useSharedValue(prop ? PROP_NUMBER[GLYPH_ANIM[prop.glyph]] : 0);

  // The two loops that everything periodic reads from. Not running while hidden or under reduce-motion.
  useEffect(() => {
    cancelAnimation(fast);
    cancelAnimation(slow);
    fast.set(0);
    slow.set(0);
    if (paused || reduceMotion) return;
    fast.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false));
    slow.set(withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1, false));
    return () => {
      cancelAnimation(fast);
      cancelAnimation(slow);
    };
  }, [paused, reduceMotion, fast, slow]);

  // A new mood: look somewhere, play its one-shot move, restart the blinking.
  useEffect(() => {
    const spec = FACES[mood];
    const move = (value: number) => (reduceMotion ? value : withTiming(value, { duration: 220, easing: Easing.out(Easing.quad) }));
    lookX.set(move(spec.look[0]));
    lookY.set(move(spec.look[1]));
    scanAmp.set(spec.scan && !reduceMotion && !paused ? withTiming(SCAN_AMPLITUDE, { duration: 200 }) : withTiming(0, { duration: 200 }));
    kind.set(MOOD_NUMBER[mood]);

    cancelAnimation(shot);
    const oneShot = ONE_SHOT_MS[mood];
    // Under reduce-motion a one-shot mood is simply shown in its end pose.
    shot.set(oneShot && !reduceMotion ? 0 : 1);
    if (oneShot && !reduceMotion) shot.set(withTiming(1, { duration: oneShot, easing: Easing.out(Easing.quad) }));

    cancelAnimation(blink);
    blink.set(0);
    if (BLINKS.has(mood) && !reduceMotion && !paused) {
      blink.set(withRepeat(withSequence(withDelay(3200, withTiming(1, { duration: 80 })), withTiming(0, { duration: 110 })), -1, false));
    }
  }, [mood, reduceMotion, paused, lookX, lookY, scanAmp, kind, shot, blink]);

  // A new icon pops in.
  const glyphKey = prop ? `${prop.glyph}-${prop.lens}` : '';
  useEffect(() => {
    cancelAnimation(propIn);
    if (!prop) {
      propIn.set(0);
      return;
    }
    propKind.set(PROP_NUMBER[GLYPH_ANIM[prop.glyph]]);
    propIn.set(reduceMotion ? 1 : 0);
    if (!reduceMotion) propIn.set(withSpring(1, { damping: 9, stiffness: 220, mass: 0.6 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `prop` is derived from `glyphKey`
  }, [glyphKey, reduceMotion, propIn, propKind]);

  const roundEyes = 'rx' in eyes;
  const baseRy = roundEyes ? eyes.ry : 0;
  const baseRx = roundEyes ? eyes.rx : 0;

  /** Where one eye is and how open it is right now: look, scan sweep, blink and the wake-up opening. */
  const eyeFrame = (index: 0 | 1) => {
    'worklet';
    const sweep = Math.sin(fast.get() * TAU) * scanAmp.get();
    const waking = kind.get() === WAKING ? 0.12 + 0.88 * Math.min(1, shot.get() * 1.5) : 1;
    return {
      cx: EYE_CENTERS[index] + lookX.get() + sweep,
      cy: EYE_Y + lookY.get(),
      ry: Math.max(0.4, baseRy * (1 - 0.9 * blink.get()) * waking),
    };
  };
  const leftEye = useAnimatedProps(() => eyeFrame(0));
  const rightEye = useAnimatedProps(() => eyeFrame(1));

  const mouthProps = useAnimatedProps(() => ({ ry: 0.9 + 2.3 * Math.abs(Math.sin(fast.get() * Math.PI * 4)) }));

  const bodyStyle = useAnimatedStyle(() => {
    const k = kind.get();
    const f = fast.get();
    const s = slow.get();
    const sh = shot.get();
    let tx = 0;
    let ty = 0;
    let rot = 0;
    let sx = 1;
    let sy = 1;
    if (k === SLEEPING) {
      sx = 1 + 0.05 * Math.sin(s * TAU);
      sy = sx;
    } else if (k === IDLE || k === TALKING) {
      ty = -1.5 * Math.sin(s * TAU);
    } else if (k === THINKING) {
      rot = 3 * Math.sin(s * TAU);
    } else if (k === SEARCHING) {
      rot = 3 * Math.sin(f * TAU);
    } else if (k === WORKING) {
      ty = -1.2 * Math.abs(Math.sin(f * TAU));
    } else if (k === ASKING) {
      ty = -3 * Math.abs(Math.sin(f * Math.PI));
    } else if (k === WAKING) {
      sy = 1 + 0.12 * Math.sin(Math.PI * sh);
      sx = 1 - 0.04 * Math.sin(Math.PI * sh);
    } else if (k === FOUND) {
      sx = 1 + 0.14 * Math.sin(Math.PI * sh);
      sy = sx;
    } else if (k === HAPPY) {
      ty = -7 * Math.sin(Math.PI * sh);
    } else if (k === OOPS) {
      tx = 2.5 * Math.sin(sh * Math.PI * 5) * (1 - sh);
    }
    return { transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot}deg` }, { scaleX: sx }, { scaleY: sy }] };
  });

  const propBox = size * 0.56;
  const popStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, propIn.get() * 2), transform: [{ scale: propIn.get() }] }));
  const loopStyle = useAnimatedStyle(() => {
    const k = propKind.get();
    const f = fast.get();
    const s = slow.get();
    let ty = 0;
    let rot = 0;
    let scale = 1;
    let opacity = 1;
    if (k === SWING) rot = 14 * Math.sin(f * TAU);
    else if (k === BOB) ty = 1.5 * Math.sin(f * TAU);
    else if (k === SPIN) rot = s * 360;
    else if (k === PULSE) scale = 1.02 + 0.13 * Math.sin(f * TAU);
    else if (k === RISE) {
      ty = 5 - 11 * s;
      opacity = Math.sin(Math.PI * s);
    } else if (k === HOP) ty = -2.5 * Math.abs(Math.sin(f * Math.PI));
    return { opacity, transform: [{ translateY: ty }, { rotate: `${rot}deg` }, { scale }] };
  });

  const mouth = face.mouth === 'talk' ? null : MOUTHS[face.mouth];
  const glyph = prop ? GLYPHS[prop.glyph] : null;
  const bare = prop ? BARE_GLYPHS.has(prop.glyph) : false;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 56 56">
          <G stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
            {roundEyes ? (
              <>
                <AnimatedEllipse animatedProps={leftEye} rx={baseRx} fill={color} stroke="none" />
                <AnimatedEllipse animatedProps={rightEye} rx={baseRx} fill={color} stroke="none" />
              </>
            ) : (
              eyes.paths.map((d) => <Path key={d} d={d} strokeWidth={2.4} />)
            )}
            {brow ? brow.map((d) => <Path key={d} d={d} strokeWidth={2} />) : null}
            {mouth ? (
              <Path d={mouth.d} strokeWidth={2.2} fill={mouth.fill ? color : 'none'} stroke={mouth.fill ? 'none' : color} />
            ) : (
              <AnimatedEllipse animatedProps={mouthProps} cx={28} cy={37} rx={3.2} fill={color} stroke="none" />
            )}
          </G>
        </Svg>
      </Animated.View>

      {prop && glyph ? (
        <Animated.View
          style={[{ position: 'absolute', top: -size * 0.34, start: (size - propBox) / 2, width: propBox, height: propBox }, popStyle]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              loopStyle,
              bare
                ? null
                : { padding: propBox * 0.16, borderRadius: propBox, backgroundColor: colors.background, borderWidth: 1, borderColor: ai.border },
            ]}>
            <Svg width="100%" height="100%" viewBox="0 0 24 24">
              <G
                stroke={glyph.filled ? 'none' : ai.solid}
                fill={glyph.filled ? ai.solid : 'none'}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round">
                {glyph.paths.map((d) => (
                  <Path key={d} d={d} />
                ))}
                {prop.lens ? (
                  <>
                    <Path d={LENS.circle} fill={colors.background} />
                    <Path d={LENS.handle} />
                  </>
                ) : null}
              </G>
            </Svg>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export const AuraFace = memo(AuraFaceImpl);
