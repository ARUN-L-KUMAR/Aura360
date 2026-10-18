import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, type ImageProps } from 'expo-image';
import { memo, useState, type ComponentProps } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { hashString, initialsOf } from '@/components/ui/logic';
import { Text, type TextVariant } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { duration, radius, useTheme, type ModuleKey } from '@/theme';

export { initialsOf };

type IconName = ComponentProps<typeof Ionicons>['name'];

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline';

const SIZE: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
const INITIALS_VARIANT: Record<AvatarSize, TextVariant> = { xs: 'caption', sm: 'caption', md: 'label', lg: 'title', xl: 'headline' };
const STATUS_DOT: Record<AvatarSize, number> = { xs: 8, sm: 10, md: 12, lg: 16, xl: 20 };

/** Palette the fallback colour is picked from (accent tokens, so contrast is guaranteed in both schemes). */
const FALLBACK_KEYS: ModuleKey[] = ['finance', 'fitness', 'food', 'fashion', 'skincare', 'notes', 'saved', 'time', 'ai'];

const STATUS_ICON: Record<AvatarStatus, IconName> = {
  online: 'ellipse',
  away: 'time',
  busy: 'remove-circle',
  offline: 'ellipse-outline',
};

/** Static, per-size styles built once (an avatar can appear dozens of times in a list). */
const sizeStyles = StyleSheet.create(
  Object.fromEntries(
    (Object.keys(SIZE) as AvatarSize[]).flatMap((size) => {
      const px = SIZE[size];
      const dot = STATUS_DOT[size];
      return [
        [`box_${size}`, { width: px, height: px }],
        [
          `disc_${size}`,
          { width: px, height: px, borderRadius: radius.full, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
        ],
        [`dot_${size}`, { position: 'absolute', end: 0, bottom: 0, width: dot, height: dot, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }],
      ] as const;
    }),
  ) as Record<string, ViewStyle>,
);

export type AvatarProps = {
  /** Used for initials, the deterministic fallback colour and the accessibility label. */
  name?: string;
  /** Remote or local image URI. Falls back to initials while missing or if it fails to load. */
  uri?: string | null;
  size?: AvatarSize;
  /** Presence dot. Each status has its own shape (filled, ring, clock, minus) so it never relies on colour. */
  status?: AvatarStatus;
  /** Force a module accent for the fallback instead of deriving it from `name`. */
  accent?: ModuleKey;
  accessibilityLabel?: string;
  /** Identity of the picture for expo-image's view recycling in lists. Defaults to `uri`. */
  recyclingKey?: string | null;
  /** Image cache policy. Default `memory-disk`: avatars repeat across screens and are worth keeping. */
  cachePolicy?: ImageProps['cachePolicy'];
  style?: StyleProp<ViewStyle>;
};

function AvatarImpl({ name, uri, size = 'md', status, accent, accessibilityLabel, recyclingKey, cachePolicy = 'memory-disk', style }: AvatarProps) {
  const { colors, accent: accentFor, reduceMotion } = useTheme();
  const { t } = useTranslation('common');
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const px = SIZE[size];
  const initials = initialsOf(name);
  const key = accent ?? FALLBACK_KEYS[hashString(name?.trim().toLowerCase() ?? '') % FALLBACK_KEYS.length];
  const a = accentFor(key);
  const showImage = !!uri && failedUri !== uri;
  const label = [accessibilityLabel ?? name ?? t('avatar.profile'), status ? t(`avatar.${status}`) : null].filter(Boolean).join(', ');

  const statusColor =
    status === 'online' ? colors.successText : status === 'busy' ? colors.errorText : status === 'away' ? colors.warningText : colors.textMuted;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[sizeStyles[`box_${size}`], style]}>
      <View style={[sizeStyles[`disc_${size}`], { backgroundColor: showImage ? colors.cardMuted : a.solid }]}>
        {showImage ? (
          <Image
            source={{ uri }}
            style={{ width: px, height: px }}
            contentFit="cover"
            transition={reduceMotion ? 0 : duration.fast}
            cachePolicy={cachePolicy}
            recyclingKey={recyclingKey ?? uri}
            onError={() => setFailedUri(uri ?? null)}
            accessible={false}
          />
        ) : initials ? (
          <Text variant={INITIALS_VARIANT[size]} weight="semiBold" style={{ color: a.onSolid }} allowFontScaling={false}>
            {initials}
          </Text>
        ) : (
          <Ionicons name="person" size={px * 0.5} color={a.onSolid} />
        )}
      </View>
      {status ? (
        <View style={[sizeStyles[`dot_${size}`], { backgroundColor: colors.card }]}>
          <Ionicons name={STATUS_ICON[status]} size={STATUS_DOT[size] - 2} color={statusColor} />
        </View>
      ) : null}
    </View>
  );
}

/** Round avatar: photo, else initials, else a person glyph. Memoised, since lists render many of them. */
export const Avatar = memo(AvatarImpl);
