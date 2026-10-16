import * as Font from 'expo-font';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { typography, useTheme, type ThemeColors } from '@/theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';
export type TextWeight = 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold' | '400' | '500' | '600' | '700' | '800';

const variantSpecs: Record<TextVariant, { fontSize: number; lineHeight: number; letterSpacing: number; defaultWeight: TextWeight }> = {
  display: { fontSize: 32, lineHeight: 38, letterSpacing: -0.6, defaultWeight: 'bold' },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.4, defaultWeight: 'bold' },
  heading: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, defaultWeight: 'semiBold' },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, defaultWeight: 'regular' },
  label: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1, defaultWeight: 'medium' },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, defaultWeight: 'regular' },
};

function getSafeFont(fontName: string): string {
  try {
    return Font.isLoaded(fontName) ? fontName : typography.fallback.sans;
  } catch {
    return typography.fallback.sans;
  }
}

function resolveFont(weight: TextWeight | undefined, isMono?: boolean, isNumeric?: boolean): { fontFamily: string } {
  if (isMono) {
    return { fontFamily: typography.fontFamily.mono };
  }
  if (isNumeric) {
    switch (weight) {
      case '700':
      case '800':
      case 'bold':
      case 'extraBold':
        return { fontFamily: getSafeFont(typography.fontFamily.interBold) };
      case '600':
      case 'semiBold':
        return { fontFamily: getSafeFont(typography.fontFamily.interSemiBold) };
      case '500':
      case 'medium':
        return { fontFamily: getSafeFont(typography.fontFamily.interMedium) };
      default:
        return { fontFamily: getSafeFont(typography.fontFamily.interRegular) };
    }
  }

  switch (weight) {
    case '800':
    case 'extraBold':
      return { fontFamily: getSafeFont(typography.fontFamily.extraBold) };
    case '700':
    case 'bold':
      return { fontFamily: getSafeFont(typography.fontFamily.bold) };
    case '600':
    case 'semiBold':
      return { fontFamily: getSafeFont(typography.fontFamily.semiBold) };
    case '500':
    case 'medium':
      return { fontFamily: getSafeFont(typography.fontFamily.medium) };
    case '400':
    case 'regular':
    default:
      return { fontFamily: getSafeFont(typography.fontFamily.regular) };
  }
}

type Props = TextProps & {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: keyof ThemeColors | (string & {});
  muted?: boolean;
  numeric?: boolean;
};

export function Text({ variant = 'body', weight, color, muted, numeric, style, ...rest }: Props) {
  const { colors } = useTheme();
  const spec = variantSpecs[variant];
  const flattened = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const isMono = flattened.fontFamily === 'monospace' || flattened.fontFamily === typography.fontFamily.mono;

  const targetWeight = (weight ?? (flattened.fontWeight as TextWeight | undefined) ?? spec.defaultWeight) as TextWeight;
  const fontStyle = resolveFont(targetWeight, isMono, numeric);

  const resolvedColor = color
    ? (colors[color as keyof ThemeColors] ?? color)
    : muted
      ? colors.textMuted
      : colors.text;

  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          letterSpacing: spec.letterSpacing,
          color: resolvedColor,
        },
        fontStyle,
        style,
        // Override fontWeight to prevent faux-bold distortion on platforms with specific font files
        { fontWeight: undefined },
      ]}
    />
  );
}

