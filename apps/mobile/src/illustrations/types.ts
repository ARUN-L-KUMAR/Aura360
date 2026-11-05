import type { ComponentType } from 'react';

import type { ScenePalette } from './palette';

/**
 * Illustrations are built as PURE SVG scene components: they import only `react` and `react-native-svg`, take their
 * colours from a `ScenePalette` (never hard-coded), and never touch React Native, Reanimated or the theme hook. That is
 * what lets `npm run render:art` draw them to PNG under plain Node so they can be looked at before shipping. The app-side
 * `<Illustration>` (components/illustrations/illustration.tsx) adds theming, motion and accessibility around them.
 */
export type SceneProps = {
  /** Size to draw at, in points. The scene must fill exactly this box (use a viewBox, not fixed pixel coordinates). */
  width: number;
  height: number;
  p: ScenePalette;
  /** Scene-specific variant (for example a time of day). One of `SceneDef.variants`. */
  variant?: string;
};

/** Gentle looping motion for a layer, applied by the app wrapper with transform only. */
export type LayerMotion = {
  /** Vertical drift in points (up and back down). */
  dy?: number;
  /** Horizontal drift in points. */
  dx?: number;
  /** Breathing scale amplitude, e.g. 0.03 for +-3%. */
  scale?: number;
  /** Seconds for one full loop. Default 6. */
  period?: number;
  /** Start offset in seconds so layers do not move in lockstep. */
  delay?: number;
};

export type SceneLayer = {
  /** Stable id (also used by the preview harness for file names). */
  id: string;
  /** Renders one `<Svg>` filling the scene box. Layers are stacked in order, first at the back. */
  Component: ComponentType<SceneProps>;
  motion?: LayerMotion;
  /** Scroll parallax: the layer shifts by `scrollY * parallax` points (use small values, 0.05 to 0.3). */
  parallax?: number;
};

export type SceneDef = {
  /** width / height of the artwork's natural box. */
  aspect: number;
  layers: SceneLayer[];
  /** Variants the harness should also render (e.g. ['morning', 'day', 'evening', 'night']). */
  variants?: string[];
  /** One-line description for the preview sheet. */
  note?: string;
};
