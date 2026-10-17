import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type HeaderAction = {
  icon: IconName;
  /** Spoken name; also what a screen reader says for the badge when `badge` is on. */
  label: string;
  onPress: () => void;
  /** A dot for "something new" (unread notifications). */
  badge?: boolean;
  /** Draw the square outline (the web header outlines the search button). */
  outlined?: boolean;
};

type Props = {
  /** Breadcrumb, first to last, e.g. ['Aura360', 'Finance']. The last crumb is the current page. */
  trail: string[];
  actions?: HeaderAction[];
  avatar?: { name: string; uri?: string | null; label: string; onPress?: () => void };
  /** Pad for the status bar. Default true. */
  topInset?: boolean;
};

// 36pt visible square + 4pt hit slop on each side = a 44pt touch target, and enough room for the breadcrumb on a 360pt phone.
const BUTTON = layout.minTouchTarget - spacing.sm; // 36

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function HeaderButton({ action }: { action: HeaderAction }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={action.label}
      haptic="tap"
      hitSlop={spacing.xs}
      ringRadius={radius.md}
      onPress={action.onPress}
      style={{
        width: BUTTON,
        height: BUTTON,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: action.outlined ? 1 : 0,
        borderColor: colors.border,
      }}>
      <Ionicons name={action.icon} size={18} color={colors.text} />
      {action.badge ? (
        <View
          style={{
            position: 'absolute',
            top: spacing.sm - 1,
            end: spacing.sm - 1,
            width: spacing.sm,
            height: spacing.sm,
            borderRadius: radius.full,
            backgroundColor: colors.error,
            borderWidth: 1.5,
            borderColor: colors.glassSolid,
          }}
        />
      ) : null}
    </PressableScale>
  );
}

function AvatarButton({ avatar }: { avatar: NonNullable<Props['avatar']> }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const showImage = !!avatar.uri && !failed;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={avatar.label}
      haptic="tap"
      hitSlop={spacing.xs}
      ringRadius={radius.md}
      disabled={!avatar.onPress}
      onPress={avatar.onPress}
      style={{
        width: BUTTON,
        height: BUTTON,
        borderRadius: radius.md,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryContainer,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      {showImage ? (
        <Image source={{ uri: avatar.uri ?? undefined }} contentFit="cover" onError={() => setFailed(true)} style={{ width: BUTTON, height: BUTTON }} />
      ) : (
        <Text variant="label" weight="bold" style={{ color: colors.onPrimaryContainer }}>
          {initialsOf(avatar.name)}
        </Text>
      )}
    </PressableScale>
  );
}

/**
 * The web dashboard's header on the phone: a rounded, softly framed pill holding a breadcrumb chip on the left
 * ("AURA360 > FINANCE" in tiny tracked capitals) and the quick actions on the right (search, theme, notifications, avatar).
 * It is an overlay surface, so it uses glass on iOS 26+ and the solid card colour elsewhere.
 */
export const PremiumHeader = memo(function PremiumHeader({ trail, actions, avatar, topInset = true }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const chevron = directional('chevron-forward', 'chevron-back') as IconName;

  return (
    <View style={{ paddingTop: (topInset ? insets.top : 0) + spacing.sm, paddingHorizontal: layout.screenPadding, paddingBottom: spacing.sm }}>
      <GlassSurface
        style={{
          borderRadius: radius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          padding: spacing.sm,
          backgroundColor: colors.glassSolid,
        }}>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={trail.join(', ')}
          style={{
            flexShrink: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderRadius: radius.md,
            backgroundColor: colors.cardMuted,
            paddingHorizontal: spacing.sm + 2,
            paddingVertical: spacing.sm,
          }}>
          {trail.map((crumb, index) => {
            const last = index === trail.length - 1;
            return (
              <View key={`${index}-${crumb}`} style={{ flexShrink: last ? 1 : 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text variant="overline" numberOfLines={1} style={{ color: last ? colors.text : colors.textMuted }}>
                  {crumb}
                </Text>
                {last ? null : <Ionicons name={chevron} size={11} color={colors.textMuted} />}
              </View>
            );
          })}
        </View>

        <View style={{ flex: 1, minWidth: 0 }} />

        {actions?.map((action) => <HeaderButton key={action.label} action={action} />)}
        {avatar ? <AvatarButton avatar={avatar} /> : null}
      </GlassSurface>
    </View>
  );
});
