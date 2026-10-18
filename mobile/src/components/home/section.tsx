import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme } from '@/theme';

/**
 * Dashboard block: header + content with a gap, fading up on mount (staggered by `index`). Only the entrance is used:
 * the blocks never leave, and their reflow is left to the data. Reduce-motion turns the entrance off.
 */
export function Section({ index = 0, children }: { index?: number; children: ReactNode }) {
  const { entering } = useListMotion(index);
  return (
    <Animated.View entering={entering} style={{ gap: spacing.lg }}>
      {children}
    </Animated.View>
  );
}

type HeadProps = {
  title: string;
  /** Muted line under the title (the web's CardDescription). */
  description?: string;
  /** Trailing link, e.g. "See all". */
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onActionPress?: () => void;
};

/** Section heading as on the web: a bold title, a muted description and an optional "See all" link (44pt target). */
export function SectionHead({ title, description, actionLabel, actionAccessibilityLabel, onActionPress }: HeadProps) {
  const { colors } = useTheme();
  const hasAction = !!actionLabel && !!onActionPress;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xs / 2 }}>
        <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {hasAction ? (
        <PressableScale
          accessibilityRole="link"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onActionPress}
          haptic={false}
          scaleTo={1}
          ringRadius={radius.sm}
          style={{ minHeight: layout.minTouchTarget, minWidth: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs / 2 }}>
          <Text variant="label" weight="semiBold" color="textSecondary">
            {actionLabel}
          </Text>
          <Ionicons name={directional('chevron-forward', 'chevron-back')} size={16} color={colors.textSecondary} />
        </PressableScale>
      ) : null}
    </View>
  );
}
