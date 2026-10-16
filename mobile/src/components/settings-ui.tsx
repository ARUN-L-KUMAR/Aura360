import { Switch, View } from 'react-native';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { ListItem, type ListItemProps } from '@/components/ui/list-item';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { spacing, useTheme } from '@/theme';

type SectionProps = {
  title: string;
  /** Explanation under the group. Keep long copy here rather than in row subtitles, which stop at two lines. */
  footer?: string;
  /** Wrap the children in one card (rows, dividers). Pass false to lay out your own cards. Default true. */
  card?: boolean;
  children: ReactNode;
};

/** A titled group of settings rows in one card, with optional explanation text underneath. */
export function SettingsSection({ title, footer, card = true, children }: SectionProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title={title} />
      {card ? (
        <Card padding="none" style={{ overflow: 'hidden' }}>
          {children}
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>{children}</View>
      )}
      {footer ? (
        <Text variant="caption" color="textSecondary" style={{ paddingHorizontal: spacing.xs }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

type SwitchRowProps = Pick<ListItemProps, 'title' | 'subtitle' | 'icon' | 'accent' | 'divider' | 'titleLines' | 'disabled'> & {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/**
 * A settings row with a Switch at the right. The whole row toggles it; the Switch stays the one focusable control for
 * screen readers (labelled with the title, described by the subtitle) so the state is announced once.
 */
export function SwitchRow({ value, onValueChange, disabled, title, subtitle, ...item }: SwitchRowProps) {
  const { colors } = useTheme();

  const change = (next: boolean) => {
    haptics.select();
    onValueChange(next);
  };

  return (
    <ListItem
      {...item}
      title={title}
      subtitle={subtitle}
      disabled={disabled}
      accessible={false}
      chevron={false}
      onPress={() => change(!value)}
      trailing={
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={change}
          trackColor={{ false: colors.borderStrong, true: colors.primary }}
          thumbColor={colors.primaryText}
          ios_backgroundColor={colors.borderStrong}
          accessibilityLabel={title}
          accessibilityHint={subtitle}
        />
      }
    />
  );
}
