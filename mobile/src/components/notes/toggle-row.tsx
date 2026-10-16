import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Switch, View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  accent: ModuleKey;
};

/** A whole-row on / off setting: the row is the switch for touch and for screen readers; the visual Switch is decoration. */
export function ToggleRow({ icon, label, description, value, onChange, accent }: Props) {
  const { colors, accent: accentFor } = useTheme();
  const a = accentFor(accent);
  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      haptic="select"
      scaleTo={1}
      ringRadius={radius.md}
      onPress={() => onChange(!value)}
      style={{ minHeight: layout.minTouchTarget + spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs }}>
      <Ionicons name={icon} size={22} color={value ? a.text : colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="medium">
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch value={value} trackColor={{ false: colors.borderStrong, true: a.solid }} thumbColor={colors.surfaceRaised} />
      </View>
    </PressableScale>
  );
}
