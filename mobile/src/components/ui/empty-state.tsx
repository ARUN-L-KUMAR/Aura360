import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/button';
import { withAlpha } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type EmptyStateVariant = 'empty' | 'noResults' | 'offline';

const PRESETS: Record<EmptyStateVariant, { icon: IconName; title: string; description?: string }> = {
  empty: { icon: 'sparkles-outline', title: 'Nothing here yet' },
  noResults: {
    icon: 'search-outline',
    title: 'No results',
    description: 'Try a different search or clear your filters.',
  },
  offline: {
    icon: 'cloud-offline-outline',
    title: "You're offline",
    description: 'Connect to the internet to see the latest.',
  },
};

export interface EmptyStateProps {
  /** empty (default), noResults (search / filters matched nothing) or offline. Sets default icon and copy. */
  variant?: EmptyStateVariant;
  icon?: IconName;
  /** Replaces the icon with your own artwork. */
  illustration?: ReactNode;
  title?: string;
  description?: string;
  /** Primary action. */
  actionTitle?: string;
  onAction?: () => void;
  /** Secondary, quieter action. */
  secondaryActionTitle?: string;
  onSecondaryAction?: () => void;
  /** `noResults` only: adds a "Clear filters" action. */
  onClearFilters?: () => void;
  clearFiltersLabel?: string;
  /** Module accent for the icon tile. */
  accent?: ModuleKey;
  /** Legacy: arbitrary icon colour. Prefer `accent`. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  variant = 'empty',
  icon,
  illustration,
  title,
  description,
  actionTitle,
  onAction,
  secondaryActionTitle,
  onSecondaryAction,
  onClearFilters,
  clearFiltersLabel = 'Clear filters',
  accent,
  color,
  style,
}: EmptyStateProps) {
  const { colors, accent: accentFor } = useTheme();
  const preset = PRESETS[variant];
  const a = accent ? accentFor(accent) : null;
  const iconColor = a ? a.text : (color ?? colors.textSecondary);
  const tile = a ? a.soft : color ? withAlpha(color, 0.12) : colors.cardMuted;

  const heading = title ?? preset.title;
  const body = description ?? preset.description;

  // noResults: "Clear filters" is the primary action unless the caller supplied one.
  const primary =
    actionTitle && onAction
      ? { title: actionTitle, onPress: onAction }
      : variant === 'noResults' && onClearFilters
        ? { title: clearFiltersLabel, onPress: onClearFilters }
        : null;
  const secondary =
    secondaryActionTitle && onSecondaryAction
      ? { title: secondaryActionTitle, onPress: onSecondaryAction }
      : primary && actionTitle && onAction && variant === 'noResults' && onClearFilters
        ? { title: clearFiltersLabel, onPress: onClearFilters }
        : null;

  return (
    <View
      style={[{ alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl }, style]}>
      {illustration ?? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xs,
            backgroundColor: tile,
          }}>
          <Ionicons name={icon ?? preset.icon} size={32} color={iconColor} />
        </View>
      )}

      <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
        {heading}
      </Text>

      {body ? (
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center', maxWidth: 320 }}>
          {body}
        </Text>
      ) : null}

      {primary || secondary ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm, alignItems: 'center' }}>
          {primary ? <Button title={primary.title} fullWidth={false} onPress={primary.onPress} /> : null}
          {secondary ? <Button title={secondary.title} variant="ghost" fullWidth={false} onPress={secondary.onPress} /> : null}
        </View>
      ) : null}
    </View>
  );
}
