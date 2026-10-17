/**
 * Color tokens. This file is pure TypeScript (no React Native imports) so `scripts/check-contrast.ts` can load it
 * under plain Node and verify WCAG contrast for every semantic pair.
 *
 * Three layers:
 *  1. Ramps    - 50-900 shade scales. Brand ramps are hand-picked; tertiary, semantic and category ramps are generated
 *                in OKLCH with one lightness profile, so the same shade has the same contrast whatever the hue.
 *  2. Palettes - semantic roles per scheme (`light` / `dark`). Components read these via `useTheme().colors`.
 *  3. Accents  - one ramp per module, derived from the tertiary profile by rotating hue (see `categoryAccent`).
 *
 * Hard-coded hex values are allowed only in this file.
 */

// ---------------------------------------------------------------------------------------------------------------
// OKLCH -> sRGB hex (with chroma-reduction gamut mapping, so lightness - and therefore contrast - is preserved)
// ---------------------------------------------------------------------------------------------------------------

function oklchToLinearRgb(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
const encode = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  const e = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(e * 255)
    .toString(16)
    .padStart(2, '0');
};

function oklchHex(L: number, C: number, h: number): string {
  let lo = 0;
  let hi = C;
  let rgb = oklchToLinearRgb(L, C, h);
  if (!inGamut(rgb)) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb(L, mid, h))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinearRgb(L, lo, h);
  }
  return `#${rgb.map(encode).join('')}`;
}

export type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type Ramp = Record<Shade, string>;
const SHADES: Shade[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

/** OKLCH lightness per shade. 600 reads >= 4.5:1 against white; 400 reads >= 4.5:1 against the dark backgrounds. */
const LIGHTNESS: Record<Shade, number> = { 50: 0.975, 100: 0.945, 200: 0.895, 300: 0.82, 400: 0.73, 500: 0.64, 600: 0.55, 700: 0.47, 800: 0.4, 900: 0.33 };
/** Share of the ramp's peak chroma used at each shade: soft tints at the ends, full colour in the middle. */
const CHROMA: Record<Shade, number> = { 50: 0.1, 100: 0.2, 200: 0.38, 300: 0.6, 400: 0.85, 500: 1, 600: 1, 700: 0.88, 800: 0.72, 900: 0.55 };

export function generateRamp(hue: number, peakChroma = 0.19): Ramp {
  const out = {} as Ramp;
  for (const shade of SHADES) out[shade] = oklchHex(LIGHTNESS[shade], peakChroma * CHROMA[shade], hue);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// 1. Ramps
// ---------------------------------------------------------------------------------------------------------------

export const primary = {
  50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
  500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
} as const satisfies Ramp;

export const secondary = {
  50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
  500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e',
} as const satisfies Ramp;

/** Warm magenta: the third brand hue. Category accents are rotations of this ramp. */
export const TERTIARY_HUE = 330;
export const tertiary: Ramp = generateRamp(TERTIARY_HUE);

export const neutral = {
  50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
  500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#090d16',
} as const;

export const success: Ramp = generateRamp(155, 0.17);
export const warning: Ramp = generateRamp(75, 0.16);
export const error: Ramp = generateRamp(25, 0.2);
export const info: Ramp = secondary;

/** Hue (OKLCH degrees) for each module's accent. Fashion uses the tertiary hue itself. */
const CATEGORY_HUES = {
  finance: 155,
  fitness: 45,
  food: 90,
  fashion: TERTIARY_HUE,
  skincare: 195,
  notes: 300,
  saved: 245,
  time: 120,
} as const;

export type ModuleKey = keyof typeof CATEGORY_HUES | 'ai';

export const categoryRamps: Record<ModuleKey, Ramp> = {
  finance: generateRamp(CATEGORY_HUES.finance),
  fitness: generateRamp(CATEGORY_HUES.fitness),
  food: generateRamp(CATEGORY_HUES.food, 0.16),
  fashion: tertiary,
  skincare: generateRamp(CATEGORY_HUES.skincare, 0.15),
  notes: generateRamp(CATEGORY_HUES.notes),
  saved: generateRamp(CATEGORY_HUES.saved),
  time: generateRamp(CATEGORY_HUES.time, 0.17),
  ai: primary,
};

/** Legacy export: older code reads `shades.slate` / `shades.danger`. */
export const colorShades = { primary, secondary, tertiary, neutral, slate: neutral, success, warning, error, danger: error, info } as const;

// ---------------------------------------------------------------------------------------------------------------
// 2. Semantic palettes
// ---------------------------------------------------------------------------------------------------------------

const WHITE = '#ffffff';

function semantic(ramp: Ramp, scheme: 'light' | 'dark') {
  return scheme === 'light'
    ? { solid: ramp[600], on: WHITE, container: ramp[50], onContainer: ramp[800], border: ramp[200], text: ramp[700] }
    : { solid: ramp[400], on: neutral[950], container: ramp[900], onContainer: ramp[200], border: ramp[700], text: ramp[300] };
}

function buildPalette(scheme: 'light' | 'dark') {
  const light = scheme === 'light';
  const ok = semantic(success, scheme);
  const warn = semantic(warning, scheme);
  const err = semantic(error, scheme);
  const inf = semantic(light ? { ...secondary, 600: secondary[700] } : secondary, scheme);

  return {
    // Surfaces
    background: light ? neutral[50] : neutral[950],
    /** Default card / sheet surface. */
    card: light ? WHITE : '#111827',
    /** Quiet inset surface (inputs, chips, skeleton wells). */
    cardMuted: light ? neutral[100] : '#1a2333',
    surfaceRaised: light ? WHITE : '#18212f',
    overlay: light ? 'rgba(15, 23, 42, 0.45)' : 'rgba(0, 0, 0, 0.65)',

    // Borders
    border: light ? neutral[200] : '#1f293d',
    borderSubtle: light ? neutral[100] : '#151e2e',
    /** Boundary of interactive controls (inputs, checkboxes): >= 3:1 on card. */
    borderStrong: neutral[500],
    focusRing: light ? primary[600] : primary[300],

    // Text
    text: light ? neutral[900] : neutral[50],
    textSecondary: light ? neutral[600] : neutral[300],
    textMuted: light ? '#5b6a7f' : neutral[400],
    textDisabled: light ? neutral[400] : neutral[600],
    textInverse: light ? WHITE : neutral[950],

    // Brand: primary (filled controls use `primary` + `primaryText`; links and icons on surfaces use `primaryAccent`)
    primary: light ? primary[600] : '#5a5df0',
    primaryText: WHITE,
    /** Brand colour for text / icons on a surface. */
    primaryAccent: light ? primary[700] : primary[300],
    primaryLight: light ? primary[50] : primary[400],
    primaryDark: light ? primary[800] : primary[700],
    primaryContainer: light ? primary[100] : primary[900],
    onPrimaryContainer: light ? primary[800] : primary[200],

    secondary: light ? secondary[700] : secondary[400],
    secondaryText: light ? WHITE : neutral[950],
    secondaryLight: light ? secondary[50] : secondary[900],
    secondaryDark: light ? secondary[800] : secondary[600],

    tertiary: light ? tertiary[600] : tertiary[400],
    tertiaryText: light ? WHITE : neutral[950],
    tertiaryContainer: light ? tertiary[100] : tertiary[900],
    onTertiaryContainer: light ? tertiary[800] : tertiary[200],

    accent: light ? primary[50] : neutral[800],
    accentForeground: light ? primary[700] : primary[300],

    // Semantic
    success: ok.solid, onSuccess: ok.on, successContainer: ok.container, onSuccessContainer: ok.onContainer, successBorder: ok.border, successText: ok.text,
    warning: warn.solid, onWarning: warn.on, warningContainer: warn.container, onWarningContainer: warn.onContainer, warningBorder: warn.border, warningText: warn.text,
    error: err.solid, onError: err.on, errorContainer: err.container, onErrorContainer: err.onContainer, errorBorder: err.border, errorText: err.text,
    info: inf.solid, onInfo: inf.on, infoContainer: inf.container, onInfoContainer: inf.onContainer, infoBorder: inf.border, infoText: inf.text,
    /** Legacy alias of `error`. */
    danger: err.solid,
    onDanger: err.on,

    // Glass (overlays only: tab bar, sheets, floating widget, headers). `glassSolid` is the no-blur fallback.
    glass: light ? 'rgba(255, 255, 255, 0.72)' : 'rgba(15, 23, 42, 0.72)',
    glassBorder: light ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.10)',
    glassSolid: light ? WHITE : neutral[900],

    // Loading
    skeletonBase: light ? neutral[200] : '#1a2333',
    skeletonHighlight: light ? neutral[100] : '#243049',
  };
}

export const palettes = { light: buildPalette('light'), dark: buildPalette('dark') } as const;

export type ThemeColors = { [K in keyof typeof palettes.light]: string };
export type ColorScheme = 'light' | 'dark';

// ---------------------------------------------------------------------------------------------------------------
// 3. Category accents
// ---------------------------------------------------------------------------------------------------------------

export type Accent = {
  /** Fills: icon tiles, progress bars, chips. White (light) / near-black (dark) text reads on it. */
  solid: string;
  onSolid: string;
  /** Tinted surface behind icons and badges. */
  soft: string;
  /** Accent-coloured text on a surface (>= 4.5:1). */
  text: string;
  border: string;
};

export function categoryAccent(key: ModuleKey, scheme: ColorScheme): Accent {
  const r = categoryRamps[key];
  return scheme === 'light'
    ? { solid: r[600], onSolid: WHITE, soft: r[50], text: r[700], border: r[200] }
    : { solid: r[400], onSolid: neutral[950], soft: r[900], text: r[300], border: r[700] };
}

/** Static mid-tone per module (shade 500) for places with no theme access (e.g. notification channel colours). */
export const moduleColors = Object.fromEntries(
  (Object.keys(categoryRamps) as ModuleKey[]).map((k) => [k, categoryRamps[k][500]]),
) as Record<ModuleKey, string>;
