import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { IconTile } from './finance-ui';
import { layout, radius, spacing, useTheme } from '@/theme';

/** Parses what the user typed into an amount field. NaN when empty or not a number. Commas are ignored. */
export function parseAmount(text: string) {
  return Number.parseFloat(text.replace(/,/g, ''));
}

/** Keeps digits and a single decimal point while typing. */
export function cleanAmount(text: string) {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

/** Inline validation message with an icon, so an error is never colour alone. */
export function FieldError({ message }: { message?: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons name="alert-circle" size={16} color={colors.errorText} />
      <Text variant="caption" color="errorText" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

/** A titled card that groups related form fields, with an optional inline error under them. */
export function FormCard({ title, icon, children, error }: { title?: string; icon?: IconName; children: ReactNode; error?: string | null }) {
  return (
    <Card style={{ gap: spacing.md }}>
      {title ? (
        <View accessibilityRole="header" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {icon ? <IconTile icon={icon} size={spacing.xxl + spacing.xs} /> : null}
          <Text variant="overline" color="textMuted" style={{ flex: 1 }}>
            {title}
          </Text>
        </View>
      ) : null}
      {children}
      <FieldError message={error} />
    </Card>
  );
}

/** A tracked label over a group of choices, with no card around them (the transaction sheet's category and payment rows). */
export function FormSection({ title, children, error }: { title: string; children: ReactNode; error?: string | null }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="overline" color="textMuted" accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {children}
      <FieldError message={error} />
    </View>
  );
}

export type TypeSwitchOption<T extends string> = {
  value: T;
  label: string;
  /** Fill of the chosen pill and the colour of the text on it. */
  tint: string;
  onTint: string;
};

/**
 * The transaction type as a row of pills in one track; the chosen pill is filled with the type's colour (expense, income,
 * investment). Announced as a radio group; the chosen label is bold, so the choice is never colour alone.
 */
export function TypeSwitch<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly TypeSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', gap: spacing.xs, padding: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.cardMuted }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <View key={option.value} style={{ flex: 1 }}>
            <PressableScale
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              scaleTo={1}
              ringRadius={radius.pill}
              hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
              onPress={() => {
                if (selected) return;
                haptics.select();
                onChange(option.value);
              }}
              style={{
                minHeight: layout.minTouchTarget - spacing.xs,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: selected ? option.tint : 'transparent',
              }}>
              <Text variant="label" weight={selected ? 'bold' : 'semiBold'} numberOfLines={1} style={{ color: selected ? option.onTint : colors.textSecondary }}>
                {option.label}
              </Text>
            </PressableScale>
          </View>
        );
      })}
    </View>
  );
}
