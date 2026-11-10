import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import {
  MAX_FONT_SCALE,
  fontFamily,
  fontWeightFamily,
  normalizeWeight,
  tabularNums,
  typeScale,
  useTheme,
  type FontWeightName,
  type TextVariant,
  type ThemeColors,
} from '@/theme';

export type { TextVariant };
/** Four weights only. Numeric strings ('600', '700', ...) are still accepted and mapped onto them. */
export type TextWeight = FontWeightName | '400' | '500' | '600' | '700';

type Props = TextProps & {
  variant?: TextVariant;
  weight?: TextWeight;
  /** A theme color token (`'textSecondary'`, `'errorText'`, ...). Raw color strings are still accepted for accents. */
  color?: keyof ThemeColors | (string & {});
  muted?: boolean;
  /** Tabular (equal-width) digits for amounts, timers and counters. */
  numeric?: boolean;
};

export function Text({ variant = 'body', weight, color, muted, numeric, style, maxFontSizeMultiplier, ...rest }: Props) {
  const { colors } = useTheme();
  const spec = typeScale[variant];
  const flattened = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const isMono = flattened.fontFamily === 'monospace' || flattened.fontFamily === fontFamily.monoFallback || flattened.fontFamily === fontFamily.mono;

  const resolvedWeight = normalizeWeight(weight ?? flattened.fontWeight) ?? spec.weight;
  const resolvedColor = color ? (colors[color as keyof ThemeColors] ?? color) : muted ? colors.textMuted : colors.text;

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
      {...rest}
      style={[
        {
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          letterSpacing: spec.letterSpacing,
          color: resolvedColor,
          fontFamily: isMono ? fontFamily.mono : fontWeightFamily[resolvedWeight],
        },
        variant === 'overline' ? { textTransform: 'uppercase' } : null,
        numeric ? { fontVariant: tabularNums } : null,
        style,
        // The family already carries the weight; a leftover fontWeight would fake-bold it a second time.
        { fontWeight: undefined },
      ]}
    />
  );
}
