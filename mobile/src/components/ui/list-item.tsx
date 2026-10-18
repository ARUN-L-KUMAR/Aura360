import { Ionicons } from '@expo/vector-icons';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { accentTint } from '@/components/ui/accent-tint';
import { Avatar, type AvatarProps } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TILE = layout.minTouchTarget - spacing.xs; // 40

export type ListItemProps = {
  title: string;
  subtitle?: string;
  /** Icon tile on the left, tinted by `accent`. */
  icon?: IconName;
  accent?: ModuleKey;
  /** Avatar on the left (takes precedence over `icon`). */
  avatar?: AvatarProps;
  /** Fully custom leading node (takes precedence over `icon` and `avatar`). */
  leading?: ReactNode;
  /** Small secondary text or node on the right, e.g. an amount or date. */
  meta?: ReactNode;
  /** Custom node at the far right (switch, badge, button). */
  trailing?: ReactNode;
  /** Show a chevron. Defaults to true when the row is pressable. */
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** Hairline under the row, inset to line up with the text. */
  divider?: boolean;
  titleLines?: number;
  /** Spoken text. Default: title, subtitle and string meta joined. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Set false when `trailing` holds its own interactive controls that must stay individually focusable. */
  accessible?: boolean;
  style?: StyleProp<ViewStyle>;
};

function ListItemImpl({
  title,
  subtitle,
  icon,
  accent,
  avatar,
  leading,
  meta,
  trailing,
  chevron,
  onPress,
  onLongPress,
  selected = false,
  disabled = false,
  divider = false,
  titleLines = 1,
  accessibilityLabel,
  accessibilityHint,
  accessible = true,
  style,
}: ListItemProps) {
  const { colors, scheme, accent: accentFor } = useTheme();
  const pressable = !!(onPress || onLongPress);
  const showChevron = chevron ?? pressable;
  const a = accent ? accentFor(accent) : null;

  const lead =
    leading ??
    (avatar ? (
      <Avatar {...avatar} size={avatar.size ?? 'md'} />
    ) : icon ? (
      <View
        style={{
          width: TILE,
          height: TILE,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: a ? accentTint(a, scheme) : colors.cardMuted,
        }}>
        <Ionicons name={icon} size={22} color={a ? a.text : colors.textSecondary} />
      </View>
    ) : null);

  const label =
    accessibilityLabel ?? [title, subtitle, typeof meta === 'string' || typeof meta === 'number' ? String(meta) : null].filter(Boolean).join(', ');

  const row = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        {
          backgroundColor: selected ? (a ? accentTint(a, scheme) : colors.primaryContainer) : pressed ? colors.cardMuted : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {lead}
      <View style={styles.text}>
        <Text variant="body" weight="semiBold" numberOfLines={titleLines} color={disabled ? 'textDisabled' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={2} color={disabled ? 'textDisabled' : 'textSecondary'}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta != null && meta !== false ? (
        typeof meta === 'string' || typeof meta === 'number' ? (
          <Text variant="label" numeric color="textSecondary" numberOfLines={1}>
            {meta}
          </Text>
        ) : (
          meta
        )
      ) : null}
      {trailing}
      {selected ? <Ionicons name="checkmark-circle" size={22} color={a ? a.text : colors.primaryAccent} /> : null}
      {showChevron ? <Ionicons name={directional('chevron-forward', 'chevron-back')} size={18} color={colors.textMuted} /> : null}
    </View>
  );

  const insetStart = spacing.lg + (lead ? TILE + spacing.md : 0);
  const separator = divider ? (
    <View style={{ height: StyleSheet.hairlineWidth, marginStart: insetStart, backgroundColor: colors.border }} />
  ) : null;

  if (!pressable) {
    return (
      <View accessible={accessible} accessibilityLabel={accessible ? label : undefined} accessibilityState={{ selected, disabled }}>
        {row(false)}
        {separator}
      </View>
    );
  }

  return (
    <View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ selected, disabled }}
        accessible={accessible}
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        haptic={false}
        scaleTo={1}
        hitSlop={0}
        ringRadius={radius.sm}>
        {({ pressed }) => row(pressed)}
      </PressableScale>
      {separator}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget + spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  text: { flex: 1, gap: 2 },
});

/**
 * Standard list row: leading visual, title / subtitle, meta, trailing node and chevron. At least 56pt tall and it grows
 * with the text size. The chevron mirrors in right-to-left languages. Memoised for long lists.
 */
export const ListItem = memo(ListItemImpl);
