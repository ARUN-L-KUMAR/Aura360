import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

/** Bottom padding for scroll content that has a floating action button (56pt button + 16pt inset + breathing room). */
export const FAB_CLEARANCE = spacing.xxxl + spacing.xxl;

type StepperProps = {
  /** Current period ("Today", "October 2026"). */
  label: string;
  accent: ModuleKey;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  /** Makes the label a button (e.g. "jump to today"). */
  onLabelPress?: () => void;
  labelHint?: string;
};

/** Previous / current / next control for a day or month. */
export function PeriodStepper({ label, accent, previousLabel, nextLabel, onPrevious, onNext, nextDisabled, onLabelPress, labelHint }: StepperProps) {
  const { accent: accentFor } = useTheme();
  const a = accentFor(accent);
  return (
    <Card rounded="xl" padding="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs, paddingHorizontal: spacing.xs }}>
      <IconButton icon={directional('chevron-back', 'chevron-forward')} accessibilityLabel={previousLabel} onPress={onPrevious} haptic="select" />
      {onLabelPress ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={labelHint}
          onPress={onLabelPress}
          haptic="select"
          ringRadius={radius.md}
          style={{ minHeight: layout.minTouchTarget, flexShrink: 1, justifyContent: 'center', paddingHorizontal: spacing.md }}>
          <Text variant="title" numberOfLines={1} style={{ color: a.text, textAlign: 'center' }}>
            {label}
          </Text>
        </PressableScale>
      ) : (
        <View accessible accessibilityLabel={label} accessibilityLiveRegion="polite" style={{ flexShrink: 1, paddingHorizontal: spacing.md }}>
          <Text variant="title" numberOfLines={1} style={{ textAlign: 'center' }}>
            {label}
          </Text>
        </View>
      )}
      <IconButton icon={directional('chevron-forward', 'chevron-back')} accessibilityLabel={nextLabel} onPress={onNext} disabled={nextDisabled} haptic="select" />
    </Card>
  );
}

type QueryErrorProps = {
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
  /** True when cached data is on screen: the error shows as a compact strip above it instead of replacing it. */
  hasData: boolean;
};

/** Error for a failed query: full-size when there is nothing to show, an inline strip when cached data is visible. */
export function QueryError({ error, onRetry, retrying, hasData }: QueryErrorProps) {
  return <ErrorState error={error} onRetry={onRetry} retrying={retrying} size={hasData ? 'inline' : 'full'} />;
}

type IconName = ComponentProps<typeof Ionicons>['name'];

const TILE = spacing.xxl + spacing.sm; // 40, the web's h-10 w-10 icon tile

/** The web's tinted rounded icon tile, in the Fitness accent. Decoration: hidden from screen readers. */
export function IconTile({ icon, size = TILE }: { icon: IconName; size?: number }) {
  const { accent } = useTheme();
  const fitness = accent('fitness');
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: fitness.soft }}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={fitness.text} />
    </View>
  );
}

/** A quiet ring card: the web's `ring-1 ring-border/50 rounded-2xl` surface that every Fitness block sits on. */
export function RingCard({ children, style, ...rest }: { children: ReactNode; style?: StyleProp<ViewStyle> } & Omit<ComponentProps<typeof Card>, 'style' | 'children'>) {
  return (
    <Card rounded="xl" padding="md" {...rest} style={[{ gap: spacing.lg }, style]}>
      {children}
    </Card>
  );
}

/** Bold section heading with an optional tracked overline above it and a muted description under it. */
export function Heading({ title, subtitle, overline, count }: { title: string; subtitle?: string; overline?: string; count?: number }) {
  const { accent } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {overline ? (
        <Text variant="overline" style={{ color: accent('fitness').text }} numberOfLines={1}>
          {overline}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2} style={{ flexShrink: 1 }}>
          {title}
        </Text>
        {typeof count === 'number' ? (
          <View style={{ minWidth: spacing.xl, paddingHorizontal: spacing.sm, borderRadius: radius.pill, alignItems: 'center' }}>
            <Text variant="caption" weight="semiBold" numeric color="textMuted">
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
  );
}

export type Trend = { text: string; direction: 'up' | 'down' | 'flat'; good?: boolean };

/** Small pill with an arrow and a change ("12%"). Arrow AND colour show the direction. */
export function TrendPill({ trend }: { trend: Trend }) {
  const { colors } = useTheme();
  const good = trend.good ?? (trend.direction === 'up' ? true : trend.direction === 'down' ? false : undefined);
  const tone = good === true ? { bg: colors.successContainer, fg: colors.onSuccessContainer } : good === false ? { bg: colors.errorContainer, fg: colors.onErrorContainer } : { bg: colors.cardMuted, fg: colors.textSecondary };
  const icon = trend.direction === 'up' ? 'arrow-up' : trend.direction === 'down' ? 'arrow-down' : 'remove';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: tone.bg }}>
      <Ionicons name={icon} size={12} color={tone.fg} />
      <Text variant="caption" weight="bold" numeric style={{ color: tone.fg }}>
        {trend.text}
      </Text>
    </View>
  );
}

type MetricProps = {
  label: string;
  value: number;
  format?: (value: number) => string;
  icon: IconName;
  trend?: Trend;
  /** Muted line under the number ("vs the 7 days before"). */
  caption?: string;
  /** Replaces the generated "label: value, trend" sentence. */
  accessibilityLabel?: string;
};

/**
 * The web's stat card: tinted icon tile and a trend pill on top, a tiny tracked label, and a big bold number. The whole
 * card reads as one sentence.
 */
export function MetricCard({ label, value, format, icon, trend, caption, accessibilityLabel }: MetricProps) {
  const { t } = useTranslation('common');
  const valueText = format ? format(value) : String(value);
  const word = trend ? (trend.direction === 'up' ? 'up' : trend.direction === 'down' ? 'down' : 'unchanged') : null;
  const spoken = accessibilityLabel ?? [`${label}: ${valueText}`, trend && word ? t(`statCard.${word}`, { value: trend.text }) : null, caption].filter(Boolean).join(', ');
  return (
    <Card rounded="xl" padding="md" accessible accessibilityLabel={spoken} style={{ gap: spacing.md, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <IconTile icon={icon} />
        {trend ? <TrendPill trend={trend} /> : null}
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

/** Two-up grid for `MetricCard`s: pairs share a row, and a single column when the text is large. */
export function MetricGrid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>{children}</View>;
}

/** Wrapper that gives a `MetricCard` its half of a `MetricGrid` row. */
export function MetricCell({ children }: { children: ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 148, flexDirection: 'row' }}>{children}</View>;
}

export type HeroButtonSpec = { label: string; icon: IconName; variant: 'solid' | 'glass'; onPress: () => void };

/**
 * Pill buttons for the hero card. The hero is dark in both schemes, so the solid one is white with deep slate text
 * (the theme's `primary` turns dark in the light scheme and would vanish into the hero) and the glass one is frosted.
 */
export function HeroButtons({ actions }: { actions: HeroButtonSpec[] }) {
  const { colors, elevation } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {actions.map((action) => {
        const solid = action.variant === 'solid';
        const color = solid ? colors.heroSurface : colors.onHero;
        return (
          <PressableScale
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            haptic="tap"
            ringRadius={radius.lg}
            onPress={action.onPress}
            style={[
              {
                flexGrow: 1,
                minHeight: layout.minTouchTarget + spacing.md,
                borderRadius: radius.lg,
                paddingHorizontal: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                backgroundColor: solid ? colors.onHero : colors.heroChip,
                borderWidth: solid ? 0 : 1,
                borderColor: colors.heroChipBorder,
              },
              solid ? elevation(3) : null,
            ]}>
            <Ionicons name={action.icon} size={20} color={color} />
            <Text variant="label" weight="bold" style={{ color }}>
              {action.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
