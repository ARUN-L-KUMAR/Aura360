import { I18nManager } from 'react-native';

/**
 * Right-to-left support. The UI is written with logical properties (`marginStart`, `paddingEnd`, `start`/`end`,
 * `textAlign: 'auto'`) so it mirrors itself when an RTL language ships. Two things do not mirror on their own:
 * directional icons and hand-computed pixel offsets. Use `directional()` for the first and `isRTL` for the second.
 */
export const isRTL = () => I18nManager.isRTL;

/** Pick the icon for "forward" / "back" arrows and chevrons in the current reading direction. */
export function directional<T>(ltr: T, rtl: T): T {
  return I18nManager.isRTL ? rtl : ltr;
}

/** `+1` in LTR, `-1` in RTL: multiply a horizontal translation so it follows the reading direction. */
export const directionSign = () => (I18nManager.isRTL ? -1 : 1);
