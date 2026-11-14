import { createContext, useContext } from 'react';

/**
 * The bottom tab bar's actual rendered height (including its own safe-area padding), measured live via `onLayout`
 * in `AppTabs`. Replaces guessing the bar's height from constants, which drifts from the real value across devices
 * and platforms (notch/gesture-nav insets, glass bar, larger labels, ...). Defaults to 0 until the first layout.
 */
export const TabBarHeightContext = createContext({
  height: 0,
  setHeight: (_height: number) => {},
});

export const useTabBarHeight = () => useContext(TabBarHeightContext).height;
