import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { duration, easing, radius, spacing, useTheme } from '@/theme';

export type OtpInputProps = {
  /** Number of digits. Default 6. */
  length?: number;
  value?: string;
  defaultValue?: string;
  /** Called with the digits typed so far (digits only, never longer than `length`). */
  onChangeText?: (code: string) => void;
  /** Called once each time all digits are filled (typed, pasted or autofilled from SMS). */
  onComplete?: (code: string) => void;
  /** Error message. Boxes get the error ring and the message is shown with an icon and announced. */
  error?: string | null;
  label?: string;
  helper?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  /** Style for the outer wrapper. */
  style?: StyleProp<ViewStyle>;
};

const BOX_HEIGHT = spacing.xxxl + spacing.sm; // 56

const DIGITS = /\D/g;

function Caret({ color, still }: { color: string; still: boolean }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (still) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: duration.slow, easing: Easing.bezier(...easing.standard) }),
        withTiming(1, { duration: duration.slow, easing: Easing.bezier(...easing.standard) }),
      ),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [still, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.caret, { backgroundColor: color }, animated]} />;
}

/**
 * One-time-code entry: N visible boxes driven by a single invisible TextInput laid over them, so paste, SMS autofill,
 * backspace and the numeric keyboard all behave like a normal text field.
 */
export const OtpInput = forwardRef<TextInput, OtpInputProps>(function OtpInput(
  {
    length = 6,
    value,
    defaultValue,
    onChangeText,
    onComplete,
    error,
    label,
    helper,
    disabled,
    autoFocus,
    accessibilityLabel,
    style,
  },
  ref,
) {
  const { colors, reduceMotion } = useTheme();
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);

  const clean = (s: string) => s.replace(DIGITS, '').slice(0, length);
  const [internal, setInternal] = useState(clean(defaultValue ?? ''));
  const code = value !== undefined ? clean(value) : internal;
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  });
  const wasComplete = useRef(false);
  useEffect(() => {
    const complete = code.length === length;
    if (complete && !wasComplete.current) completeRef.current?.(code);
    wasComplete.current = complete;
  }, [code, length]);

  useEffect(() => {
    if (error && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  const handleChange = (text: string) => {
    const next = clean(text);
    setInternal(next);
    onChangeText?.(next);
  };

  const activeIndex = Math.min(code.length, length - 1);
  const slots = useMemo(() => Array.from({ length }, (_, i) => i), [length]);

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text variant="label" color="textSecondary" accessibilityElementsHidden importantForAccessibility="no">
          {label}
        </Text>
      ) : null}

      <View style={[styles.boxes, disabled ? styles.disabled : null]}>
        <View style={styles.boxes} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {slots.map((i) => {
            const char = code[i];
            const active = focused && !disabled && i === activeIndex && !hasError;
            const ringColor = hasError ? colors.error : colors.focusRing;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  {
                    backgroundColor: disabled ? colors.cardMuted : colors.card,
                    borderColor: hasError ? colors.error : char ? colors.borderStrong : colors.border,
                  },
                ]}>
                {char ? (
                  <Text variant="title" weight="semiBold" numeric>
                    {char}
                  </Text>
                ) : active ? (
                  <Caret color={colors.primaryAccent} still={reduceMotion} />
                ) : null}
                {active || hasError ? <View style={[styles.ring, { borderColor: ringColor }]} /> : null}
              </View>
            );
          })}
        </View>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
          autoFocus={autoFocus}
          keyboardType="number-pad"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoCorrect={false}
          spellCheck={false}
          caretHidden
          contextMenuHidden={false}
          selection={{ start: code.length, end: code.length }}
          selectionColor="transparent"
          cursorColor="transparent"
          returnKeyType="done"
          accessibilityLabel={accessibilityLabel ?? label ?? `Verification code, ${length} digits`}
          accessibilityHint={error || helper || 'Enter or paste the code'}
          accessibilityValue={{ text: `${code.length} of ${length} digits entered` }}
          accessibilityState={{ disabled: !!disabled }}
          style={[StyleSheet.absoluteFill, styles.hiddenInput]}
        />
      </View>

      {hasError ? (
        <View style={styles.message} accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={14} color={colors.errorText} style={styles.messageIcon} />
          <Text variant="caption" color="errorText" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text variant="caption" color="textMuted">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  boxes: { flexDirection: 'row', gap: spacing.sm },
  disabled: { opacity: 0.55 },
  box: {
    flex: 1,
    minHeight: BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  ring: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius.md, borderWidth: 2 },
  caret: { width: 2, height: spacing.xl, borderRadius: radius.sm },
  hiddenInput: { opacity: 0 },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  messageIcon: { marginTop: 1 },
  messageText: { flex: 1 },
});
