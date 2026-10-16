import { Ionicons } from '@expo/vector-icons';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type { IconName } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MAX_FONT_SCALE, fontWeightFamily, normalizeWeight, radius, spacing, typeScale, useTheme } from '@/theme';

export type InputProps = TextInputProps & {
  label?: string;
  /** Helper text under the field. Replaced by `error` while an error is showing. */
  helper?: string;
  /** Error message. Shown with an icon, announced to screen readers and turns the border to the error colour. */
  error?: string | null;
  /** Ionicons name drawn at the start of the field. */
  leftIcon?: IconName;
  /** Custom content at the start / end of the field (a currency symbol, a unit, a toggle). */
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
  /** Shows a clear (x) button while the field has text. */
  clearable?: boolean;
  /** Called after the clear button empties the field. `onChangeText('')` is also called. */
  onClear?: () => void;
  /** Shows a character counter ("12/80" when `maxLength` is set). */
  showCount?: boolean;
  /** Same as `editable={false}` with the disabled look. */
  disabled?: boolean;
  /** Style for the outer wrapper (label + field + messages). `style` still goes to the TextInput, as before. */
  containerStyle?: StyleProp<ViewStyle>;
};

const FIELD_MIN_HEIGHT = spacing.xxxl; // 48

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    helper,
    error,
    leftIcon,
    leftAdornment,
    rightAdornment,
    clearable,
    onClear,
    showCount,
    disabled,
    containerStyle,
    style,
    editable,
    multiline,
    value,
    defaultValue,
    maxLength,
    onChangeText,
    onFocus,
    onBlur,
    accessibilityLabel,
    accessibilityHint,
    placeholder,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);

  const [focused, setFocused] = useState(false);
  // Only used when the parent does not control `value`.
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const text = value ?? uncontrolled;

  const isDisabled = !!disabled || editable === false;
  const hasError = !!error;

  // iOS does not announce a newly mounted alert reliably, so speak it; Android uses the live region below.
  useEffect(() => {
    if (error && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  const handleChange = useCallback(
    (next: string) => {
      setUncontrolled(next);
      onChangeText?.(next);
    },
    [onChangeText],
  );

  const clear = () => {
    handleChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  // Legacy call sites pass fontSize / fontWeight / minHeight in `style`; keep those working, but let the weight pick
  // the matching Inter family instead of faking bold on top of a medium file.
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const legacyFamily = flat.fontWeight ? fontWeightFamily[normalizeWeight(flat.fontWeight) ?? 'medium'] : undefined;
  const { fontWeight: _ignored, ...userStyle } = flat;

  const borderColor = hasError ? colors.error : focused ? colors.focusRing : isDisabled ? colors.border : colors.borderStrong;
  const showClear = !!clearable && !isDisabled && text.length > 0;
  const hasLeft = !!leftIcon || !!leftAdornment;
  const hasRight = showClear || !!rightAdornment;
  const showFooter = hasError || !!helper || !!showCount;
  const count = showCount ? (maxLength ? `${text.length}/${maxLength}` : `${text.length}`) : null;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        // The TextInput carries the label for assistive tech, so hide this copy to avoid reading it twice.
        <Text
          variant="label"
          color="textSecondary"
          accessibilityElementsHidden
          importantForAccessibility="no">
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            minHeight: FIELD_MIN_HEIGHT,
            borderColor,
            backgroundColor: isDisabled ? colors.cardMuted : colors.card,
          },
        ]}>
        {hasLeft ? (
          <View style={[styles.adornment, multiline ? styles.adornmentTop : null, { paddingLeft: spacing.md }]}>
            {leftIcon ? <Ionicons name={leftIcon} size={20} color={isDisabled ? colors.textDisabled : colors.textMuted} /> : null}
            {leftAdornment}
          </View>
        ) : null}

        <TextInput
          placeholderTextColor={colors.textMuted}
          cursorColor={colors.primaryAccent}
          selectionColor={colors.primaryAccent}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          {...rest}
          ref={inputRef}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          multiline={multiline}
          editable={!isDisabled}
          onChangeText={handleChange}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          accessibilityHint={accessibilityHint ?? (error || helper || undefined)}
          accessibilityState={{ disabled: isDisabled }}
          style={[
            styles.input,
            {
              color: isDisabled ? colors.textDisabled : colors.text,
              fontFamily: legacyFamily ?? fontWeightFamily.medium,
              fontSize: typeScale.body.fontSize,
              paddingLeft: hasLeft ? spacing.sm : spacing.md,
              paddingRight: hasRight ? spacing.sm : spacing.md,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            userStyle,
          ]}
        />

        {showClear ? (
          <View style={[styles.adornment, multiline ? styles.adornmentTop : null]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label ? `Clear ${label}` : 'Clear text'}
              hitSlop={spacing.sm}
              onPress={clear}
              style={({ pressed }) => [styles.clear, { backgroundColor: pressed ? colors.cardMuted : 'transparent' }]}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}
        {rightAdornment ? (
          <View style={[styles.adornment, multiline ? styles.adornmentTop : null, { paddingRight: spacing.sm }]}>
            {rightAdornment}
          </View>
        ) : null}

        {focused ? (
          <View pointerEvents="none" style={[styles.ring, { borderColor: hasError ? colors.error : colors.focusRing }]} />
        ) : null}
      </View>

      {showFooter ? (
        <View style={styles.footer}>
          {hasError ? (
            <View
              style={styles.message}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={14} color={colors.errorText} style={styles.messageIcon} />
              <Text variant="caption" color="errorText" style={styles.messageText}>
                {error}
              </Text>
            </View>
          ) : helper ? (
            <Text variant="caption" color="textMuted" style={styles.messageText}>
              {helper}
            </Text>
          ) : (
            <View style={styles.messageText} />
          )}
          {count ? (
            <Text variant="caption" numeric color="textMuted" accessibilityLabel={`${count.replace('/', ' of ')} characters`}>
              {count}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  input: { flex: 1, paddingVertical: spacing.md },
  adornment: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  adornmentTop: { alignSelf: 'flex-start', paddingTop: spacing.md },
  clear: { borderRadius: radius.pill, padding: spacing.xs },
  ring: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.md, borderWidth: 2 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  message: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  messageIcon: { marginTop: 1 },
  messageText: { flex: 1 },
});
