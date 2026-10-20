import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ComponentProps } from 'react';
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { instant } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { withAlpha } from '@/components/ui/logic';
import { duration, layout, radius, spacing, spring, useTheme, type ThemeColors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive' | 'glass';
/**
 * Legacy variants still accepted by the existing call sites. Mapping:
 *   'secondarySolid' -> solid secondary-brand fill (colors.secondary / secondaryText), kept as its own look
 *   'outline'        -> 'tertiary'    (bordered, transparent)
 *   'danger'         -> 'destructive' (colors.error / onError)
 * 'secondary' and 'ghost' keep their names but follow the v2 look (tonal brand container / brand-coloured text).
 * 'glass' is the web's translucent white/10 button with a white/20 border, for hero and other always-dark surfaces.
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
  /**
   * Swaps the label for an animated check (a pop in transform / opacity; instant under reduce-motion) while true, and
   * ignores presses. Off by default. Set it for a moment after the action succeeds, then clear it. Pair with
   * `haptics.success()` at the call site if the action has no toast.
   */
  success?: boolean;
  /** Haptic on press. `false` for none. Default 'tap'. */
  haptic?: 'tap' | 'select' | false;
};

const HEIGHT: Record<ButtonSize, number> = {
  sm: spacing.xxl + spacing.xs, // 36 visual; hitSlop lifts the target to 44
  md: spacing.xxxl, // 48
  lg: spacing.xxxl + spacing.sm, // 56
};
const PADDING_X: Record<ButtonSize, number> = { sm: spacing.md, md: spacing.lg + spacing.xs, lg: spacing.xl };
/** rounded-xl on the small button, rounded-2xl on the rest. */
const RADIUS: Record<ButtonSize, number> = { sm: radius.md, md: radius.lg, lg: radius.lg };
const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };
/** The success check is a little larger than the icons beside a label. */
const CHECK_SCALE = 1.25;
const CHECK_FROM = 0.4;

/** Style keys that position the button among its siblings; they go on the outer wrapper, the rest on the surface. */
const LAYOUT_KEYS = new Set([
  'margin',
  'marginTop',
  'marginBottom',
  // Legacy physical margins are still honoured when a call site passes them.
  ...['Left', 'Right'].map((side) => `margin${side}`),
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
    case 'glass':
      return { bg: c.heroChip, fg: c.onHero, border: c.heroChipBorder, pressedBg: withAlpha(c.onHero, 0.18) };
    case 'tertiary':
    case 'outline':
      // The web's outline button: a faint fill and a ring a step above the card border.
      return { bg: withAlpha(c.text, 0.04), fg: c.text, border: withAlpha(c.text, 0.2), pressedBg: withAlpha(c.text, 0.1) };
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

/** The check that replaces the label while `success` is true. Fills the button and centres a mark that pops in. */
function SuccessMark({ progress, size, color }: { progress: SharedValue<number>; size: number; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, progress.get()) * 2),
    transform: [{ scale: CHECK_FROM + (1 - CHECK_FROM) * progress.get() }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.spinner, style]}>
      <Ionicons name="checkmark" size={Math.round(size * CHECK_SCALE)} color={color} />
    </Animated.View>
  );
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth,
  loading,
  success,
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
  const { colors, reduceMotion } = useTheme();
  const swap = useSharedValue(0);
  const [focused, setFocused] = useState(false);
  const palette = paletteFor(variant, colors);

  // 0 = label, 1 = check. Transform / opacity only; a single frame under reduce-motion.
  useEffect(() => {
    if (reduceMotion) swap.set(withTiming(success ? 1 : 0, instant));
    else swap.set(success ? withSpring(1, spring.bouncy) : withTiming(0, { duration: duration.fast }));
  }, [success, reduceMotion, swap]);
  const labelFade = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.max(0, swap.get()) * 2) }));
  const blocked = !!disabled || !!loading || !!success;
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
                  borderRadius: RADIUS[size],
                },
                inner,
              ]}>
              <Animated.View style={labelFade}>
                <View style={[styles.row, loading ? styles.hidden : null]}>
                  {leftIcon ? <Ionicons name={leftIcon} size={iconSize} color={palette.fg} /> : null}
                  {/* Two lines at most: a long label wraps at large font sizes instead of clipping. */}
                  <Text variant={labelVariant} weight="bold" style={[styles.label, { color: palette.fg }]} numberOfLines={2}>
                    {title}
                  </Text>
                  {rightIcon ? <Ionicons name={rightIcon} size={iconSize} color={palette.fg} /> : null}
                </View>
              </Animated.View>
              <SuccessMark progress={swap} size={iconSize} color={palette.fg} />
              {loading ? (
                <View style={styles.spinner} pointerEvents="none">
                  <ActivityIndicator color={palette.fg} />
                </View>
              ) : null}
              {focused ? <View pointerEvents="none" style={[styles.ring, { borderColor: colors.focusRing, borderRadius: RADIUS[size] }]} /> : null}
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
  spinner: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFill, borderRadius: radius.md, borderWidth: 2 },
  label: { flexShrink: 1, textAlign: 'center' },
});
