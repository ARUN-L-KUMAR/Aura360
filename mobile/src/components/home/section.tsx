import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';

import { useListMotion } from '@/components/ui/motion';
import { spacing } from '@/theme';

/**
 * Dashboard block: header + content with a gap, fading up on mount (staggered by `index`). Only the entrance is used:
 * the blocks never leave, and their reflow is left to the data. Reduce-motion turns the entrance off.
 */
export function Section({ index = 0, children }: { index?: number; children: ReactNode }) {
  const { entering } = useListMotion(index);
  return (
    <Animated.View entering={entering} style={{ gap: spacing.md }}>
      {children}
    </Animated.View>
  );
}
