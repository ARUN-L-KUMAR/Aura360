import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePop } from '@/components/ui/motion';
import { Text } from '@/components/ui/text';
import { useVizTones } from '@/components/viz/tones';
import { radius, spacing, useTheme, type ModuleKey } from '@/theme';

/**
 * A row of completion dots, one per day (7 for a week, or any n).
 *
 * ```tsx
 * <StreakDots done={[true, true, false, true, true, false, false]} todayIndex={4}
 *             labels={weekdayInitials} accent="fitness" accessibilityLabel={t('streakSummary', { count: 4, total: 7 })} />
 * ```
 *
 * - Done days are filled and carry a check icon; open days are an empty outline. Today is marked by a heavier outline,
 *   a bold label and a small bar under it, so nothing depends on colour alone.
 * - Days after `todayIndex` are drawn quieter (still to come).
 * - The newest completion pops (spring scale, via `usePop`); nothing moves under reduce-motion.
 * - `accessibilityLabel` is the spoken summary ("4 of 7 days done, today is Friday"), written by the caller.
 */
export type StreakDotsProps = {
  /** Completion per day, oldest first. */
  done: readonly boolean[];
  /** Index of today. Omit for a history with no "today". */
  todayIndex?: number;
  /** Caption under each dot (weekday initials). */
  labels?: readonly string[];
  accent?: ModuleKey;
  /** Dot diameter in points. Default 24. */
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_SIZE = spacing.xl;
const OUTLINE = spacing.xs / 2;
const TODAY_OUTLINE = spacing.xs;
const ICON_RATIO = 0.65;
const MARKER_WIDTH = spacing.md;
const MARKER_HEIGHT = spacing.xs / 2;

type DotProps = { done: boolean; today: boolean; upcoming: boolean; label?: string; size: number; accent?: ModuleKey };

function Dot({ done, today, upcoming, label, size, accent }: DotProps) {
  const { colors } = useTheme();
  const tones = useVizTones(accent);
  const pop = usePop(done);

  const border = today ? tones.solid : upcoming ? colors.borderSubtle : colors.borderStrong;
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: done ? tones.solid : 'transparent',
            borderWidth: done ? 0 : today ? TODAY_OUTLINE : OUTLINE,
            borderColor: border,
          },
          pop,
        ]}>
        {done ? <Ionicons name="checkmark" size={Math.round(size * ICON_RATIO)} color={tones.onSolid} /> : null}
      </Animated.View>
      {label !== undefined ? (
        <Text variant="caption" weight={today ? 'bold' : 'regular'} color={today ? 'text' : 'textSecondary'} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <View style={{ width: MARKER_WIDTH, height: MARKER_HEIGHT, borderRadius: radius.pill, backgroundColor: today ? tones.solid : 'transparent' }} />
    </View>
  );
}

function StreakDotsImpl({ done, todayIndex, labels, accent, size = DEFAULT_SIZE, accessibilityLabel, style }: StreakDotsProps) {
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, style]}>
      {done.map((isDone, i) => (
        <Dot key={i} done={isDone} today={i === todayIndex} upcoming={todayIndex !== undefined && i > todayIndex} label={labels?.[i]} size={size} accent={accent} />
      ))}
    </View>
  );
}

export const StreakDots = memo(StreakDotsImpl);
