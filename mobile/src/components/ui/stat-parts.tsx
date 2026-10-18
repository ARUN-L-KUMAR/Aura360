import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { accentTint } from '@/components/ui/accent-tint';
import { withAlpha } from '@/components/ui/logic';
import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Tile size: the web's `p-3` around a 20pt glyph is 44; on a phone grid 40 keeps two tiles per row airy. */
export const TILE_SIZE = 40;
const TILE_ICON = 20;

/**
 * The web's stat icon tile: a rounded-2xl square tinted with the module colour (light tints in light mode, a faint
 * wash over the card in dark) with the icon in that colour. Decorative: hidden from screen readers.
 */
export function IconTile({ icon, accent, color, size = TILE_SIZE }: { icon: IconName; accent?: ModuleKey; color?: string; size?: number }) {
  const { colors, scheme, accent: accentFor } = useTheme();
  const a = accent ? accentFor(accent) : null;
  const fg = a ? a.text : (color ?? colors.textSecondary);
  const bg = a ? accentTint(a, scheme) : color ? withAlpha(color, 0.14) : colors.cardMuted;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Ionicons name={icon} size={TILE_ICON} color={fg} />
    </View>
  );
}

export type TrendDirection = 'up' | 'down' | 'flat';

/**
 * Small rounded-full trend pill (10px bold) with an arrow icon: emerald for good news, rose for bad, slate for flat.
 * Only ever rendered from data the caller passes in.
 */
export function TrendPill({ text, direction, good }: { text: string; direction: TrendDirection; good?: boolean }) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const tone = good === true ? 'good' : good === false ? 'bad' : 'flat';
  const bg = tone === 'good' ? (dark ? withAlpha(colors.success, 0.16) : colors.successContainer) : tone === 'bad' ? (dark ? withAlpha(colors.error, 0.16) : colors.errorContainer) : colors.cardMuted;
  const fg = tone === 'good' ? (dark ? colors.successText : colors.onSuccessContainer) : tone === 'bad' ? (dark ? colors.errorText : colors.onErrorContainer) : colors.textSecondary;
  const icon: IconName = direction === 'up' ? 'trending-up' : direction === 'down' ? 'trending-down' : 'remove';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: bg,
      }}>
      <Ionicons name={icon} size={12} color={fg} />
      <Text variant="overline" numeric style={{ color: fg, letterSpacing: 0.2, textTransform: 'none' }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
