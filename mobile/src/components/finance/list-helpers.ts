import { useMemo } from 'react';
import { FadeInDown } from 'react-native-reanimated';

import { duration, spacing, useTheme } from '@/theme';

/** Bottom padding that keeps the last list row clear of a floating action button (56pt + gutter). */
export const FAB_CLEARANCE = spacing.xxxl + spacing.xxl + spacing.lg;

/** How many leading rows animate in; later rows (and recycled cells while scrolling) appear instantly. */
const ANIMATED_ROWS = 8;
const STAGGER_MS = 40;

/** Subtle fade-and-rise for the first rows of a list. Undefined (no animation) when reduce-motion is on. */
export function useEntering(index: number) {
  const { reduceMotion } = useTheme();
  return useMemo(
    () => (reduceMotion || index >= ANIMATED_ROWS ? undefined : FadeInDown.delay(index * STAGGER_MS).duration(duration.base)),
    [index, reduceMotion],
  );
}
