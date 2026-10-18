import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Gradient } from '@/components/ui/gradient';
import { readableOn as readableColor, withAlpha } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { neutral, radius, spacing, useTheme, type ModuleKey } from '@/theme';

export type CardVariant = 'flat' | 'outlined' | 'elevated' | 'tinted';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, number> = { none: 0, sm: spacing.lg, md: 20, lg: spacing.xl };

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
  /** Inner padding: sm 16, md 20 (default), lg 24. */
  padding?: CardPadding;
  /** Corner radius token or number. Default `xl` (the web's rounded-3xl). */
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
  rounded = 'xl',
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

  const dark = scheme === 'dark';
  // The web card: a hairline ring on the card surface. No shadow in dark mode; a whisper of elevation in light.
  let surface: ViewStyle;
  /** Accent wash drawn over the surface (dark tinted cards stay near-black and only glow faintly). */
  let tint: string | null = null;
  switch (variant) {
    case 'flat':
      surface = { backgroundColor: colors.cardMuted, borderWidth: 0 };
      break;
    case 'elevated':
      surface = { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, ...(dark ? null : elevation(2)) };
      break;
    case 'tinted': {
      const a = accent ? accentFor(accent) : null;
      if (a) {
        // A near-neutral card with a faint module wash and ring, not a coloured block.
        surface = { backgroundColor: colors.card, borderWidth: 1, borderColor: withAlpha(a.solid, dark ? 0.3 : 0.25), ...(dark ? null : elevation(1)) };
        tint = withAlpha(a.solid, dark ? 0.08 : 0.06);
      } else {
        surface = { backgroundColor: colors.primaryContainer, borderWidth: 1, borderColor: colors.border };
      }
      break;
    }
    default:
      surface = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...(dark ? null : elevation(1)) };
  }
  if (tintColor) {
    surface = { ...surface, borderWidth: 1, borderColor: withAlpha(tintColor, dark ? 0.4 : 0.3) };
  }

  const containerStyle: StyleProp<ViewStyle> = [surface, { borderRadius, padding: PADDING[padding] }, gradient || tint ? { overflow: 'hidden' } : null, style];
  const gradientAccent = gradient ? accentFor(gradient) : null;
  const wash = gradientAccent ? (
    // Subtle: the module colour fading to nothing, not a coloured card.
    <Gradient from={withAlpha(gradientAccent.solid, dark ? 0.16 : 0.1)} to={withAlpha(gradientAccent.solid, 0)} />
  ) : tint ? (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
  ) : tintColor ? (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius, backgroundColor: withAlpha(tintColor, dark ? 0.12 : 0.06) }]}
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
        {({ pressed }) => (
          <>
            {wash}
            {children}
            {/* Pressed: the ring gets stronger, as on the web's hover. */}
            {pressed ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius, borderWidth: 1, borderColor: colors.borderStrong }]} /> : null}
          </>
        )}
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
