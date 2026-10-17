import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { MAX_FONT_SCALE, fontWeightFamily, layout, radius, spacing, typeScale, useTheme } from '@/theme';

export type SearchBarProps = Omit<TextInputProps, 'style' | 'value' | 'defaultValue' | 'onChangeText'> & {
  /** Current text. Treated as the initial value; later changes that differ from what was last emitted reset the field. */
  value?: string;
  defaultValue?: string;
  /** Called with the new text; after `debounceMs` of no typing when that is set, otherwise on every keystroke. */
  onChangeText?: (text: string) => void;
  /** Wait this long after the last keystroke before calling `onChangeText` (clearing always fires immediately). */
  debounceMs?: number;
  /** Fired when the clear button empties the field. */
  onClear?: () => void;
  /** When provided, a "Cancel" button appears while the field is focused or has text; it clears, dismisses the keyboard and calls this. */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Style for the outer row. */
  style?: StyleProp<ViewStyle>;
};

export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  {
    value,
    defaultValue,
    onChangeText,
    debounceMs,
    onClear,
    onCancel,
    cancelLabel,
    placeholder,
    accessibilityLabel,
    editable,
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);

  const [text, setText] = useState(value ?? defaultValue ?? '');
  const [focused, setFocused] = useState(false);
  const lastEmitted = useRef(text);
  const emit = useRef(onChangeText);
  useEffect(() => {
    emit.current = onChangeText;
  });
  const isDisabled = editable === false;

  // External reset (parent changed `value` to something other than what we sent).
  useEffect(() => {
    if (value !== undefined && value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value);
    }
  }, [value]);

  const debounced = useDebouncedValue(text, debounceMs ?? 0);
  useEffect(() => {
    if (!debounceMs || debounced === lastEmitted.current) return;
    lastEmitted.current = debounced;
    emit.current?.(debounced);
  }, [debounced, debounceMs]);

  const change = (next: string) => {
    setText(next);
    if (!debounceMs) {
      lastEmitted.current = next;
      emit.current?.(next);
    }
  };

  const clear = () => {
    setText('');
    lastEmitted.current = '';
    emit.current?.('');
    onClear?.();
    inputRef.current?.focus();
  };

  const cancel = () => {
    setText('');
    lastEmitted.current = '';
    emit.current?.('');
    inputRef.current?.blur();
    onCancel?.();
  };

  const placeholderText = placeholder ?? t('actions.search');
  const cancelText = cancelLabel ?? t('actions.cancel');
  const showCancel = !!onCancel && (focused || text.length > 0);

  return (
    <View style={[styles.row, style]}>
      <View
        style={[
          styles.field,
          {
            borderColor: focused ? colors.focusRing : colors.borderStrong,
            backgroundColor: isDisabled ? colors.cardMuted : colors.card,
          },
        ]}>
        <Ionicons
          name="search"
          size={20}
          color={isDisabled ? colors.textDisabled : colors.textMuted}
          style={styles.searchIcon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <TextInput
          placeholderTextColor={colors.textMuted}
          cursorColor={colors.primaryAccent}
          selectionColor={colors.primaryAccent}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
          ref={inputRef}
          value={text}
          onChangeText={change}
          placeholder={placeholderText}
          editable={!isDisabled}
          returnKeyType="search"
          enterKeyHint="search"
          accessibilityRole="search"
          accessibilityLabel={accessibilityLabel ?? placeholderText}
          accessibilityState={{ disabled: isDisabled }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: isDisabled ? colors.textDisabled : colors.text,
              fontFamily: fontWeightFamily.medium,
              fontSize: typeScale.body.fontSize,
            },
          ]}
        />
        {text.length > 0 && !isDisabled ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('searchBar.clear')}
            hitSlop={spacing.sm}
            scaleTo={1}
            ringRadius={radius.pill}
            onPress={clear}
            style={styles.clear}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </PressableScale>
        ) : null}
        {focused ? <View pointerEvents="none" style={[styles.ring, { borderColor: colors.focusRing }]} /> : null}
      </View>

      {showCancel ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={cancelText}
          scaleTo={1}
          ringRadius={radius.md}
          onPress={cancel}
          style={styles.cancel}>
          <Text variant="label" weight="semiBold" color="primaryAccent">
            {cancelText}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  searchIcon: { marginStart: spacing.md },
  input: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  clear: { borderRadius: radius.pill, padding: spacing.xs, marginEnd: spacing.sm },
  ring: { ...StyleSheet.absoluteFill, borderRadius: radius.pill, borderWidth: 2 },
  cancel: { minHeight: layout.minTouchTarget, paddingHorizontal: spacing.xs, justifyContent: 'center' },
});
