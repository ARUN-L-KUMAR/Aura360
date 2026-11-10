import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { MascotId } from '@/features/ai/mascot/characters';
import type { Mood } from '@/features/ai/mascot/face';
import type { ToolActivity } from '@/features/ai/mascot/mood';
import { useMascot } from '@/features/ai/mascot/selection';
import { useTheme } from '@/theme';

// Metro needs a static `require(...)` per image, so the mascot+mood -> asset mapping lives here rather than in
// the shared, framework-agnostic characters.ts / face.ts (see those files' headers).
const MOOD_SOURCES: Record<MascotId, Record<Mood, number>> = {
  robot: {
    sleeping: require('../../../assets/images/mascot/characters/robot/sleeping.png'),
    waking: require('../../../assets/images/mascot/characters/robot/waking.png'),
    idle: require('../../../assets/images/mascot/characters/robot/idle.png'),
    thinking: require('../../../assets/images/mascot/characters/robot/thinking.png'),
    searching: require('../../../assets/images/mascot/characters/robot/searching.png'),
    found: require('../../../assets/images/mascot/characters/robot/found.png'),
    working: require('../../../assets/images/mascot/characters/robot/working.png'),
    talking: require('../../../assets/images/mascot/characters/robot/talking.png'),
    asking: require('../../../assets/images/mascot/characters/robot/asking.png'),
    happy: require('../../../assets/images/mascot/characters/robot/happy.png'),
    oops: require('../../../assets/images/mascot/characters/robot/oops.png'),
  },
  Luffy: {
    sleeping: require('../../../assets/images/mascot/characters/Luffy/sleeping.png'),
    waking: require('../../../assets/images/mascot/characters/Luffy/waking.png'),
    idle: require('../../../assets/images/mascot/characters/Luffy/idle.png'),
    thinking: require('../../../assets/images/mascot/characters/Luffy/thinking.png'),
    searching: require('../../../assets/images/mascot/characters/Luffy/searching.png'),
    found: require('../../../assets/images/mascot/characters/Luffy/found.png'),
    working: require('../../../assets/images/mascot/characters/Luffy/working.png'),
    talking: require('../../../assets/images/mascot/characters/Luffy/talking.png'),
    asking: require('../../../assets/images/mascot/characters/Luffy/asking.png'),
    happy: require('../../../assets/images/mascot/characters/Luffy/happy.png'),
    oops: require('../../../assets/images/mascot/characters/Luffy/oops.png'),
  },
  Zoro: {
    sleeping: require('../../../assets/images/mascot/characters/Zoro/sleeping.png'),
    waking: require('../../../assets/images/mascot/characters/Zoro/waking.png'),
    idle: require('../../../assets/images/mascot/characters/Zoro/idle.png'),
    thinking: require('../../../assets/images/mascot/characters/Zoro/thinking.png'),
    searching: require('../../../assets/images/mascot/characters/Zoro/searching.png'),
    found: require('../../../assets/images/mascot/characters/Zoro/found.png'),
    working: require('../../../assets/images/mascot/characters/Zoro/working.png'),
    talking: require('../../../assets/images/mascot/characters/Zoro/talking.png'),
    asking: require('../../../assets/images/mascot/characters/Zoro/asking.png'),
    happy: require('../../../assets/images/mascot/characters/Zoro/happy.png'),
    oops: require('../../../assets/images/mascot/characters/Zoro/oops.png'),
  },
  Sanji: {
    sleeping: require('../../../assets/images/mascot/characters/Sanji/sleeping.png'),
    waking: require('../../../assets/images/mascot/characters/Sanji/waking.png'),
    idle: require('../../../assets/images/mascot/characters/Sanji/idle.png'),
    thinking: require('../../../assets/images/mascot/characters/Sanji/thinking.png'),
    searching: require('../../../assets/images/mascot/characters/Sanji/searching.png'),
    found: require('../../../assets/images/mascot/characters/Sanji/found.png'),
    working: require('../../../assets/images/mascot/characters/Sanji/working.png'),
    talking: require('../../../assets/images/mascot/characters/Sanji/talking.png'),
    asking: require('../../../assets/images/mascot/characters/Sanji/asking.png'),
    happy: require('../../../assets/images/mascot/characters/Sanji/happy.png'),
    oops: require('../../../assets/images/mascot/characters/Sanji/oops.png'),
  },
  Chopper: {
    sleeping: require('../../../assets/images/mascot/characters/Chopper/sleeping.png'),
    waking: require('../../../assets/images/mascot/characters/Chopper/waking.png'),
    idle: require('../../../assets/images/mascot/characters/Chopper/idle.png'),
    thinking: require('../../../assets/images/mascot/characters/Chopper/thinking.png'),
    searching: require('../../../assets/images/mascot/characters/Chopper/searching.png'),
    found: require('../../../assets/images/mascot/characters/Chopper/found.png'),
    working: require('../../../assets/images/mascot/characters/Chopper/working.png'),
    talking: require('../../../assets/images/mascot/characters/Chopper/talking.png'),
    asking: require('../../../assets/images/mascot/characters/Chopper/asking.png'),
    happy: require('../../../assets/images/mascot/characters/Chopper/happy.png'),
    oops: require('../../../assets/images/mascot/characters/Chopper/oops.png'),
  },
};

const TAU = Math.PI * 2;

// Looping moods: play for as long as the mood holds, matching the web CSS animations in globals.css.
const SLEEPING = 0; // "breathe": slow scale pulse
const IDLE = 1; // "float": slow gentle bob
const THINKING = 2; // "sway": slow rotate side to side
const SEARCHING = 3; // "sway": fast rotate side to side
const WORKING = 4; // "type": fast small bob
const ASKING = 5; // "bounce": fast bob, holds at the top

const MOOD_MOTION: Record<Mood, number> = {
  sleeping: SLEEPING,
  waking: -1,
  idle: IDLE,
  thinking: THINKING,
  searching: SEARCHING,
  found: -1,
  working: WORKING,
  talking: IDLE,
  asking: ASKING,
  happy: -1,
  oops: -1,
};

// One-shot moods: play once when the mood starts, then hold their end pose (a fresh image keeps re-triggering
// this as long as the mood persists, which reads as "it just happened again" — the same as the web version).
const ONE_SHOT_MS: Partial<Record<Mood, number>> = { waking: 700, found: 450, happy: 800, oops: 500 };

/** Which little animated cue plays near the head for a mood, or none. Mirrors the web version. */
const FX_TYPE: Partial<Record<Mood, 'zzz' | 'dots' | 'sparkle' | 'alert'>> = {
  sleeping: 'zzz',
  thinking: 'dots',
  searching: 'dots',
  found: 'sparkle',
  happy: 'sparkle',
  oops: 'alert',
};

type Props = {
  mood: Mood;
  /** Kept for API compatibility with callers; the artwork already shows the activity. */
  activity?: ToolActivity | null;
  /** Width and height of the face. */
  size: number;
  /** Kept for API compatibility; the artwork has its own fixed colours now. */
  color?: string;
  /** Kept for API compatibility; each mood's artwork already includes its own icon/accent. */
  showProp?: boolean;
  /** Stop all looping motion (the bubble is hidden). The expression itself stays. */
  paused?: boolean;
  /** Crop to a circle (for a small avatar on a solid background). Off shows the character's own silhouette. */
  rounded?: boolean;
};

/**
 * Aura's face for the floating bubble: a small illustrated robot, one image per mood (sliced from a single
 * sticker sheet, shared with the web app). Swapping moods just swaps the image; a light Reanimated loop adds
 * a bit of life (breathing, swaying) on top.
 */
function AuraFaceImpl({ mood, size, paused = false, rounded = true }: Props) {
  const { accent, reduceMotion } = useTheme();
  const [mascot] = useMascot();
  const ai = accent('ai');

  const fast = useSharedValue(0); // 1.2 s loop
  const slow = useSharedValue(0); // 3.6 s loop
  const shot = useSharedValue(1); // 0 -> 1 progress of the current one-shot mood's entrance

  useEffect(() => {
    fast.set(0);
    slow.set(0);
    if (paused || reduceMotion) return;
    fast.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false));
    slow.set(withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1, false));
  }, [paused, reduceMotion, fast, slow]);

  // A fresh mood: (re)play its one-shot entrance from the top. Under reduce-motion it just shows the end pose.
  useEffect(() => {
    cancelAnimation(shot);
    const ms = ONE_SHOT_MS[mood];
    if (!ms || reduceMotion) {
      shot.set(1);
      return;
    }
    shot.set(0);
    shot.set(withTiming(1, { duration: ms, easing: Easing.out(Easing.quad) }));
  }, [mood, reduceMotion, shot]);

  const bodyStyle = useAnimatedStyle(() => {
    const k = MOOD_MOTION[mood];
    const f = fast.get();
    const s = slow.get();
    const sh = shot.get();
    let tx = 0;
    let ty = 0;
    let rot = 0;
    let sx = 1;
    let sy = 1;

    if (k === SLEEPING) sx = sy = 1 + 0.04 * Math.sin(s * TAU);
    else if (k === IDLE) ty = -1.5 * Math.sin(s * TAU);
    else if (k === THINKING) rot = 3 * Math.sin(s * TAU);
    else if (k === SEARCHING) rot = 3 * Math.sin(f * TAU);
    else if (k === WORKING) ty = -1.2 * Math.abs(Math.sin(f * TAU));
    else if (k === ASKING) ty = -3 * Math.abs(Math.sin(f * Math.PI));
    else if (mood === 'waking') {
      // "stretch": squash, then overshoot taller, then settle.
      sy = 1 - 0.1 * Math.sin(Math.PI * sh) + 0.24 * Math.max(0, Math.sin(Math.PI * sh) - 0.55);
      sx = 1 + 0.1 * Math.sin(Math.PI * sh) - 0.08 * Math.max(0, Math.sin(Math.PI * sh) - 0.55);
    } else if (mood === 'found') {
      // "pop": scale up and settle.
      sx = sy = 0.85 + 0.43 * Math.sin((Math.PI / 2) * Math.min(1, sh * 1.3));
    } else if (mood === 'happy') {
      // "hop": a single jump with a squash on landing.
      ty = -6 * Math.sin(Math.PI * sh);
      const landing = Math.max(0, sh - 0.6) / 0.4;
      sx = 1 + 0.04 * landing;
      sy = 1 - 0.06 * landing;
    } else if (mood === 'oops') {
      // "shake": a decaying side-to-side wobble.
      tx = 2.5 * Math.sin(sh * Math.PI * 5) * (1 - sh);
    }

    return { transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot}deg` }, { scaleX: sx }, { scaleY: sy }] };
  });

  // A small animated cue near the head for moods that call for one (zzz, thinking dots, sparkle, alert). Skipped
  // below a minimum size, where it would just be noise, and clipped out wherever `rounded` crops to a circle.
  const fx = size >= 40 && !rounded ? FX_TYPE[mood] : undefined;

  // Rise and fade (zzz): a sine hump over each loop reads as "appear, drift up, fade" without a hard reset.
  const zzzStyle = (offset: number) =>
    useAnimatedStyle(() => {
      const p = (slow.get() + offset) % 1;
      return { opacity: Math.sin(Math.PI * p), transform: [{ translateY: -size * 0.14 * p }, { scale: 0.75 + 0.35 * p }] };
    });
  const zzz0 = zzzStyle(0);
  const zzz1 = zzzStyle(0.33);
  const zzz2 = zzzStyle(0.66);

  // Bounce (thinking dots): a quick up-down hop, staggered per dot.
  const dotStyle = (offset: number) =>
    useAnimatedStyle(() => {
      const p = (fast.get() + offset) % 1;
      const hump = Math.abs(Math.sin(Math.PI * p));
      return { opacity: 0.5 + 0.5 * hump, transform: [{ translateY: -size * 0.08 * hump }] };
    });
  const dot0 = dotStyle(0);
  const dot1 = dotStyle(0.15);
  const dot2 = dotStyle(0.3);

  // Pop (sparkle): scale and spin in, then back out.
  const sparkleStyle = (offset: number) =>
    useAnimatedStyle(() => {
      const p = (slow.get() * 3 + offset) % 1;
      const hump = Math.sin(Math.PI * p);
      return { opacity: 0.45 + 0.55 * hump, transform: [{ scale: 0.6 + 0.5 * hump }, { rotate: `${18 * hump}deg` }] };
    });
  const sparkle0 = sparkleStyle(0);
  const sparkle1 = sparkleStyle(0.35);

  // Shake (alert): a decaying wobble that repeats each loop.
  const alertStyle = useAnimatedStyle(() => {
    const p = (fast.get() * 2) % 1;
    return { transform: [{ translateX: 2.5 * Math.sin(p * Math.PI * 10) * (1 - p) }, { scale: 1 + 0.08 * Math.sin(Math.PI * p) }] };
  });

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: rounded ? size / 2 : 0, overflow: rounded ? 'hidden' : 'visible' }}>
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Image
          source={MOOD_SOURCES[mascot][mood]}
          style={{ width: size, height: size }}
          contentFit={rounded ? 'cover' : 'contain'}
        />
      </Animated.View>

      {fx === 'zzz' ? (
        <View style={[styles.fxZzz, { width: size * 0.55, height: size * 0.55 }]}>
          <Animated.Text style={[styles.fxZzzChar, { fontSize: size * 0.12, right: size * 0.22, bottom: size * 0.02, color: ai.solid }, zzz0]}>z</Animated.Text>
          <Animated.Text style={[styles.fxZzzChar, { fontSize: size * 0.16, right: size * 0.12, bottom: size * 0.1, color: ai.solid }, zzz1]}>z</Animated.Text>
          <Animated.Text style={[styles.fxZzzChar, { fontSize: size * 0.2, right: size * 0.02, bottom: size * 0.18, color: ai.solid }, zzz2]}>z</Animated.Text>
        </View>
      ) : null}

      {fx === 'dots' ? (
        <View style={[styles.fxDots, { top: -size * 0.1 }]}>
          <Animated.View style={[styles.fxDot, { width: size * 0.09, height: size * 0.09, backgroundColor: ai.solid }, dot0]} />
          <Animated.View style={[styles.fxDot, { width: size * 0.09, height: size * 0.09, marginStart: size * 0.04, backgroundColor: ai.solid }, dot1]} />
          <Animated.View style={[styles.fxDot, { width: size * 0.09, height: size * 0.09, marginStart: size * 0.04, backgroundColor: ai.solid }, dot2]} />
        </View>
      ) : null}

      {fx === 'sparkle' ? (
        <View style={[styles.fxSparkle, { width: size * 0.5, height: size * 0.5 }]}>
          <Animated.Text style={[styles.fxSparkleChar, { fontSize: size * 0.16, top: 0, right: size * 0.08 }, sparkle0]}>✦</Animated.Text>
          <Animated.Text style={[styles.fxSparkleChar, { fontSize: size * 0.11, top: size * 0.15, right: -size * 0.02 }, sparkle1]}>✦</Animated.Text>
        </View>
      ) : null}

      {fx === 'alert' ? (
        <Animated.Text style={[styles.fxAlert, { fontSize: size * 0.2, top: -size * 0.06, right: -size * 0.04 }, alertStyle]}>!</Animated.Text>
      ) : null}
    </View>
  );
}

export const AuraFace = memo(AuraFaceImpl);

const styles = StyleSheet.create({
  fxZzz: {
    position: 'absolute',
    top: '-6%',
    right: '-10%',
  },
  fxZzzChar: {
    position: 'absolute',
    fontWeight: '800',
  },
  fxDots: {
    position: 'absolute',
    left: '50%',
    flexDirection: 'row',
    transform: [{ translateX: -8 }],
  },
  fxDot: {
    borderRadius: 999,
  },
  fxSparkle: {
    position: 'absolute',
    top: '-4%',
    right: '-8%',
  },
  fxSparkleChar: {
    position: 'absolute',
    color: '#f5b300',
  },
  fxAlert: {
    position: 'absolute',
    fontWeight: '800',
    color: '#ef4444',
  },
});
