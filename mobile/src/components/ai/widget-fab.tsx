import { memo, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  clamp,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { duration, easing, motionDuration, radius, spacing, spring, useTheme } from '@/theme';

import {
  DRAG_SLOP,
  FAB_SIZE,
  FLING_PROJECTION,
  PEEK_FADE,
  PEEK_SCALE,
  PEEK_SHIFT,
  PULSE_DELAY_MS,
  PULSE_GROWTH,
  PULSE_PEAK_OPACITY,
  PULSE_REPEATS,
} from './widget-constants';
import { useIdlePeek, useScreenReaderEnabled } from './widget-hooks';
import { BotIcon } from './widget-icons';
import { clampY, getFabBounds, rememberPlacement, sessionPlacement, settle, sideToX, type Side } from './widget-placement';

const EASE_STANDARD = Easing.bezier(...easing.standard);
const HALF_FAB = FAB_SIZE / 2;
const BADGE_MAX = 9;

const ACCESSIBILITY_ACTIONS = [
  { name: 'activate' },
  { name: 'moveLeft', label: 'Move to left edge' },
  { name: 'moveRight', label: 'Move to right edge' },
  { name: 'moveUp', label: 'Move up' },
  { name: 'moveDown', label: 'Move down' },
] as const;

type Props = {
  /** Fade the bubble out (keyboard open, chat tab, sheet open). */
  hidden: boolean;
  /** Number of drafts waiting for approval. */
  badge: number;
  onOpen: () => void;
};

/**
 * The collapsed assistant: a 56pt bubble you can drag. It snaps to the nearest side edge, stays between the top app
 * bar and the bottom navigation bar, tucks half-way off the edge after a few idle seconds, and fades while hidden.
 * Dragging runs on the UI thread (Gesture.Pan + shared values) and only animates transform / opacity.
 * Every drag-only affordance also exists as an accessibility action (open, move left / right / up / down).
 */
function FabImpl({ hidden, badge, onOpen }: Props) {
  const { accent, colors, elevation, reduceMotion } = useTheme();
  const ai = accent('ai');
  const { width, height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const screenReader = useScreenReaderEnabled();
  const bounds = useMemo(() => getFabBounds(width, height, { top, bottom }), [width, height, top, bottom]);

  const x = useSharedValue(sideToX(sessionPlacement.side, bounds));
  const y = useSharedValue(clampY(sessionPlacement.y ?? bounds.maxY, bounds));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const peek = useSharedValue(0);
  const fade = useSharedValue(0);
  const pulse = useSharedValue(0);

  // Keep the bubble inside the allowed area when the window or insets change.
  useEffect(() => {
    x.set(sideToX(sessionPlacement.side, bounds));
    y.set(clampY(y.get(), bounds));
  }, [bounds, x, y]);

  // Fade in / out.
  useEffect(() => {
    fade.set(withTiming(hidden ? 1 : 0, { duration: motionDuration(duration.base, reduceMotion), easing: EASE_STANDARD }));
  }, [hidden, reduceMotion, fade]);

  // A few slow "breathing" pulses when the bubble appears, then still. Skipped for reduced motion.
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.set(0);
    if (hidden || reduceMotion) return;
    pulse.set(
      withDelay(
        PULSE_DELAY_MS,
        withRepeat(withTiming(1, { duration: duration.slow * 4, easing: EASE_STANDARD }), PULSE_REPEATS, false),
      ),
    );
  }, [hidden, reduceMotion, pulse]);

  // Idle "peek": tuck toward the edge after PEEK_DELAY_MS without a touch. Never while a screen reader is on.
  const idle = useIdlePeek(peek, !hidden && !screenReader, reduceMotion);

  const pan = useMemo(() => {
    const bouncy = spring.bouncy;
    const gentle = spring.gentle;
    const { dragStart, dragEnd } = idle;
    return Gesture.Pan()
      .minDistance(DRAG_SLOP)
      .onStart(() => {
        startX.set(x.get());
        startY.set(y.get());
        scheduleOnRN(dragStart);
      })
      .onUpdate((e) => {
        x.set(clamp(startX.get() + e.translationX, 0, bounds.width - FAB_SIZE));
        y.set(clamp(startY.get() + e.translationY, bounds.minY, bounds.maxY));
      })
      .onEnd((e) => {
        const projected = x.get() + HALF_FAB + e.velocityX * FLING_PROJECTION;
        const toRight = projected > bounds.width / 2;
        const targetY = clamp(y.get() + e.velocityY * FLING_PROJECTION, bounds.minY, bounds.maxY);
        x.set(settle(toRight ? bounds.maxX : bounds.minX, reduceMotion, bouncy));
        y.set(settle(targetY, reduceMotion, gentle));
        scheduleOnRN(rememberPlacement, toRight ? 'right' : 'left', targetY);
        scheduleOnRN(haptics.impact);
      })
      .onFinalize(() => {
        scheduleOnRN(dragEnd);
      });
  }, [bounds, idle, reduceMotion, startX, startY, x, y]);

  const moveTo = useCallback(
    (side: Side, nextY: number) => {
      const targetY = clampY(nextY, bounds);
      x.set(settle(sideToX(side, bounds), reduceMotion, spring.bouncy));
      y.set(settle(targetY, reduceMotion, spring.gentle));
      rememberPlacement(side, targetY);
      haptics.select();
    },
    [bounds, reduceMotion, x, y],
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const step = Math.max((bounds.maxY - bounds.minY) / 3, FAB_SIZE);
      switch (event.nativeEvent.actionName) {
        case 'activate':
          onOpen();
          break;
        case 'moveLeft':
          moveTo('left', y.get());
          break;
        case 'moveRight':
          moveTo('right', y.get());
          break;
        case 'moveUp':
          moveTo(sessionPlacement.side, y.get() - step);
          break;
        case 'moveDown':
          moveTo(sessionPlacement.side, y.get() + step);
          break;
      }
    },
    [bounds, moveTo, onOpen, y],
  );

  const anchorStyle = useAnimatedStyle(() => {
    const side = x.get() + HALF_FAB < bounds.width / 2 ? -1 : 1;
    const tuck = reduceMotion ? 0 : peek.get();
    return {
      opacity: (1 - fade.get()) * (1 - PEEK_FADE * peek.get()),
      transform: [
        { translateX: x.get() + side * PEEK_SHIFT * tuck },
        { translateY: y.get() },
        { scale: 1 - (1 - PEEK_SCALE) * tuck },
      ],
    };
  });

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.get(), [0, 0.15, 1], [0, PULSE_PEAK_OPACITY, 0]),
    transform: [{ scale: 1 + PULSE_GROWTH * pulse.get() }],
  }));

  const label = badge > 0 ? `Ask Aura AI assistant, ${badge} ${badge === 1 ? 'draft' : 'drafts'} waiting` : 'Ask Aura AI assistant';

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={pan}>
        <Animated.View
          pointerEvents={hidden ? 'none' : 'auto'}
          accessibilityElementsHidden={hidden}
          importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
          style={[styles.anchor, anchorStyle]}>
          <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: ai.solid }, haloStyle]} />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint="Opens the assistant. Drag to move it, or use the actions menu."
            accessibilityActions={ACCESSIBILITY_ACTIONS}
            onAccessibilityAction={onAccessibilityAction}
            haptic="tap"
            scaleTo={0.92}
            ringRadius={radius.pill}
            onPress={onOpen}
            onPressIn={idle.touchStart}
            onPressOut={idle.touchEnd}
            style={[styles.bubble, { backgroundColor: ai.solid }, elevation(3)]}>
            <BotIcon size={26} color={ai.onSolid} />
            <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: ai.solid }]} />
            {badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.background }]}>
                <Text variant="caption" weight="bold" color="onError">
                  {badge > BADGE_MAX ? `${BADGE_MAX}+` : badge}
                </Text>
              </View>
            ) : null}
          </PressableScale>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const WidgetFab = memo(FabImpl);

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  halo: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
  },
  bubble: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    minWidth: spacing.lg + spacing.xs,
    height: spacing.lg + spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
