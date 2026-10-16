import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { duration, spacing, useTheme } from '@/theme';

const STAGGER_MS = 60;

/** Dashboard block: header + content with a gap, fading up on mount (staggered by `index`) unless motion is reduced. */
export function Section({ index = 0, children }: { index?: number; children: ReactNode }) {
  const { reduceMotion } = useTheme();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(index * STAGGER_MS).duration(duration.base)}
      style={{ gap: spacing.md }}>
      {children}
    </Animated.View>
  );
}
