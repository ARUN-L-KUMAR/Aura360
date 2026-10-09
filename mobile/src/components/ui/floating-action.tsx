import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface FloatingActionProps {
  icon?: IconName;
  onPress: () => void;
  color?: string;
  accessibilityLabel: string;
  style?: ViewStyle;
}

export function FloatingAction({
  icon = 'add',
  onPress,
  color,
  accessibilityLabel,
  style,
}: FloatingActionProps) {
  const { colors } = useTheme();
  const bg = color ?? colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.93 : 1 }],
        },
        style,
      ]}>
      <Ionicons name={icon} size={28} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
