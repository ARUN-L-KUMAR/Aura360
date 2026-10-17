import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { clampPercent, progressLevel } from '@/components/ui/logic';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { directionSign } from '@/i18n/rtl';
import { duration, easing, radius, spacing, useTheme, type ModuleKey } from '@/theme';

export interface ProgressBarProps {
  /** 0-100. Out-of-range values are clamped for the bar; the label shows the real number. */
  percent: number;
  /** Fill colour override (legacy; prefer `accent`). */
  color?: string;
  /** Module accent for the fill. */
  accent?: ModuleKey;
  /** Track thickness in points. Default 8. */
  height?: number;
  trackColor?: string;
  /** Fill turns warning at 80% and error at 100%, with an icon so it never relies on colour alone. */
  autoThresholdColor?: boolean;
  showLabel?: boolean;
  label?: string;
}

/** Horizontal progress bar. The fill animates with a transform, not a width change, and grows from the start side (right in RTL). */
export function ProgressBar({
  percent,
  color,
  accent,
  height = 8,
  trackColor,
  autoThresholdColor = false,
  showLabel = false,
  label,
}: ProgressBarProps) {
  const { colors, accent: accentFor, reduceMotion } = useTheme();
  const { t } = useTranslation('common');
  const clamped = clampPercent(percent);
  const progress = useSharedValue(reduceMotion ? clamped / 100 : 0);
  const trackWidth = useSharedValue(0);

  useEffect(() => {
    const target = clamped / 100;
    progress.value = reduceMotion ? target : withTiming(target, { duration: duration.slow, easing: Easing.bezier(...easing.decelerate) });
  }, [clamped, reduceMotion, progress]);

  // The fill is full width and parked off the start edge; mirrored in RTL so it still grows from the start side.
  const sign = directionSign();
  const fillStyle = useAnimatedStyle(() => ({
    opacity: trackWidth.value > 0 ? 1 : 0,
    transform: [{ translateX: (progress.value - 1) * trackWidth.value * sign }],
  }));

  const level = progressLevel(percent, autoThresholdColor);
  const over = level === 'over';
  const near = level === 'near';
  const barColor =
    color ?? (over ? colors.error : near ? colors.warning : autoThresholdColor ? colors.success : accent ? accentFor(accent).solid : colors.primary);
  const rounded = Math.round(Number.isFinite(percent) ? percent : 0);
  const spoken = over ? t('progress.overLimit', { percent: rounded }) : near ? t('progress.nearLimit', { percent: rounded }) : t('progress.percent', { percent: rounded });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped), text: spoken }}
      style={{ gap: spacing.xs, width: '100%' }}>
      {showLabel || label ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          {label ? (
            <Text variant="caption" color="textSecondary" style={{ flexShrink: 1 }}>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {over || near ? (
                <Ionicons name={over ? 'alert-circle' : 'warning'} size={14} color={over ? colors.errorText : colors.warningText} />
              ) : null}
              <Text variant="caption" weight="semiBold" numeric color={over ? 'errorText' : near ? 'warningText' : 'text'}>
                {rounded}%
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View
        onLayout={(e: LayoutChangeEvent) => {
          trackWidth.set(e.nativeEvent.layout.width);
        }}
        style={{ height, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: trackColor ?? colors.cardMuted }}>
        <Animated.View style={[{ height: '100%', width: '100%', borderRadius: radius.pill, backgroundColor: barColor }, fillStyle]} />
      </View>
    </View>
  );
}
