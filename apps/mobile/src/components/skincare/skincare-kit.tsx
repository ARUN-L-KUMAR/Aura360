import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { getDeviceLocale } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** A quiet ring card: the web's `ring-1 ring-border/50 rounded-2xl` surface every Skincare block sits on. */
export function RingCard({ children, style, ...rest }: { children: ReactNode; style?: StyleProp<ViewStyle> } & Omit<ComponentProps<typeof Card>, 'style' | 'children'>) {
  return (
    <Card rounded="xl" padding="md" {...rest} style={[{ gap: spacing.lg }, style]}>
      {children}
    </Card>
  );
}

/** Bold section heading with a tracked accent overline above it and a muted description under it. */
export function Heading({ title, subtitle, overline }: { title: string; subtitle?: string; overline?: string }) {
  const { accent } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {overline ? (
        <Text variant="overline" style={{ color: accent('skincare').text }} numberOfLines={1}>
          {overline}
        </Text>
      ) : null}
      <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" color="textSecondary" numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

type MetricProps = {
  label: string;
  value: number;
  fractionDigits?: number;
  icon: IconName;
  /** Muted line under the number. */
  caption?: string;
};

/** The web's stat card: tinted icon tile, a tiny tracked label and a big bold number. One spoken sentence. */
export function MetricCard({ label, value, fractionDigits = 0, icon, caption }: MetricProps) {
  const valueText = value.toLocaleString(getDeviceLocale(), { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  const spoken = [`${label}: ${valueText}`, caption].filter(Boolean).join(', ');
  return (
    <Card rounded="xl" padding="md" accessible accessibilityLabel={spoken} style={{ gap: spacing.md, flex: 1 }}>
      <View style={{ flexDirection: 'row' }}>
        <IconTile icon={icon} accent="skincare" />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" color="textMuted" numberOfLines={2}>
          {label}
        </Text>
        <AnimatedNumber value={value} fractionDigits={fractionDigits} variant="headline" accessibilityLabel={valueText} />
        {caption ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

/** Two-up grid for `MetricCard`s: pairs share a row, one column when the text is large. */
export function MetricGrid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>{children}</View>;
}

/** Gives a `MetricCard` its half of a `MetricGrid` row. */
export function MetricCell({ children }: { children: ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 148, flexDirection: 'row' }}>{children}</View>;
}

const CHIP_BASIS = 84;

/** A frosted stat chip for the hero: icon, count-up number and a tiny tracked label. One spoken sentence. */
export function HeroChip({ icon, value, label, spoken }: { icon: IconName; value: number; label: string; spoken: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{
        flexGrow: 1,
        flexBasis: CHIP_BASIS,
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.heroChipBorder,
        backgroundColor: colors.heroChip,
      }}>
      <Ionicons name={icon} size={spacing.lg} color={colors.onHeroMuted} />
      <AnimatedNumber value={value} variant="headline" color="onHero" accessibilityLabel={String(value)} />
      <Text variant="overline" numberOfLines={2} style={{ color: colors.onHeroMuted }}>
        {label}
      </Text>
    </View>
  );
}

/** Same footprint as three `HeroChip`s while loading, in the hero's own frosted tone. */
export function HeroChipsSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexGrow: 1, flexBasis: CHIP_BASIS, height: spacing.xxxl + spacing.xl, borderRadius: radius.lg, backgroundColor: colors.heroChip }} />
      ))}
    </View>
  );
}
