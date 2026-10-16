import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useKeyboardHeight } from '@/components/ui/bottom-sheet';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { describeSeverity, hapticFor, severityColors, type NotifyAction, type Severity, type ToastItem } from '@/lib/notify';
import { duration, easing, layout, radius, spacing, spring, useTheme } from '@/theme';

export type ToastProps = {
  /** Default `info`. */
  severity?: Severity;
  title?: string;
  message: string;
  /** One action such as Undo. */
  action?: NotifyAction;
  /** Shows a close button (use for toasts that never time out). */
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The toast card: severity icon, text, optional action and optional close button. Presentational; `ToastHost` adds
 * the queue, timing, swipe-to-dismiss and placement. Use `useNotify().toast(...)` to show one.
 */
export function Toast({ severity = 'info', title, message, action, onDismiss, style }: ToastProps) {
  const { colors, elevation } = useTheme();
  const tone = severityColors(colors, severity);
  const { icon, label } = describeSeverity(severity);

  return (
    <View style={[styles.card, { backgroundColor: tone.background, borderColor: tone.border }, elevation(3), style]}>
      <View style={styles.icon} accessible accessibilityLabel={label}>
        <Ionicons name={icon} size={22} color={tone.icon} />
      </View>
      <View style={styles.body}>
        {title ? (
          <Text variant="label" weight="semiBold" color={tone.foreground}>
            {title}
          </Text>
        ) : null}
        <Text variant="body" color={tone.foreground}>
          {message}
        </Text>
      </View>
      {action ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={action.label}
          haptic="tap"
          onPress={action.onPress}
          style={styles.action}
          ringRadius={radius.md}>
          <Text variant="label" weight="semiBold" color={tone.foreground} style={styles.actionText}>
            {action.label}
          </Text>
        </PressableScale>
      ) : null}
      {onDismiss ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={onDismiss}
          style={styles.close}
          ringRadius={radius.pill}>
          <Ionicons name="close" size={20} color={tone.foreground} />
        </PressableScale>
      ) : null}
    </View>
  );
}

/* Reanimated shared values are mutated by design; the React Compiler lint cannot see that. */
/* eslint-disable react-hooks/immutability */

const SWIPE_DISTANCE = 80;
const SWIPE_PROJECTION = 0.15;
const ENTER_OFFSET = spacing.xl;

type ViewProps = { item: ToastItem; onDismiss: (id: string) => void };

/** One visible toast: enter / exit motion, auto-dismiss timer (paused while touched), swipe away, announcement. */
function ToastView({ item, onDismiss }: ViewProps) {
  const { reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);
  const dragX = useSharedValue(0);
  const [paused, setPaused] = useState(false);
  const fromBottom = item.position === 'bottom';

  const done = useCallback(() => onDismiss(item.id), [onDismiss, item.id]);

  const leave = useCallback(() => {
    progress.value = withTiming(0, { duration: duration.fast, easing: Easing.bezier(...easing.accelerate) }, (finished) => {
      if (finished) scheduleOnRN(done);
    });
  }, [progress, done]);

  // Enter, haptic and announcement happen once per toast.
  useEffect(() => {
    progress.value = withTiming(1, { duration: reduceMotion ? duration.fast : duration.base, easing: Easing.bezier(...easing.decelerate) });
    const feedback = hapticFor(item.severity);
    if (item.haptic && feedback) haptics[feedback]();
    // Android reads the live region below; iOS needs an explicit announcement.
    if (Platform.OS === 'ios') {
      const { label } = describeSeverity(item.severity);
      AccessibilityInfo.announceForAccessibility(`${label}. ${item.title ? `${item.title}. ` : ''}${item.message}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss. An identical toast arriving bumps `nonce`, which restarts the clock.
  useEffect(() => {
    if (item.duration <= 0 || paused) return;
    const timer = setTimeout(leave, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration, item.nonce, paused, leave]);

  const swipe = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      scheduleOnRN(setPaused, true);
    })
    .onUpdate((e) => {
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      const projected = e.translationX + e.velocityX * SWIPE_PROJECTION;
      if (Math.abs(projected) > SWIPE_DISTANCE) {
        const toX = projected > 0 ? width : -width;
        dragX.value = withTiming(toX, { duration: duration.fast }, (finished) => {
          if (finished) scheduleOnRN(done);
        });
      } else {
        dragX.value = reduceMotion ? 0 : withSpring(0, spring.gentle);
      }
    })
    .onFinalize(() => {
      scheduleOnRN(setPaused, false);
    });

  const style = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(Math.abs(dragX.value), [0, width / 2], [1, 0.3], Extrapolation.CLAMP),
    transform: [
      { translateX: dragX.value },
      { translateY: reduceMotion ? 0 : (1 - progress.value) * (fromBottom ? ENTER_OFFSET : -ENTER_OFFSET) },
    ],
  }));

  const assertive = item.severity === 'error' || item.severity === 'critical';

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        accessibilityLiveRegion={assertive ? 'assertive' : 'polite'}
        accessibilityActions={[{ name: 'dismiss', label: 'Dismiss' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'dismiss') leave();
        }}
        style={[styles.view, style]}>
        <Toast
          severity={item.severity}
          title={item.title}
          message={item.message}
          action={
            item.action
              ? {
                  label: item.action.label,
                  onPress: () => {
                    item.action?.onPress();
                    leave();
                  },
                }
              : undefined
          }
          onDismiss={item.duration === 0 ? leave : undefined}
        />
      </Animated.View>
    </GestureDetector>
  );
}

type HostProps = {
  /** The visible toast from the queue (`ToastQueue.current`). */
  current: ToastItem | null;
  onDismiss: (id: string) => void;
  /** Clearance above the bottom safe area for the tab bar. */
  bottomOffset?: number;
  /** Clearance below the top safe area (leaves room for the offline pill). */
  topOffset?: number;
};

/** Default clearance that keeps bottom toasts above the tab bar. */
export const TAB_BAR_CLEARANCE = spacing.xxxl + spacing.xxl;

/**
 * Places the visible toast above the bottom nav (or below the top safe area), lifted above the keyboard.
 * Mounted once by `NotifyProvider`.
 */
export function ToastHost({ current, onDismiss, bottomOffset = TAB_BAR_CLEARANCE, topOffset = spacing.xxxl }: HostProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const restingBottom = insets.bottom + bottomOffset;

  const lift = useAnimatedStyle(() => ({
    // Keep a gap above the keyboard once it covers the resting position.
    transform: [{ translateY: -Math.max(0, keyboard.value + spacing.md - restingBottom) }],
  }));

  if (!current) return null;
  const top = current.position === 'top';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.host, top ? { top: insets.top + topOffset } : { bottom: restingBottom }, top ? null : lift]}>
      <ToastView key={current.id} item={current} onDismiss={onDismiss} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: layout.screenPadding, right: layout.screenPadding, alignItems: 'center' },
  view: { width: '100%', maxWidth: 560 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
    gap: spacing.sm,
    minHeight: layout.minTouchTarget + spacing.sm,
  },
  icon: { justifyContent: 'center' },
  body: { flex: 1, paddingVertical: spacing.sm, gap: 2 },
  action: { minHeight: layout.minTouchTarget, minWidth: layout.minTouchTarget, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  actionText: { textDecorationLine: 'underline' },
  close: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
});
