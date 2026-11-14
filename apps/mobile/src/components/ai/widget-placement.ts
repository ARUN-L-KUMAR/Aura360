import AsyncStorage from '@react-native-async-storage/async-storage';
import { withSpring, withTiming } from 'react-native-reanimated';

import { spacing, type spring } from '@/theme';

import { APP_BAR_HEIGHT, BOTTOM_GAP, EDGE_MARGIN, FAB_SIZE, MIN_BOTTOM_INSET, TAB_BAR_CONTENT_HEIGHT } from './widget-constants';

/** Fallback reserved bottom space (guessed bar height + the minimum inset) used until the real tab bar has laid out. */
const FALLBACK_BOTTOM_RESERVED = MIN_BOTTOM_INSET + TAB_BAR_CONTENT_HEIGHT;

/** The edge the bubble rests against, in reading direction: `start` is the left in LTR and the right in RTL. */
export type Side = 'start' | 'end';

export type FabBounds = {
  width: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/**
 * Where the bubble may rest, in the coordinates of the full-screen overlay. `x` is measured from the start edge
 * (the overlay is anchored with `start: 0`), so multiply it by `directionSign()` to get a screen translation.
 * - Horizontally it docks `EDGE_MARGIN` from either edge.
 * - Vertically it stays below the status bar plus a top app bar, and above the bottom nav bar. `tabBarHeight` is the
 *   bar's real measured height (already including its own safe-area padding) from `useTabBarHeight()`; a guess is used
 *   only until the bar has laid out once.
 */
export function getFabBounds(width: number, height: number, insets: { top: number; bottom: number }, tabBarHeight: number): FabBounds {
  const minY = insets.top + APP_BAR_HEIGHT + spacing.sm;
  const bottomReserved = tabBarHeight > 0 ? tabBarHeight : FALLBACK_BOTTOM_RESERVED;
  return {
    width,
    minX: EDGE_MARGIN,
    maxX: width - FAB_SIZE - EDGE_MARGIN,
    minY,
    maxY: Math.max(minY, height - bottomReserved - FAB_SIZE - BOTTOM_GAP),
  };
}

export const sideToX = (side: Side, bounds: FabBounds) => (side === 'start' ? bounds.minX : bounds.maxX);

export const clampY = (y: number, bounds: FabBounds) => Math.min(bounds.maxY, Math.max(bounds.minY, y));

const PLACEMENT_KEY = 'aura.aiWidget.placement.v2';

/**
 * Last edge and height the user left the bubble at. Kept in module scope so it survives the widget remounting when
 * navigating between stacks, and saved to AsyncStorage so it survives app restarts (it is a layout preference, not a
 * secret, so it does not belong in SecureStore). `y: null` means "not placed yet": sit just above the tab bar.
 * The default edge is the start side (left in LTR) so the bubble never sits on top of a screen's primary action, which
 * sits on the end side.
 */
export const sessionPlacement: { side: Side; y: number | null } = { side: 'start', y: null };

/** Load the saved placement. Runs once at import; the stored height is re-clamped to the screen when it is used. */
async function hydratePlacement() {
  try {
    const raw = await AsyncStorage.getItem(PLACEMENT_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { side?: unknown; y?: unknown };
    // Older versions stored the physical side (`left` / `right`), which was the start / end side in the only layout direction shipped.
    if (saved.side === 'start' || saved.side === 'left') sessionPlacement.side = 'start';
    else if (saved.side === 'end' || saved.side === 'right') sessionPlacement.side = 'end';
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
