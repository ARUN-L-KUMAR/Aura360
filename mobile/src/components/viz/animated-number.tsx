import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { Text, type TextVariant, type TextWeight } from '@/components/ui/text';
import { isFiniteNumber, tweenValue } from '@/features/viz/geometry';
import { getDeviceLocale } from '@/i18n';
import { duration, useTheme, type ThemeColors } from '@/theme';

/**
 * A number that counts up to its value on mount and to each new value after.
 *
 * ```tsx
 * <AnimatedNumber value={balance} format={(n) => formatMoney(n)} variant="headline" />
 * <AnimatedNumber value={streak} />                       // locale-aware integer
 * <AnimatedNumber value={weight} fractionDigits={1} />    // 72.4
 * ```
 *
 * - Tabular digits (`<Text numeric>`), so the width does not jitter while it counts.
 * - `format` turns a number into text; the default is `Intl.NumberFormat` in the phone's locale. While counting, the
 *   formatter receives values rounded to `fractionDigits`; the final call gets the exact value.
 * - Screen readers hear the final value only (the label is set once), never the ticks.
 * - Instant under reduce-motion. It is a short JS tween (about 24 frames): Intl and arbitrary formatters cannot run on the
 *   UI thread, so a read-only TextInput driven by Reanimated was not an option.
 */
export type AnimatedNumberProps = {
  value: number;
  format?: (value: number) => string;
  /** Decimals shown by the default formatter, and the precision of the counting steps. Default 0. */
  fractionDigits?: number;
  /** Where the first count starts. Default 0. Pass `value` to skip the count on mount. */
  from?: number;
  variant?: TextVariant;
  weight?: TextWeight;
  color?: keyof ThemeColors | (string & {});
  numberOfLines?: number;
  /** Spoken text, when the formatted number alone is not enough ("1,200 rupees spent"). */
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
};

function AnimatedNumberImpl({ value, format, fractionDigits = 0, from = 0, variant = 'headline', weight, color, numberOfLines = 1, accessibilityLabel, style }: AnimatedNumberProps) {
  const { reduceMotion } = useTheme();
  const target = isFiniteNumber(value) ? value : 0;

  const defaultFormat = useMemo(() => {
    const digits = Math.max(0, Math.min(20, Math.floor(fractionDigits)));
    let formatter: Intl.NumberFormat | null = null;
    try {
      formatter = new Intl.NumberFormat(getDeviceLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
    } catch {
      formatter = null;
    }
    return (n: number) => (formatter ? formatter.format(n) : n.toFixed(digits));
  }, [fractionDigits]);
  const render = format ?? defaultFormat;

  const [shown, setShown] = useState(reduceMotion ? target : isFiniteNumber(from) ? from : 0);
  const latest = useRef(shown);

  useEffect(() => {
    if (reduceMotion || latest.current === target) {
      latest.current = target;
      setShown(target);
      return;
    }
    const start = latest.current;
    const step = Math.pow(10, Math.max(0, Math.floor(fractionDigits)));
    const began = Date.now();
    let frame = 0;
    const tick = () => {
      const progress = (Date.now() - began) / duration.slow;
      const next = progress >= 1 ? target : Math.round(tweenValue(start, target, progress) * step) / step;
      latest.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, fractionDigits, reduceMotion]);

  return (
    <Text variant={variant} weight={weight} color={color} numeric numberOfLines={numberOfLines} accessibilityLabel={accessibilityLabel ?? render(target)} style={style}>
      {render(shown)}
    </Text>
  );
}

export const AnimatedNumber = memo(AnimatedNumberImpl);
