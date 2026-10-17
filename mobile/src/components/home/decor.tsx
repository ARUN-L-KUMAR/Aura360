import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Wraps a chart or illustration that sits inside a tile which already speaks for it ("Finance logs: 12, 34 percent of
 * all your entries"). Screen readers skip it, so the tile reads as one element instead of a pile of fragments.
 */
export function Decor({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      {children}
    </View>
  );
}
