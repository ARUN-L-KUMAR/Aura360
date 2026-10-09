import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  color?: string;
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  description,
  actionTitle,
  onAction,
  color,
}: EmptyStateProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const iconColor = color ?? colors.textMuted;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDark ? `${iconColor}1a` : `${iconColor}14`,
            borderColor: isDark ? `${iconColor}33` : `${iconColor}22`,
          },
        ]}>
        <Ionicons name={icon} size={32} color={iconColor} />
      </View>

      <Text variant="heading" style={styles.title}>
        {title}
      </Text>

      {description && (
        <Text variant="body" muted style={styles.description}>
          {description}
        </Text>
      )}

      {actionTitle && onAction && (
        <View style={styles.actionWrapper}>
          <Button title={actionTitle} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
    fontSize: 14,
  },
  actionWrapper: {
    marginTop: spacing.md,
  },
});
