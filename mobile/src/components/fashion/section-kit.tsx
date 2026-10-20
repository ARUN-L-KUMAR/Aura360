import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/card';
import { withAlpha } from '@/components/ui/logic';
import { hitSlopOf, PressableScale } from '@/components/ui/pressable-scale';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The web's quiet ring card (`ring-1 ring-border rounded-2xl`) that every Fashion block sits on. */
export function RingCard({ children, style, ...rest }: { children: ReactNode; style?: StyleProp<ViewStyle> } & Omit<ComponentProps<typeof Card>, 'style' | 'children'>) {
  return (
    <Card rounded="xl" padding="md" {...rest} style={[{ gap: spacing.lg }, style]}>
      {children}
    </Card>
  );
}

/** Bold section heading with an optional tracked overline above it and a muted description under it. */
export function Heading({ title, subtitle, overline, count, trailing }: { title: string; subtitle?: string; overline?: string; count?: number; trailing?: ReactNode }) {
  const { accent } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        {overline ? (
          <Text variant="overline" style={{ color: accent('fashion').text }} numberOfLines={1}>
            {overline}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {typeof count === 'number' ? (
            <Text variant="caption" weight="semiBold" numeric color="textMuted">
              {count}
            </Text>
          ) : null}
        </View>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

type MetricProps = {
  label: string;
  value: number;
  format?: (value: number) => string;
  icon: IconName;
  /** Muted line under the number. */
  caption?: string;
  onPress?: () => void;
  accessibilityHint?: string;
};

/**
 * The web's stat card: tinted icon tile on top, a tiny tracked label and a big bold number. The whole card reads as one
 * sentence. No trend pill: Fashion has no history to compare against, so none is drawn.
 */
export function MetricCard({ label, value, format, icon, caption, onPress, accessibilityHint }: MetricProps) {
  const text = format ? format(value) : String(value);
  const spoken = [`${label}: ${text}`, caption].filter(Boolean).join(', ');
  return (
    <Card rounded="xl" padding="md" accessible accessibilityLabel={spoken} accessibilityHint={accessibilityHint} onPress={onPress} style={{ gap: spacing.md, flex: 1 }}>
      <IconTile icon={icon} accent="fashion" />
      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" color="textMuted" numberOfLines={2}>
          {label}
        </Text>
        <AnimatedNumber value={value} format={format} variant="headline" accessibilityLabel={text} />
        {caption ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Two-up grid for `MetricCard`s: pairs share a row. */
export function MetricGrid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>{children}</View>;
}

/** Wrapper that gives a `MetricCard` its half of a `MetricGrid` row. */
export function MetricCell({ children }: { children: ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 148, flexDirection: 'row' }}>{children}</View>;
}

/** A frosted stat chip for the hero: icon, number and a tiny tracked label. One spoken sentence. */
export function HeroChip({ icon, value, label, spoken }: { icon: IconName; value: number; label: string; spoken: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        flexGrow: 1,
        flexBasis: 88,
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.heroChipBorder,
        backgroundColor: colors.heroChip,
      }}>
      <Ionicons name={icon} size={spacing.lg} color={colors.onHeroMuted} />
      <AnimatedNumber value={value} variant="headline" color="onHero" />
      <Text variant="overline" numberOfLines={2} style={{ color: colors.onHeroMuted }}>
        {label}
      </Text>
    </View>
  );
}

/** Trailing "View all" link for a `Heading` (44pt target). */
export function LinkAction({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel?: string; onPress: () => void }) {
  const { accent } = useTheme();
  const color = accent('fashion').text;
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      haptic={false}
      scaleTo={1}
      ringRadius={radius.sm}
      style={{ minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text variant="label" weight="semiBold" style={{ color }}>
        {label}
      </Text>
      <Ionicons name={directional('chevron-forward', 'chevron-back')} size={16} color={color} />
    </PressableScale>
  );
}

const WARN_CHIP_HEIGHT = 36;

/**
 * Filter chip for the laundry state: amber like the other "needs attention" marks. Icon plus label plus count, and a
 * check mark when on, so the state never rests on colour alone.
 */
export function WarnChip({ label, count, selected, onPress }: { label: string; count: number; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const fg = selected ? colors.onWarningContainer : colors.warningText;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
      accessibilityState={{ selected }}
      haptic="select"
      hitSlop={hitSlopOf((layout.minTouchTarget - WARN_CHIP_HEIGHT) / 2, spacing.xs)}
      ringRadius={radius.pill}
      onPress={onPress}
      style={{
        minHeight: WARN_CHIP_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.warningBorder,
        backgroundColor: selected ? colors.warningContainer : colors.card,
      }}>
      <Ionicons name={selected ? 'checkmark' : 'water-outline'} size={16} color={fg} />
      <Text variant="label" weight="semiBold" numberOfLines={1} style={{ color: fg, flexShrink: 1 }}>
        {label}
      </Text>
      <View style={{ minWidth: spacing.lg + spacing.xs, paddingHorizontal: spacing.xs, borderRadius: radius.pill, alignItems: 'center', backgroundColor: withAlpha(fg, 0.16) }}>
        <Text variant="caption" weight="semiBold" numeric style={{ color: fg }}>
          {count}
        </Text>
      </View>
    </PressableScale>
  );
}
