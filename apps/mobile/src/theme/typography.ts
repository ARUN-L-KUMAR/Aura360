import { Platform, type TextStyle } from 'react-native';

/**
 * One family (Geist, the same as the web app) in four weights. The OS font is the fallback while Geist loads or if it fails to load.
 * Weights are limited to 400 / 500 / 600 / 700; never use fontWeight directly, pick a `weight` on <Text>.
 */
export const fontFamily = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semiBold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  /** Geist Mono, as on the web. Falls back to the platform monospace while it loads. */
  mono: 'GeistMono_400Regular',
  monoFallback: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
  /** Used before Geist is available. */
  fallback: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }) as string,
} as const;

export type FontWeightName = 'regular' | 'medium' | 'semiBold' | 'bold';

export const fontWeightFamily: Record<FontWeightName, string> = {
  regular: fontFamily.regular,
  medium: fontFamily.medium,
  semiBold: fontFamily.semiBold,
  bold: fontFamily.bold,
};

/** Map CSS-style weights ('400'-'900', 'bold', ...) from existing styles onto the four shipped weights. */
export function normalizeWeight(weight: string | number | undefined): FontWeightName | undefined {
  if (weight === undefined) return undefined;
  switch (String(weight)) {
    case 'regular':
    case 'normal':
    case '100':
    case '200':
    case '300':
    case '400':
      return 'regular';
    case 'medium':
    case '500':
      return 'medium';
    case 'semiBold':
    case '600':
      return 'semiBold';
    default:
      return 'bold'; // 'bold', '700', '800', '900', 'extraBold'
  }
}

export type TypeStyle = { fontSize: number; lineHeight: number; letterSpacing: number; weight: FontWeightName };

/** Type scale. Sizes scale with the system font-size setting, capped at MAX_FONT_SCALE. */
export const typeScale = {
  /** Hero headline: the web's text-4xl bold tracking-tight. */
  hero: { fontSize: 36, lineHeight: 40, letterSpacing: -0.9, weight: 'bold' },
  display: { fontSize: 32, lineHeight: 38, letterSpacing: -0.6, weight: 'bold' },
  headline: { fontSize: 26, lineHeight: 32, letterSpacing: -0.4, weight: 'bold' },
  title: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, weight: 'semiBold' },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, weight: 'regular' },
  label: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1, weight: 'medium' },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, weight: 'regular' },
  /** Tiny uppercase tracked label (the web's text-[10px] font-bold uppercase tracking-widest). Rendered upper-cased by <Text>. */
  overline: { fontSize: 10, lineHeight: 14, letterSpacing: 1.6, weight: 'bold' },
} as const satisfies Record<string, TypeStyle>;

export type TextVariant = keyof typeof typeScale;

/** How far the system "font size" setting may enlarge text before layouts break. */
export const MAX_FONT_SCALE = 1.4;

/** Equal-width digits, so changing numbers (timers, amounts) don't jitter. */
export const tabularNums: TextStyle['fontVariant'] = ['tabular-nums'];

/** Legacy shape: `typography.fontFamily.*` / `typography.fallback.sans`. Prefer the named exports above. */
export const typography = {
  fontFamily: {
    ...fontFamily,
  },
  fallback: { sans: fontFamily.fallback },
  scale: typeScale,
} as const;
