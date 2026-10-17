import { useId } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme, type ModuleKey } from '@/theme';

type Direction = 'vertical' | 'horizontal' | 'diagonal';

const VECTOR: Record<Direction, { x1: string; y1: string; x2: string; y2: string }> = {
  vertical: { x1: '0', y1: '0', x2: '0', y2: '1' },
  horizontal: { x1: '0', y1: '0', x2: '1', y2: '0' },
  diagonal: { x1: '0', y1: '0', x2: '1', y2: '1' },
};

type Props = {
  from: string;
  to: string;
  direction?: Direction;
  style?: StyleProp<ViewStyle>;
};

/**
 * A soft two-stop gradient that fills its parent (the parent needs `overflow: 'hidden'` for rounded corners). Purely
 * decorative: hidden from screen readers and from touches. Colours must be theme tokens; keep both stops light enough
 * (or dark enough) that the text on top still meets contrast - the accent `soft` and surface tokens do.
 */
export function Gradient({ from, to, direction = 'vertical', style }: Props) {
  const id = useId();
  const v = VECTOR[direction];
  return (
    <Svg
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, style]}
      width="100%"
      height="100%">
      <Defs>
        <LinearGradient id={id} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** The standard hero wash: the module's soft accent fading into the card surface. */
export function AccentGradient({ accent, direction = 'diagonal', style }: { accent: ModuleKey; direction?: Direction; style?: StyleProp<ViewStyle> }) {
  const { accent: accentFor, colors } = useTheme();
  return <Gradient from={accentFor(accent).soft} to={colors.card} direction={direction} style={style} />;
}
