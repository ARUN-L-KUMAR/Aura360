import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text, type TextVariant } from '@/components/ui/text';
import { duration, radius, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline';

const SIZE: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
const INITIALS_VARIANT: Record<AvatarSize, TextVariant> = { xs: 'caption', sm: 'caption', md: 'label', lg: 'title', xl: 'headline' };
const STATUS_DOT: Record<AvatarSize, number> = { xs: 8, sm: 10, md: 12, lg: 16, xl: 20 };

/** Palette the fallback colour is picked from (accent tokens, so contrast is guaranteed in both schemes). */
const FALLBACK_KEYS: ModuleKey[] = ['finance', 'fitness', 'food', 'fashion', 'skincare', 'notes', 'saved', 'time', 'ai'];

/** Stable 32-bit string hash, so the same name always gets the same colour. */
function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(h, 31) + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initialsOf(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

const STATUS_META: Record<AvatarStatus, { icon: IconName; label: string }> = {
  online: { icon: 'ellipse', label: 'online' },
  away: { icon: 'time', label: 'away' },
  busy: { icon: 'remove-circle', label: 'busy' },
  offline: { icon: 'ellipse-outline', label: 'offline' },
};

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
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ name, uri, size = 'md', status, accent, accessibilityLabel, style }: AvatarProps) {
  const { colors, accent: accentFor, reduceMotion } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const px = SIZE[size];
  const initials = initialsOf(name);
  const key = accent ?? FALLBACK_KEYS[hash(name?.trim().toLowerCase() ?? '') % FALLBACK_KEYS.length];
  const a = accentFor(key);
  const showImage = !!uri && failedUri !== uri;
  const dot = STATUS_DOT[size];
  const label = [accessibilityLabel ?? name ?? 'Profile picture', status ? STATUS_META[status].label : null].filter(Boolean).join(', ');

  const statusColor =
    status === 'online' ? colors.successText : status === 'busy' ? colors.errorText : status === 'away' ? colors.warningText : colors.textMuted;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[{ width: px, height: px }, style]}>
      <View
        style={{
          width: px,
          height: px,
          borderRadius: radius.full,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: showImage ? colors.cardMuted : a.solid,
        }}>
        {showImage ? (
          <Image
            source={{ uri }}
            style={{ width: px, height: px }}
            contentFit="cover"
            transition={reduceMotion ? 0 : duration.fast}
            cachePolicy="memory-disk"
            recyclingKey={uri}
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
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: dot,
            height: dot,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.card,
          }}>
          <Ionicons name={STATUS_META[status].icon} size={dot - 2} color={statusColor} />
        </View>
      ) : null}
    </View>
  );
}
