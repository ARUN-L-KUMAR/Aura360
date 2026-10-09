import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

type Props = TextInputProps & { label?: string; error?: string | null };

export const Input = forwardRef<TextInput, Props>(function Input({ label, error, style, ...rest }, ref) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text variant="label" muted>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        {...rest}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.card,
            color: colors.text,
            paddingHorizontal: spacing.md,
            fontSize: 16,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
