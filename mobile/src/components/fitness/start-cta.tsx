import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { withAlpha } from '@/components/ui/logic';
import { Gradient } from '@/components/ui/gradient';
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
/** Strength of the light disc behind the icon, on the accent fill. */
const DISC_ALPHA = 0.2;

/**
 * The big "Start workout" call to action: a full-width tile with the Fitness accent washing from its solid colour to its
 * text colour, an icon disc, a title and an arrow. Press squishes it and taps the haptic engine. The label always sits on
 * the accent's own `onSolid` colour, which is readable on both ends of the wash.
 */
export function StartCta({ title, subtitle, icon = 'play', onPress, haptic = 'tap', accessibilityHint }: Props) {
  const { accent, elevation } = useTheme();
  const fitness = accent('fitness');

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
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.lg,
          backgroundColor: fitness.solid,
        }}>
        <Gradient from={fitness.solid} to={fitness.text} direction="diagonal" />
        <View style={{ width: DISC, height: DISC, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(fitness.onSolid, DISC_ALPHA) }}>
          <Ionicons name={icon} size={spacing.xl} color={fitness.onSolid} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs / 2 }}>
          <Text variant="title" numberOfLines={2} style={{ color: fitness.onSolid }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" numberOfLines={2} style={{ color: fitness.onSolid }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name={directional('arrow-forward', 'arrow-back')} size={spacing.xl} color={fitness.onSolid} />
      </View>
    </PressableScale>
  );
}
