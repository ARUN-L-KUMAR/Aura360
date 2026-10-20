import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { withAlpha } from '@/components/ui/logic';
import { radius, spacing, useTheme } from '@/theme';

/**
 * The look of the "aurora glass" cards on Home: a see-through surface with a hairline edge, so the aurora behind the
 * page shows through. Dark: a faint wash of the text colour over the page. Light: a mostly opaque card, since a
 * light page has no glow to show off. Everything is derived from the theme, so both schemes stay readable.
 */
export function useGlass() {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  return {
    /** Fill of a glass card. */
    fill: dark ? withAlpha(colors.text, 0.07) : withAlpha(colors.card, 0.86),
    /** Hairline edge of a glass card. */
    border: dark ? withAlpha(colors.text, 0.13) : colors.border,
    /** A quieter surface for tiles that sit inside a glass card. */
    inner: dark ? withAlpha(colors.text, 0.07) : colors.cardMuted,
    /** Edge of such a tile. */
    innerBorder: dark ? withAlpha(colors.text, 0.1) : colors.borderSubtle,
  };
}

type Props = ViewProps & {
  /** Inner padding. Default `spacing.lg`. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** A glass surface: rounded, hairline edge, translucent fill. Content and size are up to the caller. */
export function GlassCard({ padding = spacing.lg, style, children, ...rest }: Props) {
  const glass = useGlass();
  return (
    <View
      {...rest}
      style={[{ borderRadius: radius.xl, borderWidth: 1, borderColor: glass.border, backgroundColor: glass.fill, padding }, style]}>
      {children}
    </View>
  );
}
