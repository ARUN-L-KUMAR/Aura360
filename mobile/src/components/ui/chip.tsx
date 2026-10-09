import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
};

export function Chip({ label, selected, onPress, color }: ChipProps) {
  const { colors } = useTheme();
  const active = color ?? colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? active : colors.border,
        backgroundColor: selected ? active : colors.card,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text variant="label" style={{ color: selected ? (color ? '#ffffff' : colors.primaryText) : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Wrapping group of chips (form fields). */
export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
}

/** Single horizontally-scrolling row of chips (filters). */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {children}
    </ScrollView>
  );
}
