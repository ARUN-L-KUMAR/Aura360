import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { View } from 'react-native';

import { Card, withAlpha } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: IconName;
  /** Module accent for the icon tile. */
  accent?: ModuleKey;
  /** Legacy: arbitrary colour for the icon tile and card tint. Prefer `accent`. */
  color?: string;
  /** `isPositive` true / false shows up / down; leave it undefined for a neutral (flat) trend. */
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onPress?: () => void;
}

/** Label, big tabular number, optional trend and subtitle. Reads as one element for screen readers. */
export function StatCard({ label, value, subtitle, icon, accent, color, trend, onPress }: StatCardProps) {
  const { colors, accent: accentFor } = useTheme();
  const a = accent ? accentFor(accent) : null;
  const iconColor = a ? a.text : (color ?? colors.textSecondary);
  const tile = a ? a.soft : color ? withAlpha(color, 0.14) : colors.cardMuted;

  const direction = trend ? (trend.isPositive === undefined ? 'flat' : trend.isPositive ? 'up' : 'down') : null;
  const trendTone =
    direction === 'up'
      ? { bg: colors.successContainer, fg: colors.onSuccessContainer, icon: 'arrow-up' as const, word: 'up' }
      : direction === 'down'
        ? { bg: colors.errorContainer, fg: colors.onErrorContainer, icon: 'arrow-down' as const, word: 'down' }
        : { bg: colors.cardMuted, fg: colors.textSecondary, icon: 'remove' as const, word: 'unchanged' };

  const spoken = [`${label}: ${value}`, trend ? `${trendTone.word} ${trend.value}` : null, subtitle].filter(Boolean).join(', ');

  return (
    <Card
      accessible
      accessibilityLabel={spoken}
      onPress={onPress}
      accent={accent}
      tintColor={accent ? undefined : color}
      padding="sm"
      style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text variant="caption" weight="medium" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
        {icon ? (
          <View style={{ width: spacing.xxl, height: spacing.xxl, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: tile }}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
        ) : null}
      </View>

      <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>

      {subtitle || trend ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {trend ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: trendTone.bg,
              }}>
              <Ionicons name={trendTone.icon} size={12} color={trendTone.fg} />
              <Text variant="caption" weight="semiBold" numeric style={{ color: trendTone.fg }}>
                {trend.value}
              </Text>
            </View>
          ) : null}
          {subtitle ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
