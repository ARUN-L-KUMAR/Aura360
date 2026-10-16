/**
 * Motion tokens. Pure data, so they work with Reanimated (`Easing.bezier(...easing.standard)`) and RN `Animated`.
 * Animate only transform and opacity (see DESIGN_SYSTEM.md).
 */
export const duration = { instant: 0, fast: 150, base: 250, slow: 400 } as const;

/** Cubic-bezier control points [x1, y1, x2, y2]. */
export const easing = {
  /** Default for things moving within the screen. */
  standard: [0.2, 0, 0, 1],
  /** Things entering: start fast, settle slowly. */
  decelerate: [0, 0, 0, 1],
  /** Things leaving: start slowly, exit fast. */
  accelerate: [0.3, 0, 1, 1],
} as const;

/** Spring configs for Reanimated `withSpring`. */
export const spring = {
  /** Snappy, no overshoot: press feedback, toggles. */
  gentle: { damping: 20, stiffness: 220, mass: 1 },
  /** Slight overshoot: drag-and-snap, success pops. */
  bouncy: { damping: 12, stiffness: 180, mass: 1 },
} as const;

/** Standard press-feedback scale. */
export const pressScale = 0.97;

/** Duration to use given the user's reduce-motion setting: collapsed to a single frame. */
export const motionDuration = (ms: number, reduceMotion: boolean) => (reduceMotion ? 1 : ms);
