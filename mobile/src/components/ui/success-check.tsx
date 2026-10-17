import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { useTranslation } from '@/i18n';
import { duration, radius, spring, useTheme, type ModuleKey } from '@/theme';

type Props = {
  /** Diameter in points. Default 48. */
  size?: number;
  /** Module accent for the disc; the success colour when omitted. */
  accent?: ModuleKey;
  /** Plays the pop whenever this turns true. Default true. */
  visible?: boolean;
  /** Spoken label. Default "Done" (from the catalog). Pass `null` when a nearby label already says it. */
  accessibilityLabel?: string | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * A completion mark: a disc that pops in with a small overshoot while the tick fades in just after (transform and
 * opacity only). Under reduce-motion it appears at once. Pair it with `haptics.success()` at the call site.
 */
export function SuccessCheck({ size = 48, accent, visible = true, accessibilityLabel, style }: Props) {
  const { t } = useTranslation('common');
  const { colors, accent: accentFor, reduceMotion } = useTheme();
  const scale = useSharedValue(0);
  const tick = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      scale.set(0);
      tick.set(0);
      return;
    }
    if (reduceMotion) {
      scale.set(1);
      tick.set(1);
      return;
    }
    scale.set(withSpring(1, spring.bouncy));
    tick.set(withDelay(duration.fast / 2, withTiming(1, { duration: duration.fast })));
  }, [visible, reduceMotion, scale, tick]);

  const disc = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }], opacity: Math.min(1, scale.get() * 1.5) }));
  const mark = useAnimatedStyle(() => ({ opacity: tick.get(), transform: [{ scale: 0.7 + 0.3 * tick.get() }] }));

  const a = accent ? accentFor(accent) : null;
  const fill = a ? a.solid : colors.success;
  const onFill = a ? a.onSolid : colors.onSuccess;

  return (
    <View
      accessible={accessibilityLabel !== null}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel === undefined ? t('actions.done') : (accessibilityLabel ?? undefined)}
      importantForAccessibility={accessibilityLabel === null ? 'no-hide-descendants' : 'auto'}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View style={[{ width: size, height: size, borderRadius: radius.full, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }, disc]}>
        <Animated.View style={mark}>
          <Ionicons name="checkmark" size={Math.round(size * 0.6)} color={onFill} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
