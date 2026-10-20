import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/card';
import { IconTile, TrendPill, type TrendDirection } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { useTranslation } from '@/i18n';
import { radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The card kit every module section is built from (the per-module `section-kit` files of Fitness, Food, Skincare and
 * Fashion predate it): a quiet ring card, a bold heading and the web's stat card. Everything takes the module accent.
 */

/** A quiet ring card: the web's `ring-1 ring-border/50 rounded-2xl` surface. */
export function RingCard({ children, style, ...rest }: { children: ReactNode; style?: StyleProp<ViewStyle> } & Omit<ComponentProps<typeof Card>, 'style' | 'children'>) {
  return (
    <Card rounded="xl" padding="md" {...rest} style={[{ gap: spacing.lg }, style]}>
      {children}
    </Card>
  );
}

/** Bold section heading with an optional tracked overline above it, a count, a trailing control and a muted description. */
export function Heading({
  title,
  subtitle,
  overline,
  count,
  accent,
  trailing,
}: {
  title: string;
  subtitle?: string;
  overline?: string;
  count?: number;
  accent?: ModuleKey;
  trailing?: ReactNode;
}) {
  const { accent: accentFor } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {overline ? (
        <Text variant="overline" color={accent ? undefined : 'textMuted'} style={accent ? { color: accentFor(accent).text } : undefined} numberOfLines={1}>
          {overline}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2} style={{ flexShrink: 1, flexGrow: 1 }}>
          {title}
        </Text>
        {typeof count === 'number' ? (
          <Text variant="caption" weight="semiBold" numeric color="textMuted">
            {count}
          </Text>
        ) : null}
        {trailing}
      </View>
      {subtitle ? (
        <Text variant="caption" color="textSecondary" numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export type Trend = { text: string; direction: TrendDirection; good?: boolean };

type MetricProps = {
  label: string;
  value: number;
  accent: ModuleKey;
  format?: (value: number) => string;
  icon: IconName;
  trend?: Trend;
  /** Muted line under the number ("vs the 7 days before"). */
  caption?: string;
  /** Replaces the generated "label: value, trend" sentence. */
  accessibilityLabel?: string;
  /** Makes the whole card a button. */
  onPress?: () => void;
  accessibilityHint?: string;
};

/** The web's stat card: tinted icon tile and a trend pill on top, a tiny tracked label, a big bold number. */
export function MetricCard({ label, value, accent, format, icon, trend, caption, accessibilityLabel, onPress, accessibilityHint }: MetricProps) {
  const { t } = useTranslation('common');
  const valueText = format ? format(value) : String(value);
  const word = trend ? (trend.direction === 'up' ? 'up' : trend.direction === 'down' ? 'down' : 'unchanged') : null;
  const spoken = accessibilityLabel ?? [`${label}: ${valueText}`, trend && word ? t(`statCard.${word}`, { value: trend.text }) : null, caption].filter(Boolean).join(', ');
  return (
    <Card
      rounded="xl"
      padding="md"
      accent={accent}
      onPress={onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={spoken}
      accessibilityHint={accessibilityHint}
      style={{ gap: spacing.md, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <IconTile icon={icon} accent={accent} />
        {trend ? <TrendPill text={trend.text} direction={trend.direction} good={trend.good} /> : null}
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

/** Two-up grid for `MetricCard`s: pairs share a row, a single column when the text is large. */
export function MetricGrid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>{children}</View>;
}

/** Wrapper that gives a `MetricCard` its half of a `MetricGrid` row. */
export function MetricCell({ children }: { children: ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 148, flexDirection: 'row' }}>{children}</View>;
}

/** A small frosted figure for a hero card (a number over a tracked label). */
export function HeroFigure({ label, value, format }: { label: string; value: number; format?: (value: number) => string }) {
  const { colors } = useTheme();
  const valueText = format ? format(value) : String(value);
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${valueText}`}
      style={{ flexGrow: 1, flexBasis: 0, minWidth: spacing.xxxl * 2, gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.heroChip }}>
      <AnimatedNumber value={value} format={format} variant="headline" color={colors.onHero} accessibilityLabel={valueText} />
      <Text variant="overline" numberOfLines={2} style={{ color: colors.onHeroMuted }}>
        {label}
      </Text>
    </View>
  );
}
