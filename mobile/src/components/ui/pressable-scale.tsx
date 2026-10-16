import { useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { instant } from '@/components/ui/motion';
import { haptics } from '@/lib/haptics';
import { duration, pressScale, radius, spring, useTheme } from '@/theme';

/** How much the surface dims while pressed (opacity). */
const PRESSED_DIP = 0.12;
/** Opacity of a disabled control. */
const DISABLED_OPACITY = 0.45;

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode | ((state: { pressed: boolean; focused: boolean }) => ReactNode);
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (transform only). Pass 1 to disable the squish and keep opacity feedback. */
  scaleTo?: number;
  /** Haptic fired on press. `false` for none. */
  haptic?: 'tap' | 'select' | false;
  /** Draw a focus ring when focused with a keyboard / switch control. Default true. */
  focusRing?: boolean;
  /** Corner radius used for the focus ring. */
  ringRadius?: number;
};

/**
 * The app's base touchable: scale + opacity press feedback on the UI thread (transform / opacity only), a focus ring,
 * optional haptics, and a hit area padded up to the 44pt minimum. Respects the reduce-motion setting.
 */
export function PressableScale({
  children,
  style,
  scaleTo = pressScale,
  haptic = false,
  focusRing = true,
  ringRadius = radius.md,
  onPress,
  onPressIn,
  onPressOut,
  onFocus,
  onBlur,
  disabled,
  hitSlop,
  ...rest
}: PressableScaleProps) {
  const { colors, reduceMotion } = useTheme();
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const progress = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (scaleTo - 1) * progress.value }],
    opacity: 1 - PRESSED_DIP * progress.value,
  }));

  const press = (to: 0 | 1) => {
    if (reduceMotion) progress.value = withTiming(to, instant);
    else progress.value = to ? withTiming(1, { duration: duration.fast / 2 }) : withSpring(0, spring.gentle);
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop ?? 4}
      onPressIn={(e: GestureResponderEvent) => {
        setPressed(true);
        press(1);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        setPressed(false);
        press(0);
        onPressOut?.(e);
      }}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}>
      <Animated.View
        style={[
          animated,
          style,
          focusRing && focused ? { borderWidth: 2, borderColor: colors.focusRing, borderRadius: ringRadius } : null,
          disabled ? { opacity: DISABLED_OPACITY } : null,
        ]}>
        {typeof children === 'function' ? children({ pressed, focused }) : children}
      </Animated.View>
    </Pressable>
  );
}
