import { Platform, type ViewStyle } from 'react-native';

import type { ColorScheme } from './colors';

/** 4pt grid. Use these for every padding, margin and gap. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/** Layout constants built from the spacing scale. */
export const layout = {
  /** Page gutter. Use `screenPaddingWide` for hero-style screens. */
  screenPadding: spacing.lg,
  screenPaddingWide: 20,
  cardPadding: spacing.lg,
  /** Gap between sibling blocks on a screen. */
  sectionGap: spacing.xl,
  /** Gap between items inside a block. */
  itemGap: spacing.md,
  /** Minimum touch target (Apple HIG 44pt, Material 48dp). */
  minTouchTarget: 44,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999, full: 9999 } as const;

export type ElevationLevel = 0 | 1 | 2 | 3 | 4;

const SHADOW = {
  0: { y: 0, blur: 0, opacity: 0, elevation: 0 },
  1: { y: 1, blur: 3, opacity: 0.06, elevation: 1 },
  2: { y: 2, blur: 8, opacity: 0.08, elevation: 3 },
  3: { y: 6, blur: 16, opacity: 0.12, elevation: 6 },
  4: { y: 12, blur: 28, opacity: 0.18, elevation: 12 },
} as const;

/**
 * Soft shadow for a level: 0 flat, 1 card, 2 raised card, 3 floating (FAB, tab bar), 4 modal / sheet.
 * Dark surfaces get a stronger shadow because the same opacity disappears on a dark background.
 */
export function elevation(level: ElevationLevel, scheme: ColorScheme): ViewStyle {
  const s = SHADOW[level];
  if (level === 0) return Platform.OS === 'android' ? { elevation: 0 } : {};
  if (Platform.OS === 'android') return { elevation: s.elevation };
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: s.y },
    shadowOpacity: scheme === 'dark' ? Math.min(1, s.opacity * 2.5) : s.opacity,
    shadowRadius: s.blur,
  };
}
