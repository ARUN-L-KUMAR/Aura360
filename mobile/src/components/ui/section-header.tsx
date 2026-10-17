import { Ionicons } from '@expo/vector-icons';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { layout, radius, spacing, useTheme } from '@/theme';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  /** Number of items in the section, shown after the title. */
  count?: number;
  /** Trailing link, e.g. "See all". */
  actionLabel?: string;
  onActionPress?: () => void;
  /** Spoken label for the action when the visible text is vague ("See all" -> "See all transactions"). */
  actionAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Title row above a block of content, with an optional count, subtitle and trailing action link (44pt target). */
export function SectionHeader({ title, subtitle, count, actionLabel, onActionPress, actionAccessibilityLabel, style }: SectionHeaderProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const hasAction = !!actionLabel && !!onActionPress;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: hasAction ? layout.minTouchTarget : undefined }, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="title" accessibilityRole="header" numberOfLines={2} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {typeof count === 'number' ? (
            <View
              accessible
              accessibilityLabel={t('sectionHeader.items', { count })}
              style={{ minWidth: spacing.xl, paddingHorizontal: spacing.sm, borderRadius: radius.pill, alignItems: 'center', backgroundColor: colors.cardMuted }}>
              <Text variant="caption" weight="semiBold" numeric color="textSecondary">
                {count}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {hasAction ? (
        <PressableScale
          accessibilityRole="link"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onActionPress}
          haptic={false}
          scaleTo={1}
          ringRadius={radius.sm}
          style={{ minHeight: layout.minTouchTarget, minWidth: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
          <Text variant="label" weight="semiBold" color="primaryAccent">
            {actionLabel}
          </Text>
          <Ionicons name={directional('chevron-forward', 'chevron-back')} size={16} color={colors.primaryAccent} />
        </PressableScale>
      ) : null}
    </View>
  );
}
