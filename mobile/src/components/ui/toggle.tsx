import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { PressableScale } from '@/components/ui/pressable-scale';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, spring, useTheme, type ModuleKey } from '@/theme';

const TRACK_WIDTH = spacing.xxl + spacing.lg + spacing.xs; // 52
const TRACK_HEIGHT = spacing.xxl; // 32
const THUMB = spacing.xl; // 24
const INSET = (TRACK_HEIGHT - THUMB) / 2;
const TRAVEL = TRACK_WIDTH - THUMB - INSET * 2;

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Module accent for the "on" track; the brand colour when omitted. */
  accent?: ModuleKey;
  /** Spoken name when the switch is not inside a labelled row. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's switch. The thumb slides on a spring and the "on" track cross-fades (transform and opacity only), with a
 * selection haptic. A 44pt-high hit area surrounds the 32pt track. Under reduce-motion it changes instantly.
 */
export function Toggle({ value, onValueChange, disabled, accent, accessibilityLabel, accessibilityHint, style }: Props) {
  const { colors, accent: accentFor, reduceMotion } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.set(reduceMotion ? withTiming(value ? 1 : 0, { duration: 1 }) : withSpring(value ? 1 : 0, spring.gentle));
  }, [value, reduceMotion, progress]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * TRAVEL }] }));
  const onTrack = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, progress.get())) }));

  const fill = accent ? accentFor(accent).solid : colors.primary;
  const thumbColor = accent ? accentFor(accent).onSolid : colors.primaryText;

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      scaleTo={1}
      focusRing
      ringRadius={radius.full}
      hitSlop={{ top: (layout.minTouchTarget - TRACK_HEIGHT) / 2, bottom: (layout.minTouchTarget - TRACK_HEIGHT) / 2, left: spacing.sm, right: spacing.sm }}
      onPress={() => {
        haptics.select();
        onValueChange(!value);
      }}
      style={style}>
      <View style={[styles.track, { backgroundColor: colors.cardMuted, borderColor: colors.borderStrong }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill, borderRadius: radius.full }, onTrack]} />
        <Animated.View style={[styles.thumb, { backgroundColor: value ? thumbColor : colors.borderStrong }, thumb]} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    left: INSET - 1,
    width: THUMB,
    height: THUMB,
    borderRadius: radius.full,
  },
});
