import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress: () => void;
  /** Haptic on press. Pass `false` when the handler fires its own. Default 'tap'. */
  haptic?: 'tap' | 'select' | false;
  accessibilityHint?: string;
};

/** Disc behind the icon. */
const DISC = spacing.xxl + spacing.md;

/**
 * The big "Start workout" call to action in the web hero's language: a slate-900 rounded tile with white text, a frosted
 * icon disc, a bold title and an arrow. It is dark in both schemes (like the hero), so its text uses the `onHero` tokens.
 */
export function StartCta({ title, subtitle, icon = 'play', onPress, haptic = 'tap', accessibilityHint }: Props) {
  const { colors, elevation } = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      haptic={haptic}
      ringRadius={radius.xl}
      style={[{ borderRadius: radius.xl }, elevation(2)]}>
      <View
        style={{
          minHeight: layout.minTouchTarget + spacing.xl,
          borderRadius: radius.xl,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.lg,
          backgroundColor: colors.heroSurface,
          borderWidth: 1,
          borderColor: colors.heroChipBorder,
        }}>
        <View style={{ width: DISC, height: DISC, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.heroChip }}>
          <Ionicons name={icon} size={spacing.xl} color={colors.onHero} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs / 2 }}>
          <Text variant="title" weight="bold" numberOfLines={2} style={{ color: colors.onHero }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" numberOfLines={2} style={{ color: colors.onHeroMuted }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name={directional('arrow-forward', 'arrow-back')} size={spacing.xl} color={colors.onHeroMuted} />
      </View>
    </PressableScale>
  );
}
