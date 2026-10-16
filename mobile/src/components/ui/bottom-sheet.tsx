import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { GlassSurface } from '@/components/ui/glass-surface';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { duration, easing, layout, radius, spacing, spring, useTheme } from '@/theme';

/** A pixel height, or a percentage of the screen height. */
export type SnapPoint = number | `${number}%`;

export type BottomSheetProps = {
  visible: boolean;
  /** The user asked to close (backdrop tap, swipe down, close button, Android back). Set `visible` to false. */
  onClose: () => void;
  children?: ReactNode;
  title?: string;
  /** Replaces the title text in the header row (the close button stays). */
  header?: ReactNode;
  /** Pinned under the content, above the bottom safe area (e.g. a primary button). */
  footer?: ReactNode;
  /**
   * Visible heights the sheet can rest at, e.g. `['40%', '90%']`. Smallest first; `initialSnap` indexes into them.
   * `'auto'` (default) sizes the sheet to its content, up to the screen height minus the top safe area.
   * Content keeps one fixed height, so at a lower snap the bottom of it sits off screen until the sheet is expanded.
   */
  snapPoints?: SnapPoint[] | 'auto';
  /** Index into `snapPoints` the sheet opens at. Default 0. */
  initialSnap?: number;
  onSnapChange?: (index: number) => void;
  /** When false the sheet can only be closed by the app: no backdrop tap, swipe down, close button or back. Default true. */
  dismissible?: boolean;
  /** Wraps `children` in a ScrollView that hands its drag to the sheet when scrolled to the top. */
  scrollable?: boolean;
  /** Use the glass surface (iOS 26+; a solid surface everywhere else). Default false (opaque card). */
  glass?: boolean;
  /** Lift the sheet above the keyboard. Default true. */
  keyboardAware?: boolean;
  /** Spoken name of the sheet; defaults to `title`. */
  accessibilityLabel?: string;
};

/** Always-current value for callbacks that outlive a render (timers, animation callbacks). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Keyboard height as a shared value, animated, for lifting overlays. 0 when hidden. */
export function useKeyboardHeight(): SharedValue<number> {
  const height = useSharedValue(0);
  const { reduceMotion } = useTheme();
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const run = (to: number, ms?: number) => {
      height.value = withTiming(to, { duration: reduceMotion ? 1 : (ms ?? duration.fast), easing: Easing.bezier(...easing.standard) });
    };
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => run(e.endCoordinates.height, ios ? e.duration : undefined));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', (e) => run(0, ios ? e.duration : undefined));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [height, reduceMotion]);
  return height;
}

const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
/** How far past the sheet's own height it travels when closing, so its shadow is fully off screen. */
const CLOSE_MARGIN = spacing.xxxl;
/** Seconds of velocity projected ahead when deciding which snap point a flick lands on. */
const PROJECTION = 0.15;

const toPixels = (point: SnapPoint, screenHeight: number) =>
  typeof point === 'number' ? point : (parseFloat(point) / 100) * screenHeight;

/* Reanimated shared values are mutated by design (`sv.value = ...`); the React Compiler lint cannot see that. */
/* eslint-disable react-hooks/immutability */

/**
 * Modal bottom sheet. Controlled (`visible` / `onClose`), with snap points, swipe-to-dismiss with velocity, a fading
 * backdrop, optional scrollable content that hands off to the drag at the top, keyboard lift and bottom safe area.
 *
 * Rendered in a transparent RN `Modal` (so it sits above Expo Router's native stack and screen readers are trapped
 * in it) with its own GestureHandlerRootView, which Modal content needs on Android. Animates transform / opacity only;
 * with reduce-motion on it fades instead of sliding.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  title,
  header,
  footer,
  snapPoints = 'auto',
  initialSnap = 0,
  onSnapChange,
  dismissible = true,
  scrollable = false,
  glass = false,
  keyboardAware = true,
  accessibilityLabel,
}: BottomSheetProps) {
  const { colors, reduceMotion, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboard = useKeyboardHeight();

  const auto = snapPoints === 'auto';
  const maxHeight = Math.max(0, windowHeight - insets.top - spacing.md);

  // Visible heights, smallest first, capped at the screen.
  const heights = useMemo(() => {
    if (snapPoints === 'auto') return [] as number[];
    const px = snapPoints.map((p) => Math.min(maxHeight, Math.max(0, toPixels(p, windowHeight))));
    return Array.from(new Set(px)).sort((a, b) => a - b);
  }, [snapPoints, maxHeight, windowHeight]);

  const [autoHeight, setAutoHeight] = useState(0);
  const sheetHeight = auto ? autoHeight : (heights[heights.length - 1] ?? 0);
  /** translateY at each snap, top-most (smallest) first. */
  const offsets = useMemo(
    () => (auto ? [0] : [...heights].reverse().map((h) => sheetHeight - h)),
    [auto, heights, sheetHeight],
  );
  const closedY = sheetHeight + CLOSE_MARGIN;

  const [mounted, setMounted] = useState(visible);
  const [snapIndex, setSnapIndex] = useState(() => clampIndex(initialSnap, heights.length));
  /** Position in `offsets` for a snap index (offsets are reversed relative to heights). */
  const offsetIndex = auto ? 0 : Math.max(0, offsets.length - 1 - clampIndex(snapIndex, heights.length));

  const translateY = useSharedValue(windowHeight);
  const fade = useSharedValue(0);
  const offsetsSv = useSharedValue<number[]>([0]);
  const closedSv = useSharedValue(windowHeight);
  const startY = useSharedValue(0);
  const dragBase = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const visibleRef = useLatest(visible);
  const onCloseRef = useLatest(onClose);
  const onSnapRef = useLatest(onSnapChange);

  // Mount on open. (Position and snap were reset when the last close finished.)
  if (visible && !mounted) setMounted(true);

  const startIndex = clampIndex(initialSnap, heights.length);
  const finishClose = useCallback(() => {
    if (visibleRef.current) return; // reopened mid-animation
    translateY.value = windowHeight;
    fade.value = 0;
    scrollY.value = 0;
    setSnapIndex(startIndex);
    setMounted(false);
    setAutoHeight(0);
  }, [visibleRef, translateY, fade, scrollY, windowHeight, startIndex]);

  // Drive the sheet to its resting place (open / retarget) or off screen (close).
  const offsetsKey = offsets.join(',');
  useEffect(() => {
    if (!mounted) return;
    offsetsSv.value = offsets;
    closedSv.value = closedY;
    if (visible) {
      if (sheetHeight <= 0) return; // wait for the first layout of an 'auto' sheet
      const target = offsets[offsetIndex] ?? 0;
      if (reduceMotion) {
        translateY.value = target;
        fade.value = withTiming(1, { duration: duration.fast });
      } else {
        fade.value = 1;
        translateY.value = withSpring(target, spring.gentle);
      }
      return;
    }
    if (sheetHeight <= 0) {
      finishClose();
      return;
    }
    if (reduceMotion) {
      fade.value = withTiming(0, { duration: duration.fast }, (done) => {
        if (done) scheduleOnRN(finishClose);
      });
    } else {
      translateY.value = withTiming(closedY, { duration: duration.base, easing: Easing.bezier(...easing.accelerate) }, (done) => {
        if (done) scheduleOnRN(finishClose);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted, sheetHeight, offsetsKey, offsetIndex, reduceMotion]);

  const settle = useCallback(() => {
    const target = offsets[offsetIndex] ?? 0;
    if (reduceMotion) translateY.value = target;
    else translateY.value = withSpring(target, spring.gentle);
  }, [offsets, offsetIndex, reduceMotion, translateY]);

  /** The user wants out. We tell the parent, and spring back if it chooses to stay open. */
  const requestDismiss = useCallback(() => {
    if (!dismissible) return;
    onCloseRef.current();
    setTimeout(() => {
      if (visibleRef.current) settle();
    }, duration.slow);
  }, [dismissible, settle, onCloseRef, visibleRef]);

  const snapTo = useCallback((index: number) => {
    setSnapIndex(index);
    onSnapRef.current?.(index);
  }, [onSnapRef]);

  const canDrag = dismissible || (!auto && heights.length > 1);

  const scrollNative = useMemo(() => Gesture.Native(), []);
  const pan = useMemo(() => {
    const gesture = Gesture.Pan()
      .enabled(canDrag)
      .activeOffsetY([-10, 10])
      .failOffsetX([-24, 24])
      .onBegin(() => {
        startY.value = translateY.value;
        dragBase.value = 0;
      })
      .onUpdate((e) => {
        const offs = offsetsSv.value;
        const top = offs[0] ?? 0;
        const low = offs[offs.length - 1] ?? 0;
        // Content is scrolled while the sheet is fully open: the scroll view owns the drag. Re-anchor, so the sheet
        // takes over smoothly from the moment the content reaches its top again.
        if (scrollable && translateY.value <= top + 0.5 && scrollY.value > 0.5) {
          startY.value = translateY.value;
          dragBase.value = e.translationY;
          return;
        }
        let y = startY.value + (e.translationY - dragBase.value);
        if (y < top) y = top;
        if (!dismissible && y > low) y = low + (y - low) * 0.2; // resist, then spring back
        translateY.value = y;
      })
      // eslint-disable-next-line react-hooks/refs -- `requestDismiss` reads refs only when it runs, never during render
      .onEnd((e) => {
        const offs = offsetsSv.value;
        const top = offs[0] ?? 0;
        if (scrollable && translateY.value <= top + 0.5 && scrollY.value > 0.5) return;
        const projected = translateY.value + e.velocityY * PROJECTION;
        let best = 0;
        let bestDistance = Math.abs(projected - offs[0]);
        for (let i = 1; i < offs.length; i++) {
          const d = Math.abs(projected - offs[i]);
          if (d < bestDistance) {
            best = i;
            bestDistance = d;
          }
        }
        // Compare against "fully hidden" (the sheet's own height), not the extra shadow margin.
        if (dismissible && Math.abs(projected - (closedSv.value - CLOSE_MARGIN)) < bestDistance) {
          scheduleOnRN(requestDismiss);
          return;
        }
        if (reduceMotion) translateY.value = offs[best];
        else translateY.value = withSpring(offs[best], { ...spring.gentle, velocity: e.velocityY });
        // offsets run top-most first; snap indexes run smallest-visible first
        scheduleOnRN(snapTo, offs.length - 1 - best);
      });
    return scrollable ? gesture.simultaneousWithExternalGesture(scrollNative) : gesture;
  }, [canDrag, scrollable, dismissible, reduceMotion, requestDismiss, snapTo, scrollNative, startY, translateY, dragBase, offsetsSv, closedSv, scrollY]);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    // Until the sheet is fully open, dragging belongs to the sheet: keep the content parked at its top.
    if (e.contentOffset.y > 0 && translateY.value > (offsetsSv.value[0] ?? 0) + 1) scrollTo(scrollRef, 0, 0, false);
  });

  const sheetStyle = useAnimatedStyle(() => {
    let lift = 0;
    if (keyboardAware) {
      const room = Math.max(0, windowHeight - sheetHeight + translateY.value - insets.top);
      lift = Math.min(keyboard.value, room);
    }
    return { transform: [{ translateY: translateY.value - lift }], opacity: reduceMotion ? fade.value : 1 };
  });

  const backdropStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: fade.value };
    const offs = offsetsSv.value;
    const low = offs[offs.length - 1] ?? 0;
    return { opacity: interpolate(translateY.value, [low, closedSv.value], [1, 0], Extrapolation.CLAMP) };
  });

  if (!mounted) return null;

  const Surface = glass ? GlassSurface : View;
  const label = accessibilityLabel ?? title;
  const showHeader = !!(title || header);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismissible ? requestDismiss : () => {}}>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestDismiss}
            disabled={!dismissible}
            accessible={dismissible}
            accessibilityRole="button"
            accessibilityLabel="Close"
            importantForAccessibility={dismissible ? 'yes' : 'no-hide-descendants'}
          />
        </Animated.View>

        <View pointerEvents="box-none" style={styles.anchor}>
          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityViewIsModal
              accessibilityLabel={label}
              onAccessibilityEscape={dismissible ? requestDismiss : undefined}
              onLayout={(e) => {
                if (auto) setAutoHeight(Math.round(e.nativeEvent.layout.height));
              }}
              style={[
                auto ? { maxHeight } : { height: sheetHeight },
                elevation(4),
                sheetStyle,
              ]}>
              <Surface
                style={[
                  styles.surface,
                  auto ? styles.shrink : styles.fill,
                  glass ? null : { backgroundColor: colors.card, borderColor: colors.border },
                ]}>
                <View style={styles.handleZone} accessible={false}>
                  <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
                </View>

                {showHeader ? (
                  <View style={styles.headerRow}>
                    <View style={styles.headerContent}>
                      {header ?? (
                        <Text variant="title" accessibilityRole="header" numberOfLines={2}>
                          {title}
                        </Text>
                      )}
                    </View>
                    {dismissible ? (
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        haptic="tap"
                        onPress={requestDismiss}
                        style={styles.closeButton}
                        ringRadius={radius.pill}>
                        <Ionicons name="close" size={22} color={colors.textSecondary} />
                      </PressableScale>
                    ) : null}
                  </View>
                ) : null}

                {scrollable ? (
                  <GestureDetector gesture={scrollNative}>
                    <Animated.ScrollView
                      ref={scrollRef}
                      onScroll={scrollHandler}
                      scrollEventThrottle={16}
                      bounces={false}
                      overScrollMode="never"
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      style={auto ? styles.shrink : styles.fill}
                      contentContainerStyle={styles.scrollContent}>
                      {children}
                    </Animated.ScrollView>
                  </GestureDetector>
                ) : (
                  <View style={[styles.content, auto ? styles.shrink : styles.fill]}>{children}</View>
                )}

                {footer ? <View style={styles.footer}>{footer}</View> : null}
                <View style={{ height: insets.bottom + spacing.lg }} />
              </Surface>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function clampIndex(index: number, count: number) {
  return Math.min(Math.max(0, index), Math.max(0, count - 1));
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shrink: { flexShrink: 1 },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  surface: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  handleZone: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  handle: { width: HANDLE_WIDTH, height: HANDLE_HEIGHT, borderRadius: radius.pill },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingLeft: layout.screenPadding,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  headerContent: { flex: 1 },
  closeButton: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: layout.screenPadding },
  scrollContent: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.lg },
  footer: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md },
});
