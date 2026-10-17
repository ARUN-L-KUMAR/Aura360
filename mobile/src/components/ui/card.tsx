import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { AccentGradient } from '@/components/ui/gradient';
import { readableOn as readableColor, withAlpha } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { neutral, radius, spacing, useTheme, type ModuleKey } from '@/theme';

export type CardVariant = 'flat' | 'outlined' | 'elevated' | 'tinted';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, number> = { none: 0, sm: spacing.md, md: spacing.lg, lg: spacing.xl };

export { withAlpha };

/** Picks the more readable of a light and a dark foreground for a filled background. Non-hex colours get `light`. */
export function readableOn(background: string, light: string, dark: string = neutral[950]): string {
  return readableColor(background, light, dark);
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
  /** Soft hero wash: the module's accent fading into the card surface. Use on at most one or two hero cards per screen. */
  gradient?: ModuleKey;
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
  gradient,
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

  const containerStyle: StyleProp<ViewStyle> = [surface, { borderRadius, padding: PADDING[padding] }, gradient ? { overflow: 'hidden' } : null, style];
  const wash = gradient ? (
    <AccentGradient accent={gradient} />
  ) : tintColor ? (
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
