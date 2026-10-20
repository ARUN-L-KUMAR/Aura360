import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { withAlpha } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { layout, radius, spacing, useTheme } from '@/theme';

import type { LucideIcon } from 'lucide-react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type CategoryOption<T extends string> = {
  value: T;
  label: string;
  icon: IconName | LucideIcon | React.ComponentType<{ size?: number; color?: string }>;
  /** Draw the tile with a dashed border (the "Custom" tile of the transaction sheet). `columns` layout only. */
  dashed?: boolean;
};

type Props<T extends string> = {
  options: readonly CategoryOption<T>[];
  /** The selected value, or `''` when nothing is chosen yet. */
  value: string;
  onChange: (value: T) => void;
  /** Spoken name of the group, for example "Category". */
  accessibilityLabel: string;
  /**
   * Lay the options out as a grid of this many equal columns (a column of icon over label, tinted when chosen) instead of
   * the default flowing tiles. The last row is padded so every tile has the same width.
   */
  columns?: number;
  /** Colour of the chosen tile in the `columns` layout (border, tint and icon): the fill and the text-safe version of it. */
  tint?: { solid: string; text: string };
};

const TILE_ICON = layout.minTouchTarget - spacing.xs;
const TILE_BORDER = 2;
const GRID_TILE_HEIGHT = spacing.xxxl + spacing.xl + spacing.xs + 2;
const GRID_ICON = spacing.xl - 2;
const CHECK = spacing.md + 2;

/**
 * Single choice from a handful of categories, drawn as icon tiles. The chosen tile gets a thicker border, a filled icon
 * disc and a check mark, so the selection never depends on colour alone. Announced as a radio group.
 */
export function CategoryPicker<T extends string>({ options, value, onChange, accessibilityLabel, columns, tint }: Props<T>) {
  const { colors } = useTheme();

  if (columns && columns > 0) {
    const solid = tint?.solid ?? colors.primary;
    const text = tint?.text ?? colors.primaryAccent;
    const rows: (CategoryOption<T> | null)[][] = [];
    for (let i = 0; i < options.length; i += columns) {
      const row: (CategoryOption<T> | null)[] = options.slice(i, i + columns);
      while (row.length < columns) row.push(null);
      rows.push(row);
    }
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ gap: spacing.sm }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: spacing.sm }}>
            {row.map((option, c) => {
              if (!option) return <View key={`pad-${c}`} style={{ flex: 1 }} />;
              const selected = option.value === value;
              const ink = selected ? text : colors.textSecondary;
              return (
                <PressableScale
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: selected }}
                  haptic="select"
                  ringRadius={radius.lg}
                  onPress={() => onChange(option.value)}
                  style={{
                    flex: 1,
                    minHeight: GRID_TILE_HEIGHT,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.xs,
                    paddingHorizontal: spacing.xs,
                    borderRadius: radius.lg,
                    borderWidth: selected ? TILE_BORDER : 1,
                    borderStyle: option.dashed && !selected ? 'dashed' : 'solid',
                    borderColor: selected ? solid : colors.border,
                    backgroundColor: selected ? withAlpha(solid, 0.16) : colors.card,
                  }}>
                  {typeof option.icon === 'string' ? <Ionicons name={option.icon} size={GRID_ICON} color={ink} /> : <option.icon size={GRID_ICON} color={ink} />}
                  <Text variant="caption" weight={selected ? 'bold' : 'medium'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: ink, alignSelf: 'stretch', textAlign: 'center' }}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <View pointerEvents="none" style={{ position: 'absolute', top: spacing.xs, end: spacing.xs }}>
                      <Ionicons name="checkmark-circle" size={CHECK} color={solid} />
                    </View>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

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
              borderColor: selected ? colors.primary : colors.borderSubtle,
              backgroundColor: selected ? colors.cardMuted : colors.card,
            }}>
            <View
              style={{
                width: TILE_ICON,
                height: TILE_ICON,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? colors.primary : colors.cardMuted,
              }}>
              {typeof option.icon === 'string' ? (
                <Ionicons name={option.icon} size={22} color={selected ? colors.primaryText : colors.textSecondary} />
              ) : (
                <option.icon size={20} color={selected ? colors.primaryText : colors.textSecondary} />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
              {selected ? <Ionicons name="checkmark-circle" size={14} color={colors.text} /> : null}
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
