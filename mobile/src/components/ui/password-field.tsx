import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Input, type InputProps } from '@/components/ui/input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { layout, radius, useTheme } from '@/theme';

export type PasswordFieldProps = Omit<InputProps, 'secureTextEntry' | 'rightAdornment' | 'multiline'> & {
  /**
   * True on sign-up / reset / change-password screens: asks the OS to suggest a strong password
   * (`new-password` / `newPassword`). False (default) offers saved credentials (`password`).
   */
  newPassword?: boolean;
};

/** Input with a show / hide toggle. The toggle announces its action ("Show password" / "Hide password"). */
export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField(
  { newPassword = false, label = 'Password', disabled, editable, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const isDisabled = !!disabled || editable === false;

  return (
    <Input
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      autoComplete={newPassword ? 'new-password' : 'password'}
      textContentType={newPassword ? 'newPassword' : 'password'}
      {...rest}
      ref={ref}
      label={label}
      disabled={isDisabled}
      secureTextEntry={!visible}
      rightAdornment={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          haptic="select"
          scaleTo={1}
          hitSlop={0}
          ringRadius={radius.pill}
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}>
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={isDisabled ? colors.textDisabled : colors.textSecondary}
          />
        </PressableScale>
      }
    />
  );
});

const styles = StyleSheet.create({
  toggle: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
