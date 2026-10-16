import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useTheme } from '@/theme';

export type DividerProps = {
  /** Which ends are pulled in: none (full width), start (left only, for list rows), both. */
  inset?: 'none' | 'start' | 'both';
  /** How far to inset. Default 16 (screen gutter). */
  insetSize?: number;
  /** Use the stronger border colour. */
  strong?: boolean;
  /** Vertical line instead of horizontal (needs a parent with a height). */
  vertical?: boolean;
  /** Space above and below (or left and right when vertical). */
  gap?: keyof typeof spacing;
  style?: StyleProp<ViewStyle>;
};

/** Hairline separator. Purely visual, so it is hidden from screen readers. */
export function Divider({ inset = 'none', insetSize = spacing.lg, strong = false, vertical = false, gap, style }: DividerProps) {
  const { colors } = useTheme();
  const margin = gap ? spacing[gap] : 0;
  const start = inset === 'start' || inset === 'both' ? insetSize : 0;
  const end = inset === 'both' ? insetSize : 0;
  const color = strong ? colors.borderStrong : colors.border;

  const layoutStyle: ViewStyle = vertical
    ? { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: margin, marginTop: start, marginBottom: end }
    : { height: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: margin, marginLeft: start, marginRight: end };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[layoutStyle, { backgroundColor: color }, style]}
    />
  );
}
