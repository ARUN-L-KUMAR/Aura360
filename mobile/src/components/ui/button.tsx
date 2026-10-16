import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, useTheme, type ThemeColors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive';
/**
 * Legacy variants still accepted by the existing call sites. Mapping:
 *   'secondarySolid' -> solid secondary-brand fill (colors.secondary / secondaryText), kept as its own look
 *   'outline'        -> 'tertiary'    (bordered, transparent)
 *   'danger'         -> 'destructive' (colors.error / onError)
 * 'secondary' and 'ghost' keep their names but follow the v2 look (tonal brand container / brand-coloured text).
 */
export type LegacyButtonVariant = 'secondarySolid' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: ButtonVariant | LegacyButtonVariant;
  size?: ButtonSize;
  /** Ionicons name shown before the title. */
  leftIcon?: IconName;
  /** Ionicons name shown after the title. */
  rightIcon?: IconName;
  /**
   * Buttons stretch to their parent's width in a column (legacy behaviour), so `undefined`/`true` both fill.
   * Pass `false` to shrink-wrap the content instead.
   */
  fullWidth?: boolean;
  /** Keeps the button's width, shows a spinner, announces "busy" and ignores presses. */
  loading?: boolean;
  /** Haptic on press. `false` for none. Default 'tap'. */
  haptic?: 'tap' | 'select' | false;
};

const HEIGHT: Record<ButtonSize, number> = {
  sm: spacing.xxl + spacing.xs, // 36 visual; hitSlop lifts the target to 44
  md: spacing.xxxl, // 48
  lg: spacing.xxxl + spacing.sm, // 56
};
const PADDING_X: Record<ButtonSize, number> = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };
const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

/** Style keys that position the button among its siblings; they go on the outer wrapper, the rest on the surface. */
const LAYOUT_KEYS = new Set([
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'maxWidth',
  'minWidth',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'start',
  'end',
  'zIndex',
]);

function splitStyle(style: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) (LAYOUT_KEYS.has(key) ? outer : inner)[key] = flat[key];
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

type Palette = { bg: string; fg: string; border: string; pressedBg: string };

function paletteFor(variant: ButtonVariant | LegacyButtonVariant, c: ThemeColors): Palette {
  switch (variant) {
    case 'secondary':
      return { bg: c.primaryContainer, fg: c.onPrimaryContainer, border: c.primaryContainer, pressedBg: c.primaryContainer };
    case 'secondarySolid':
      return { bg: c.secondary, fg: c.secondaryText, border: c.secondary, pressedBg: c.secondary };
    case 'tertiary':
    case 'outline':
      return { bg: 'transparent', fg: c.text, border: c.borderStrong, pressedBg: c.cardMuted };
    case 'ghost':
      return { bg: 'transparent', fg: c.primaryAccent, border: 'transparent', pressedBg: c.cardMuted };
    case 'destructive':
    case 'danger':
      return { bg: c.error, fg: c.onError, border: c.error, pressedBg: c.error };
    case 'primary':
    default:
      return { bg: c.primary, fg: c.primaryText, border: c.primary, pressedBg: c.primary };
  }
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth,
  loading,
  disabled,
  haptic = 'tap',
  style,
  onPress,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityState,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const palette = paletteFor(variant, colors);
  const blocked = !!disabled || !!loading;
  const visualHeight = HEIGHT[size];
  const slop = Math.max(0, Math.ceil((layout.minTouchTarget - visualHeight) / 2));
  const iconSize = ICON_SIZE[size];
  const labelVariant = size === 'lg' ? 'body' : 'label';

  const press = (e: GestureResponderEvent) => {
    if (blocked) return;
    if (haptic) haptics[haptic]();
    onPress?.(e);
  };

  // Function styles (legacy) are resolved with the pressed state. Layout keys always come from the un-pressed
  // resolution because they live on the outer wrapper, which does not re-render on press.
  const resolveStyle = (pressed: boolean) => {
    if (typeof style !== 'function') return style;
    const state: PressableStateCallbackType = { pressed, hovered: false };
    return style(state);
  };
  const { outer } = splitStyle(resolveStyle(false));

  return (
    <View style={[fullWidth === false ? styles.shrink : null, outer]}>
      <PressableScale
        {...rest}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ ...accessibilityState, disabled: blocked, busy: !!loading }}
        disabled={disabled}
        hitSlop={slop}
        haptic={false}
        focusRing={false}
        scaleTo={blocked ? 1 : undefined}
        onPress={press}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}>
        {({ pressed }) => {
          const { inner } = splitStyle(resolveStyle(pressed));
          return (
            <View
              style={[
                styles.surface,
                {
                  minHeight: visualHeight,
                  paddingHorizontal: PADDING_X[size],
                  backgroundColor: pressed ? palette.pressedBg : palette.bg,
                  borderColor: palette.border,
                },
                inner,
              ]}>
              <View style={[styles.row, loading ? styles.hidden : null]}>
                {leftIcon ? <Ionicons name={leftIcon} size={iconSize} color={palette.fg} /> : null}
                <Text variant={labelVariant} weight="semiBold" style={{ color: palette.fg }} numberOfLines={1}>
                  {title}
                </Text>
                {rightIcon ? <Ionicons name={rightIcon} size={iconSize} color={palette.fg} /> : null}
              </View>
              {loading ? (
                <View style={styles.spinner} pointerEvents="none">
                  <ActivityIndicator color={palette.fg} />
                </View>
              ) : null}
              {focused ? <View pointerEvents="none" style={[styles.ring, { borderColor: colors.focusRing }]} /> : null}
            </View>
          );
        }}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { alignSelf: 'flex-start' },
  surface: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  hidden: { opacity: 0 },
  spinner: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.md, borderWidth: 2 },
});
