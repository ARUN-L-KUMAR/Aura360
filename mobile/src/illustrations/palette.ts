/**
 * Colours for illustrations. Pure (no React Native): derived from the design-token ramps in theme/colors.ts, so artwork
 * follows the palette, the module accent and light / dark mode, and no scene contains a literal colour.
 */
import { categoryRamps, error, neutral, primary, secondary, success, tertiary, warning, type ModuleKey, type Ramp } from '../theme/colors';

export type Scheme = 'light' | 'dark';

export type ScenePalette = {
  scheme: Scheme;
  isDark: boolean;
  /** The module's accent ramp (50-900). */
  accent: Ramp;
  /** A contrasting partner ramp for secondary details. */
  partner: Ramp;
  brand: Ramp;
  sky: Ramp;
  warm: Ramp;
  good: Ramp;
  bad: Ramp;
  rose: Ramp;
  /** Greys (50-950). */
  neutral: typeof neutral;
  /** Three-stop sky gradient, top to bottom, for the current scheme. */
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  /** Hills / ground from far to near. */
  groundFar: string;
  groundMid: string;
  groundNear: string;
  /** Strong line / detail colour that reads on the scene's backgrounds. */
  ink: string;
  /** Near-white (light) or soft light (dark) used for clouds, paper, highlights. */
  paper: string;
  /** Soft colour for glows and halos. */
  glow: string;
  /** Soft colour for ground shadows. */
  shadow: string;
};

const AI: ModuleKey = 'ai';

/** Palette for a scheme and a module accent (default: the brand / AI accent). */
export function scenePalette(scheme: Scheme, accentKey: ModuleKey = AI): ScenePalette {
  const dark = scheme === 'dark';
  const accent = categoryRamps[accentKey];
  return {
    scheme,
    isDark: dark,
    accent,
    partner: accentKey === 'ai' ? secondary : categoryRamps.ai,
    brand: primary,
    sky: secondary,
    warm: warning,
    good: success,
    bad: error,
    rose: tertiary,
    neutral,
    skyTop: dark ? neutral[950] : secondary[100],
    skyMid: dark ? primary[900] : secondary[50],
    skyBottom: dark ? primary[800] : neutral[50],
    groundFar: dark ? primary[900] : primary[200],
    groundMid: dark ? primary[800] : primary[300],
    groundNear: dark ? neutral[900] : accent[200],
    ink: dark ? neutral[50] : neutral[900],
    paper: dark ? neutral[200] : neutral[50],
    glow: dark ? accent[400] : accent[200],
    shadow: dark ? neutral[950] : neutral[300],
  };
}
