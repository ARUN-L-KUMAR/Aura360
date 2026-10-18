import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useId, type ComponentProps, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { GradientText } from '@/components/ui/gradient-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { layout, radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type HeroAction = {
  label: string;
  icon?: IconName;
  /** `solid` is the primary call to action (white on dark, deep slate on light); `glass` is the frosted secondary one. */
  variant?: 'solid' | 'glass';
  onPress: () => void;
  accessibilityHint?: string;
};

type Props = {
  /** Small status chip above the title, e.g. the greeting. */
  chip?: { label: string; icon?: IconName };
  /** First line(s) of the headline. */
  title: string;
  /** A word shown on its own line in a white-to-blue gradient (the user's name in the web hero). */
  accentWord?: string;
  subtitle?: string;
  actions?: HeroAction[];
  /** Anything under the buttons: headline numbers, chips. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const ORB = 220;

/** A soft glow: a radial gradient that fades to transparent, standing in for the web hero's blurred circles. */
function Orb({ color, opacity, style }: { color: string; opacity: number; style: ViewStyle }) {
  const id = useId();
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: ORB, height: ORB }, style]}>
      <Svg width={ORB} height={ORB} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function ActionButton({ action }: { action: HeroAction }) {
  const { colors, elevation } = useTheme();
  const solid = (action.variant ?? 'solid') === 'solid';
  // The hero is dark in both themes, so the solid button is always white with dark text (never the theme primary).
  const textColor = solid ? colors.heroSurface : colors.onHero;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityHint={action.accessibilityHint}
      haptic="tap"
      ringRadius={radius.lg}
      onPress={action.onPress}
      style={[
        {
          // Two buttons share a row equally; on a very narrow screen they wrap onto two full-width rows.
          flexGrow: 1,
          flexBasis: layout.minTouchTarget * 3,
          minHeight: layout.minTouchTarget + spacing.md,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.xl,
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
      {action.icon ? <Ionicons name={action.icon} size={20} color={textColor} /> : null}
      <Text variant="label" weight="bold" style={{ color: textColor }}>
        {action.label}
      </Text>
    </PressableScale>
  );
}

/**
 * The web dashboard's hero card for the phone: a slate-900 rounded card with two soft glow orbs, a frosted status chip,
 * a bold tight headline whose last word fades white to blue, a muted line of copy and large pill buttons. It is always
 * dark (like the web hero), so text colours are the `onHero` tokens in both themes.
 *
 * ```tsx
 * <PremiumHero chip={{ icon: 'flash', label: 'Good evening' }} title="Welcome back," accentWord="Arun"
 *   subtitle="You have completed 1,375 activities this month."
 *   actions={[{ label: 'New note', icon: 'add', onPress }, { label: 'Transaction', icon: 'cash-outline', variant: 'glass', onPress }]} />
 * ```
 */
export const PremiumHero = memo(function PremiumHero({ chip, title, accentWord, subtitle, actions, children, style }: Props) {
  const { colors, shades } = useTheme();
  const headline = accentWord ? `${title} ${accentWord}` : title;

  return (
    <View
      style={[
        {
          borderRadius: radius.xl,
          backgroundColor: colors.heroSurface,
          overflow: 'hidden',
          padding: spacing.xl,
          gap: spacing.lg,
        },
        style,
      ]}>
      <Orb color={colors.heroGlowA} opacity={0.28} style={{ top: -ORB * 0.35, end: -ORB * 0.35 }} />
      <Orb color={colors.heroGlowB} opacity={0.2} style={{ bottom: -ORB * 0.4, start: -ORB * 0.4 }} />

      {chip ? (
        <View
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: colors.heroChip,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
          }}>
          {chip.icon ? <Ionicons name={chip.icon} size={12} color={shades.warning[400]} /> : null}
          <Text variant="overline" style={{ color: colors.onHero }}>
            {chip.label}
          </Text>
        </View>
      ) : null}

      <View accessible accessibilityRole="header" accessibilityLabel={headline} style={{ gap: spacing.xs }}>
        <Text variant="hero" style={{ color: colors.onHero }}>
          {title}
        </Text>
        {accentWord ? (
          <GradientText from={colors.onHero} to={shades.secondary[400]}>
            {accentWord}
          </GradientText>
        ) : null}
      </View>

      {subtitle ? (
        <Text variant="body" weight="medium" style={{ color: colors.onHeroMuted }}>
          {subtitle}
        </Text>
      ) : null}

      {actions?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {actions.map((action) => (
            <ActionButton key={action.label} action={action} />
          ))}
        </View>
      ) : null}

      {children}
    </View>
  );
});
