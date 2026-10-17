import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type CategoryOption<T extends string> = { value: T; label: string; icon: IconName };

type Props<T extends string> = {
  options: readonly CategoryOption<T>[];
  /** The selected value, or `''` when nothing is chosen yet. */
  value: string;
  onChange: (value: T) => void;
  /** Spoken name of the group, for example "Category". */
  accessibilityLabel: string;
  accent?: ModuleKey;
};

const TILE_ICON = layout.minTouchTarget - spacing.xs;
const TILE_BORDER = 2;

/**
 * Single choice from a handful of categories, drawn as icon tiles. The chosen tile gets a thicker border, a filled icon
 * disc and a check mark, so the selection never depends on colour alone. Announced as a radio group.
 */
export function CategoryPicker<T extends string>({ options, value, onChange, accessibilityLabel, accent = 'finance' }: Props<T>) {
  const { colors, accent: accentFor } = useTheme();
  const tone = accentFor(accent);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            haptic="select"
            ringRadius={radius.md}
            onPress={() => onChange(option.value)}
            style={{
              flexGrow: 1,
              flexBasis: spacing.xxxl * 2,
              minHeight: layout.minTouchTarget,
              alignItems: 'center',
              gap: spacing.xs,
              padding: spacing.sm,
              borderRadius: radius.md,
              borderWidth: TILE_BORDER,
              borderColor: selected ? tone.solid : colors.borderSubtle,
              backgroundColor: selected ? tone.soft : colors.card,
            }}>
            <View
              style={{
                width: TILE_ICON,
                height: TILE_ICON,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? tone.solid : colors.cardMuted,
              }}>
              <Ionicons name={option.icon} size={22} color={selected ? tone.onSolid : colors.textSecondary} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
              {selected ? <Ionicons name="checkmark-circle" size={14} color={tone.text} /> : null}
              <Text variant="caption" weight={selected ? 'semiBold' : 'medium'} numberOfLines={2} style={{ flexShrink: 1, textAlign: 'center' }}>
                {option.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}
