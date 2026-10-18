import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { IconTile, TrendPill, type TrendDirection } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type HeadingProps = {
  title: string;
  subtitle?: string;
  /** Tiny tracked label above the title, in the Food amber. */
  overline?: string;
  count?: number;
  /** Trailing link ("Edit targets"). */
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onActionPress?: () => void;
};

/** Bold section heading: amber overline, title, quiet description and an optional trailing link (44pt target). */
export function FoodHeading({ title, subtitle, overline, count, actionLabel, actionAccessibilityLabel, onActionPress }: HeadingProps) {
  const { accent, colors } = useTheme();
  const { t } = useTranslation('common');
  const food = accent('food');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        {overline ? (
          <Text variant="overline" numberOfLines={1} style={{ color: food.text }}>
            {overline}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {typeof count === 'number' ? (
            <View accessible accessibilityLabel={t('sectionHeader.items', { count })} style={{ minWidth: spacing.xl, paddingHorizontal: spacing.sm, borderRadius: radius.pill, alignItems: 'center', backgroundColor: colors.cardMuted }}>
              <Text variant="caption" weight="semiBold" numeric color="textSecondary">
                {count}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <PressableScale
          accessibilityRole="link"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onActionPress}
          haptic={false}
          scaleTo={1}
          ringRadius={radius.sm}
          style={{ minHeight: layout.minTouchTarget, minWidth: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
          <Text variant="label" weight="semiBold" style={{ color: food.text }}>
            {actionLabel}
          </Text>
          <Ionicons name={directional('chevron-forward', 'chevron-back')} size={16} color={food.text} />
        </PressableScale>
      ) : null}
    </View>
  );
}

export type FoodTrend = { text: string; direction: TrendDirection };

type StatProps = {
  label: string;
  value: number;
  format?: (value: number) => string;
  icon: IconName;
  /** Only ever built from real data. Neutral colour: more or fewer calories is not good or bad on its own. */
  trend?: FoodTrend;
  caption?: string;
};

/** The web's stat card: ring border, tinted icon tile, optional trend pill, tracked label, big bold number. One spoken sentence. */
export function FoodStat({ label, value, format, icon, trend, caption }: StatProps) {
  const { t } = useTranslation('common');
  const valueText = format ? format(value) : String(value);
  const word = trend ? (trend.direction === 'up' ? 'up' : trend.direction === 'down' ? 'down' : 'unchanged') : null;
  const spoken = [`${label}: ${valueText}`, trend && word ? t(`statCard.${word}`, { value: trend.text }) : null, caption].filter(Boolean).join(', ');
  return (
    <Card rounded="xl" padding="md" accessible accessibilityLabel={spoken} style={{ gap: spacing.md, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <IconTile icon={icon} accent="food" />
        {trend ? <TrendPill text={trend.text} direction={trend.direction} /> : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" color="textMuted" numberOfLines={2}>
          {label}
        </Text>
        <AnimatedNumber value={value} format={format} variant="headline" accessibilityLabel={valueText} />
        {caption ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

type ChipProps = { icon: IconName; value: string; caption?: string; label: string; spoken: string };

/** A frosted figure in the hero: icon, bold value, a muted "of target" and the tiny tracked label. One spoken sentence. */
export function HeroFigure({ icon, value, caption, label, spoken }: ChipProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: spacing.xxxl * 2 - spacing.sm,
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.heroChipBorder,
        backgroundColor: colors.heroChip,
      }}>
      <Ionicons name={icon} size={spacing.lg} color={colors.onHeroMuted} />
      <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: colors.onHero }}>
        {value}
      </Text>
      {caption ? (
        <Text variant="caption" numeric numberOfLines={1} style={{ color: colors.onHeroMuted }}>
          {caption}
        </Text>
      ) : null}
      <Text variant="overline" numberOfLines={1} style={{ color: colors.onHeroMuted }}>
        {label}
      </Text>
    </View>
  );
}
