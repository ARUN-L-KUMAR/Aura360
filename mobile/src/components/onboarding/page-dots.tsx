import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { instant } from '@/components/ui/motion';
import { duration, radius, spacing, useTheme } from '@/theme';

const DOT = spacing.sm;
/** How much bigger the current dot is than the rest. */
const ACTIVE_SCALE = 1.5;

function Dot({ active }: { active: boolean }) {
  const { colors, reduceMotion } = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, reduceMotion ? instant : { duration: duration.fast }));
  }, [active, reduceMotion, progress]);

  // Two stacked discs: the resting one never changes, the brand one fades and grows in. Opacity and transform only.
  const on = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: 1 + (ACTIVE_SCALE - 1) * progress.get() }],
  }));

  return (
    <View style={[styles.dot, { backgroundColor: colors.borderStrong }]}>
      <Animated.View style={[styles.dot, styles.on, { backgroundColor: colors.primary }, on]} />
    </View>
  );
}

type Props = {
  count: number;
  /** Zero-based current page. */
  index: number;
  /** Spoken value, e.g. "Page 2 of 3". */
  label: string;
};

/** Page indicator. One element for screen readers ("Page 2 of 3"); the dots themselves are decorative. */
export const PageDots = memo(function PageDots({ count, index, label }: Props) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, minHeight: spacing.xl },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
  on: { position: 'absolute', top: 0, start: 0 },
});
