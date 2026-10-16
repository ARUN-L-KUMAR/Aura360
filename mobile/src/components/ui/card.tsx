import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { neutral, radius, spacing, useTheme, type ModuleKey } from '@/theme';

export type CardVariant = 'flat' | 'outlined' | 'elevated' | 'tinted';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, number> = { none: 0, sm: spacing.md, md: spacing.lg, lg: spacing.xl };

/**
 * Adds an alpha channel to a 6-digit hex colour. Anything else (rgba(), named colours) is returned unchanged.
 * Only for legacy call sites that still pass a raw colour (`glowColor`, `color`); prefer `accent` tokens.
 */
export function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${a}`;
}

function luminance(hex: string): number | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** Picks the more readable of a light and a dark foreground for a filled background. Non-hex colours get `light`. */
export function readableOn(background: string, light: string, dark: string = neutral[950]): string {
  const l = luminance(background);
  if (l === null) return light;
  const vsLight = 1.05 / (l + 0.05);
  const vsDark = (l + 0.05) / ((luminance(dark) ?? 0) + 0.05);
  return vsDark > vsLight ? dark : light;
}

export type CardProps = ViewProps & {
  /** flat: quiet inset surface. outlined (default): card + border. elevated: raised with shadow. tinted: accent wash. */
  variant?: CardVariant;
  /** Module accent used by the `tinted` variant (and for the pressed ring). Defaults to the brand colour. */
  accent?: ModuleKey;
  /** Inner padding. Default `md` (16). */
  padding?: CardPadding;
  /** Corner radius token or number. Default `lg`. */
  rounded?: keyof typeof radius | number;
  /** Makes the whole card a button with scale feedback. */
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /**
   * Legacy: tint the border and surface with an arbitrary colour (used by GlassCard's `glowColor`).
   * Prefer `variant="tinted" accent="finance"`.
   */
  tintColor?: string;
};

/**
 * The app's content surface. Solid, token-based, never blurred (blur is for overlays: see GlassSurface).
 * Non-pressable cards are plain containers; pass `accessible` to make one read as a single unit.
 */
export function Card({
  variant = 'outlined',
  accent,
  padding = 'md',
  rounded = 'lg',
  onPress,
  onLongPress,
  disabled,
  tintColor,
  accessibilityLabel,
  accessibilityHint,
  style,
  children,
  ...rest
}: CardProps) {
  const { colors, scheme, accent: accentFor, elevation } = useTheme();
  const borderRadius = typeof rounded === 'number' ? rounded : radius[rounded];

  let surface: ViewStyle;
  switch (variant) {
    case 'flat':
      surface = { backgroundColor: colors.cardMuted, borderWidth: 0 };
      break;
    case 'elevated':
      surface = { backgroundColor: colors.surfaceRaised, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle, ...elevation(2) };
      break;
    case 'tinted': {
      const a = accent ? accentFor(accent) : null;
      surface = {
        backgroundColor: a ? a.soft : colors.primaryContainer,
        borderWidth: 1,
        borderColor: a ? a.border : colors.border,
      };
      break;
    }
    default:
      surface = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  }
  if (tintColor) {
    surface = { ...surface, borderWidth: 1, borderColor: withAlpha(tintColor, scheme === 'dark' ? 0.4 : 0.3) };
  }

  const containerStyle: StyleProp<ViewStyle> = [surface, { borderRadius, padding: PADDING[padding] }, style];
  const wash = tintColor ? (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius, backgroundColor: withAlpha(tintColor, scheme === 'dark' ? 0.12 : 0.06) }]}
    />
  ) : null;

  if (onPress || onLongPress) {
    return (
      <PressableScale
        {...(rest as object)}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        haptic={false}
        ringRadius={borderRadius}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled }}
        accessible
        style={containerStyle}>
        {wash}
        {children}
      </PressableScale>
    );
  }

  return (
    <View {...rest} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} style={containerStyle}>
      {wash}
      {children}
    </View>
  );
}
