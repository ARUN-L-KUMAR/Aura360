import { Text as RNText, type TextProps } from 'react-native';

import { useTheme, type ThemeColors } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';

const variants: Record<Variant, { fontSize: number; fontWeight: '400' | '500' | '600' | '700'; lineHeight: number }> = {
  display: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

type Props = TextProps & {
  variant?: Variant;
  color?: keyof ThemeColors | (string & {});
  muted?: boolean;
};

export function Text({ variant = 'body', color, muted, style, ...rest }: Props) {
  const { colors } = useTheme();
  const resolved = color ? (colors[color as keyof ThemeColors] ?? color) : muted ? colors.textMuted : colors.text;
  return <RNText {...rest} style={[variants[variant], { color: resolved }, style]} />;
}
