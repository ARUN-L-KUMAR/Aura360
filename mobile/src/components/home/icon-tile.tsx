import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { View } from 'react-native';

import { withAlpha } from '@/components/ui/logic';
import type { IconName, ModuleKey } from '@/features/modules';
import { radius, spacing, useTheme } from '@/theme';

/** Wash behind the icon: the web's `bg-<hue>-900/20` in dark, a lighter one in light. Quiet on purpose. */
const WASH_DARK = 0.18;
const WASH_LIGHT = 0.12;

type Props = {
  icon: IconName;
  accent: ModuleKey;
  /** Side of the tile. Default 44 (the web's p-3 around a 24px icon, a bit tighter). */
  size?: number;
};

/** The web stat card's icon tile: a rounded-2xl square with a faint tint of the module colour and the icon in it. */
export const IconTile = memo(function IconTile({ icon, accent, size = spacing.xxxl - spacing.xs }: Props) {
  const { accent: accentFor, scheme } = useTheme();
  const a = accentFor(accent);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(a.solid, scheme === 'dark' ? WASH_DARK : WASH_LIGHT),
      }}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={a.text} />
    </View>
  );
});
