import AsyncStorage from '@react-native-async-storage/async-storage';
import { withSpring, withTiming } from 'react-native-reanimated';

import { spacing, type spring } from '@/theme';

import { APP_BAR_HEIGHT, EDGE_MARGIN, FAB_SIZE, MIN_BOTTOM_INSET, TAB_BAR_CONTENT_HEIGHT } from './widget-constants';

export type Side = 'left' | 'right';

export type FabBounds = {
  width: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/**
 * Where the bubble may rest, in the coordinates of the full-screen overlay.
 * - Horizontally it docks `EDGE_MARGIN` from either edge.
 * - Vertically it stays below the status bar plus a top app bar, and above the bottom nav bar
 *   (`TAB_BAR_CONTENT_HEIGHT` + bottom safe-area inset), so it never covers navigation.
 */
export function getFabBounds(width: number, height: number, insets: { top: number; bottom: number }): FabBounds {
  const minY = insets.top + APP_BAR_HEIGHT + spacing.sm;
  const bottomReserved = Math.max(insets.bottom, MIN_BOTTOM_INSET) + TAB_BAR_CONTENT_HEIGHT;
  return {
    width,
    minX: EDGE_MARGIN,
    maxX: width - FAB_SIZE - EDGE_MARGIN,
    minY,
    maxY: Math.max(minY, height - bottomReserved - FAB_SIZE - EDGE_MARGIN),
  };
}

export const sideToX = (side: Side, bounds: FabBounds) => (side === 'left' ? bounds.minX : bounds.maxX);

export const clampY = (y: number, bounds: FabBounds) => Math.min(bounds.maxY, Math.max(bounds.minY, y));

const PLACEMENT_KEY = 'aura.aiWidget.placement.v1';

/**
 * Last edge and height the user left the bubble at. Kept in module scope so it survives the widget remounting when
 * navigating between stacks, and saved to AsyncStorage so it survives app restarts (it is a layout preference, not a
 * secret, so it does not belong in SecureStore). `y: null` means "not placed yet": sit just above the tab bar.
 * The default edge is the left so the bubble never sits on top of a screen's bottom-right primary action.
 */
export const sessionPlacement: { side: Side; y: number | null } = { side: 'left', y: null };

/** Load the saved placement. Runs once at import; the stored height is re-clamped to the screen when it is used. */
async function hydratePlacement() {
  try {
    const raw = await AsyncStorage.getItem(PLACEMENT_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { side?: unknown; y?: unknown };
    if (saved.side === 'left' || saved.side === 'right') sessionPlacement.side = saved.side;
    if (typeof saved.y === 'number' && Number.isFinite(saved.y)) sessionPlacement.y = saved.y;
  } catch {
    // A missing or corrupt value just means the default position.
  }
}
void hydratePlacement();

/** Spring (or an instant move under reduced motion) to a resting value. Runs on the UI thread. */
export function settle(target: number, reduceMotion: boolean, config: typeof spring.bouncy | typeof spring.gentle) {
  'worklet';
  return reduceMotion ? withTiming(target, { duration: 1 }) : withSpring(target, config);
}

export function rememberPlacement(side: Side, y: number) {
  sessionPlacement.side = side;
  sessionPlacement.y = y;
  AsyncStorage.setItem(PLACEMENT_KEY, JSON.stringify({ side, y: Math.round(y) })).catch(() => {});
}
