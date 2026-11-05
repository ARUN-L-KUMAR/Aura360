import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import type { IconName } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { duration, layout, radius, spacing, useTheme } from '@/theme';

export type SheetAction = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
};

/**
 * The "more options" menu for a row: the non-gesture alternative to swiping and long-pressing. Closes first, then runs
 * the action once the sheet has gone (so an action that opens a dialog does not collide with the sheet's modal).
 */
export function ActionSheet({ visible, onClose, title, actions }: Props) {
  const { colors } = useTheme();
  return (
    <BottomSheet glass visible={visible} onClose={onClose} title={title}>
      <View style={{ paddingBottom: spacing.md }}>
        {actions.map((action) => (
          <PressableScale
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            haptic="tap"
            scaleTo={1}
            ringRadius={radius.md}
            onPress={() => {
              onClose();
              setTimeout(action.onPress, duration.base);
            }}
            style={{
              minHeight: layout.minTouchTarget + spacing.xs,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.xs,
              paddingVertical: spacing.sm,
            }}>
            <Ionicons name={action.icon} size={22} color={action.destructive ? colors.errorText : colors.textSecondary} />
            <Text variant="body" weight="medium" color={action.destructive ? 'errorText' : 'text'} style={{ flex: 1 }}>
              {action.label}
            </Text>
          </PressableScale>
        ))}
      </View>
    </BottomSheet>
  );
}
