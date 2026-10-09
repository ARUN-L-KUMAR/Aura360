import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

export interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: number;
  trackColor?: string;
  autoThresholdColor?: boolean;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({
  percent,
  color,
  height = 8,
  trackColor,
  autoThresholdColor = false,
  showLabel = false,
  label,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));

  const resolveBarColor = () => {
    if (color) return color;
    if (autoThresholdColor) {
      if (percent >= 100) return colors.danger;
      if (percent >= 80) return colors.warning;
      return colors.success;
    }
    return colors.primary;
  };

  const barColor = resolveBarColor();

  return (
    <View style={styles.container}>
      {(showLabel || label) && (
        <View style={styles.labelRow}>
          {label && <Text variant="caption" muted>{label}</Text>}
          {showLabel && (
            <Text variant="caption" style={{ fontWeight: '600', color: barColor }}>
              {Math.round(percent)}%
            </Text>
          )}
        </View>
      )}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
        style={[
          styles.track,
          {
            height,
            backgroundColor: trackColor ?? colors.cardMuted,
          },
        ]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
