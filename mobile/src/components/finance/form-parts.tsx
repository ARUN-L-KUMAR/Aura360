import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { spacing, useTheme } from '@/theme';

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
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.md }}>
      {title ? (
        <View accessibilityRole="header" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon ? <Ionicons name={icon} size={18} color={colors.textSecondary} /> : null}
          <Text variant="label" color="textSecondary" style={{ flex: 1 }}>
            {title}
          </Text>
        </View>
      ) : null}
      {children}
      <FieldError message={error} />
    </Card>
  );
}
