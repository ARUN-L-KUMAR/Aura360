import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ComponentProps } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { IconTile, TrendPill } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { spacing, type ModuleKey } from '@/theme';

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
function StatCardImpl({ label, value, subtitle, icon, accent, color, trend, onPress }: StatCardProps) {
  const { t } = useTranslation('common');

  const direction = trend ? (trend.isPositive === undefined ? 'flat' : trend.isPositive ? 'up' : 'down') : null;
  const word = direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'unchanged';
  const spoken = [`${label}: ${value}`, trend ? t(`statCard.${word}`, { value: trend.value }) : null, subtitle].filter(Boolean).join(', ');

  return (
    <Card
      accessible
      accessibilityLabel={spoken}
      onPress={onPress}
      accent={accent}
      tintColor={accent ? undefined : color}
      padding="sm"
      rounded="lg"
      style={{ gap: spacing.md }}>
      {icon || trend ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
          {icon ? <IconTile icon={icon} accent={accent} color={color} /> : <View />}
          {trend && direction ? <TrendPill text={trend.value} direction={direction} good={trend.isPositive} /> : null}
        </View>
      ) : null}

      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" color="textMuted" numberOfLines={2}>
          {label}
        </Text>
        <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Memoised: dashboards render a grid of these and re-render on every refetch. */
export const StatCard = memo(StatCardImpl);
