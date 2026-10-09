import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: IconName;
  color?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
  trend,
  onPress,
}: StatCardProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const accentColor = color ?? colors.text;

  const content = (
    <GlassCard glowColor={color ? `${color}` : undefined} style={styles.card}>
      <View style={styles.header}>
        <Text variant="caption" muted style={styles.label}>
          {label.toUpperCase()}
        </Text>
        {icon && (
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark
                  ? `${accentColor}24`
                  : `${accentColor}18`,
              },
            ]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
        )}
      </View>

      <Text variant="title" style={styles.value} numberOfLines={1}>
        {value}
      </Text>

      {(subtitle || trend) && (
        <View style={styles.footer}>
          {trend && (
            <View
              style={[
                styles.trendPill,
                {
                  backgroundColor: trend.isPositive
                    ? `${colors.success}1c`
                    : `${colors.danger}1c`,
                },
              ]}>
              <Ionicons
                name={trend.isPositive ? 'arrow-up' : 'arrow-down'}
                size={11}
                color={trend.isPositive ? colors.success : colors.danger}
              />
              <Text
                variant="caption"
                style={[
                  styles.trendText,
                  { color: trend.isPositive ? colors.success : colors.danger },
                ]}>
                {trend.value}
              </Text>
            </View>
          )}
          {subtitle && (
            <Text variant="caption" muted numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </GlassCard>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    padding: spacing.md + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtitle: {
    flex: 1,
    fontSize: 11,
  },
});
