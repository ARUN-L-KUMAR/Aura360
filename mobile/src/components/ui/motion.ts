import { useMemo } from 'react';
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { duration, easing, useTheme } from '@/theme';

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
