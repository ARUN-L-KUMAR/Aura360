import Animated from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { EmptyState, type EmptyStateProps } from '@/components/ui/empty-state';
import { useBlockMotion } from '@/components/ui/motion';
import type { ModuleKey } from '@/theme';

/**
 * The "nothing here yet" state of Notes and Saved as the screen's one hero: the module accent washes softly into a solid
 * card, and the block fades in once. Only for the true first-use state, never for "no results" or errors.
 */
export function EmptyHero({ accent, ...props }: EmptyStateProps & { accent: ModuleKey }) {
  const motion = useBlockMotion();
  return (
    <Animated.View {...motion}>
      <Card gradient={accent} padding="none">
        <EmptyState accent={accent} {...props} />
      </Card>
    </Animated.View>
  );
}
