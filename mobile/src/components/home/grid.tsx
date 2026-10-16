import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/theme';

/** Two-column wrapping grid; cells grow to fill the row and drop to one column when the text gets large. */
export function Grid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>{children}</View>;
}

export const gridCell: StyleProp<ViewStyle> = { flexGrow: 1, flexBasis: '45%' };
