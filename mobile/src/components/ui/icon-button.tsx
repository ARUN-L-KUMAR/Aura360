import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/components/ui/button';
import { PressableScale, type PressableScaleProps } from '@/components/ui/pressable-scale';
import { layout, radius, spacing, useTheme } from '@/theme';

export type IconButtonVariant = 'filled' | 'tonal' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = Omit<PressableScaleProps, 'children' | 'style' | 'accessibilityLabel'> & {
  icon: IconName;
  /** Required: an icon alone says nothing to a screen reader. Describe the action ("Delete entry"), not the glyph. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Use the error colours for a destructive action. */
  destructive?: boolean;
  /** Marks a toggled-on button (announced as selected and drawn with the brand container). */
  selected?: boolean;
  /** Shows a small dot for unread / new. A dot alone is not colour-only: it is also announced via `badgeLabel`. */
  badge?: boolean;
  /** Spoken value when `badge` is on. Default "New activity". */
  badgeLabel?: string;
  /** Layout style for the button (margin, alignSelf, ...). */
  style?: StyleProp<ViewStyle>;
};

// Visual sizes (md and lg already meet the 44pt target; sm is lifted to 44 with hitSlop).
const BOX: Record<IconButtonSize, number> = {
  sm: spacing.xxl + spacing.xs, // 36
  md: layout.minTouchTarget, // 44
  lg: spacing.xxxl + spacing.sm, // 56
};
const GLYPH: Record<IconButtonSize, number> = { sm: 18, md: 22, lg: 26 };

export function IconButton({
  icon,
  accessibilityLabel,
  variant = 'ghost',
  size = 'md',
  destructive,
  selected,
  badge,
  badgeLabel = 'New activity',
  disabled,
  haptic = 'tap',
  style,
  accessibilityState,
  onFocus,
  onBlur,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const box = BOX[size];
  const slop = Math.max(0, Math.ceil((layout.minTouchTarget - box) / 2));

  let bg: string = 'transparent';
  let fg: string = colors.text;
  if (variant === 'filled') {
    bg = destructive ? colors.error : colors.primary;
    fg = destructive ? colors.onError : colors.primaryText;
  } else if (variant === 'tonal') {
    bg = destructive ? colors.errorContainer : colors.primaryContainer;
    fg = destructive ? colors.onErrorContainer : colors.onPrimaryContainer;
  } else {
    fg = destructive ? colors.errorText : colors.text;
  }
  if (selected && variant === 'ghost') {
    bg = colors.primaryContainer;
    fg = colors.onPrimaryContainer;
  }

  return (
    <PressableScale
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled, selected }}
      accessibilityValue={badge ? { text: badgeLabel } : undefined}
      disabled={disabled}
      haptic={haptic}
      focusRing={false}
      hitSlop={slop}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={style}>
      <View style={[styles.box, { width: box, height: box, backgroundColor: bg }]}>
        <Ionicons name={icon} size={GLYPH[size]} color={fg} />
        {badge ? <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.card }]} /> : null}
        {focused ? <View pointerEvents="none" style={[styles.ring, { borderColor: colors.focusRing }]} /> : null}
      </View>
    </PressableScale>
  );
}

const DOT = spacing.sm + spacing.xs; // 12

const styles = StyleSheet.create({
  box: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: spacing.xs, right: spacing.xs, width: DOT, height: DOT, borderRadius: radius.pill, borderWidth: 2 },
  ring: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.pill, borderWidth: 2 },
});
