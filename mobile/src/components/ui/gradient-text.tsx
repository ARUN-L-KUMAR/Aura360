import { Text, type TextVariant } from '@/components/ui/text';
import { lerpHex } from '@/components/ui/logic';
import type { StyleProp, TextStyle } from 'react-native';

type Props = {
  children: string;
  /** Colour of the first letter (`#rrggbb`, from theme tokens). */
  from: string;
  /** Colour of the last letter. */
  to: string;
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
};

/**
 * A word whose colour fades from `from` to `to`, like the web hero's gradient name. React Native has no gradient text
 * without a native masking module, so each letter gets its own blended colour; for a name or a short word this reads as a
 * smooth gradient. Screen readers hear one word (the nested spans are read as a single string).
 *
 * Usage: `<GradientText from={colors.onHero} to={shades.secondary[400]}>Arun</GradientText>`
 */
export function GradientText({ children, from, to, variant = 'hero', style }: Props) {
  const letters = Array.from(children);
  const last = Math.max(1, letters.length - 1);
  return (
    <Text variant={variant} style={style} accessibilityLabel={children}>
      {letters.map((letter, index) => (
        <Text key={`${index}-${letter}`} variant={variant} style={{ color: lerpHex(from, to, index / last) }}>
          {letter}
        </Text>
      ))}
    </Text>
  );
}
