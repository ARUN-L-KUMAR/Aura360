import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme, type ThemeColors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The quiet colour families Finance uses on tiles and pills. `neutral` is the web's slate. */
export type Tone = 'neutral' | 'success' | 'error' | 'warning' | 'info';

/** Tinted background and the colour that reads on it, from the semantic container tokens (soft in light, deep in dark). */
export function useToneColors(tone: Tone): { bg: string; fg: string } {
  const { colors } = useTheme();
  return toneColors(tone, colors);
}

function toneColors(tone: Tone, c: ThemeColors) {
  switch (tone) {
    case 'success':
      return { bg: c.successContainer, fg: c.onSuccessContainer };
    case 'error':
      return { bg: c.errorContainer, fg: c.onErrorContainer };
    case 'warning':
      return { bg: c.warningContainer, fg: c.onWarningContainer };
    case 'info':
      return { bg: c.infoContainer, fg: c.onInfoContainer };
    default:
      return { bg: c.cardMuted, fg: c.textSecondary };
  }
}

const TILE = layout.minTouchTarget;

/** Rounded square icon tile tinted by `tone` (the web's `rounded-2xl p-3 bg-*-500/10`). Decorative: hidden from screen readers. */
export function IconTile({ icon, tone = 'neutral', size = TILE, style }: { icon: IconName; tone?: Tone; size?: number; style?: StyleProp<ViewStyle> }) {
  const { bg, fg } = useToneColors(tone);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size, borderRadius: size > TILE - 1 ? radius.lg : radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={fg} />
    </View>
  );
}

/** Tiny uppercase tracked label (the web's text-[10px] font-bold tracking-widest). */
export function Overline({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text variant="overline" color="textMuted" numberOfLines={1} style={style}>
      {children}
    </Text>
  );
}

type PillProps = {
  /** Already formatted, for example "26%". */
  text: string;
  direction: 'up' | 'down' | 'flat';
  /** Whether this movement is welcome (spending going down). */
  good?: boolean;
};

/** Small trend pill: arrow AND tint, so direction never relies on colour alone. */
export function TrendPill({ text, direction, good }: PillProps) {
  const tone: Tone = good === undefined ? 'neutral' : good ? 'success' : 'error';
  const { bg, fg } = useToneColors(tone);
  const icon: IconName = direction === 'up' ? 'arrow-up' : direction === 'down' ? 'arrow-down' : 'remove';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs / 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs / 2, borderRadius: radius.pill, backgroundColor: bg }}>
      <Ionicons name={icon} size={12} color={fg} />
      <Text variant="caption" weight="bold" numeric style={{ color: fg }}>
        {text}
      </Text>
    </View>
  );
}

type SectionHeadProps = {
  /** Tiny uppercase line above the title. */
  overline?: string;
  title: string;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onActionPress?: () => void;
  /** Leave the horizontal padding to the parent (inside a card). */
  style?: StyleProp<ViewStyle>;
};

/** Bold section heading with a tracked overline and an optional "See all" link (44pt target). */
export function SectionHead({ overline, title, actionLabel, actionAccessibilityLabel, onActionPress, style }: SectionHeadProps) {
  const { colors } = useTheme();
  const hasAction = !!actionLabel && !!onActionPress;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: hasAction ? layout.minTouchTarget : undefined }, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        {overline ? <Overline>{overline}</Overline> : null}
        <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
      </View>
      {hasAction ? (
        <PressableScale
          accessibilityRole="link"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onActionPress}
          haptic={false}
          scaleTo={1}
          ringRadius={radius.sm}
          style={{ minHeight: layout.minTouchTarget, minWidth: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
          <Text variant="overline" color="primaryAccent">
            {actionLabel}
          </Text>
          <Ionicons name={directional('chevron-forward', 'chevron-back')} size={14} color={colors.primaryAccent} />
        </PressableScale>
      ) : null}
    </View>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  icon: IconName;
  tone?: Tone;
  trend?: PillProps;
  /** Muted line under the number. */
  note?: string;
  /** Spoken summary of the whole card. */
  accessibilityLabel: string;
  children?: ReactNode;
};

/**
 * The web's stat card: a tinted icon tile and a trend pill on top, a tiny uppercase label, a big bold number and a muted
 * note. The whole card is one spoken sentence.
 */
export function FinStatCard({ label, value, icon, tone = 'neutral', trend, note, accessibilityLabel, children }: StatCardProps) {
  return (
    <Card accessible accessibilityLabel={accessibilityLabel} rounded="lg" style={{ flexGrow: 1, flexBasis: spacing.xxxl * 3, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <IconTile icon={icon} tone={tone} />
        {trend ? <TrendPill {...trend} /> : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <Overline>{label}</Overline>
        <Text variant="headline" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {value}
        </Text>
        {note ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {note}
          </Text>
        ) : null}
      </View>
      {children}
    </Card>
  );
}
