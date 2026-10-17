import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { withAlpha } from '@/components/ui/logic';
import { useBlockMotion } from '@/components/ui/motion';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type EmptyStateVariant = 'empty' | 'noResults' | 'offline';

/** Icons per variant. The words live in `common:emptyState.<variant>`. */
const PRESET_ICONS: Record<EmptyStateVariant, IconName> = {
  empty: 'sparkles-outline',
  noResults: 'search-outline',
  offline: 'cloud-offline-outline',
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
  clearFiltersLabel,
  accent,
  color,
  style,
}: EmptyStateProps) {
  const { colors, accent: accentFor } = useTheme();
  const { t } = useTranslation('common');
  const motion = useBlockMotion();
  const a = accent ? accentFor(accent) : null;
  const iconColor = a ? a.text : (color ?? colors.textSecondary);
  const tile = a ? a.soft : color ? withAlpha(color, 0.12) : colors.cardMuted;

  const heading = title ?? t(`emptyState.${variant}.title`);
  // The plain "empty" variant has a headline only; the other two explain what to do next.
  const body = description ?? (variant === 'empty' ? undefined : t(`emptyState.${variant}.description`));
  const clearLabel = clearFiltersLabel ?? t('emptyState.clearFilters');

  // noResults: "Clear filters" is the primary action unless the caller supplied one.
  const primary =
    actionTitle && onAction
      ? { title: actionTitle, onPress: onAction }
      : variant === 'noResults' && onClearFilters
        ? { title: clearLabel, onPress: onClearFilters }
        : null;
  const secondary =
    secondaryActionTitle && onSecondaryAction
      ? { title: secondaryActionTitle, onPress: onSecondaryAction }
      : primary && actionTitle && onAction && variant === 'noResults' && onClearFilters
        ? { title: clearLabel, onPress: onClearFilters }
        : null;

  return (
    <Animated.View
      {...motion}
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
          <Ionicons name={icon ?? PRESET_ICONS[variant]} size={32} color={iconColor} />
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
    </Animated.View>
  );
}
