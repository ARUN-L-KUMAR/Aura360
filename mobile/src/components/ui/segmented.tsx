import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: 3 }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: spacing.sm,
              borderRadius: radius.sm + 1,
              backgroundColor: selected ? colors.card : 'transparent',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.border,
            }}>
            <Text variant="label" style={{ fontWeight: selected ? '600' : '500' }} muted={!selected}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
