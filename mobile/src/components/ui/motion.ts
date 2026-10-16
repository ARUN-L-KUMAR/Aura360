import { useEffect, useMemo, useRef } from 'react';
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { duration, easing, motionDuration, spring, useTheme } from '@/theme';

/** `withTiming` config for "change at once" (reduce-motion, first placement): a single frame. */
export const instant = { duration: motionDuration(0, true) } as const;

/** Scale a control starts from when it pops into its selected state, and from when it pops out of it. */
const POP_IN_FROM = 0.9;
const POP_OUT_FROM = 1.05;

/** How many leading rows stagger in; later rows (and recycled cells while scrolling) appear instantly. */
const STAGGER_ROWS = 8;
const STAGGER_MS = 40;

const decelerate = Easing.bezier(...easing.decelerate);
const accelerate = Easing.bezier(...easing.accelerate);
const standard = Easing.bezier(...easing.standard);

/**
 * Enter / exit / reflow motion for one row of a list. Spread it on an `Animated.View`:
 *
 * ```tsx
 * <Animated.View {...useListMotion(index)}>
 * ```
 *
 * - enter: fade + 12pt rise, staggered for the first rows only
 * - exit: quick fade, so a deleted / archived / undo-hidden row leaves smoothly
 * - layout: the rows below slide up to close the gap
 *
 * All three are transform / opacity only. With reduce-motion on it returns an empty object (no animation at all).
 */
export function useListMotion(index = 0) {
  const { reduceMotion } = useTheme();
  return useMemo(
    () =>
      reduceMotion
        ? {}
        : {
            entering: index < STAGGER_ROWS ? FadeInDown.delay(index * STAGGER_MS).duration(duration.base).easing(decelerate) : undefined,
            exiting: FadeOut.duration(duration.fast).easing(accelerate),
            layout: LinearTransition.duration(duration.base).easing(standard),
          },
    [reduceMotion, index],
  );
}

/** A single block that fades in once (a summary card, a section). Empty object under reduce-motion. */
export function useBlockMotion(delayMs = 0) {
  const { reduceMotion } = useTheme();
  return useMemo(() => (reduceMotion ? {} : { entering: FadeIn.delay(delayMs).duration(duration.base).easing(decelerate) }), [reduceMotion, delayMs]);
}

/**
 * A small scale pop whenever `active` changes (not on first render): selecting overshoots from slightly smaller,
 * deselecting settles from slightly larger. Returns an animated style (transform only) for an `Animated.View` that
 * wraps the control. No pop under reduce-motion.
 */
export function usePop(active: boolean) {
  const { reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const previous = useRef(active);

  useEffect(() => {
    if (previous.current === active) return;
    previous.current = active;
    if (reduceMotion) {
      scale.set(1);
      return;
    }
    scale.set(active ? POP_IN_FROM : POP_OUT_FROM);
    scale.set(withSpring(1, active ? spring.bouncy : spring.gentle));
  }, [active, reduceMotion, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}
